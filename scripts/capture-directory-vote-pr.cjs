// DIRECTORY_VOTE_PR_DIR=/tmp/directory-vote-pr node scripts/capture-directory-vote-pr.cjs
const { chromium } = require('playwright')
const fs = require('node:fs/promises')
const path = require('node:path')
const base = process.env.DIRECTORY_VOTE_BASE || 'https://nomad-magazine.com'
const out = process.env.DIRECTORY_VOTE_PR_DIR || '/tmp/directory-vote-pr'

;(async () => {
  await fs.mkdir(out, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  try {
    await page.goto(`${base}/nomad_directory/coliving/`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: path.join(out, `${process.env.DIRECTORY_VOTE_PHASE || 'after'}-coliving.png`), fullPage: false })

    const colivingVotes = await page.locator('[data-upvote]').count()
    const voteButton = page.locator('[data-upvote]').first()
    if (colivingVotes) {
      await voteButton.scrollIntoViewIfNeeded()
      await voteButton.screenshot({ path: path.join(out, `${process.env.DIRECTORY_VOTE_PHASE || 'after'}-vote-control.png`) })
    }

    await page.goto(`${base}/nomad_directory/`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: path.join(out, `${process.env.DIRECTORY_VOTE_PHASE || 'after'}-main-no-vote.png`), fullPage: false })
    const mainVotes = await page.locator('[data-upvote]').count()
    console.log(JSON.stringify({ base, out, mainVotes, colivingVotes }))
  } finally {
    await browser.close()
  }
})().catch(err => { console.error(err); process.exit(1) })