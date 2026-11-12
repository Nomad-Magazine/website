const { chromium } = require('playwright')
const baseUrl = process.env.DIRECTORY_TEST_URL || 'http://localhost:3000'
const AxeBuilder = require('@axe-core/playwright').default
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${baseUrl}/nomad_directory/`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#directory-search:not([hidden])')
  assert.equal(await page.locator('[data-entry]').count(), 234)
  assert.equal(await page.locator('[data-entry]:visible').count(), 24)
  await page.locator('#search-input').fill('Zenvify')
  assert.equal(await page.locator('[data-entry]:visible').count(), 1)
  await page.locator('#search-input').fill('no-matching-listing-012345')
  assert.equal(await page.locator('[data-entry]:visible').count(), 0)
  assert(await page.locator('#no-results').isVisible())
  await page.locator('#clear-filters').click()
  assert.equal(await page.locator('[data-entry]:visible').count(), 24)
  await page.locator('#category-select').selectOption('Coliving')
  assert.match(await page.locator('#result-count').textContent(), /^32 listings/)
  assert(await page.locator('[data-entry]:visible').evaluateAll((cards) => cards.every((card) => card.dataset.category === 'Coliving')))
  await page.locator('#sort-select').selectOption('az')
  const names = await page.locator('[data-entry]:visible').evaluateAll((cards) => cards.map((card) => card.dataset.title))
  assert.deepEqual(
    names,
    [...names].sort((a, b) => a.localeCompare(b)),
  )
  await page.locator('#clear-filters').click()
  await page.locator('#next-page').click()
  assert.match(await page.locator('#page-number').textContent(), /Page 2/)
  assert.equal(await page.evaluate(() => document.activeElement.id), 'browse-heading')
  await page.locator('#previous-page').click()
  assert.match(await page.locator('#page-number').textContent(), /Page 1/)
  await page.goto(`${baseUrl}/nomad_directory/?category=eSim`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#directory-search:not([hidden])')
  assert.equal(await page.locator('[data-entry]:visible').count(), 11)
  assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://nomad-magazine.com/nomad_directory/')
  const lastId = await page.locator('[data-entry]').last().getAttribute('id')
  await page.goto(`${baseUrl}/nomad_directory/#${lastId}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#directory-search:not([hidden])')
  assert(await page.locator(`#${lastId}`).isVisible())
  const a11y = {}
  for (const route of ['/', '/nomad_directory/']) {
    await page.goto(baseUrl + route, { waitUntil: 'domcontentloaded' })
    await page.addStyleTag({ content: 'astro-dev-toolbar {display:none!important}' })
    a11y[route] = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    }))
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} overflow at ${width}`)
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' })
  await page.locator('.mobile-nav summary').click()
  assert(await page.locator('.mobile-nav nav').isVisible())
  await page.keyboard.press('Escape')
  assert(!(await page.locator('.mobile-nav').getAttribute('open')))
  await page.locator('#home-search').fill('Zenvify')
  await page.locator('.home-search button').click()
  await page.waitForSelector('#directory-search:not([hidden])')
  assert.equal(await page.locator('[data-entry]:visible').count(), 1)
  const nojs = await browser.newContext({ javaScriptEnabled: false })
  const plain = await nojs.newPage()
  await plain.goto(`${baseUrl}/nomad_directory/`, { waitUntil: 'domcontentloaded' })
  assert.equal(await plain.locator('[data-entry]:visible').count(), 234)
  assert.equal(await plain.locator('main').count(), 1)
  assert.equal(errors.length, 0, 'No browser exceptions')
  assert(
    Object.values(a11y).every((violations) => violations.length === 0),
    JSON.stringify(a11y),
  )
  console.log(
    JSON.stringify(
      {
        result: 'PASS',
        checks:
          'search, empty state, reset, category, sorting, pagination, focus, deep links, canonical, responsive overflow, mobile menu, homepage search, all 234 listings without JS',
        errors,
        a11y,
      },
      null,
      2,
    ),
  )
  await browser.close()
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
