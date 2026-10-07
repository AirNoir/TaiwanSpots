"""Download documented real-photo references; only used as generation inputs."""
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
def fetch(item):
    folder = ROOT / 'assets/spots' / item['id'] / 'reference'
    folder.mkdir(exist_ok=True)
    target = folder / 'real-photo.jpg'
    try:
        with urlopen(Request(item['image'], headers={'User-Agent': 'Mozilla/5.0'}), timeout=35) as response:
            content = response.read()
        target.write_bytes(content)
        (folder / 'sources.json').write_text(json.dumps(item, ensure_ascii=False, indent=2) + '\n')
        return f"{item['id']}: downloaded {len(content)} bytes"
    except Exception as error:
        return f"{item['id']}: FAILED {error}"

if __name__ == '__main__':
    items = json.loads((ROOT / 'docs/photo-reference-manifest.json').read_text())
    with ThreadPoolExecutor(max_workers=6) as pool:
        for result in pool.map(fetch, items):
            print(result, flush=True)
