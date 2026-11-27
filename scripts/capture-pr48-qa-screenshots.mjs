import { chromium } from 'playwright'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'

const execFileAsync = promisify(execFile)
const repoRoot = path.resolve(import.meta.dirname, '..')
const outDir = path.join(repoRoot, 'pr-assets/pr-48')
const baseMain = process.argv[2] ?? 'http://127.0.0.1:4322'
const baseBranch = process.argv[3] ?? 'http://127.0.0.1:4321'

async function waitForServer(url) {
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (res.ok || res.status < 500) return
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error(`Server not ready: ${url}`)
}

async function syncPagefindToDist() {
  await execFileAsync('node', [path.join(repoRoot, 'scripts/sync-pagefind-from-prod.mjs')], {
    cwd: repoRoot,
  })
  await execFileAsync('cp', ['-a', path.join(repoRoot, 'public/pagefind'), path.join(repoRoot, '../website-main/public/')])
}

async function hideAstroToolbar(page) {
  await page.addStyleTag({
    content: 'astro-dev-toolbar, #dev-toolbar, .astro-dev-toolbar { display: none !important; }',
  })
}

async function addTitleCaption(page) {
  const title = await page.title()
  await page.evaluate((t) => {
    document.querySelector('[data-qa-caption]')?.remove()
    const bar = document.createElement('div')
    bar.setAttribute('data-qa-caption', 'true')
    bar.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:99998;background:#111827;color:#f9fafb;font:600 13px/1.4 ui-monospace,Menlo,monospace;padding:6px 12px;border-bottom:2px solid #facc15;'
    bar.textContent = `document.title → ${t}`
    document.body.prepend(bar)
  }, title)
}

async function addConsoleMainCount(page) {
  const count = await page.evaluate(() => document.querySelectorAll('main').length)
  await page.evaluate((n) => {
    document.querySelector('[data-qa-console]')?.remove()
    const bar = document.createElement('div')
    bar.setAttribute('data-qa-console', 'true')
    bar.style.cssText =
      'position:fixed;bottom:0;left:0;right:0;z-index:99998;background:#1e1e1e;color:#4ade80;font:13px/1.5 ui-monospace,Menlo,monospace;padding:10px 14px;border-top:1px solid #374151;'
    bar.textContent = `> document.querySelectorAll('main').length\n${n}`
    document.body.appendChild(bar)
  }, count)
}

async function stackImages(topPath, bottomPath, outPath) {
  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-i',
      topPath,
      '-i',
      bottomPath,
      '-filter_complex',
      'vstack=inputs=2',
      '-frames:v',
      '1',
      '-update',
      '1',
      outPath,
    ])
    await rm(topPath)
    await rm(bottomPath)
  } catch {
    await writeFile(outPath, await readFile(topPath))
  }
}

async function captureSearch(page, base, file, isBefore) {
  await page.setViewportSize({ width: 1400, height: 900 })
  const client = await page.context().newCDPSession(page)
  await client.send('Network.enable')
  await page.goto(`${base}/search/`, { waitUntil: 'domcontentloaded' })
  await hideAstroToolbar(page)
  const input = page.locator('input[type="text"]').first()
  await input.fill('dali')
  await page.waitForSelector('.pagefind-ui__result', { timeout: 25000 })
  if (isBefore) await page.waitForTimeout(800)
  else await page.waitForTimeout(2000)
  await page.screenshot({ path: file })
}

async function captureArticle(page, base, file, isBefore) {
  await page.setViewportSize({ width: 1400, height: 900 })
  if (isBefore) {
    await page.route('**/*', async (route) => {
      const url = route.request().url()
      if (route.request().resourceType() === 'image' && (url.includes('logo.svg') || url.includes('edition-004-cover'))) {
        await new Promise((r) => setTimeout(r, 8000))
      }
      await route.continue()
    })
  }
  await page.goto(`${base}/articles/dali-chinas-spiritual-homeland-for-digital-nomads/`, {
    waitUntil: 'commit',
  })
  await hideAstroToolbar(page)
  await page.waitForTimeout(isBefore ? 150 : 1500)
  await page.screenshot({ path: file })
  if (isBefore) await page.unrouteAll()
}

async function captureTitlePair(page, base, outPath, pathA, pathB) {
  const tmpA = outPath.replace('.png', '-tmp-a.png')
  const tmpB = outPath.replace('.png', '-tmp-b.png')
  await page.setViewportSize({ width: 1400, height: 720 })
  await page.goto(`${base}${pathA}`, { waitUntil: 'networkidle' })
  await hideAstroToolbar(page)
  await addTitleCaption(page)
  await page.screenshot({ path: tmpA })
  await page.goto(`${base}${pathB}`, { waitUntil: 'networkidle' })
  await hideAstroToolbar(page)
  await addTitleCaption(page)
  await page.screenshot({ path: tmpB })
  await stackImages(tmpA, tmpB, outPath)
}

async function captureNewsletterMain(page, base, file) {
  await page.setViewportSize({ width: 1280, height: 820 })
  await page.goto(`${base}/newsletter/`, { waitUntil: 'networkidle' })
  await hideAstroToolbar(page)
  await addConsoleMainCount(page)
  await page.screenshot({ path: file })
}

await waitForServer(`${baseBranch}/`)
await waitForServer(`${baseMain}/`)
await mkdir(outDir, { recursive: true })
await syncPagefindToDist()

const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

await captureSearch(page, baseMain, path.join(outDir, 'before-18-search.png'), true)
await captureSearch(page, baseBranch, path.join(outDir, 'after-18-search.png'), false)

await captureArticle(page, baseMain, path.join(outDir, 'before-19-article-header.png'), true)
await captureArticle(page, baseBranch, path.join(outDir, 'after-19-article-header.png'), false)

await captureTitlePair(
  page,
  baseMain,
  path.join(outDir, 'before-20-titles.png'),
  '/free-magazines-internations/',
  '/magazines-giveaway/',
)
await captureTitlePair(
  page,
  baseBranch,
  path.join(outDir, 'after-20-titles.png'),
  '/free-magazines-internations/',
  '/magazines-giveaway/',
)

await captureNewsletterMain(page, baseMain, path.join(outDir, 'before-20-newsletter-main.png'))
await captureNewsletterMain(page, baseBranch, path.join(outDir, 'after-20-newsletter-main.png'))

await browser.close()
console.log('Screenshots saved:', outDir)