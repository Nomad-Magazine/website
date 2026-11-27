import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import sharp from 'sharp'

const CACHE_PATH = 'src/utils/nomad_cache_table_6857167d82358a0f5e038c3f.json'
const OUT_DIR = 'public/images/directory-shots'
const MANIFEST_PATH = 'src/utils/directory-screenshots.json'
const VIEWPORT = { width: 800, height: 500 }
const SITE_TIMEOUT_MS = 15_000
const CONCURRENCY = 4
const WEBP_QUALITY = 72

const COOKIE_SELECTORS = [
  '#onetrust-accept-btn-handler',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  '#CybotCookiebotDialogBodyButtonAccept',
  'button[aria-label*="Accept" i]',
  'button[aria-label*="accept" i]',
  'button:has-text("Accept all")',
  'button:has-text("Accept All")',
  'button:has-text("I agree")',
  'button:has-text("Got it")',
  'button:has-text("OK")',
  '[data-testid="cookie-accept"]',
  '.osano-cm-accept-all',
]

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

async function loadListings() {
  const { records } = JSON.parse(await readFile(CACHE_PATH, 'utf8'))
  return records
    .filter((record) => record.sf4ad525dd && record.title)
    .map((record) => ({ id: String(record.id), title: String(record.title), website: listingWebsite(record) }))
    .filter((record) => record.website)
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

async function dismissCookieBanners(page) {
  for (const selector of COOKIE_SELECTORS) {
    try {
      const button = page.locator(selector).first()
      if (await button.isVisible({ timeout: 300 })) {
        await button.click({ timeout: 1000 })
        await page.waitForTimeout(200)
        return
      }
    } catch {
      /* next selector */
    }
  }
}

async function captureOne(browser, listing, manifest, refresh) {
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
  const page = await context.newPage()
  try {
    await page.goto(listing.website, { waitUntil: 'domcontentloaded', timeout: SITE_TIMEOUT_MS })
    await dismissCookieBanners(page)
    await page.waitForTimeout(400)
    const png = await page.screenshot({ type: 'png', animations: 'disabled', timeout: 5000 })
    const webp = await sharp(png).resize(VIEWPORT.width, VIEWPORT.height, { fit: 'cover' }).webp({ quality: WEBP_QUALITY }).toBuffer()
    await writeFile(dest, webp)
    manifest[listing.id] = {
      file: relFile,
      capturedAt: new Date().toISOString(),
      website: listing.website,
    }
    return { status: 'ok' }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Screenshot failed for ${listing.id} (${listing.title}): ${message}`)
    return { status: 'failed' }
  } finally {
    await context.close()
  }
}

async function runPool(browser, queue, manifest, refresh, stats) {
  for (;;) {
    const listing = queue.pop()
    if (!listing) return
    const result = await captureOne(browser, listing, manifest, refresh)
    stats[result.status] = (stats[result.status] || 0) + 1
    if (stats.ok % 25 === 0 && stats.ok > 0) {
      console.log(`Progress: ${stats.ok} captured, ${stats.failed || 0} failed, ${stats.skipped || 0} skipped`)
    }
  }
}

async function main() {
  const refresh = process.argv.includes('--refresh')
  await mkdir(OUT_DIR, { recursive: true })
  const listings = await loadListings()
  const manifest = await loadManifest()
  const stats = { ok: 0, failed: 0, skipped: 0 }
  const queue = [...listings]

  console.log(`Capturing ${listings.length} directory websites (concurrency ${CONCURRENCY}, timeout ${SITE_TIMEOUT_MS}ms)`)
  const browser = await chromium.launch({ headless: true })
  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, () => runPool(browser, queue, manifest, refresh, stats)))
  } finally {
    await browser.close()
  }

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`Done: ${stats.ok} captured, ${stats.failed || 0} failed, ${stats.skipped || 0} skipped, manifest ${Object.keys(manifest).length} entries`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})