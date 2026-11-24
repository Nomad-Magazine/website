import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const outDir = '/opt/cursor/artifacts/calendly-removal';
await mkdir(outDir, { recursive: true });

const targets = [
  {
    label: 'homepage-get-involved',
    before: 'https://nomad-magazine.com/#Involved',
    after: 'http://127.0.0.1:4322/#Involved',
  },
  {
    label: 'partnerships-cta',
    before: 'https://nomad-magazine.com/partnerships/',
    after: 'http://127.0.0.1:4322/partnerships/',
  },
  {
    label: 'office-hours-cta',
    before: 'https://nomad-magazine.com/office-hours/',
    after: 'http://127.0.0.1:4322/office-hours/',
  },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const t of targets) {
  for (const phase of ['before', 'after']) {
    const url = t[phase];
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(1500);
    if (t.label === 'homepage-get-involved') {
      await page.locator('#Involved').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.locator('#Involved').screenshot({
        path: `${outDir}/${t.label}-${phase}.png`,
      });
    } else if (t.label === 'partnerships-cta') {
      await page.getByRole('heading', { name: /Partner with Nomad Magazine/i }).scrollIntoViewIfNeeded();
      await page.locator('text=Distribution Partner').first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${outDir}/${t.label}-${phase}.png`,
        clip: { x: 0, y: 200, width: 1440, height: 700 },
      });
    } else {
      await page.locator('text=Flexible Participation').first().scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${outDir}/${t.label}-${phase}.png`,
        clip: { x: 0, y: 350, width: 1440, height: 550 },
      });
    }
  }
}

await browser.close();
console.log('Saved screenshots to', outDir);