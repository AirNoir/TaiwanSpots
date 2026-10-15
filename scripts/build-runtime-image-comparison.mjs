import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const report = JSON.parse(readFileSync(join(root, 'docs/runtime-asset-report.json'), 'utf8'));
const examples = [
  ['taipei-101', 'collection', '台北 101：窗格與建築'],
  ['alishan', 'collection', '阿里山：樹葉與木紋'],
  ['qingshui-cliff', 'collection', '清水斷崖：岩石與海面'],
  ['yehliu', 'world', '野柳圖標：透明邊緣（無損）'],
];
const samples = examples.map(([id, family, label]) => {
  const asset = report.assets.find((row) => row.output.includes(`/${id}/`) && row.family === family);
  if (!asset) throw new Error(`Missing runtime example: ${id} / ${family}`);
  return { ...asset, label };
});
const data = JSON.stringify({ samples, before: report.sourceBytes, after: report.outputBytes, reduction: report.reductionPercent }).replaceAll('<', '\\u003c');
const template = readFileSync(join(root, 'docs/runtime-image-comparison.template.html'), 'utf8');
writeFileSync(join(root, 'docs/runtime-image-comparison.html'), template.replace('__RUNTIME_PROOF_DATA__', data));
console.log('Wrote docs/runtime-image-comparison.html');
