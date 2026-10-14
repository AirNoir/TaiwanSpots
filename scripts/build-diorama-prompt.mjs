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
  'Cute Q-proportion premium physical miniature collectible, macro product photography',
  'Common product apparatus reference is Tamsui collection/review-v3.png: match ivory base thickness, rim width, rounded bevels, wide landscape backdrop-card proportions and short clip-post scale, without copying its landscape',
  'Consistent 45-degree downward camera elevation, diagonally above a front corner; two sides of the base clearly visible',
  'Handcrafted collectible miniature',
  'Compact self-contained world',
  'Accurate landmark geometry from real photographic references',
  'Gently rounded Q forms with realistic miniature-scale material surfaces: stone grain, worn paving, glazed tiles, wood grain, restrained glass and metal',
  'Slightly chubby miniature proportions, preserving the landmark silhouette',
  'Soft diffused studio daylight and restrained tilt-shift focus matched to the approved Jiufen review style',
  'Ambient occlusion',
  'Very soft shadows',
  'Clean background',
  'Warm cream palette and ONE shallow square ivory plinth with rounded corners, equal-length sides in world space; not a circle, oval or elongated rectangle',
  'Manufactured base perimeter has FOUR straight sides and FOUR right-angle corners with modest soft corner radius visually matched to Tamsui review-v3 (about 6% of side length), with long straight sides retained; natural shoreline is contained inside, never defines the plinth outline',
  'Camera pulled back: entire square base and all subject tops visible with 10–15% clean outer margin',
  'Foreground and middle-distance objects are tactile physical models, grounded on the same base',
  'Any distant sea, mountains or skyline are printed on one finite thick rounded-corner scenery card held above the rear rim by TWO visible short ivory posts with small brass clips pinching its lower corners',
  'Card bottom is visibly raised above terrain/water: expose its entire unobstructed lower edge, paperboard thickness, clip jaws, cream air gap and cast shadow; posts are only 5–7% of card height and attached to this same base',
  'Physical model water ends inside a visible ivory rear curb, separated from printed distant water by the cream gap; never blend model water seamlessly into the printed card',
  'Standard hardware on every card: two identical short matte ivory cylindrical posts and matching satin brass slim rounded-rectangle spring clips, two vertically aligned circular fasteners and visible jaws gripping the lower edge; never mix clip designs',
  'Card plane is upright perpendicular to the base and parallel to its rear edge: top/bottom card edges and the corresponding opposite front edge of the base share the same perspective vanishing point; no skewed yaw, roll or tilted pasted artwork',
  'Printed water horizon and riverbank datum are level within the card artwork, following the same perspective direction as its long edges; natural mountain contours remain irregular',
  'Card artwork follows real photographed geographic contours; do not bring distant water physically against hilltop buildings',
  'Printed distant scenery has a natural photographic finish with subtle atmospheric depth, not hand-painted mountain ridges or decorative mist stripes',
  'Use a backdrop card only for actual distant landscape in the crop, not as a substitute for the main landmark or nearby physical terrain',
  'Clear hero landmark',
  'Premium collectible feel',
];

// Spec §17: what to get right first.
const PRIORITY = {
  natural: ['terrain silhouette', 'landmark identity', 'geographic relationship', 'vegetation', 'human structures', 'decorative details'],
  urban: ['landmark silhouette', 'surrounding major massing', 'road orientation', 'plaza / public space', 'transport', 'vegetation', 'decorative details'],
};

const list = (items) => items.map((s) => `- ${s}`).join('\n');
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

Use the approved latest Jiufen miniature as a STYLE ONLY reference; use this spot's real photographs for geometry. Never copy another spot's landmarks.
This is a STYLE TRANSFORMATION ONLY of a real place. Do not redesign the place.

ART DIRECTION
${list(MASTER_ART_DIRECTION)}

HERO (must be recognisable at 512px without text)
${bp.hero.name}: ${bp.hero.silhouette}
Hero scale: keep the real landmark silhouette, with gentle toy-like proportions and coherent miniature scale.

CROP (one representative slice, not the whole area)
${bp.crop}
${bp.orientation ? `\nORIENTATION (verify markers remain unresolved unless backed by real references)\n${bp.orientation}\n` : ''}
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
Square PNG at native generator resolution (at least 1024²). Entire physical miniature on a square rounded-corner ivory base; 45-degree diagonal elevated camera; plain cream studio background. Realistic materials but unmistakably cute scale-model proportions. No hand-painted brushwork, rough blocks, crystal globe, support pillar, captions or watermarks. No map UI copied into output. Preserve slope direction and recognizable landmark silhouette; uncertain details are simplified, never invented.`;
}

console.log(prompt);
if (bp.status === 'draft') {
  console.error(`\n⚠ ${id} blueprint is still "draft" — collect references and verify it before generating.`);
}
if (!refs) console.error(`⚠ ${id} has no references listed — attach reference images manually.`);
