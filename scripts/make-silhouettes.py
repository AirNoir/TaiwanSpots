#!/usr/bin/env python3
"""Generate sealed-model silhouettes from the collection thumbnails.

For every assets/spots/<id>/collection/thumbnail.* the flat studio background
is flood-filled from the border (same cut as extract-world-tokens.py) and the
remaining diorama becomes a white, soft-edged shape on transparency:
assets/spots/<id>/collection/silhouette.webp. The app tints it with the theme
colour (Image tintColor) wherever a collection is sealed (docs/spec.md §3.2),
so the real art never reaches a screen the player hasn't paid for.

Usage: python3 scripts/make-silhouettes.py [spot-id ...]
"""
import importlib.util
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent / "assets" / "spots"
SIZE = 256  # a silhouette has no detail worth more pixels
FEATHER = 1.0

spec = importlib.util.spec_from_file_location("tokens", HERE / "extract-world-tokens.py")
tokens = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tokens)


def largest_shape(alpha: Image.Image) -> Image.Image:
    """Drop specks the background cut left behind: keep only the biggest solid shape."""
    w, h = alpha.size
    a = alpha.load()
    seen = bytearray(w * h)
    best = []
    for sy in range(h):
        for sx in range(w):
            if seen[sy * w + sx] or a[sx, sy] <= 128:
                continue
            part, queue = [], deque([(sx, sy)])
            seen[sy * w + sx] = 1
            while queue:
                x, y = queue.popleft()
                part.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and a[nx, ny] > 128:
                        seen[ny * w + nx] = 1
                        queue.append((nx, ny))
            if len(part) > len(best):
                best = part
    keep = Image.new("L", (w, h), 0)
    k = keep.load()
    for x, y in best:
        k[x, y] = 255
    # grow by a pixel so the soft edge of the kept shape survives the cut
    keep = keep.filter(ImageFilter.MaxFilter(3))
    return Image.composite(alpha, keep, keep)


def make(spot_dir: Path) -> str:
    src = next((p for p in sorted((spot_dir / "collection").glob("thumbnail.*"))), None)
    if src is None:
        return "no thumbnail"
    img = Image.open(src).convert("RGB")
    bg = tokens.background_mask(img)
    alpha = Image.eval(bg, lambda v: 255 - v).filter(ImageFilter.GaussianBlur(FEATHER))
    alpha = largest_shape(alpha.resize((SIZE, SIZE), Image.LANCZOS))
    out = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
    out.putalpha(alpha)
    out.save(spot_dir / "collection" / "silhouette.webp", "WEBP", quality=80, method=6)
    covered = sum(1 for v in alpha.getdata() if v > 128) / (SIZE * SIZE)
    return f"ok ({covered:.0%} covered)"


def main(ids):
    dirs = [ROOT / i for i in ids] if ids else sorted(p for p in ROOT.iterdir() if p.is_dir())
    for d in dirs:
        print(f"{d.name}: {make(d)}")


if __name__ == "__main__":
    main(sys.argv[1:])
