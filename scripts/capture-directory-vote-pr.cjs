// DIRECTORY_TEST_URL=http://localhost:8788 node scripts/capture-directory-vote-pr.cjs
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')

const base = process.env.DIRECTORY_TEST_URL || 'http://localhost:8788'
const outDir = process.env.PR_VOTE_ASSETS_DIR || path.join('/tmp', 'pr-41')
const TURNSTILE_TEST_SITEKEY = '1x00000000000000000000AA'

assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Loopback preview only')

;(async () => {
  await fs.mkdir(outDir, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const page = await context.newPage()
    await page.addInitScript(key => {
      document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-turnstile-sitekey]').forEach(el => { el.dataset.turnstileSitekey = key })
      })
    }, TURNSTILE_TEST_SITEKEY)

    await page.goto(`${base}/nomad_directory/coliving/`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-entry]', { timeout: 20000 })
    await page.waitForSelector('[data-upvote]', { timeout: 20000 })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: path.join(outDir, 'after-coliving-country-pill.png') })

    const upvote = page.locator('[data-upvote]').first()
    await upvote.scrollIntoViewIfNeeded()
    await upvote.click()
    await page.locator('.directory-turnstile-popover.is-open').first().waitFor({ state: 'visible', timeout: 15000 })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: path.join(outDir, 'after-turnstile-visible.png') })

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const mobilePage = await mobile.newPage()
    await mobilePage.addInitScript(key => {
      document.querySelectorAll('[data-turnstile-sitekey]').forEach(el => { el.dataset.turnstileSitekey = key })
    }, TURNSTILE_TEST_SITEKEY)
    await mobilePage.goto(`${base}/nomad_directory/coliving/`, { waitUntil: 'networkidle' })
    const mobileUpvote = mobilePage.locator('[data-upvote]').first()
    await mobileUpvote.scrollIntoViewIfNeeded()
    await mobileUpvote.click()
    await mobilePage.locator('.directory-turnstile-popover.is-open').waitFor({ state: 'visible', timeout: 15000 })
    const fits = await mobilePage.evaluate(() => {
      const panel = document.querySelector('.directory-turnstile-popover.is-open')
      if (!panel) return false
      const r = panel.getBoundingClientRect()
      return r.right <= window.innerWidth && r.left >= 0
    })
    assert.equal(fits, true, 'Turnstile popover must fit inside mobile viewport')
    await mobilePage.screenshot({ path: path.join(outDir, 'after-turnstile-mobile-390.png') })
    await mobile.close()

    await page.goto(`${base}/nomad_directory/`, { waitUntil: 'networkidle' })
    assert.equal(await page.locator('[data-upvote]').count(), 0)
    await page.screenshot({ path: path.join(outDir, 'after-main-no-vote.png') })

    console.log(`Wrote PR vote screenshots to ${outDir}`)
  } finally {
    await browser.close()
  }
})().catch(err => { console.error(err); process.exit(1) })
