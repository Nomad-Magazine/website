import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:4321/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  const sizes = await page.evaluate(() => {
    const stickers = Array.from(document.querySelectorAll('.sticker')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    
    return stickers.map(s => {
      const rect = s.getBoundingClientRect();
      return {
        name: s.querySelector('span')?.textContent || 'unknown',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        x: Math.round(rect.left),
        y: Math.round(rect.top)
      };
    });
  });
  
  console.log('390px sticker sizes:');
  sizes.forEach(s => console.log(`  ${s.name}: ${s.width}x${s.height} at (${s.x}, ${s.y})`));
  
  await browser.close();
})();
