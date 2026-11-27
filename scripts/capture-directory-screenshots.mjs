import { readFile, writeFile, mkdir, access, unlink, readdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import sharp from 'sharp'

const CACHE_PATH = 'src/utils/nomad_cache_table_6857167d82358a0f5e038c3f.json'
const OUT_DIR = 'public/images/directory-shots'
const MANIFEST_PATH = 'src/utils/directory-screenshots.json'
const EXCLUSIONS_PATH = 'src/utils/directory-screenshots-exclusions.json'
const VIEWPORT = { width: 800, height: 500 }
const SITE_TIMEOUT_MS = 15_000
const NETWORK_IDLE_MS = 5_000
const SETTLE_MS = 2_500
const CONCURRENCY = 3
const CAPTURE_HARD_TIMEOUT_MS = SITE_TIMEOUT_MS + NETWORK_IDLE_MS + SETTLE_MS + 12_000
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
  '.onetrust-close-btn-handler',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  '#CybotCookiebotDialogBodyButtonAccept',
  '#didomi-notice-agree-button',
  'button.didomi-components-button--color',
  '#iubenda-cs-accept-btn',
  '.iubenda-cs-accept-btn',
  '#usercentrics-root button[data-testid="uc-accept-all-button"]',
  '[data-cookiefirst-action="accept"]',
  '.cky-btn-accept',
  '#cookieyes-EU-accept-all',
  '.cookieyes-consent-accept',
  '#borlabs-cookie-accept-all',
  '.cmplz-accept',
  '.brlbs-btn-accept-all',
  '[aria-label*="Accept" i]',
  '[aria-label*="accept" i]',
  'button:has-text("Accept all")',
  'button:has-text("Accept All")',
  'button:has-text("Accept cookies")',
  'button:has-text("Alle akzeptieren")',
  'button:has-text("Alle Cookies akzeptieren")',
  'button:has-text("Akzeptieren")',
  'button:has-text("Zustimmen")',
  'button:has-text("Einverstanden")',
  'button:has-text("Tout accepter")',
  'button:has-text("Aceptar todo")',
  'button:has-text("Aceptar todas")',
  'button:has-text("Accetta tutti")',
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
  'confirm you\'re not a bot',
  'confirm you are not a bot',
  'account has been suspended',
  'access denied',
  'attention required',
  "can't access this",
  'please enable javascript',
  'enable cookies',
  'security check',
  'ddos protection',
  'checking if the site connection is secure',
  'cloudflare',
  'turnstile',
  'before you continue to youtube',
  'unusual traffic',
  'performed an action that violated',
  'domain registration has expired',
  'registration has expired',
  'this domain has expired',
  'weather preview',
  'save $',
]

const BOT_TITLE_SNIPPETS = ['403', '404', '503', 'access denied', 'attention required', 'error', 'suspended']

const CONSENT_ACCEPT_PATTERN =
  /^(accept all|accept cookies|allow all|alle akzeptieren|alle cookies|akzeptieren|zustimmen|einverstanden|tout accepter|aceptar todo|accetta tutti|agree|i agree|got it|ok|allow)$/i

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

async function loadExclusions() {
  try {
    return JSON.parse(await readFile(EXCLUSIONS_PATH, 'utf8'))
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

async function allFrameText(page) {
  const parts = []
  for (const frame of page.frames()) {
    try {
      const chunk = await frame.evaluate(() => {
        const title = document.title || ''
        const body = document.body?.innerText?.slice(0, 12_000) || ''
        return `${title}\n${body}`
      })
      parts.push(chunk)
    } catch {
      /* cross-origin frame */
    }
  }
  return parts.join('\n---\n').toLowerCase()
}

async function clickConsentInShadowDom(page) {
  await page.evaluate((patternSource) => {
    const pattern = new RegExp(patternSource, 'i')
    const walk = (root) => {
      const nodes = root.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]')
      for (const node of nodes) {
        const text = (node.textContent || node.value || node.getAttribute('aria-label') || '').trim()
        if (!text || text.length > 80) continue
        if (pattern.test(text)) {
          const rect = node.getBoundingClientRect()
          if (rect.width > 0 && rect.height > 0) {
            node.click()
          }
        }
      }
      for (const host of root.querySelectorAll('*')) {
        if (host.shadowRoot) walk(host.shadowRoot)
      }
    }
    walk(document)
  }, CONSENT_ACCEPT_PATTERN.source)
}

async function dismissCookieBanners(page) {
  const surfaces = [page, ...page.frames().filter((frame) => frame !== page.mainFrame())]
  for (const surface of surfaces) {
    for (const selector of COOKIE_SELECTORS) {
      try {
        const button = surface.locator(selector).first()
        if (await button.isVisible({ timeout: 200 })) {
          await button.click({ timeout: 800, noWaitAfter: true })
          await page.waitForTimeout(300)
        }
      } catch {
        /* try next */
      }
    }
  }
  await clickConsentInShadowDom(page)
}

async function consentOverlayStillVisible(page) {
  return page.evaluate(() => {
    const consentWords = /cookie|cookies|consent|gdpr|datenschutz|einwilligung|tracking preferences|cookie settings|cookie policy/i
    const viewportArea = innerWidth * innerHeight
    const minArea = viewportArea * 0.12
    const candidates = document.querySelectorAll(
      '#onetrust-banner-sdk, #CybotCookiebotDialog, .cc-window, #usercentrics-root, #iubenda-cs-banner, [id*="cookie"], [class*="cookie"], [id*="consent"], [class*="consent"]',
    )
    for (const el of candidates) {
      const style = getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue
      const rect = el.getBoundingClientRect()
      if (rect.width * rect.height >= minArea && consentWords.test(el.textContent || '')) return true
    }
    for (const el of document.body.querySelectorAll('*')) {
      const style = getComputedStyle(el)
      if (!['fixed', 'sticky'].includes(style.position)) continue
      const rect = el.getBoundingClientRect()
      if (rect.width * rect.height < minArea) continue
      const text = (el.innerText || '').slice(0, 600)
      if (consentWords.test(text)) return true
    }
    return false
  })
}

async function runConsentFlow(page, timeLeft) {
  await dismissCookieBanners(page)
  await page.waitForTimeout(Math.min(700, timeLeft()))
  if (await consentOverlayStillVisible(page)) {
    await dismissCookieBanners(page)
    await page.waitForTimeout(Math.min(800, timeLeft()))
    await clickConsentInShadowDom(page)
    await page.waitForTimeout(Math.min(400, timeLeft()))
    if (await consentOverlayStillVisible(page)) return 'consent-wall'
  } else {
    await dismissCookieBanners(page)
    await clickConsentInShadowDom(page)
    await page.waitForTimeout(Math.min(300, timeLeft()))
  }
  const combined = await allFrameText(page)
  if (/manage consent/i.test(combined)) return 'manage-consent-visible'
  return null
}

async function detectPageBlockers(page) {
  const combined = await allFrameText(page)
  const title = (await page.title().catch(() => '')).toLowerCase()

  for (const snippet of BOT_TITLE_SNIPPETS) {
    if (title.includes(snippet)) return `bot-title:${snippet}`
  }
  for (const snippet of BOT_TEXT_SNIPPETS) {
    if (combined.includes(snippet)) return `bot-text:${snippet}`
  }

  if (/account has been suspended|has been suspended/i.test(combined)) return 'account-suspended'

  const host = new URL(page.url()).hostname.toLowerCase()
  if (/instagram\.com|facebook\.com|fb\.com/.test(host) && /\b(log in|sign up|create (new )?account)\b/i.test(combined)) {
    return 'social-login-wall'
  }
  if (/youtube\.com|youtu\.be/.test(host) && /confirm you.?re not a bot|not a bot/i.test(combined)) {
    return 'youtube-bot-wall'
  }

  const domCheck = await page.evaluate(() => {
    const text = (document.body?.innerText || '').toLowerCase()
    const password = document.querySelector('input[type="password"]:not([hidden])')
    const pwdRect = password?.getBoundingClientRect()
    const pwdVisible = pwdRect && pwdRect.width > 40 && pwdRect.height > 10
  const loginWords = /log in|sign in|sign-in|login|anmelden|connexion|iniciar sesión|accedi/i
    if (pwdVisible && loginWords.test(text)) {
      const main = document.querySelector('main, [role="main"], #content, .content, body')
      const mainText = (main?.innerText || text).slice(0, 2500).toLowerCase()
      if ((mainText.match(/password/g) || []).length > 0 && (mainText.match(/email|username|e-mail/gi) || []).length > 0) {
        return 'login-wall'
      }
    }

    const vw = innerWidth
    const vh = innerHeight
    const fullThreshold = vw * vh * 0.35
    const modalWords = /newsletter|subscribe|sign up for|join our list|get updates|email address/i
    for (const el of document.body.querySelectorAll('*')) {
      const style = getComputedStyle(el)
      if (!['fixed', 'absolute'].includes(style.position)) continue
      const z = Number.parseInt(style.zIndex, 10)
      if (!Number.isNaN(z) && z < 5) continue
      const rect = el.getBoundingClientRect()
      const area = rect.width * rect.height
      if (area < fullThreshold) continue
      if (modalWords.test(el.innerText || '') && rect.top < vh * 0.35) return 'newsletter-modal'
    }

    if (/cf-turnstile|challenges\.cloudflare\.com|turnstile/i.test(document.documentElement.innerHTML)) return 'turnstile-widget'

    const overlayAreaMin = vw * vh * 0.25
    for (const el of document.body.querySelectorAll('*')) {
      const style = getComputedStyle(el)
      if (!['fixed', 'absolute'].includes(style.position)) continue
      if (style.display === 'none' || style.visibility === 'hidden') continue
      const opacity = Number.parseFloat(style.opacity)
      if (!Number.isNaN(opacity) && opacity < 0.08) continue
      const rect = el.getBoundingClientRect()
      const area = rect.width * rect.height
      if (area < overlayAreaMin) continue
      const role = el.getAttribute('role')
      const z = Number.parseInt(style.zIndex, 10)
      const dialogLike = role === 'dialog' || role === 'alertdialog'
      const centered =
        rect.width >= vw * 0.45 &&
        rect.height >= vh * 0.35 &&
        rect.left <= vw * 0.3 &&
        rect.right >= vw * 0.7
      const highStack = !Number.isNaN(z) && z >= 50
      if (dialogLike || centered || highStack) return 'viewport-overlay'
    }

    return null
  })

  if (domCheck) return domCheck
  if (/turnstile|cf-challenge|hcaptcha-box|recaptcha/i.test(combined)) return 'bot-text:turnstile'

  return null
}

async function webpOverlaySignals(webp) {
  const file = sharp(webp)
  const meta = await file.metadata()
  const w = meta.width || VIEWPORT.width
  const h = meta.height || VIEWPORT.height
  const sample = async (top, height) => {
    const topPx = Math.floor(h * top)
    const heightPx = Math.max(1, Math.floor(h * height))
    const { data, info } = await sharp(webp)
      .extract({ left: 0, top: topPx, width: w, height: Math.min(heightPx, h - topPx) })
      .raw()
      .toBuffer({ resolveWithObject: true })
    const channels = info.channels || 3
    const sums = [0, 0, 0]
    const count = data.length / channels
    for (let i = 0; i < data.length; i += channels) {
      sums[0] += data[i]
      sums[1] += data[i + 1]
      sums[2] += data[i + 2]
    }
    return sums.map((v) => v / count)
  }
  const dist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
  const middle = await sample(0.38, 0.3)
  const bottom = await sample(0.8, 0.18)
  const top = await sample(0.02, 0.16)
  const signals = []
  if (dist(middle, bottom) > 44 && dist(middle, top) < 28) signals.push('bottom-bar')
  const stats = await sharp(webp).stats()
  const minStdev = Math.min(...stats.channels.map((c) => c.stdev))
  if (dist(middle, bottom) > 48 && dist(middle, top) > 48 && minStdev < 35) signals.push('full-overlay')
  return signals
}

async function validateCapture(page, response, webp) {
  const status = response?.status() ?? 0
  if (status >= 400) return `http-${status}`

  const blocker = await detectPageBlockers(page)
  if (blocker) return blocker

  if (webp.length < MIN_WEBP_BYTES) return 'tiny-file'

  const stats = await sharp(webp).stats()
  const minStdev = Math.min(...stats.channels.map((channel) => channel.stdev))
  if (webp.length < LOW_VARIANCE_FILE_BYTES && minStdev < LOW_VARIANCE_MIN_STDEV) return 'low-variance'

  const head = (await page.locator('body').innerText({ timeout: 1500 }).catch(() => '')).trim().slice(0, 160).toLowerCase()
  if (/^(loading\.{0,3}\b|opening\b)/i.test(head)) return 'loading-shell'
  if (/loading\.{0,3}/i.test(head) && head.length < 200) return 'loading-shell'

  if (await consentOverlayStillVisible(page)) return 'consent-wall'

  const overlay = await webpOverlaySignals(webp)
  if (overlay.includes('full-overlay')) return 'pixel-full-overlay'
  if (overlay.includes('bottom-bar')) return 'pixel-consent-bar'

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

async function captureOne(browser, listing, manifest, exclusions, refresh, excluded) {
  const relFile = `/images/directory-shots/${listing.id}.webp`
  const dest = path.join(OUT_DIR, `${listing.id}.webp`)
  const retryExcluded = process.argv.includes('--retry-excluded')

  if (exclusions[listing.id] && !retryExcluded) {
    await removeCapture(listing.id, manifest)
    return { status: 'skipped-excluded' }
  }

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

        const consentReason = await runConsentFlow(page, timeLeft)
        if (consentReason) return { status: 'failed', rejectReason: consentReason }

        await page.waitForTimeout(Math.min(SETTLE_MS, timeLeft()))
        const consentReason2 = await runConsentFlow(page, timeLeft)
        if (consentReason2) return { status: 'failed', rejectReason: consentReason2 }

        const loadingReason = await waitPastLoadingShell(page, timeLeft)
        if (loadingReason) return { status: 'failed', rejectReason: loadingReason }

        const preShotBlocker = await detectPageBlockers(page)
        if (preShotBlocker) return { status: 'failed', rejectReason: preShotBlocker }

        const png = await page.screenshot({ type: 'png', animations: 'disabled', timeout: Math.min(6000, timeLeft()) })
        const webp = await sharp(png).resize(VIEWPORT.width, VIEWPORT.height, { fit: 'cover' }).webp({ quality: WEBP_QUALITY }).toBuffer()

        const rejectReason = await validateCapture(page, response, webp)
        if (rejectReason) return { status: 'failed', rejectReason }

        const previous = await readExistingBytes(dest)
        if (!refresh && previous && previous.equals(webp)) {
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
        if (refresh && previous && previous.equals(webp) && manifest[listing.id]) {
          return { status: 'unchanged' }
        }

        await writeFile(dest, webp)
        delete exclusions[listing.id]
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
      exclusions[listing.id] = { reason: captured.rejectReason, excludedAt: new Date().toISOString() }
      excluded[listing.id] = captured.rejectReason
      console.warn(`Rejected ${listing.id} (${listing.title}): ${captured.rejectReason}`)
      return { status: 'failed' }
    }
    return captured
  } catch (error) {
    await removeCapture(listing.id, manifest)
    const message = error instanceof Error ? error.message : String(error)
    const reason = `error:${message.split('\n')[0].slice(0, 120)}`
    exclusions[listing.id] = { reason, excludedAt: new Date().toISOString() }
    excluded[listing.id] = reason
    console.warn(`Screenshot failed for ${listing.id} (${listing.title}): ${message.split('\n')[0]}`)
    return { status: 'failed' }
  } finally {
    await context.close()
  }
}

async function runPool(browser, queue, manifest, exclusions, refresh, stats, excluded) {
  for (;;) {
    const listing = queue.pop()
    if (!listing) return
    const result = await captureOne(browser, listing, manifest, exclusions, refresh, excluded)
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
  const exclusions = await loadExclusions()
  const stats = { ok: 0, failed: 0, skipped: 0, unchanged: 0, 'skipped-excluded': 0 }
  const excluded = {}
  const queue = [...listings]

  console.log(`Capturing ${listings.length} directory websites (concurrency ${CONCURRENCY}, timeout ${SITE_TIMEOUT_MS}ms)`)
  const browser = await chromium.launch({ headless: true })
  try {
    await Promise.all(
      Array.from({ length: CONCURRENCY }, () => runPool(browser, queue, manifest, exclusions, refresh, stats, excluded)),
    )
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
  await writeFile(EXCLUSIONS_PATH, `${JSON.stringify(exclusions, null, 2)}\n`)
  const good = Object.keys(manifest).length
  console.log(
    `Done: ${stats.ok || 0} saved, ${stats.unchanged || 0} unchanged, ${stats.failed || 0} failed, ${stats.skipped || 0} skipped, ${stats['skipped-excluded'] || 0} skipped-excluded, manifest ${good} good, exclusions ${Object.keys(exclusions).length}`,
  )
  if (Object.keys(excluded).length) {
    console.log('Excluded by reason:', JSON.stringify(excluded, null, 2))
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})