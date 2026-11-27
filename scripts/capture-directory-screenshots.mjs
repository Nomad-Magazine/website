import { readFile, writeFile, mkdir, access, unlink, readdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import sharp from 'sharp'

const CACHE_PATH = 'src/utils/nomad_cache_table_6857167d82358a0f5e038c3f.json'
const OUT_DIR = 'public/images/directory-shots'
const MANIFEST_PATH = 'src/utils/directory-screenshots.json'
const VIEWPORT = { width: 800, height: 500 }
const SITE_TIMEOUT_MS = 15_000
const NETWORK_IDLE_MS = 5_000
const SETTLE_MS = 2_500
const CONCURRENCY = 3
const CAPTURE_HARD_TIMEOUT_MS = SITE_TIMEOUT_MS + NETWORK_IDLE_MS + SETTLE_MS + 10_000
const WEBP_QUALITY = 72
const MIN_WEBP_BYTES = 2_200
const LOW_VARIANCE_FILE_BYTES = 6_000
const LOW_VARIANCE_MIN_STDEV = 12

const SUPABASE_URL = 'https://kmsroigetiipulnosooy.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttc3JvaWdldGlpcHVsbm9zb295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NDk0MzcsImV4cCI6MjA3MTAyNTQzN30.yKGKsfDA4WOAwAOOX6znSNfcT6yL7Y0RWLBc2ylktCI'

const COOKIE_SELECTORS = [
  '#onetrust-accept-btn-handler',
  '#onetrust-banner-sdk #onetrust-accept-btn-handler',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  '#CybotCookiebotDialogBodyButtonAccept',
  '#didomi-notice-agree-button',
  'button.didomi-components-button--color',
  'button[aria-label*="Accept" i]',
  'button[aria-label*="accept" i]',
  'button:has-text("Accept all")',
  'button:has-text("Accept All")',
  'button:has-text("Accept cookies")',
  'button:has-text("I agree")',
  'button:has-text("Agree")',
  'button:has-text("Got it")',
  'button:has-text("OK")',
  'button:has-text("Allow all")',
  '[data-testid="cookie-accept"]',
  '.osano-cm-accept-all',
  '#truste-consent-button',
  '.fc-cta-consent',
]

const BOT_TEXT_SNIPPETS = [
  'checking your browser',
  'just a moment',
  'verify you are human',
  'failed to verify your browser',
  'access denied',
  'attention required',
  "can't access this",
  'please enable javascript',
  'enable cookies',
  'security check',
  'ddos protection',
]

const BOT_TITLE_SNIPPETS = ['403', '404', '503', 'access denied', 'attention required', 'error']

function websiteUrl(value) {
  if (!value) return ''
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

function listingWebsite(record) {
  return websiteUrl(record.link || record.sb788c266b?.[0] || '')
}

async function fetchManagedListings() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/directory_public_listings`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      console.warn(`Managed listings RPC unavailable (${response.status}); SmartSuite cache only.`)
      return []
    }
    const rows = await response.json()
    return rows
      .map(({ id, payload }) => ({
        id: String(id),
        title: String(payload?.title || ''),
        website: websiteUrl(payload?.website || ''),
      }))
      .filter((row) => row.title && row.website)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Managed listings fetch skipped: ${message}`)
    return []
  }
}

async function loadListings() {
  const { records } = JSON.parse(await readFile(CACHE_PATH, 'utf8'))
  const fromCache = records
    .filter((record) => record.sf4ad525dd && record.title)
    .map((record) => ({ id: String(record.id), title: String(record.title), website: listingWebsite(record) }))
    .filter((record) => record.website)

  const managed = await fetchManagedListings()
  const byId = new Map(fromCache.map((row) => [row.id, row]))
  for (const row of managed) {
    const existing = byId.get(row.id)
    byId.set(row.id, existing ? { ...existing, title: row.title, website: row.website } : row)
  }
  return [...byId.values()].filter((row) => row.website)
}

async function loadManifest() {
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, 'utf8'))
  } catch {
    return {}
  }
}

async function fileExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function readExistingBytes(dest) {
  try {
    return await readFile(dest)
  } catch {
    return null
  }
}

async function removeCapture(listingId, manifest) {
  const dest = path.join(OUT_DIR, `${listingId}.webp`)
  try {
    await unlink(dest)
  } catch {
    /* missing file */
  }
  delete manifest[listingId]
}

async function dismissCookieBanners(page) {
  const surfaces = [page, ...page.frames().filter((frame) => frame !== page.mainFrame())]
  for (const surface of surfaces) {
    for (const selector of COOKIE_SELECTORS) {
      try {
        const button = surface.locator(selector).first()
        if (await button.isVisible({ timeout: 200 })) {
          await button.click({ timeout: 800, noWaitAfter: true })
          await page.waitForTimeout(350)
          return
        }
      } catch {
        /* try next */
      }
    }
  }
}

async function validateCapture(page, response, webp) {
  const status = response?.status() ?? 0
  if (status >= 400) return `http-${status}`

  const title = (await page.title().catch(() => '')).toLowerCase()
  const bodyText = (await page.locator('body').innerText({ timeout: 2000 }).catch(() => '')).toLowerCase()
  const combined = `${title}\n${bodyText}`

  for (const snippet of BOT_TITLE_SNIPPETS) {
    if (title.includes(snippet)) return `bot-title:${snippet}`
  }
  for (const snippet of BOT_TEXT_SNIPPETS) {
    if (combined.includes(snippet)) return `bot-text:${snippet}`
  }

  const host = new URL(page.url()).hostname.toLowerCase()
  if (/instagram\.com|facebook\.com|fb\.com/.test(host) && /\b(log in|sign up|create (new )?account)\b/i.test(combined)) {
    return 'social-login-wall'
  }

  if (webp.length < MIN_WEBP_BYTES) return 'tiny-file'

  const stats = await sharp(webp).stats()
  const minStdev = Math.min(...stats.channels.map((channel) => channel.stdev))
  if (webp.length < LOW_VARIANCE_FILE_BYTES && minStdev < LOW_VARIANCE_MIN_STDEV) return 'low-variance'

  const head = bodyText.trim().slice(0, 160)
  if (/^(loading\.{0,3}\b|opening\b)/i.test(head)) return 'loading-shell'
  if (/loading\.{0,3}/i.test(head) && head.length < 200) return 'loading-shell'

  return null
}

async function waitPastLoadingShell(page, timeLeft) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const lead = (await page.locator('body').innerText({ timeout: 1500 }).catch(() => '')).trim().slice(0, 80)
    if (!/^(loading\.{0,3}\b|opening\b)/i.test(lead)) return null
    await page.waitForTimeout(Math.min(2_500, timeLeft()))
  }
  return 'loading-shell'
}

function withHardTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    }),
  ])
}

async function captureOne(browser, listing, manifest, refresh, excluded) {
  const relFile = `/images/directory-shots/${listing.id}.webp`
  const dest = path.join(OUT_DIR, `${listing.id}.webp`)

  if (!refresh && (await fileExists(dest)) && manifest[listing.id]?.file === relFile) {
    return { status: 'skipped' }
  }

  const context = await browser.newContext({
    viewport: VIEWPORT,
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
  })
  context.setDefaultTimeout(2_000)
  context.setDefaultNavigationTimeout(SITE_TIMEOUT_MS)
  const page = await context.newPage()
  let response
  try {
    const captured = await withHardTimeout(
      (async () => {
        const captureDeadline = Date.now() + CAPTURE_HARD_TIMEOUT_MS
        const timeLeft = () => Math.max(1_000, captureDeadline - Date.now())
        response = await page.goto(listing.website, { waitUntil: 'domcontentloaded', timeout: timeLeft() })
        try {
          await page.waitForLoadState('networkidle', { timeout: Math.min(NETWORK_IDLE_MS, timeLeft()) })
        } catch {
          /* bounded */
        }
        await dismissCookieBanners(page)
        await page.waitForTimeout(Math.min(SETTLE_MS, timeLeft()))
        await dismissCookieBanners(page)
        const loadingReason = await waitPastLoadingShell(page, timeLeft)
        if (loadingReason) {
          return { status: 'failed', rejectReason: loadingReason }
        }

        const png = await page.screenshot({ type: 'png', animations: 'disabled', timeout: Math.min(6000, timeLeft()) })
        const webp = await sharp(png).resize(VIEWPORT.width, VIEWPORT.height, { fit: 'cover' }).webp({ quality: WEBP_QUALITY }).toBuffer()

        const rejectReason = await validateCapture(page, response, webp)
        if (rejectReason) {
          return { status: 'failed', rejectReason }
        }

        const previous = await readExistingBytes(dest)
        if (previous && previous.equals(webp)) {
          if (!manifest[listing.id]) {
            manifest[listing.id] = {
              file: relFile,
              capturedAt: new Date().toISOString(),
              website: listing.website,
            }
            return { status: 'ok' }
          }
          return { status: 'unchanged' }
        }

        await writeFile(dest, webp)
        manifest[listing.id] = {
          file: relFile,
          capturedAt: new Date().toISOString(),
          website: listing.website,
        }
        return { status: 'ok' }
      })(),
      CAPTURE_HARD_TIMEOUT_MS + 2_000,
      listing.id,
    )

    if (captured.status === 'failed' && captured.rejectReason) {
      await removeCapture(listing.id, manifest)
      excluded[listing.id] = captured.rejectReason
      console.warn(`Rejected ${listing.id} (${listing.title}): ${captured.rejectReason}`)
      return { status: 'failed' }
    }
    return captured
  } catch (error) {
    await removeCapture(listing.id, manifest)
    const message = error instanceof Error ? error.message : String(error)
    excluded[listing.id] = `error:${message.split('\n')[0].slice(0, 120)}`
    console.warn(`Screenshot failed for ${listing.id} (${listing.title}): ${message.split('\n')[0]}`)
    return { status: 'failed' }
  } finally {
    await context.close()
  }
}

async function runPool(browser, queue, manifest, refresh, stats, excluded) {
  for (;;) {
    const listing = queue.pop()
    if (!listing) return
    const result = await captureOne(browser, listing, manifest, refresh, excluded)
    stats[result.status] = (stats[result.status] || 0) + 1
    if (stats.ok && stats.ok % 25 === 0) {
      console.log(`Progress: ${stats.ok} saved, ${stats.failed || 0} failed, ${stats.unchanged || 0} unchanged`)
    }
  }
}

async function main() {
  const refresh = process.argv.includes('--refresh')
  await mkdir(OUT_DIR, { recursive: true })
  const listings = await loadListings()
  const manifest = await loadManifest()
  const stats = { ok: 0, failed: 0, skipped: 0, unchanged: 0 }
  const excluded = {}
  const queue = [...listings]

  console.log(`Capturing ${listings.length} directory websites (concurrency ${CONCURRENCY}, timeout ${SITE_TIMEOUT_MS}ms)`)
  const browser = await chromium.launch({ headless: true })
  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, () => runPool(browser, queue, manifest, refresh, stats, excluded)))
  } finally {
    await browser.close()
  }

  const allowed = new Set(Object.keys(manifest))
  for (const file of await readdir(OUT_DIR)) {
    if (!file.endsWith('.webp')) continue
    const id = file.replace(/\.webp$/, '')
    if (!allowed.has(id)) {
      await unlink(path.join(OUT_DIR, file)).catch(() => {})
    }
  }

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`)
  const good = Object.keys(manifest).length
  console.log(
    `Done: ${stats.ok || 0} saved, ${stats.unchanged || 0} unchanged, ${stats.failed || 0} failed, ${stats.skipped || 0} skipped, manifest ${good} good`,
  )
  if (Object.keys(excluded).length) {
    console.log('Excluded by reason:', JSON.stringify(excluded, null, 2))
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})