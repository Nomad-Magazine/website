import { chromium } from 'playwright';

async function checkAllCollisions(page, viewportName) {
  const result = await page.evaluate(() => {
    function rectsIntersect(a, b) {
      return !(a.right <= b.left || 
               a.left >= b.right || 
               a.bottom <= b.top || 
               a.top >= b.bottom);
    }
    
    function getElementName(el) {
      if (el.classList.contains('sticker')) {
        return `Sticker "${el.querySelector('span')?.textContent || 'unknown'}"`;
      }
      if (el.classList.contains('category-badge')) {
        return `Badge "${el.textContent.trim()}"`;
      }
      if (el.classList.contains('magazine-mini')) {
        const idx = Array.from(document.querySelectorAll('.magazine-mini')).findIndex(m => m === el);
        return idx === 0 ? 'Palermo cover' : 'Mind Body Tech cover';
      }
      if (el.classList.contains('handwritten')) {
        return 'Heading "The nomad directory"';
      }
      return 'Unknown';
    }
    
    const covers = Array.from(document.querySelectorAll('.magazine-mini')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    const stickers = Array.from(document.querySelectorAll('.sticker')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    const badges = Array.from(document.querySelectorAll('.category-badge')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    const heading = document.querySelector('.handwritten');
    const heroSection = document.querySelector('.editorial-hero');
    
    const issues = [];
    
    // Check sticker-sticker
    for (let i = 0; i < stickers.length; i++) {
      for (let j = i + 1; j < stickers.length; j++) {
        if (rectsIntersect(stickers[i].getBoundingClientRect(), stickers[j].getBoundingClientRect())) {
          issues.push(`${getElementName(stickers[i])} overlaps ${getElementName(stickers[j])}`);
        }
      }
    }
    
    // Check badge-sticker
    badges.forEach(badge => {
      const badgeRect = badge.getBoundingClientRect();
      stickers.forEach(sticker => {
        if (rectsIntersect(badgeRect, sticker.getBoundingClientRect())) {
          issues.push(`${getElementName(badge)} overlaps ${getElementName(sticker)}`);
        }
      });
    });
    
    // Check any-cover
    covers.forEach(cover => {
      const coverRect = cover.getBoundingClientRect();
      stickers.forEach(sticker => {
        if (rectsIntersect(coverRect, sticker.getBoundingClientRect())) {
          issues.push(`${getElementName(sticker)} overlaps ${getElementName(cover)}`);
        }
      });
      badges.forEach(badge => {
        if (rectsIntersect(coverRect, badge.getBoundingClientRect())) {
          issues.push(`${getElementName(badge)} overlaps ${getElementName(cover)}`);
        }
      });
    });
    
    // Check heading
    if (heading) {
      const headingRect = heading.getBoundingClientRect();
      stickers.forEach(sticker => {
        if (rectsIntersect(headingRect, sticker.getBoundingClientRect())) {
          issues.push(`${getElementName(sticker)} overlaps ${getElementName(heading)}`);
        }
      });
      badges.forEach(badge => {
        if (rectsIntersect(headingRect, badge.getBoundingClientRect())) {
          issues.push(`${getElementName(badge)} overlaps ${getElementName(heading)}`);
        }
      });
    }
    
    // Check covers are above hero bottom
    const heroRect = heroSection ? heroSection.getBoundingClientRect() : null;
    let coversClipped = false;
    if (heroRect) {
      covers.forEach(cover => {
        const coverRect = cover.getBoundingClientRect();
        if (coverRect.bottom > heroRect.bottom) {
          issues.push(`${getElementName(cover)} extends below hero section (clipped)`);
          coversClipped = true;
        }
      });
    }
    
    return {
      issues,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      heroHeight: heroRect ? heroRect.height : 0,
      coversClipped
    };
  });
  
  console.log(`\n${viewportName}:`);
  console.log(`  Hero height: ${Math.round(result.heroHeight)}px`);
  console.log(`  ScrollWidth: ${result.scrollWidth} <= InnerWidth: ${result.innerWidth} ${result.scrollWidth <= result.innerWidth ? '✓' : '✗ OVERFLOW'}`);
  
  if (result.issues.length === 0) {
    console.log(`  ✓ ZERO collisions - all elements clear`);
  } else {
    console.log(`  ✗ Found ${result.issues.length} collision(s):`);
    result.issues.forEach(issue => console.log(`    - ${issue}`));
  }
  
  return result;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  const viewports = [
    { width: 1024, height: 768, name: '1024px Tablet' },
    { width: 768, height: 1024, name: '768px Tablet' },
    { width: 390, height: 844, name: '390px Mobile' }
  ];
  
  let allPassed = true;
  
  for (const viewport of viewports) {
    const page = await context.newPage();
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('http://localhost:4321/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    const result = await checkAllCollisions(page, viewport.name);
    
    if (result.issues.length > 0 || result.scrollWidth > result.innerWidth) {
      allPassed = false;
    }
    
    await page.close();
  }
  
  await browser.close();
  
  if (allPassed) {
    console.log('\n✓ All checks passed - ZERO collisions!');
    process.exit(0);
  } else {
    console.log('\n✗ Some checks failed');
    process.exit(1);
  }
})();
