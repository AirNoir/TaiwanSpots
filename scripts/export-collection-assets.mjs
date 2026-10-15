// Encode runtime derivatives; keep source PNGs and pending review art untouched.
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = join(dirname(fileURLToPath(import.meta.url)), 'export-runtime-assets.py');
execFileSync(process.env.ISLANDIA_PYTHON || 'python3', [script, ...process.argv.slice(2)], { stdio: 'inherit' });
