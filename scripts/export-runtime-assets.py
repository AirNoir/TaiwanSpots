#!/usr/bin/env python3
"""Export offline WebP derivatives without promoting review art or changing PNGs."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, features, __version__ as pillow_version


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def export_one(root, source, output, family, spec):
    before = digest(source)
    config = spec[family]
    with Image.open(source) as original:
        image = original.convert('RGBA' if 'A' in original.getbands() or 'transparency' in original.info else 'RGB')
        icc = original.info.get('icc_profile')
        image.thumbnail((config['maxSize'], config['maxSize']), Image.Resampling.LANCZOS)
    options = {'format': 'WEBP', 'method': spec['method'], 'exact': True}
    if config.get('lossless'):
        options['lossless'] = True
    else:
        options['quality'] = config['quality']
    if icc:
        options['icc_profile'] = icc
    temporary = output.with_suffix('.webp.tmp')
    try:
        image.save(temporary, **options)
        with Image.open(temporary) as decoded:
            decoded.load()
            if decoded.size != image.size:
                raise ValueError(f'{output}: dimensions changed during encoding')
            if 'A' in image.getbands() and decoded.convert('RGBA').getchannel('A').tobytes() != image.getchannel('A').tobytes():
                raise ValueError(f'{output}: alpha changed')
            if config.get('lossless') and decoded.convert(image.mode).tobytes() != image.tobytes():
                raise ValueError(f'{output}: lossless pixel mismatch')
        if digest(source) != before:
            raise ValueError(f'{source}: source unexpectedly modified')
        temporary.replace(output)
    finally:
        temporary.unlink(missing_ok=True)
    return {
        'family': family,
        'source': str(source.relative_to(root)),
        'output': str(output.relative_to(root)),
        'sourceSha256': before,
        'outputSha256': digest(output),
        'sourceBytes': source.stat().st_size,
        'outputBytes': output.stat().st_size,
        'dimensions': list(image.size),
        'lossless': config.get('lossless', False),
        'quality': config.get('quality'),
    }


def run(root, source_mode=None):
    spec = json.loads((root / 'docs/asset-runtime-spec.json').read_text())
    report_path = root / 'docs/runtime-asset-report.json'
    previous = json.loads(report_path.read_text()) if report_path.exists() else {}
    source_mode = source_mode or previous.get('sourceMode', 'runtime')
    if source_mode not in ['runtime', 'masters']:
        raise ValueError(f'Unknown source mode: {source_mode}')
    if not features.check('webp'):
        raise RuntimeError('Pillow requires WebP support; see scripts/requirements-art.txt')
    rows = []
    for spot in sorted((root / 'assets/spots').iterdir()):
        if not spot.is_dir():
            continue
        collection = spot / 'collection'
        day = collection / 'day.png'
        master = collection / 'master.png'
        # Existing runtime art is authoritative. Never consume review-vN.png.
        source = master if source_mode == 'masters' and master.exists() else day if day.exists() else master if master.exists() else None
        if source:
            for variant in ['day', 'sunset', 'night']:
                variant_source = source if variant == 'day' else collection / f'{variant}.png'
                if variant_source.exists():
                    rows.append(export_one(root, variant_source, collection / f'{variant}.webp', 'collection', spec))
            thumbnail = collection / 'thumbnail.png'
            thumbnail_source = source if source_mode == 'masters' else thumbnail if thumbnail.exists() else source
            rows.append(export_one(root, thumbnail_source,
                                   collection / 'thumbnail.webp', 'thumbnail', spec))
        token = spot / 'world/landmark.png'
        if token.exists():
            # .final protects the source PNG from extraction; the lossless derivative
            # is pixel-identical and does not alter that approved source.
            rows.append(export_one(root, token, token.with_suffix('.webp'), 'world', spec))
    total_source = sum(x['sourceBytes'] for x in rows)
    total_output = sum(x['outputBytes'] for x in rows)
    report = {
        'scope': 'Runtime derivatives only; source byte totals are not an IPA/APK size measurement.',
        'encoder': f'Pillow {pillow_version}',
        'sourceMode': source_mode,
        'spec': spec,
        'files': len(rows),
        'sourceBytes': total_source,
        'outputBytes': total_output,
        'reductionPercent': round(100 * (1 - total_output / total_source), 2) if total_source else 0,
        'assets': rows,
    }
    report_path.write_text(json.dumps(report, indent=2) + '\n')
    print(f'{len(rows)} runtime images: {total_source / 1e6:.2f} MB -> {total_output / 1e6:.2f} MB '
          f'({report["reductionPercent"]}% smaller). PNG originals unchanged.')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--source', choices=['runtime', 'masters'], default=None,
                        help='Default: previous report mode, or runtime. Use masters only for intentional art promotion.')
    args = parser.parse_args()
    run(args.root.resolve(), args.source)
