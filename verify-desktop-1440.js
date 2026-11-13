import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:4321/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  
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
    
    const issues = [];
    
    // Check all pairs
    for (let i = 0; i < stickers.length; i++) {
      for (let j = i + 1; j < stickers.length; j++) {
        if (rectsIntersect(stickers[i].getBoundingClientRect(), stickers[j].getBoundingClientRect())) {
          issues.push(`${getElementName(stickers[i])} overlaps ${getElementName(stickers[j])}`);
        }
      }
    }
    
    badges.forEach(badge => {
      const badgeRect = badge.getBoundingClientRect();
      stickers.forEach(sticker => {
        if (rectsIntersect(badgeRect, sticker.getBoundingClientRect())) {
          issues.push(`${getElementName(badge)} overlaps ${getElementName(sticker)}`);
        }
      });
    });
    
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
    
    return {
      issues,
      stickerCount: stickers.length,
      badgeCount: badges.length,
      coverCount: covers.length,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth
    };
  });
  
  console.log(`\n1440px Desktop:`);
  console.log(`  Stickers: ${result.stickerCount}, Badges: ${result.badgeCount}, Covers: ${result.coverCount}`);
  console.log(`  ScrollWidth: ${result.scrollWidth} <= InnerWidth: ${result.innerWidth} ${result.scrollWidth <= result.innerWidth ? '✓' : '✗ OVERFLOW'}`);
  
  if (result.issues.length === 0) {
    console.log(`  ✓ ZERO collisions - all elements clear`);
  } else {
    console.log(`  ✗ Found ${result.issues.length} collision(s):`);
    result.issues.forEach(issue => console.log(`    - ${issue}`));
  }
  
  await browser.close();
  
  if (result.issues.length === 0 && result.stickerCount === 10 && result.badgeCount === 3 && result.coverCount === 2) {
    console.log('\n✓ Desktop layout perfect: 10 stickers, 3 badges, 2 covers, zero collisions!');
    process.exit(0);
  } else {
    console.log('\n✗ Desktop layout issues detected');
    process.exit(1);
  }
})();
