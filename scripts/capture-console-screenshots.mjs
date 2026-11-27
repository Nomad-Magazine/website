#!/usr/bin/env node
/**
 * Capture real /console/ pages against `bun run dev` with a local mock Supabase transport.
 * No production calls; fixture users and sample listing data only.
 *
 * Usage: node scripts/capture-console-screenshots.mjs --phase=before|after --out=pr-assets/pr-53
 *        node scripts/capture-console-screenshots.mjs --set=listing-cards --phase=after --out=pr-assets/pr-54
 */
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { readFile, writeFile, unlink, mkdir, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const consoleCss = path.join(root, 'src/styles/console.css')
const devVars = path.join(root, '.dev.vars')
const phase = process.argv.includes('--phase=before') ? 'before' : 'after'
const outArg = process.argv.find((a) => a.startsWith('--out='))
const outDir = path.resolve(outArg?.slice(6) ?? path.join(root, 'pr-assets/pr-53'))
const captureSet = process.argv.find((a) => a.startsWith('--set='))?.slice(6) ?? 'full'
const indexPath = path.join(root, 'src/pages/console/index.astro')
const base = 'http://127.0.0.1:3000'
const OWNER = '00000000-0000-4000-8000-000000000001'
const ANON = 'local-test-public-key'

const logo = (file) => `/images/directory-logos/${file}`

const allListings = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    owner_id: OWNER,
    legacy_id: '655f34669bac86d0f943d777',
    draft: {
      title: 'Harbor Coliving Lisboa',
      description: 'Bright rooms and shared workspace for remote workers exploring Portugal.',
      website: 'https://example.com/harbor-coliving/',
      category: 'Coliving',
      location: 'Lisboa, Portugal',
      special_offer: '10% off the first month',
      image: logo('655f34669bac86d0f943d777.webp'),
    },
    published: {
      title: 'Harbor Coliving Lisboa',
      description: 'Bright rooms and shared workspace for remote workers exploring Portugal.',
      website: 'https://example.com/harbor-coliving/',
      category: 'Coliving',
      location: 'Lisboa, Portugal',
      special_offer: '10% off the first month',
      image: logo('655f34669bac86d0f943d777.webp'),
    },
    status: 'approved',
    review_notes: '',
    version: 3,
    updated_at: '2026-11-20T10:00:00Z',
    created_at: '2026-10-01T10:00:00Z',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    owner_id: OWNER,
    legacy_id: null,
    draft: {
      title: 'Summit Remote Hub',
      description: 'Mountain coworking with fast Wi‑Fi and weekly community events.',
      website: 'https://example.com/summit-hub/',
      category: 'Coworking',
      location: 'Bansko, Bulgaria',
      special_offer: '',
      image: logo('655f34669bac86d0f943d793.webp'),
    },
    published: null,
    status: 'pending',
    review_notes: '',
    version: 1,
    updated_at: '2026-11-25T10:00:00Z',
    created_at: '2026-11-25T10:00:00Z',
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    owner_id: OWNER,
    legacy_id: '655f34669bac86d0f943d7a8',
    draft: {
      title: 'Nomad Grove Café',
      description: 'Updated evening workshops and a new quiet room for focus sessions.',
      website: 'https://example.com/nomad-grove/',
      category: 'Café',
      location: 'Chiang Mai, Thailand',
      special_offer: 'Free coffee with day pass',
      image: logo('655f34669bac86d0f943d7a8.webp'),
    },
    published: {
      title: 'Nomad Grove Café',
      description: 'Community café with reliable Wi‑Fi and healthy lunches.',
      website: 'https://example.com/nomad-grove/',
      category: 'Café',
      location: 'Chiang Mai, Thailand',
      special_offer: 'Free coffee with day pass',
      image: logo('655f34669bac86d0f943d7a8.webp'),
    },
    status: 'pending',
    review_notes: '',
    version: 4,
    updated_at: '2026-11-26T10:00:00Z',
    created_at: '2026-09-01T10:00:00Z',
  },
]

const allPosts = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    owner_id: OWNER,
    listing_id: allListings[0].id,
    kind: 'update',
    draft: { title: 'Winter rooftop dinners', body: 'Join weekly dinners with founders and travelers.', url: 'https://example.com/events/' },
    published: { title: 'Autumn open mic nights', body: 'Live music every Thursday.', url: 'https://example.com/music/' },
    status: 'approved',
    review_notes: '',
    version: 2,
    updated_at: '2026-11-10T10:00:00Z',
    created_at: '2026-10-15T10:00:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    owner_id: OWNER,
    listing_id: allListings[2].id,
    kind: 'update',
    draft: { title: 'New quiet room hours', body: 'Silent focus time is now 9am–1pm daily.', url: '' },
    published: null,
    status: 'pending',
    review_notes: '',
    version: 1,
    updated_at: '2026-11-26T11:00:00Z',
    created_at: '2026-11-26T11:00:00Z',
  },
]

const awards = [
  {
    id: '90000000-0000-4000-8000-000000000001',
    listing_id: allListings[0].legacy_id,
    listing_title: allListings[0].draft.title,
    vote_count: 42,
    tied_winners: 1,
    kind: 'month',
    starts_at: '2026-10-01T00:00:00Z',
    ends_at: '2026-10-31T23:59:59Z',
    finalized_at: '2026-11-01T00:10:00Z',
    revoked_at: null,
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

function sessionToken() {
  const now = Math.floor(Date.now() / 1000)
  return [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: OWNER, aud: 'authenticated', role: 'authenticated', iat: now, exp: now + 7200 })).toString('base64url'),
    Buffer.from('local-fixture-signature').toString('base64url'),
  ].join('.')
}

let fixtureListings = allListings
let fixturePosts = allPosts

function applyFixture(mode) {
  if (mode === 'single') {
    fixtureListings = [allListings[0]]
    fixturePosts = allPosts.filter((post) => post.status !== 'pending')
  } else {
    fixtureListings = allListings
    fixturePosts = allPosts
  }
}

applyFixture('multi')

function filterRows(rows, search) {
  for (const [key, op] of search) {
    if (key === 'order') continue
    if (key === 'select') continue
    const m = op.match(/^eq\.(.+)$/)
    if (m) return rows.filter((row) => String(row[key]) === m[1])
  }
  return rows
}

async function bodyJson(req) {
  let body = ''
  for await (const chunk of req) body += chunk
  return body ? JSON.parse(body) : {}
}

function createMock() {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    res.setHeader('Content-Type', 'application/json')
  if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }
    try {
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
        const rows = filterRows(fixtureListings, url.searchParams)
        res.end(JSON.stringify(rows))
        return
      }
      if (url.pathname === '/rest/v1/directory_owner_posts') {
        const rows = filterRows(fixturePosts, url.searchParams)
        res.end(JSON.stringify(rows))
        return
      }
      if (url.pathname === '/rest/v1/rpc/directory_is_admin') {
        res.end('true')
        return
      }
      if (url.pathname === '/rest/v1/rpc/directory_public_awards') {
        const args = await bodyJson(req)
        if (args.p_award_id) {
          res.end(JSON.stringify(awards.filter((a) => a.id === args.p_award_id)))
          return
        }
        if (args.p_listing_id) {
          res.end(JSON.stringify(awards.filter((a) => a.listing_id === args.p_listing_id)))
          return
        }
        res.end(JSON.stringify(awards))
        return
      }
      if (url.pathname === '/rest/v1/rpc/directory_public_listings') {
        res.end('[]')
        return
      }
      if (url.pathname === '/rest/v1/rpc/directory_award_vote_spike_flags') {
        res.end('[]')
        return
      }
      res.statusCode = 404
      res.end(JSON.stringify({ message: `Unhandled mock route ${req.method} ${url.pathname}` }))
    } catch (error) {
      res.statusCode = 500
      res.end(JSON.stringify({ message: String(error) }))
    }
  })
}

async function waitForServer(url, attempts = 90) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url)
      if (response.status < 500) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Dev server did not start: ${url}`)
}

async function login(context) {
  const loginUrl = `${base}/nomad-directory-edit/?next=%2Fconsole%2F`
  const response = await context.request.post(loginUrl, {
    headers: { Origin: base },
    form: { email: 'owner@example.com' },
    maxRedirects: 0,
  })
  if (response.status() >= 400) throw new Error(`Login failed: ${response.status()} ${await response.text()}`)
  const callback = await context.request.get(`${base}/auth/callback/?code=fixture-console-capture`, { maxRedirects: 0 })
  if (callback.status() !== 302) throw new Error(`Callback failed: ${callback.status()}`)
}

async function capture(page, name, route, width, height, hooks = {}) {
  applyFixture(hooks.fixture ?? 'multi')
  await page.setViewportSize({ width, height })
  const response = await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
  if (!response || response.status() >= 400) throw new Error(`${route} returned ${response?.status()}`)
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' })
  await page.evaluate(() => document.fonts.ready)
  if (hooks.openMore) {
    await page.locator('.listing-card .console-more-trigger').first().click()
    await page.waitForSelector('.listing-card .console-more-menu:not([hidden])')
  }
  const out = path.join(outDir, `${phase}-${name}-${width}.png`)
  await page.screenshot({ path: out, fullPage: true })
  return out
}

const routes = [
  ['listings', '/console/'],
  ['updates', '/console/updates/'],
  ['badges', '/console/badges/'],
  ['review', '/console/admin/directory/'],
  ['award-review', '/console/admin/awards/'],
  ['form', '/console/directory-submission/?new=1'],
]

let dev
let mock
let savedCss
let savedIndex
let savedDevVars = false
const files = []

try {
  await mkdir(outDir, { recursive: true })
  const { execFileSync } = await import('node:child_process')
  if (phase === 'before' && captureSet === 'listing-cards') {
    savedIndex = await readFile(indexPath, 'utf8')
    await writeFile(
      indexPath,
      execFileSync('git', ['show', 'origin/main:src/pages/console/index.astro'], { cwd: root, encoding: 'utf8' }),
    )
  }
  if (phase === 'before' && captureSet === 'full') {
    savedCss = await readFile(consoleCss, 'utf8')
    await writeFile(consoleCss, execFileSync('git', ['show', 'origin/main:src/styles/console.css'], { cwd: root, encoding: 'utf8' }))
  }

  mock = createMock()
  await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve))
  const mockPort = mock.address().port

  try {
    await readFile(devVars)
    savedDevVars = true
    await copyFile(devVars, `${devVars}.capture-bak`)
  } catch {}
  await writeFile(devVars, `SUPABASE_URL=http://127.0.0.1:${mockPort}\nSUPABASE_ANON_KEY=${ANON}\n`)

  dev = spawn('bun', ['run', 'dev', '--port', '3000', '--host', '127.0.0.1'], {
    cwd: root,
    env: { ...process.env, PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}` },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  dev.stdout?.on('data', (d) => (log += d))
  dev.stderr?.on('data', (d) => (log += d))

  await waitForServer(`${base}/nomad-directory-edit/`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  await login(context)

  if (captureSet === 'listing-cards') {
    for (const [name, fixture] of [
      ['listings-multi', 'multi'],
      ['listings-single', 'single'],
    ]) {
      files.push(await capture(page, name, '/console/', 1280, 1000, { fixture }))
      files.push(await capture(page, `${name}-mobile`, '/console/', 390, 1200, { fixture }))
    }
    if (phase === 'after') {
      files.push(await capture(page, 'listings-more-open', '/console/', 1280, 1000, { fixture: 'multi', openMore: true }))
      files.push(await capture(page, 'listings-more-open-mobile', '/console/', 390, 1200, { fixture: 'multi', openMore: true }))
    }
  } else {
    for (const [name, route] of routes) {
      files.push(await capture(page, name, route, 1280, 1000))
      files.push(await capture(page, `${name}-mobile`, route, 390, 1200))
    }
  }

  await browser.close()
} finally {
  if (dev && !dev.killed) dev.kill('SIGTERM')
  if (mock) await new Promise((r) => mock.close(r))
  if (savedIndex) await writeFile(indexPath, savedIndex)
  if (phase === 'before' && savedCss) await writeFile(consoleCss, savedCss)
  if (savedDevVars) await copyFile(`${devVars}.capture-bak`, devVars).then(() => unlink(`${devVars}.capture-bak`))
  else {
    try {
      await unlink(devVars)
    } catch {}
  }
}

console.log(JSON.stringify({ phase, outDir, files }))