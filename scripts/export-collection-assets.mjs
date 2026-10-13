// Export native generated masters into mobile runtime and grid sizes with macOS sips.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets/spots');
for (const id of readdirSync(root).filter((name) => statSync(join(root, name)).isDirectory())) {
  const collection = join(root, id, 'collection');
  const master = join(collection, 'master.png');
  if (!existsSync(master)) {
    console.log(`${id}: no master yet, skipped`);
    continue;
  }
  for (const [name, size] of [['day', 1024], ['thumbnail', 512]]) {
    execFileSync('sips', ['-Z', String(size), master, '--out', join(collection, `${name}.png`)], { stdio: 'pipe' });
  }
  console.log(`${id}: exported 1024px day and 512px thumbnail`);
}
