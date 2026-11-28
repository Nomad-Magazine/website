#!/usr/bin/env node
/**
 * Production-build screenshots for PR #59: astro build + preview, mock Supabase, no dev toolbar.
 * Usage: node scripts/capture-partnership-pr-59.mjs
 */
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { spawn, execFileSync } from 'node:child_process'
import { readFile, writeFile, unlink, mkdir, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const devVars = path.join(root, '.dev.vars')
const cardPath = path.join(root, 'src/components/DirectoryEntryCard.astro')
const outDir = path.join(root, 'pr-assets/pr-59')
const base = 'http://127.0.0.1:4321'
const listingId = '655f34669bac86d0f943d777'
const listingUuid = '10000000-0000-4000-8000-000000000001'
const OWNER = '00000000-0000-4000-8000-000000000001'
const ANON = 'local-test-public-key'

const publishedPayload = {
  title: 'Harbor Coliving Lisboa',
  description: 'Bright rooms and shared workspace for remote workers exploring Portugal.',
  website: 'https://example.com/harbor-coliving/',
  category: 'Coliving',
  location: 'Lisboa, Portugal',
  special_offer: '10% off the first month',
  partner_offer_title: 'Nomad welcome rate',
  partner_offer_description: 'Partners earn referral credit on every booking.',
  partner_offer_url: 'https://example.com/harbor-partner/',
  partner_offer_code: 'HARBOR10',
  image: '/images/directory-logos/655f34669bac86d0f943d777.webp',
}

const fixtureListing = {
  id: listingUuid,
  owner_id: OWNER,
  legacy_id: listingId,
  draft: publishedPayload,
  published: publishedPayload,
  status: 'approved',
  review_notes: '',
  version: 3,
  updated_at: '2026-11-20T10:00:00Z',
  created_at: '2026-10-01T10:00:00Z',
}

const fixturePosts = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    owner_id: OWNER,
    listing_id: listingUuid,
    kind: 'update',
    draft: { title: 'Winter rooftop dinners', body: 'Join weekly dinners.', url: 'https://example.com/events/' },
    published: { title: 'Autumn open mic nights', body: 'Live music every Thursday.', url: 'https://example.com/music/' },
    status: 'approved',
    review_notes: '',
    version: 2,
    updated_at: '2026-11-10T10:00:00Z',
    created_at: '2026-10-15T10:00:00Z',
  },
]

const fixtureUser = {
  id: OWNER,
  email: 'owner@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  created_at: new Date().toISOString(),
}

const TURNSTILE_CAPTURE_SITEKEY = '1x00000000000000000000AA'

function sessionToken() {
  const now = Math.floor(Date.now() / 1000)
  return [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: OWNER, aud: 'authenticated', role: 'authenticated', iat: now, exp: now + 7200 })).toString('base64url'),
    Buffer.from('local-fixture-signature').toString('base64url'),
  ].join('.')
}

function filterRows(rows, search) {
  for (const [key, op] of search) {
    if (key === 'order') continue
    if (key === 'select') continue
    const m = op.match(/^eq\.(.+)$/)
    if (m) return rows.filter((row) => String(row[key]) === m[1])
  }
  return rows
}

let mockIsAdmin = false
let partnershipExtras = false

function createMock() {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    res.setHeader('Content-Type', 'application/json')
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }
    if (url.pathname === '/auth/v1/otp') {
      res.end('{}')
      return
    }
    if (url.pathname === '/auth/v1/token') {
      const token = sessionToken()
      res.end(
        JSON.stringify({
          access_token: token,
          refresh_token: 'local-refresh',
          expires_in: 7200,
          token_type: 'bearer',
          user: fixtureUser,
        }),
      )
      return
    }
    if (url.pathname === '/auth/v1/user') {
      res.end(JSON.stringify(fixtureUser))
      return
    }
    if (url.pathname === '/rest/v1/directory_managed_listings') {
      const rows = filterRows([fixtureListing], url.searchParams)
      res.end(JSON.stringify(rows))
      return
    }
    if (url.pathname === '/rest/v1/directory_owner_posts') {
      const rows = filterRows(fixturePosts, url.searchParams)
      res.end(JSON.stringify(rows))
      return
    }
    if (url.pathname === '/rest/v1/rpc/directory_is_admin') {
      res.end(mockIsAdmin ? 'true' : 'false')
      return
    }
    if (url.pathname === '/rest/v1/rpc/directory_public_listings') {
      res.end(JSON.stringify(partnershipExtras ? [{ id: listingId, payload: publishedPayload }] : []))
      return
    }
    if (partnershipExtras && url.pathname === '/rest/v1/rpc/directory_owner_partnership_requests') {
      res.end(JSON.stringify([
        {
          id: '30000000-0000-4000-8000-000000000001',
          listing_id: listingUuid,
          public_listing_id: listingId,
          listing_title: publishedPayload.title,
          requester_name: 'Maya Chen',
          requester_email: 'maya@example.com',
          requester_company: 'Remote Weekends',
          message: 'We run coliving retreats and would love to cross-promote.',
          status: 'new',
          owner_reply: '',
          read_at: null,
          created_at: '2026-11-26T14:00:00Z',
          updated_at: '2026-11-26T14:00:00Z',
        },
      ]))
      return
    }
    if (partnershipExtras && url.pathname === '/rest/v1/rpc/directory_owner_partnership_unread_count') {
      res.end('1')
      return
    }
    if (url.pathname === '/rest/v1/rpc/directory_award_vote_spike_flags') {
      res.end('[]')
      return
    }
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      res.end('[]')
      return
    }
    res.statusCode = 404
    res.end('{}')
  })
}

async function shotConsoleOfferEditor(page, name, width, height) {
  const route = `/console/directory-submission/?id=${listingUuid}`
  await page.setViewportSize({ width, height })
  const response = await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  if (!response || response.status() >= 400) throw new Error(`${route} → ${response?.status()}`)
  await hideToolbar(page)
  await page.locator('#partner-offer-title').waitFor({ state: 'visible', timeout: 90000 })
  await page.waitForFunction(() => {
    const el = document.querySelector('#partner-offer-title')
    return el instanceof HTMLInputElement && el.value.trim().length > 0
  }, undefined, { timeout: 90000 })
  const file = path.join(outDir, name)
  await page.locator('section.panel').filter({ has: page.locator('#partner-offer-title') }).first().screenshot({ path: file })
  return file
}

async function capturePartnershipDialog(page) {
  await page.goto(`${base}/nomad_directory/l/${listingId}/`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await hideToolbar(page)
  await page.click('[data-partnership-open]')
  await page.waitForSelector('.partnership-dialog[open]', { timeout: 10000 })
  await page.evaluate((testKey) => {
    const mount = document.querySelector('.partnership-dialog[open] .cf-turnstile')
    if (!mount || !window.turnstile) return
    mount.innerHTML = ''
    mount.setAttribute('data-sitekey', testKey)
    window.turnstile.render(mount, { sitekey: testKey, theme: 'dark' })
  }, TURNSTILE_CAPTURE_SITEKEY)
  await page.waitForSelector('.partnership-dialog[open] input[name="cf-turnstile-response"]', { state: 'attached', timeout: 15000 })
  await page.waitForFunction(() => {
    const input = document.querySelector('.partnership-dialog[open] input[name="cf-turnstile-response"]')
    return input instanceof HTMLInputElement && input.value.length > 0
  }, { timeout: 15000 })
  const file = path.join(outDir, 'after-listing-partnership-form-1280.png')
  await page.locator('.partnership-dialog[open]').screenshot({ path: file })
  return file
}

async function waitForServer(url, attempts = 120) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url)
      if (response.status < 500) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Server did not start: ${url}`)
}

async function hideToolbar(page) {
  await page.addStyleTag({ content: 'astro-dev-toolbar,vite-error-overlay{display:none!important}' })
  await page.evaluate(() => document.fonts.ready)
}

async function shotViewport(page, name, route, width, height) {
  await page.setViewportSize({ width, height })
  const response = await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  if (!response || response.status() >= 400) throw new Error(`${route} → ${response?.status()}`)
  await hideToolbar(page)
  const file = path.join(outDir, name)
  await page.screenshot({ path: file, fullPage: false })
  return file
}

async function shotLocator(page, name, route, width, height, selector) {
  await page.setViewportSize({ width, height })
  const response = await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  if (!response || response.status() >= 400) throw new Error(`${route} → ${response?.status()}`)
  await hideToolbar(page)
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 90000 })
  const file = path.join(outDir, name)
  await page.locator(selector).first().screenshot({ path: file })
  return file
}

async function login(context) {
  const loginUrl = `${base}/nomad-directory-edit/?next=%2Fconsole%2F`
  const response = await context.request.post(loginUrl, {
    headers: { Origin: base },
    form: { email: 'owner@example.com' },
    maxRedirects: 0,
  })
  if (response.status() >= 400) throw new Error(`Login failed: ${response.status()}`)
  const callback = await context.request.get(`${base}/auth/callback/?code=fixture-console-capture`, { maxRedirects: 0 })
  if (callback.status() !== 302) throw new Error(`Callback failed: ${callback.status()}`)
}

async function buildAndPreview(mockPort) {
  const env = { ...process.env, SUPABASE_URL: `http://127.0.0.1:${mockPort}`, SUPABASE_ANON_KEY: ANON }
  let usedPreview = true
  try {
    execFileSync('npx', ['wrangler', 'types'], { cwd: root, stdio: 'pipe', env })
    execFileSync('npx', ['astro', 'build'], { cwd: root, stdio: 'pipe', env })
  } catch {
    usedPreview = false
  }
  const command = usedPreview
    ? ['astro', 'preview', '--port', '4321', '--host', '127.0.0.1']
    : ['astro', 'dev', '--port', '4321', '--host', '127.0.0.1']
  const server = spawn('npx', command, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] })
  await waitForServer(`${base}/nomad_directory/`)
  return server
}

const files = []
let preview
let mock
let savedCard
let savedDevVars = false

try {
  await mkdir(outDir, { recursive: true })
  savedCard = await readFile(cardPath, 'utf8')

  mock = createMock()
  await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve))
  const mockPort = mock.address().port
  try {
    await readFile(devVars)
    savedDevVars = true
    await copyFile(devVars, `${devVars}.capture-bak`)
  } catch {}
  await writeFile(devVars, `SUPABASE_URL=http://127.0.0.1:${mockPort}\nSUPABASE_ANON_KEY=${ANON}\n`)

  partnershipExtras = true
  await writeFile(cardPath, execFileSync('git', ['show', 'origin/main:src/components/DirectoryEntryCard.astro'], { cwd: root, encoding: 'utf8' }))
  preview = await buildAndPreview(mockPort)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  const sampleCard = '#listing-6b098148150e7b2f4c791752'
  files.push(await shotLocator(page, 'before-directory-main-1280.png', `/nomad_directory/#${sampleCard.slice(1)}`, 1280, 900, sampleCard))
  files.push(await shotLocator(page, 'before-directory-esim-390.png', '/nomad_directory/esim/', 390, 900, sampleCard))
  await browser.close()
  preview.kill('SIGTERM')

  await writeFile(cardPath, savedCard)
  preview = await buildAndPreview(mockPort)
  const browser2 = await chromium.launch({ headless: true })
  const ctx2 = await browser2.newContext()
  const page2 = await ctx2.newPage()
  files.push(await shotLocator(page2, 'after-directory-main-1280.png', `/nomad_directory/#${sampleCard.slice(1)}`, 1280, 900, sampleCard))
  files.push(await shotLocator(page2, 'after-directory-esim-390.png', '/nomad_directory/esim/', 390, 900, sampleCard))
  files.push(await shotLocator(page2, 'after-listing-detail-1280.png', `/nomad_directory/l/${listingId}/`, 1280, 900, '#listing-detail-panel'))
  files.push(await shotLocator(page2, 'after-listing-detail-390.png', `/nomad_directory/l/${listingId}/`, 390, 1200, '#listing-detail-panel'))
  files.push(await capturePartnershipDialog(page2))

  await login(ctx2)
  const page3 = await ctx2.newPage()
  files.push(await shotConsoleOfferEditor(page3, 'after-console-offer-editor-1280.png', 1280, 1400))
  files.push(await shotConsoleOfferEditor(page3, 'after-console-offer-editor-390.png', 390, 1600))
  files.push(await shotViewport(page3, 'after-console-partnership-inbox-1280.png', '/console/partnerships/', 1280, 1200))
  files.push(await shotViewport(page3, 'after-console-partnership-inbox-390.png', '/console/partnerships/', 390, 1400))
  await browser2.close()
  preview.kill('SIGTERM')
} finally {
  if (preview && !preview.killed) preview.kill('SIGTERM')
  if (mock) await new Promise((r) => mock.close(r))
  if (savedCard) await writeFile(cardPath, savedCard)
  if (savedDevVars) await copyFile(`${devVars}.capture-bak`, devVars).then(() => unlink(`${devVars}.capture-bak`))
  else {
    try {
      await unlink(devVars)
    } catch {}
  }
}

console.log(JSON.stringify({ outDir, files }))