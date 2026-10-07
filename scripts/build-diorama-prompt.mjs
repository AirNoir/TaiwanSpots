#!/usr/bin/env node
// Builds the generation prompt for a spot from its Scene Blueprint plus the
// locked Master Art Direction (visual spec v0.2 §2, §5, §15). Always attach
// MASTER_STYLE_REFERENCE.png and the spot's reference/ images alongside it —
// the text alone is not enough for consistency.
// Usage: npm run assets:prompt -- <spot-id> [--token]
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [id, flag] = process.argv.slice(2);
if (!id) {
  console.error('usage: build-diorama-prompt.mjs <spot-id> [--token]');
  process.exit(1);
}
const bp = JSON.parse(readFileSync(join(root, 'assets/spots', id, 'blueprint.json'), 'utf8'));

const MASTER_ART_DIRECTION = [
  'Cute premium handcrafted resin / clay collectible diorama',
  '35–45 degree elevated camera',
  'Handcrafted collectible miniature',
  'Compact self-contained world',
  'Accurate landmark geometry from real photographic references',
  'Smooth matte materials with gently rounded details and simplified textures',
  'Slightly chubby miniature proportions, preserving the landmark silhouette',
  'Soft diffused studio lighting matched to the approved cute Taipei 101 reference',
  'Ambient occlusion',
  'Very soft shadows',
  'Clean background',
  'Warm cream pastel palette and rounded ivory display plinth, 8% outer margin',
  'Clear hero landmark',
  'Premium collectible feel',
];

// Spec §17: what to get right first.
const PRIORITY = {
  natural: ['terrain silhouette', 'landmark identity', 'geographic relationship', 'vegetation', 'human structures', 'decorative details'],
  urban: ['landmark silhouette', 'surrounding major massing', 'road orientation', 'plaza / public space', 'transport', 'vegetation', 'decorative details'],
};

const list = (items) => items.map((s) => `- ${s.replace(/^verify:\s*/i, '')}`).join('\n');
const refs = Object.entries(bp.references)
  .flatMap(([kind, files]) => files.map((f) => `${kind}: ${f}`))
  .join(', ');

let prompt;
if (flag === '--token') {
  prompt = `WORLD TOKEN for "${bp.hero.name}" (${id})

Extract ONLY this element from the approved collection diorama: ${bp.worldToken.element}.
Same camera, lighting and materials as the diorama. Transparent background.
Simpler and more iconic than the diorama; must read at 48px on a map.
${bp.worldToken.notes ? `Notes: ${bp.worldToken.notes}\n` : ''}
Identity to keep:
${list(bp.lockedIdentity)}

Output: 1024×1024 transparent PNG, subject centred, base at the bottom.`;
} else {
  prompt = `COLLECTION DIORAMA — ${bp.hero.name} (${id})

Transform the attached real-world references into the attached MASTER STYLE REFERENCE.
This is a STYLE TRANSFORMATION ONLY of a real place. Do not redesign the place.

ART DIRECTION
${list(MASTER_ART_DIRECTION)}

HERO (must be recognisable at 512px without text)
${bp.hero.name}: ${bp.hero.silhouette}
Hero scale: keep the real landmark silhouette, with gentle toy-like proportions and coherent miniature scale.

CROP (one representative slice, not the whole area)
${bp.crop}
${bp.orientation ? `\nORIENTATION\n${bp.orientation.replace(/^verify:\s*/i, '')}\n` : ''}
LOCKED GEOMETRY — keep exactly as in the references
${list(bp.lockedGeometry)}

LOCKED IDENTITY
${list(bp.lockedIdentity)}

PRIORITY ORDER
${PRIORITY[bp.spotType].map((p, i) => `${i + 1}. ${p}`).join('\n')}

DO NOT INVENT
${list(bp.doNotInvent)}
${bp.allowedMiniatureDetails?.length ? `\nALLOWED MINIATURE DETAILS\n${list(bp.allowedMiniatureDetails)}\n` : ''}
OUTPUT
Square PNG master at the generator native resolution (at least 1024²), full scene on a shallow rounded ivory display base, plain warm-neutral background. Cute and polished, no photorealism, gritty textures, rough blocks, captions or watermarks.`;
}

console.log(prompt);
if (bp.status === 'draft') {
  console.error(`\n⚠ ${id} blueprint is still "draft" — collect references and verify it before generating.`);
}
if (!refs) console.error(`⚠ ${id} has no references listed — attach reference images manually.`);
