// Captures before/after console auto-claim screenshots. Requires local Supabase with migrations applied.
// PR_NUMBER=52 DIRECTORY_TEST_URL=http://127.0.0.1:4321 node scripts/capture-console-auto-claim.cjs
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('@supabase/supabase-js')

const pr = process.env.PR_NUMBER || 'auto-claim'
const base = process.env.DIRECTORY_TEST_URL || 'http://127.0.0.1:4321'
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Only local test apps are allowed')
const outDir = path.join('pr-assets', `pr-${pr}`)
fs.mkdirSync(outDir, { recursive: true })

const ok = ({ data, error }) => {
  assert.ifError(error)
  return data
}

;(async () => {
  const keys = JSON.parse(fs.readFileSync(process.env.SUPABASE_TEST_CONFIG || '/tmp/local-keys.json', 'utf8'))
  assert(['127.0.0.1', 'localhost'].includes(new URL(keys.API_URL).hostname))
  const make = (key = keys.ANON_KEY) => createClient(keys.API_URL, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const service = make(keys.SERVICE_ROLE_KEY)
  const password = `Local-test-${crypto.randomUUID()}`
  const email = `directory-auto-screenshot-${crypto.randomUUID().slice(0, 8)}@example.test`
  const legacy = `screenshot-auto-${crypto.randomUUID().slice(0, 8)}`
  const payload = {
    title: 'Harbor Desk Coliving',
    description: 'A friendly coliving space for remote workers with quiet desks, weekly community meals and strong Wi‑Fi.',
    category: 'Coliving',
    location: 'Lisbon, Portugal',
    website: 'https://example.com/harbor-desk/',
    special_offer: 'One free community dinner for new guests.',
    image: '',
  }
  const user = ok(await service.auth.admin.createUser({ email, password, email_confirm: true })).user
  ok(await service.from('directory_legacy_claims').upsert({ legacy_id: legacy, contact_email: email, payload, published: true }))
  const link = ok(await service.auth.admin.generateLink({ type: 'magiclink', email }))
  const callback = `/auth/callback/?token_hash=${link.properties.hashed_token}&type=magiclink`

  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const shot = async (file, viewport) => {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    await page.goto(base + callback)
    await page.waitForURL(base + '/console/', { timeout: 60000 })
    await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: path.join(outDir, file), fullPage: true })
    await context.close()
  }

  const beforeLoggedIn = async () => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(base + callback)
    await page.waitForURL(base + '/console/', { timeout: 60000 })
    const cookies = await context.cookies()
    await context.close()
    return cookies
  }

  const cookies = await beforeLoggedIn()
  ok(await service.from('directory_managed_listings').delete().neq('id', '00000000-0000-0000-0000-000000000000'))

  const before = async (file, viewport) => {
    const context = await browser.newContext({ viewport, storageState: { cookies, origins: [] } })
    const page = await context.newPage()
    await page.goto(base + '/console/')
    await page.waitForLoadState('networkidle')
    await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' })
    await page.evaluate(() => document.fonts.ready)
    assert(await page.getByText("Let's get your business listed.").isVisible())
    await page.screenshot({ path: path.join(outDir, file), fullPage: true })
    await context.close()
  }

  await before('before-desktop-1280.png', { width: 1280, height: 900 })
  await before('before-mobile-390.png', { width: 390, height: 844 })
  await shot('after-desktop-1280.png', { width: 1280, height: 900 })
  await shot('after-mobile-390.png', { width: 390, height: 844 })

  ok(await service.from('directory_managed_listings').delete().eq('legacy_id', legacy))
  ok(await service.from('directory_legacy_claims').delete().eq('legacy_id', legacy))
  ok(await service.auth.admin.deleteUser(user.id))
  await browser.close()
  console.log(`Captured console auto-claim screenshots in ${outDir}`)
})().catch((error) => {
  console.error(error)
  process.exit(1)
})