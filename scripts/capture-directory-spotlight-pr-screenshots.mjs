#!/usr/bin/env node
/**
 * Capture directory spotlight before/after assets for a PR.
 * Usage:
 *   node scripts/capture-directory-spotlight-pr-screenshots.mjs --before-url=http://127.0.0.1:4321 --after-url=http://127.0.0.1:4322 --out=pr-assets/pr-54
 */
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outArg = process.argv.find((a) => a.startsWith('--out='))
const beforeArg = process.argv.find((a) => a.startsWith('--before-url='))
const afterArg = process.argv.find((a) => a.startsWith('--after-url='))
const outDir = path.resolve(outArg?.slice(6) ?? path.join(root, 'pr-assets/pr-54'))
const beforeBase = (beforeArg?.slice(13) ?? 'http://127.0.0.1:4321').replace(/\/$/, '')
const afterBase = (afterArg?.slice(12) ?? beforeBase).replace(/\/$/, '')

const routes = [
  { slug: 'main', path: '/nomad_directory/', scroll: '#directory-spotlight-heading' },
  { slug: 'coliving', path: '/nomad_directory/coliving/', scroll: '#directory-spotlight-heading' },
]

const viewports = [
  { name: '1280', width: 1280, height: 900 },
  { name: '390', width: 390, height: 1200 },
]

async function capturePage(page, base, route, viewport, outfile) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height })
  const response = await page.goto(`${base}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  if (!response?.ok()) throw new Error(`${route.path} returned ${response?.status()}`)
  await page.evaluate(() => document.fonts.ready)
  const scrollTarget = page.locator(route.scroll).first()
  if (await scrollTarget.count()) {
    await scrollTarget.scrollIntoViewIfNeeded()
    await page.evaluate((sel) => {
      const el = document.querySelector(sel)
      if (!el) return
      const y = el.getBoundingClientRect().top + scrollY - 24
      window.scrollTo({ top: Math.max(0, y), behavior: 'instant' })
    }, route.scroll)
  }
  await page.waitForTimeout(400)
  await page.screenshot({ path: outfile, fullPage: false, animations: 'disabled' })
}

async function runSet(browser, label, base) {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  for (const route of routes) {
    for (const viewport of viewports) {
      const name = `${label}-${route.slug}-${viewport.name}.png`
      const outfile = path.join(outDir, name)
      await capturePage(page, base, route, viewport, outfile)
      console.log('wrote', name)
    }
  }
  await context.close()
}

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  await runSet(browser, 'before', beforeBase)
  if (afterBase !== beforeBase) await runSet(browser, 'after', afterBase)
  else {
    console.warn('after-url not set; only captured before set (rename manually if needed)')
  }
} finally {
  await browser.close()
}