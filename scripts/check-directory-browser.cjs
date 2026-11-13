const { chromium } = require('playwright')
const AxeBuilder = require('@axe-core/playwright').default
const assert = require('node:assert/strict')
const base = process.env.DIRECTORY_TEST_URL || 'http://localhost:3000'
;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage()
  const errors = []
  const localOnlyErrors = []
  page.on('pageerror', (e) => {
    if (e.message === '[Cloudflare Turnstile] Error: 110200.' && ['localhost','127.0.0.1'].includes(new URL(base).hostname)) localOnlyErrors.push(e.message)
    else errors.push(e.message)
  })
  await page.goto(base + '/nomad_directory/')
  await page.waitForSelector('#pagination:not(.hidden)')
  const total = await page.locator('[data-entry]').count()
  assert(total >= 234)
  assert.equal(await page.locator('[data-entry]:visible').count(), 20)
  await page.locator('#search-input').fill('Zenvify')
  assert.equal(await page.locator('[data-entry]:visible').count(), 1)
  await page.locator('#search-input').fill('no-match-012345')
  assert.equal(await page.locator('[data-entry]:visible').count(), 0)
  assert(await page.locator('#empty-state').isVisible())
  assert.equal(await page.locator('#stat-showing').textContent(), '0')
  await page.locator('#clear-filters').click()
  assert.equal(await page.locator('[data-entry]:visible').count(), 20)
  await page.locator('#sort-select').selectOption('az')
  const names = await page.locator('[data-entry]:visible').evaluateAll((cards) => cards.map((c) => c.dataset.title))
  assert.deepEqual(
    names,
    [...names].sort((a, b) => a.localeCompare(b)),
  )
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  assert.equal(await page.locator('#pagination [aria-current]').textContent(), '2')
  assert.equal(await page.locator('#pagination [aria-current]').evaluate((el) => el === document.activeElement), true)
  await page.getByRole('button', { name: 'Previous page', exact: true }).click()
  assert.equal(await page.locator('#pagination [aria-current]').textContent(), '1')
  const lastId = await page.locator('[data-entry]').last().getAttribute('id')
  await page.goto(base + `/nomad_directory/#${lastId}`)
  assert(await page.locator(`#${lastId}`).isVisible())
  await page.goto(base + '/nomad_directory/?q=Zenvify')
  assert.equal(await page.locator('[data-entry]:visible').count(), 1)
  assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://nomad-magazine.com/nomad_directory/')
  await page.locator('.cat-btn[data-cat="Coliving"]').click()
  await page.waitForURL(base + '/nomad_directory/coliving/')
  assert(await page.getByRole('heading', { name: 'Coliving for Digital Nomads', exact: true }).isVisible())
  const audits = {}
  for (const route of ['/', '/nomad_directory/', '/nomad_directory/updates/']) {
    await page.goto(base + route)
    await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' })
    await page.evaluate(() => document.fonts.ready)
    audits[route] = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    }))
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(800)
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} overflow at ${width}`)
    }
  }
  await page.goto(base + '/')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('#mobile-menu-button').click()
  assert(await page.locator('#mobile-menu-overlay').isVisible())
  await page.keyboard.press('Escape')
  assert(await page.locator('#mobile-menu-overlay').isHidden())
  assert.equal(await page.locator('#mobile-menu-button').getAttribute('aria-expanded'), 'false')
  assert(await page.locator('#magazine').evaluate((el) => el.getBoundingClientRect().top > innerHeight), 'Magazine is below the fold')
  await page.locator('#home-search').fill('Zenvify')
  await page.locator('.home-search button').click()
  await page.waitForURL(/q=Zenvify/)
  assert.equal(await page.locator('[data-entry]:visible').count(), 1)
  const plain = await browser.newContext({ javaScriptEnabled: false })
  const nojs = await plain.newPage()
  await nojs.goto(base + '/nomad_directory/')
  assert.equal(await nojs.locator('[data-entry]:visible').count(), total)
  assert.equal(await nojs.locator('main').count(), 1)
  if (localOnlyErrors.length) console.log('Existing newsletter Turnstile key rejects localhost (110200); excluded from application exceptions.')
  assert.equal(errors.length, 0, JSON.stringify(errors))
  console.log(JSON.stringify({ audits }, null, 2))
  assert(
    Object.values(audits).every((a) => a.length === 0),
    'Accessibility violations above',
  )
  await browser.close()
  console.log(
    `PASS: ${total} SSR listings without JavaScript; search, reset, sort, pagination/focus, deep links, category links, canonical, responsive layout, mobile menu, retained homepage hero and magazine below the fold.`,
  )
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
