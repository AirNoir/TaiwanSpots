"""Copy the app's art into public/ for the promo video (run from this folder)."""
import os, shutil
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')
IDS = 'taipei-101 jiufen tamsui yehliu sun-moon-lake gaomei lukang alishan chihkan pier2 kenting taroko'.split()
SEALED_INK = (0xC7, 0xB8, 0x9C, 255)  # theme.ts light.sealedInk

for d in ('lm', 'sil', 'day', 'screens'):
    os.makedirs(os.path.join(OUT, d), exist_ok=True)
for s in IDS:
    im = Image.open(f'{ROOT}/assets/spots/{s}/world/landmark.png').convert('RGBA')
    im.save(f'{OUT}/lm/{s}.png')
    sil = Image.new('RGBA', im.size, SEALED_INK)
    sil.putalpha(im.split()[3])
    sil.save(f'{OUT}/sil/{s}.png')
    Image.open(f'{ROOT}/assets/spots/{s}/collection/day.png').convert('RGB').resize((900, 900)).save(f'{OUT}/day/{s}.jpg', quality=90)
shots = f'{ROOT}/store/screenshots/zh-Hant/iphone-6.3'
for f in os.listdir(shots):
    if f.endswith('.jpg'):
        shutil.copy(os.path.join(shots, f), f'{OUT}/screens/{f}')
shutil.copy(f'{ROOT}/assets/brand/islandia-ios-icon-v2-1024.png', f'{OUT}/icon.png')
print('public/ ready')
