import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';

async function captureScreenshot(page, width, height, outputPath, fullHero = false) {
  await page.setViewportSize({ width, height });
  await page.goto('http://localhost:4321/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  let clip = null;
  if (fullHero) {
    clip = await page.evaluate(() => {
      const hero = document.querySelector('.editorial-hero');
      if (!hero) return null;
      const rect = hero.getBoundingClientRect();
      return {
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: Math.ceil(rect.bottom)
      };
    });
  }
  
  const pngPath = outputPath.replace('.webp', '.png');
  await page.screenshot({ 
    path: pngPath,
    clip: clip,
    fullPage: !clip
  });
  
  execSync(`ffmpeg -y -i "${pngPath}" -c:v libwebp -lossless 1 "${outputPath}"`, { stdio: 'inherit' });
  await fs.unlink(pngPath);
  
  console.log(`✓ Captured ${outputPath}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // 1440px desktop for docs/screenshots/home-after.webp
  await captureScreenshot(page, 1440, 900, '/opt/cursor/artifacts/home-after-1440.webp', true);
  
  // 390px mobile full hero for docs/screenshots/home-mobile-after.webp
  await captureScreenshot(page, 390, 844, '/opt/cursor/artifacts/home-mobile-after-390.webp', true);
  
  // Also capture 1024px for review
  await captureScreenshot(page, 1024, 768, '/opt/cursor/artifacts/hero-1024px.webp', true);
  
  await browser.close();
  console.log('\n✓ All screenshots captured');
})();
