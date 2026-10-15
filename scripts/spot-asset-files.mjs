import { existsSync, readdirSync } from 'node:fs';

// Registry and validation must inspect the same preferred runtime file.
export const RUNTIME_EXTENSIONS = ['webp', 'avif', 'png', 'jpg', 'jpeg'];

export function pickRuntimeImage(dir, base) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir);
  for (const extension of RUNTIME_EXTENSIONS) {
    const hit = files.find((file) => file.toLowerCase() === `${base}.${extension}`);
    if (hit) return hit;
  }
  return null;
}
