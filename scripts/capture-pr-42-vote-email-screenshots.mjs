// PR_PREVIEW_URL=http://127.0.0.1:4321 node scripts/capture-pr-42-vote-email-screenshots.mjs
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const base = process.env.PR_PREVIEW_URL || 'http://127.0.0.1:4321'
const outDir = process.env.PR_SCREENSHOT_DIR || '/opt/cursor/artifacts/pr-42'
const category = `${base}/nomad_directory/coliving/`
const OLD_EMAIL_ERROR = 'That email is already used by another account. Sign in with that email instead.'

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.route('**/challenges.cloudflare.com/**', route => route.abort())

async function hideToolbar() {
  await page.addStyleTag({ content: 'body::before{display:none!important} astro-dev-toolbar,.astro-dev-toolbar{display:none!important}' })
}

async function labelMock(text) {
  await page.evaluate(t => {
    let el = document.getElementById('pr-screenshot-mock-label')
    if (!el) {
      el = document.createElement('p')
      el.id = 'pr-screenshot-mock-label'
      el.style.cssText = 'position:fixed;top:8px;left:8px;z-index:99999;background:#111827;color:#fbbf24;font:12px system-ui;padding:6px 10px;border-radius:8px;border:1px solid #fbbf24aa'
      document.body.appendChild(el)
    }
    el.textContent = t
  }, text)
}

async function mockVoteApis({ emailPost }) {
  await page.unroute('**/api/directory-votes/')
  await page.unroute('**/api/directory-vote-email/')
  await page.route('**/api/directory-votes/', async route => {
    const method = route.request().method()
    if (method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ vote_verified: true, votes: ['1', '2', '3', '4', '5'] }),
      })
    }
    if (method === 'POST') {
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'email_required' }),
      })
    }
    return route.continue()
  })
  await page.route('**/api/directory-vote-email/', route => route.fulfill({
    ...emailPost,
    contentType: 'application/json',
  }))
}

let activeListingId = ''

async function openEmailPopover() {
  await page.waitForFunction(() => Boolean(document.querySelector('[data-upvote][role="button"]')), { timeout: 30000 })
  const upvote = page.locator('[data-upvote]').first()
  activeListingId = (await upvote.getAttribute('data-upvote')) ?? ''
  await upvote.scrollIntoViewIfNeeded()
  await upvote.click()
  await page.waitForFunction(() => {
    const panel = document.querySelector('[data-turnstile-panel].is-open [data-vote-email-step]')
    return panel && !panel.hasAttribute('hidden')
  }, { timeout: 20000 })
}

function activePanel() {
  return page.locator(`[data-turnstile-panel="${activeListingId}"].is-open`)
}

async function capture(name, viewport) {
  await page.setViewportSize(viewport)
  await page.evaluate(() => window.scrollTo(0, 0))
  await hideToolbar()
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(outDir, `${name}.webp`), type: 'webp', fullPage: true })
}

await mockVoteApis({ emailPost: { status: 409, body: JSON.stringify({ error: 'email_taken' }) } })
await page.goto(category, { waitUntil: 'networkidle' })
await openEmailPopover()
await activePanel().locator('[data-vote-email-form] input[name="email"]').fill('existing@example.test')
await activePanel().locator('[data-vote-email-form]').evaluate(form => form.requestSubmit())
await page.waitForTimeout(300)
await activePanel().locator('[data-vote-email-error]').evaluate((el, msg) => {
  el.textContent = msg
  el.classList.remove('hidden')
}, OLD_EMAIL_ERROR)
await labelMock('Mocked API — main branch 409 / email_taken copy')
await capture('before-email-taken-1440', { width: 1440, height: 900 })

await mockVoteApis({ emailPost: { status: 200, body: JSON.stringify({ ok: true }) } })
await page.goto(category, { waitUntil: 'networkidle' })
await openEmailPopover()
await activePanel().locator('[data-vote-email-form] input[name="email"]').fill('existing@example.test')
await activePanel().locator('[data-vote-email-form]').evaluate(form => form.requestSubmit())
await activePanel().locator('[data-vote-email-sent-step]').waitFor({ state: 'visible', timeout: 10000 })
await labelMock('Mocked API — existing email returns { ok: true }')
await capture('after-inbox-1440', { width: 1440, height: 900 })

await mockVoteApis({ emailPost: { status: 200, body: JSON.stringify({ ok: true }) } })
await page.goto(category, { waitUntil: 'networkidle' })
await openEmailPopover()
await activePanel().locator('[data-vote-email-form] input[name="email"]').fill('existing@example.test')
await activePanel().locator('[data-vote-email-form]').evaluate(form => form.requestSubmit())
await activePanel().locator('[data-vote-email-sent-step]').waitFor({ state: 'visible', timeout: 10000 })
await labelMock('Mocked API — existing email returns { ok: true }')
await capture('after-inbox-390', { width: 390, height: 844 })

await page.goto(`${category}?vote_email_notice=merged&vote_merge_count=3`, { waitUntil: 'networkidle' })
await labelMock('Live preview — merged notice query params')
await capture('after-merge-notice-390', { width: 390, height: 844 })

await page.goto(`${category}?vote_email_notice=cross_device`, { waitUntil: 'networkidle' })
await labelMock('Live preview — cross-device notice query params')
await capture('after-cross-device-390', { width: 390, height: 844 })

await browser.close()
console.log('Wrote screenshots to', outDir)