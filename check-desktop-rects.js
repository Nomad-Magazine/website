import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:4321/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  const result = await page.evaluate(() => {
    return [...document.querySelectorAll('.directory-collage *')]
      .filter(e => e.matches('.sticker,.badge,.cover,[class*=sticker],[class*=cover],[class*=badge],.magazine-mini,.category-badge'))
      .map(e => {
        const r = e.getBoundingClientRect();
        return [
          e.className,
          Math.round(r.x),
          Math.round(r.y),
          Math.round(r.width),
          Math.round(r.height),
          getComputedStyle(e).display,
          getComputedStyle(e).position
        ];
      });
  });
  
  console.log('\n1440px Desktop Element Rects:');
  console.log(JSON.stringify(result, null, 2));
  
  await browser.close();
})();
