import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  // Desktop 1440px - current PR #18 hero
  const desktopPage = await context.newPage();
  await desktopPage.setViewportSize({ width: 1440, height: 900 });
  await desktopPage.goto('http://localhost:4321/', { waitUntil: 'load', timeout: 60000 });
  await desktopPage.waitForTimeout(3000);
  await desktopPage.screenshot({ path: '/opt/cursor/artifacts/pr18-hero-desktop-1440px.png', fullPage: false });
  await desktopPage.close();
  
  // Mobile 390px - current PR #18 hero
  const mobilePage = await context.newPage();
  await mobilePage.setViewportSize({ width: 390, height: 844 });
  await mobilePage.goto('http://localhost:4321/', { waitUntil: 'load', timeout: 60000 });
  await mobilePage.waitForTimeout(3000);
  await mobilePage.screenshot({ path: '/opt/cursor/artifacts/pr18-hero-mobile-390px.png', fullPage: false });
  await mobilePage.close();
  
  await browser.close();
  console.log('Screenshots captured for PR #18 (current)');
})();
