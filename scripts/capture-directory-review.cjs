// Capture implemented screens against the isolated local fixtures, without changing listings or awards.
// NODE_PATH=/tmp/nomad-browser/node_modules SUPABASE_TEST_CONFIG=/tmp/nomad-owner-secrets.json node scripts/capture-directory-review.cjs
const { chromium } = require('playwright')
const { createClient } = require('@supabase/supabase-js')
const sharp = require('sharp')
const fs = require('node:fs/promises')
const assert = require('node:assert/strict')
const base = process.env.DIRECTORY_TEST_URL || 'http://localhost:3000'
const local = url => assert(['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'Local fixtures only')
;(async () => {
  local(base)
  const keys = JSON.parse(await fs.readFile(process.env.SUPABASE_TEST_CONFIG, 'utf8'))
  local(keys.API_URL)
  const fixture = JSON.parse(await fs.readFile('/tmp/nomad-owner-fixtures.json', 'utf8'))
  const awardFixture = JSON.parse(await fs.readFile('/tmp/nomad-award-fixtures.json', 'utf8'))
  const admin = createClient(keys.API_URL, keys.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const desktop = { width: 1440, height: 1000 }, mobile = { width: 390, height: 844 }
  const names = []
  try {
    const context = await browser.newContext({ viewport: desktop })
    const page = await context.newPage()
    const visit = async (page, route) => {
      const response = await page.goto(base + route)
      assert.equal(response.status(), 200, route)
      await page.evaluate(() => document.fonts.ready)
    }
    const shot = async (page, name, fullPage = false) => {
      await page.evaluate(async () => {
        await document.fonts.ready
        await Promise.all([...document.images].filter(img => {
          const rect = img.getBoundingClientRect()
          return rect.width && rect.height && rect.top < innerHeight && rect.bottom > 0
        }).map(img => {
          img.loading = 'eager'
          return Promise.race([img.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 5000))])
        }))
      })
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: overflow`)
      await sharp(await page.screenshot({ fullPage, animations: 'disabled' })).webp({ quality: 88 }).toFile(`docs/screenshots/${name}.webp`)
      names.push(name)
      console.log(`Captured ${name}`)
    }
    const login = async (page, email, next = '/console/') => {
      assert(email.endsWith('@example.test'), 'Only fictional local fixture accounts')
      const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
      assert.ifError(error)
      await page.goto(`${base}/auth/callback/?${new URLSearchParams({ token_hash: data.properties.hashed_token, type: 'magiclink', next })}`)
      await page.waitForURL(base + next)
    }
    for (const [route, name] of [['/', 'home'], ['/nomad_directory/', 'directory']]) {
      await page.setViewportSize(desktop)
      await visit(page, route)
      if (name === 'directory') await page.waitForSelector('#pagination:not(.hidden)')
      await shot(page, `${name}-after`)
      await page.setViewportSize(mobile)
      await shot(page, `${name}-mobile-after`)
    }
    await page.setViewportSize(desktop)
    await visit(page, '/')
    await page.locator('#magazine').scrollIntoViewIfNeeded()
    await shot(page, 'home-magazine-after')
    await visit(page, '/nomad-directory-edit/')
    await shot(page, 'owner-login')
    await visit(page, '/nomad_directory/updates/')
    await shot(page, 'public-updates')
    for (const kind of ['day', 'week', 'month', 'year']) {
      await visit(page, `/nomad_directory/awards/?period=${kind}`)
      assert(await page.getByRole('heading', { name: 'Nomad Grove', exact: true }).first().isVisible())
      await shot(page, kind === 'day' ? 'awards-winners' : `awards-${kind}`)
    }
    await visit(page, '/nomad_directory/awards/')
    await page.getByRole('heading', { name: 'In the running', exact: true }).scrollIntoViewIfNeeded()
    await shot(page, 'awards-standings')
    await page.setViewportSize(mobile)
    await visit(page, '/nomad_directory/awards/')
    await shot(page, 'awards-winners-mobile')
    await page.setViewportSize(desktop)
    const { data: awards, error } = await admin.rpc('directory_public_awards', { p_listing_id: awardFixture.grove, p_limit: 100 })
    assert.ifError(error)
    const award = awards.find(a => a.kind === 'month')
    assert(award)
    await visit(page, `/nomad_directory/awards/${award.id}/`)
    await page.locator('main').scrollIntoViewIfNeeded()
    await shot(page, 'awards-result')
    const embed = (await page.locator('textarea').inputValue()).replaceAll('https://nomad-magazine.com', base)
    const sample = await context.newPage()
    await sample.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Badge embed example</title><style>body{margin:0;background:#f5f3ee;color:#202820;font:20px system-ui}main{max-width:920px;margin:100px auto;padding:64px;background:white;border-radius:20px}small{color:#626c62}h1{font-size:48px;letter-spacing:-2px}p{line-height:1.6}section{margin-top:48px;padding-top:32px;border-top:1px solid #ddd}</style><main><small>FICTIONAL BUSINESS WEBSITE · LOCAL EMBED DEMONSTRATION</small><h1>Nomad Grove</h1><p>A community-led home for remote workers.</p><section><p>Recognized by the Nomad Directory community</p>${embed}<p><small>The copied badge links to the official award verification page.</small></p></section></main></html>`)
    await sample.locator('img').evaluate(img => img.decode())
    await shot(sample, 'awards-website-embed')
    const [verification] = await Promise.all([context.waitForEvent('page'), sample.locator('a').click()])
    await verification.waitForURL(`${base}/nomad_directory/awards/${award.id}/`)
    await verification.close(); await sample.close()
    await visit(page, `/nomad_directory/awards/${awardFixture.revoked}/`)
    await shot(page, 'awards-withdrawn')
    await login(page, fixture.accounts.owner.email)
    for (const [route, name] of [
      ['/console/', 'owner-dashboard'],
      [`/console/directory-submission/?id=${fixture.listingId}`, 'owner-listing'],
      ['/console/updates/', 'owner-updates'],
      [`/console/affiliates/?id=${fixture.affiliateId}`, 'owner-affiliates'],
    ]) {
      await visit(page, route); await shot(page, name, true)
      if (name === 'owner-dashboard' || name === 'owner-affiliates') {
        await page.setViewportSize(mobile); await shot(page, `${name}-mobile`, true); await page.setViewportSize(desktop)
      }
    }
    await visit(page, `/nomad_directory/vote/?listing=${awardFixture.grove}`)
    assert(await page.getByRole('button', { name: 'Confirm upvote', exact: true }).isVisible())
    await shot(page, 'votes-confirm')
    const awardContext = await browser.newContext({ viewport: desktop })
    const ownerPage = await awardContext.newPage()
    await login(ownerPage, 'awards-owner@example.test', '/console/badges/')
    await shot(ownerPage, 'awards-owner')
    await ownerPage.setViewportSize(mobile); await shot(ownerPage, 'awards-owner-mobile')
    const reviewerContext = await browser.newContext({ viewport: desktop })
    const review = await reviewerContext.newPage()
    await login(review, fixture.accounts.reviewer.email)
    await visit(review, '/console/admin/directory/'); await shot(review, 'owner-review', true)
    await visit(review, '/console/admin/awards/'); await shot(review, 'awards-review')
    console.log(`Captured ${names.length} real browser screenshots: ${names.join(', ')}. Verified the embedded badge opens its official result. No listing, vote or award data changed.`)
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exit(1) })
