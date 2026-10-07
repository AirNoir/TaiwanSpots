// Local visual review page for all collectible scenes and transparent map tokens.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'src/data/spots.ts'), 'utf8');
const spots = [...source.matchAll(/id: '([^']+)',\s+name: '([^']+)'/g)].map((match) => ({ id: match[1], name: match[2] }));
const cards = spots.map(({ id, name }) => `<article><a href="../assets/spots/${id}/collection/master.png"><img loading="lazy" src="../assets/spots/${id}/collection/day.png" alt="${name}收藏模型"></a><div class="caption"><h2>${name}</h2><img class="token" loading="lazy" src="../assets/spots/${id}/world/landmark.png" alt="${name}地圖圖標"></div><a href="../assets/spots/${id}/reference/sources.json">實景參考來源</a></article>`).join('\n');
writeFileSync(join(root, 'docs/asset-gallery.html'), `<!doctype html>
<html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Islandia 景點收藏模型</title>
<style>body{margin:0;padding:32px;background:#f2ede2;color:#3b493f;font:16px system-ui,sans-serif}header{max-width:1100px;margin:0 auto 24px}h1{font-size:28px}main{max-width:1100px;margin:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}article{background:#fffaf1;border-radius:24px;padding:12px;overflow:hidden;box-shadow:0 4px 18px #66503312}article>a>img{display:block;width:100%;aspect-ratio:1;border-radius:16px}h2{font-size:18px;margin:0}.caption{display:flex;align-items:center;justify-content:space-between;padding:8px}.token{width:64px;height:64px;object-fit:contain;background:#dfe8d8;border-radius:12px}a{color:#56745e;font-size:13px;text-decoration:none}article>a:last-child{display:block;padding:0 8px 8px}</style>
<header><h1>Islandia 景點收藏模型</h1><p>24 個景點 · 實景參考 · 柔和樹脂模型風格。點選收藏圖可查看原圖。</p></header><main>${cards}</main></html>\n`);
console.log(`Built gallery for ${spots.length} spots`);
