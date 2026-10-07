#!/usr/bin/env node
// Checks every spot in src/data/spots.ts against the asset structure and
// blueprint schema of the visual spec v0.2 (§5, §14, §16).
//   errors   → missing blueprint / collection image, invalid blueprint
//   warnings → placeholder sizes, missing thumbnail, blueprint still draft
// Usage: npm run assets:check   (exit 1 on errors)
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const spotsDir = join(root, 'assets/spots');
const schema = JSON.parse(readFileSync(join(spotsDir, 'blueprint.schema.json'), 'utf8'));

const spotsSrc = readFileSync(join(root, 'src/data/spots.ts'), 'utf8');
const spotIds = [...spotsSrc.matchAll(/^\s{4}id: '([^']+)'/gm)].map((m) => m[1]);
const heroIds = new Set(
  [...spotsSrc.matchAll(/id: '([^']+)'[\s\S]*?production: '(hero|standard)'/g)]
    .filter((m) => m[2] === 'hero')
    .map((m) => m[1]),
);

// Spec §14 target sizes (longest edge, px).
const SIZE = { collection: 1024, tokenMin: 512 };

function imageSize(file) {
  const buf = readFileSync(file);
  if (buf.toString('ascii', 1, 4) === 'PNG') return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    if (chunk === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  }
  return null;
}

function findImage(dir, base) {
  if (!existsSync(dir)) return null;
  const f = readdirSync(dir).find((n) => n.replace(/\.(png|webp|avif|jpe?g)$/i, '') === base);
  return f ? join(dir, f) : null;
}

function checkBlueprint(bp, id, errors, warnings) {
  for (const key of schema.required) if (!(key in bp)) errors.push(`blueprint missing "${key}"`);
  for (const key of Object.keys(bp)) if (!(key in schema.properties)) errors.push(`blueprint has unknown key "${key}"`);
  if (bp.spotId !== id) errors.push(`blueprint spotId "${bp.spotId}" ≠ folder "${id}"`);
  for (const key of ['status', 'spotType', 'productionTier']) {
    const allowed = schema.properties[key].enum;
    if (key in bp && !allowed.includes(bp[key])) errors.push(`blueprint ${key} "${bp[key]}" not in ${allowed.join('|')}`);
  }
  const { minimum, maximum } = schema.properties.heroScale;
  if (typeof bp.heroScale !== 'number' || bp.heroScale < minimum || bp.heroScale > maximum)
    errors.push(`heroScale must be ${minimum}–${maximum}`);
  for (const key of ['lockedGeometry', 'lockedIdentity', 'doNotInvent']) {
    const min = schema.properties[key].minItems;
    if (!Array.isArray(bp[key]) || bp[key].length < min) errors.push(`${key} needs ≥ ${min} items`);
  }
  const tier = heroIds.has(id) ? 'hero' : 'standard';
  if (bp.productionTier && bp.productionTier !== tier)
    errors.push(`productionTier "${bp.productionTier}" ≠ spots.ts production "${tier}"`);
  if (bp.status === 'draft') warnings.push('blueprint is draft (not checked against references)');
  const refs = bp.references ?? {};
  if (bp.status !== 'draft' && !Object.values(refs).some((a) => a?.length))
    errors.push(`status "${bp.status}" but no references listed`);
}

let errorCount = 0;
let warnCount = 0;
for (const id of spotIds) {
  const dir = join(spotsDir, id);
  const errors = [];
  const warnings = [];

  const bpFile = join(dir, 'blueprint.json');
  if (!existsSync(bpFile)) errors.push('no blueprint.json');
  else {
    try {
      checkBlueprint(JSON.parse(readFileSync(bpFile, 'utf8')), id, errors, warnings);
    } catch (e) {
      errors.push(`blueprint.json: ${e.message}`);
    }
  }

  const day = findImage(join(dir, 'collection'), 'day');
  if (!day) errors.push('no collection/day image');
  else {
    const s = imageSize(day);
    if (s && Math.max(s.w, s.h) < SIZE.collection) warnings.push(`collection/day is ${s.w}×${s.h} (target ${SIZE.collection}²)`);
  }
  if (!findImage(join(dir, 'collection'), 'thumbnail')) warnings.push('no collection/thumbnail (falls back to day)');
  if (heroIds.has(id) && !findImage(join(dir, 'collection'), 'master')) warnings.push('hero spot has no collection/master.png (native resolution)');

  const token = findImage(join(dir, 'world'), 'landmark');
  if (!token) warnings.push('no world/landmark token (map shows generic marker)');
  else {
    if (!existsSync(join(dir, 'world', '.final'))) warnings.push('world token is auto-extracted placeholder');
    const s = imageSize(token);
    if (s && Math.max(s.w, s.h) < SIZE.tokenMin) warnings.push(`world token is ${s.w}×${s.h} (target ≥ ${SIZE.tokenMin})`);
  }

  errorCount += errors.length;
  warnCount += warnings.length;
  if (errors.length || warnings.length) {
    console.log(`\n${id}${heroIds.has(id) ? ' (hero)' : ''}`);
    errors.forEach((e) => console.log(`  ✗ ${e}`));
    warnings.forEach((w) => console.log(`  · ${w}`));
  }
}

const orphanDirs = readdirSync(spotsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !spotIds.includes(d.name))
  .map((d) => d.name);
if (orphanDirs.length) console.log(`\nasset folders without a spot: ${orphanDirs.join(', ')}`);

console.log(`\n${spotIds.length} spots · ${errorCount} errors · ${warnCount} warnings`);
process.exit(errorCount ? 1 : 0);
