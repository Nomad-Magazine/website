#!/usr/bin/env node
/**
 * Capture /nomad_directory/ spotlight with fixture sponsored ids (production preview).
 * Usage: node scripts/capture-sponsorship-spotlight-screenshots.mjs --out=pr-assets/pr-57
 */
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outArg = process.argv.find((a) => a.startsWith('--out='))
const outDir = path.resolve(outArg?.slice(6) ?? path.join(root, 'pr-assets/pr-57'))
const base = 'http://127.0.0.1:4321'
const sponsorIds = ['655f3e03b70314e077fe8f5a', '6565f68ed4c2f8e720cdede3']

async function waitForServer(url, attempts = 120) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url)
      if (response.status < 500) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Preview server did not start: ${url}`)
}

async function captureSpotlight(page, name, route, width, height, outfile) {
  await page.setViewportSize({ width, height })
  const response = await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  if (!response?.ok()) throw new Error(`${route} returned ${response?.status()}`)
  await page.evaluate(() => document.fonts.ready)
  await page
    .waitForFunction(
      () => {
        const track = document.getElementById('directory-spotlight-track')
        return track?.getAttribute('aria-busy') === 'false' && track?.textContent?.includes('SPONSORED')
      },
      { timeout: 30000 },
    )
    .catch(() => {})
  const heading = page.locator('#directory-spotlight-heading').first()
  if (await heading.count()) await heading.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await page.screenshot({ path: outfile, fullPage: false, animations: 'disabled' })
  console.log('wrote', name)
}

let preview
try {
  await mkdir(outDir, { recursive: true })
  preview = spawn('bun', ['run', 'preview', '--port', '4321', '--host', '127.0.0.1'], {
    cwd: root,
    env: { ...process.env, PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}` },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  await waitForServer(`${base}/nomad_directory/`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.route('**/api/directory-active-sponsors/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ listing_ids: sponsorIds }),
    })
  })

  await captureSpotlight(
    page,
    'after-spotlight-main-1280.png',
    '/nomad_directory/',
    1280,
    900,
    path.join(outDir, 'after-spotlight-main-1280.png'),
  )
  await captureSpotlight(
    page,
    'after-spotlight-main-mobile-390.png',
    '/nomad_directory/',
    390,
    1200,
    path.join(outDir, 'after-spotlight-main-mobile-390.png'),
  )

  await context.close()
  await browser.close()
} finally {
  if (preview && !preview.killed) preview.kill('SIGTERM')
}