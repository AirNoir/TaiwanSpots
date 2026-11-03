// node render.mjs jobs.json   job: {html, params, out, W, H}
import { chromium } from 'playwright-core';
import { readFileSync } from 'fs';
const jobs = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const b = await chromium.launch({ channel: 'chrome' });
for (const j of jobs) {
  const p = await b.newPage({ viewport: { width: j.W, height: j.H }, deviceScaleFactor: 1 });
  await p.goto('file://' + j.html + '#' + encodeURIComponent(JSON.stringify({ W: j.W, H: j.H, ...j.params })));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth));
  await p.waitForTimeout(300);
  await p.screenshot({ path: j.out, ...(j.out.endsWith('.png') ? { type: 'png' } : { type: 'jpeg', quality: 92 }) });
  await p.close(); console.log('ok', j.out);
}
await b.close();
