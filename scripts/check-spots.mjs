#!/usr/bin/env node
// Sanity checks for src/data/spots.ts (see docs/spot-expansion.md):
//   ids unique · coordinates inside the Taiwan world · fallback icons exist ·
//   every roadmap spot marked added/needs-review is really in spots.ts
// Usage: npm run spots:check   (exit 1 on errors)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = new URL('..', import.meta.url).pathname;
const src = readFileSync(`${root}src/data/spots.ts`, 'utf8');
const glyphs = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');
const roadmap = JSON.parse(readFileSync(`${root}docs/spot-roadmap.json`, 'utf8'));

// Keep in sync with TAIWAN.bounds in src/data/world.ts.
const BOUNDS = { lngMin: 119.95, lngMax: 122.05, latMin: 21.8, latMax: 25.4 };

const blocks = src.split(/\n  \{\n/).slice(1);
const errors = [];
const ids = new Set();
for (const b of blocks) {
  const id = b.match(/id: '([^']+)'/)?.[1];
  if (!id) continue;
  if (ids.has(id)) errors.push(`${id}: duplicate id`);
  ids.add(id);

  const lat = Number(b.match(/latitude: ([\d.]+)/)?.[1]);
  const lng = Number(b.match(/longitude: ([\d.]+)/)?.[1]);
  if (!(lat >= BOUNDS.latMin && lat <= BOUNDS.latMax && lng >= BOUNDS.lngMin && lng <= BOUNDS.lngMax))
    errors.push(`${id}: ${lat},${lng} is outside the Taiwan world bounds`);

  const art = b.match(/art: \{ icon: '([^']+)'.*?deco: \[([^\]]*)\]/);
  if (!art) errors.push(`${id}: art fallback not found`);
  else {
    const names = [art[1], ...[...art[2].matchAll(/'([^']+)'/g)].map((m) => m[1])];
    for (const n of names) if (!(n in glyphs)) errors.push(`${id}: icon "${n}" is not a MaterialCommunityIcons name`);
  }
}

for (const s of roadmap.spots) {
  if (s.status !== 'planned' && !ids.has(s.id)) errors.push(`roadmap: ${s.id} is "${s.status}" but not in spots.ts`);
  if (s.status === 'planned' && ids.has(s.id)) errors.push(`roadmap: ${s.id} is in spots.ts but still "planned"`);
}

errors.forEach((e) => console.log(`✗ ${e}`));
const left = roadmap.spots.filter((s) => s.status === 'planned').length;
console.log(`${ids.size} spots · ${left} planned in roadmap · ${errors.length} errors`);
process.exit(errors.length ? 1 : 0);
