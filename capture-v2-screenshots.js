import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';

async function captureScreenshot(page, width, height, outputPath, fullHero = false, hideTickerBar = false) {
  await page.setViewportSize({ width, height });
  await page.goto('http://localhost:4321/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  if (hideTickerBar) {
    await page.evaluate(() => {
      const ticker = document.querySelector('.article-ticker-bar');
      if (ticker) ticker.style.display = 'none';
    });
    await page.waitForTimeout(500);
  }
  
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
  
  execSync(`ffmpeg -y -i "${pngPath}" -c:v libwebp -lossless 1 "${outputPath}" 2>&1 | tail -n 3`, { stdio: 'inherit' });
  await fs.unlink(pngPath);
  
  console.log(`✓ Captured ${outputPath}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // 1440px desktop
  console.log('\nCapturing 1440px desktop...');
  await captureScreenshot(page, 1440, 900, '/opt/cursor/artifacts/hero-1440-v2.webp', true);
  
  // 1024px tablet
  console.log('\nCapturing 1024px tablet...');
  await captureScreenshot(page, 1024, 768, '/opt/cursor/artifacts/hero-1024-v2.webp', true);
  
  // 390px mobile (hide ticker bar)
  console.log('\nCapturing 390px mobile (hiding ticker)...');
  await captureScreenshot(page, 390, 844, '/opt/cursor/artifacts/hero-390-v2.webp', true, true);
  
  await browser.close();
  console.log('\n✓ All 3 v2 screenshots captured - PLEASE INSPECT THEM');
})();
