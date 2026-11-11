"""Copy the app's art into public/ for the promo video (run from this folder)."""
import os, shutil
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')
IDS = 'taipei-101 jiufen tamsui yehliu sun-moon-lake gaomei lukang alishan chihkan pier2 kenting taroko'.split()
SEALED_INK = (0xC7, 0xB8, 0x9C, 255)  # theme.ts light.sealedInk

for d in ('lm', 'sil', 'day', 'screens', 'tok'):
    os.makedirs(os.path.join(OUT, d), exist_ok=True)
for s in IDS:
    im = Image.open(f'{ROOT}/assets/spots/{s}/world/landmark.png').convert('RGBA')
    im.save(f'{OUT}/lm/{s}.png')
    sil = Image.new('RGBA', im.size, SEALED_INK)
    sil.putalpha(im.split()[3])
    sil.save(f'{OUT}/sil/{s}.png')
    Image.open(f'{ROOT}/assets/spots/{s}/collection/day.png').convert('RGB').resize((900, 900)).save(f'{OUT}/day/{s}.jpg', quality=90)
# Small map tokens for every spot with art: the world token when there is one,
# otherwise the collection thumbnail cut out with its silhouette's alpha.
import json
for sp in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src', 'spots.json'))):
    if not sp['art']:
        continue
    s = sp['id']
    world = f'{ROOT}/assets/spots/{s}/world/landmark.png'
    if os.path.exists(world):
        tok = Image.open(world).convert('RGBA')
    else:
        tok = Image.open(f'{ROOT}/assets/spots/{s}/collection/thumbnail.webp').convert('RGBA')
        a = Image.open(f'{ROOT}/assets/spots/{s}/collection/silhouette.webp').split()[3].resize(tok.size, Image.LANCZOS)
        tok.putalpha(a)
    tok.resize((200, 200), Image.LANCZOS).save(f'{OUT}/tok/{s}.png')
shots = f'{ROOT}/store/screenshots/zh-Hant/iphone-6.3'
for f in os.listdir(shots):
    if f.endswith('.jpg'):
        shutil.copy(os.path.join(shots, f), f'{OUT}/screens/{f}')
shutil.copy(f'{ROOT}/assets/brand/islandia-ios-icon-v2-1024.png', f'{OUT}/icon.png')
print('public/ ready')
