#!/usr/bin/env python3
"""Generate placeholder World Tokens (Asset B) from Collection Dioramas (Asset A).

For every assets/spots/<id>/collection/day.png, flood-fills the flat studio
background from the image border, turns it transparent (with a soft edge),
crops to the remaining diorama and writes assets/spots/<id>/world/landmark.png.

These are stand-ins until a hand-made, hero-only token exists (spec §9).
A spot whose world/ folder contains a `.final` marker file is skipped.

Usage: python3 scripts/extract-world-tokens.py [spot-id ...]
"""
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent / "assets" / "spots"
TOLERANCE = 34  # max per-channel distance from the sampled background colour
FEATHER = 1.2  # alpha blur radius (px) for a soft cut edge


def background_mask(img: Image.Image) -> Image.Image:
    w, h = img.size
    px = img.load()
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    bg = tuple(sorted(c[i] for c in corners)[len(corners) // 2] for i in range(3))

    def is_bg(c):
        return all(abs(c[i] - bg[i]) <= TOLERANCE for i in range(3))

    mask = Image.new("L", (w, h), 0)
    m = mask.load()
    queue = deque()
    for x in range(w):
        queue.extend([(x, 0), (x, h - 1)])
    for y in range(h):
        queue.extend([(0, y), (w - 1, y)])
    while queue:
        x, y = queue.popleft()
        if m[x, y] or not is_bg(px[x, y]):
            continue
        m[x, y] = 255
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not m[nx, ny]:
                queue.append((nx, ny))
    return mask


def extract(spot_dir: Path) -> str:
    src = spot_dir / "collection" / "day.png"
    out = spot_dir / "world" / "landmark.png"
    if not src.exists():
        return "no collection/day.png"
    if (spot_dir / "world" / ".final").exists():
        return "skipped (final token present)"
    img = Image.open(src).convert("RGB")
    bg = background_mask(img)
    alpha = Image.eval(bg, lambda v: 255 - v).filter(ImageFilter.GaussianBlur(FEATHER))
    rgba = img.convert("RGBA")
    rgba.putalpha(alpha)
    bbox = alpha.point(lambda v: 255 if v > 24 else 0).getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    out.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(out, optimize=True)
    return f"ok {rgba.size[0]}x{rgba.size[1]}"


def main():
    ids = sys.argv[1:] or sorted(p.name for p in ROOT.iterdir() if p.is_dir())
    for spot_id in ids:
        print(f"{spot_id:18} {extract(ROOT / spot_id)}")


if __name__ == "__main__":
    main()
