"""Integration checks for the art exporter; no app or native build required."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image

MODULE_PATH = Path(__file__).with_name('export-runtime-assets.py')
module_spec = importlib.util.spec_from_file_location('runtime_exporter', MODULE_PATH)
exporter = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(exporter)


class RuntimeAssetsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'docs').mkdir()
        spec = Path(__file__).resolve().parents[1] / 'docs/asset-runtime-spec.json'
        config = json.loads(spec.read_text())
        for family in ['collection', 'thumbnail']:
            config[family].pop('saturation', None)
        (self.root / 'docs/asset-runtime-spec.json').write_text(json.dumps(config))
        self.collection = self.root / 'assets/spots/example/collection'
        self.collection.mkdir(parents=True)
        Image.new('RGB', (1200, 600), (20, 40, 200)).save(self.collection / 'day.png')
        Image.new('RGB', (1200, 1200), (200, 10, 10)).save(self.collection / 'master.png')

    def test_preserves_sources_and_does_not_promote_reviews(self):
        review = self.root / 'assets/spots/pending/collection'
        review.mkdir(parents=True)
        Image.new('RGB', (1024, 1024), 'green').save(review / 'review-v1.png')
        originals = {p: p.read_bytes() for p in self.root.rglob('*.png')}
        report = exporter.run(self.root)
        self.assertEqual(report['files'], 2)
        self.assertFalse((review / 'day.webp').exists())
        for path, content in originals.items():
            self.assertEqual(path.read_bytes(), content)
        with Image.open(self.collection / 'day.webp') as image:
            self.assertEqual(image.size, (1024, 512))
            self.assertGreater(image.getpixel((20, 20))[2], 180)  # day, not red master
        with Image.open(self.collection / 'thumbnail.webp') as image:
            self.assertEqual(image.size, (512, 256))

    def test_lossless_token_retains_every_rgba_pixel(self):
        world = self.collection.parent / 'world'
        world.mkdir()
        image = Image.new('RGBA', (512, 512))
        image.putdata([(i % 256, (i * 3) % 256, 90, (i * 7) % 256) for i in range(512 * 512)])
        image.save(world / 'landmark.png')
        (world / '.final').touch()
        exporter.run(self.root)
        with Image.open(world / 'landmark.webp') as decoded:
            self.assertEqual(decoded.convert('RGBA').tobytes(), image.tobytes())
        self.assertTrue((world / '.final').exists())

    def test_small_sources_are_not_upscaled_and_export_is_repeatable(self):
        Image.new('RGB', (128, 128), 'blue').save(self.collection / 'day.png')
        first = exporter.run(self.root)
        content = (self.root / 'docs/runtime-asset-report.json').read_bytes()
        second = exporter.run(self.root)
        self.assertEqual(first, second)
        self.assertEqual(content, (self.root / 'docs/runtime-asset-report.json').read_bytes())
        self.assertTrue(all(row['dimensions'] == [128, 128] for row in first['assets']))

    def test_failed_encode_keeps_previous_output_and_cleans_temporary_file(self):
        output = self.collection / 'day.webp'
        output.write_bytes(b'previous output')
        with patch.object(Image.Image, 'save', side_effect=OSError('encoder failed')):
            with self.assertRaises(OSError):
                exporter.run(self.root)
        self.assertEqual(output.read_bytes(), b'previous output')
        self.assertFalse(list(self.root.rglob('*.tmp')))

    def test_missing_encoder_fails_before_writing(self):
        with patch.object(exporter.features, 'check', return_value=False):
            with self.assertRaises(RuntimeError):
                exporter.run(self.root)
        self.assertFalse(list(self.root.rglob('*.webp')))

    def test_explicit_master_promotion_remains_selected_on_next_export(self):
        first = exporter.run(self.root, 'masters')
        self.assertEqual(first['sourceMode'], 'masters')
        self.assertTrue(all(row['source'].endswith('master.png') for row in first['assets']))
        self.assertEqual(exporter.run(self.root), first)
        with Image.open(self.collection / 'day.webp') as image:
            self.assertGreater(image.getpixel((20, 20))[0], 180)

    def test_saturation_matrix_preserves_alpha_and_neutral_colors(self):
        image = Image.new('RGBA', (2, 1))
        image.putdata([(200, 40, 20, 73), (100, 100, 100, 0)])
        adjusted = exporter.apply_saturation(image, .88)
        self.assertEqual(adjusted.getpixel((0, 0)), (185, 44, 26, 73))
        self.assertEqual(adjusted.getpixel((1, 0)), (100, 100, 100, 0))
        self.assertEqual(image.getpixel((0, 0)), (200, 40, 20, 73))

    def test_master_reexport_does_not_double_apply_saturation(self):
        path = self.root / 'docs/asset-runtime-spec.json'
        config = json.loads(path.read_text())
        for family in ['collection', 'thumbnail']:
            config[family]['saturation'] = .88
        path.write_text(json.dumps(config))
        first = exporter.run(self.root, 'masters')
        output = (self.collection / 'day.webp').read_bytes()
        self.assertEqual(exporter.run(self.root), first)
        self.assertEqual((self.collection / 'day.webp').read_bytes(), output)
        self.assertTrue(all(row['saturation'] == .88 for row in first['assets']))


if __name__ == '__main__':
    unittest.main()
