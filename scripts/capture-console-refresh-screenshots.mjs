#!/usr/bin/env node
/** Static console shell previews for style screenshots (no auth, no real listing data). */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '/tmp/capture/node_modules/playwright-chromium/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cssPath = path.join(root, 'src/styles/console.css')
const outArg = process.argv.find((a) => a.startsWith('--out='))
const outDir = outArg ? path.resolve(outArg.slice(6)) : path.join(root, 'pr-assets/pr-49')
const phase = process.argv.includes('--phase=before') ? 'before' : 'after'

async function shell(title, main) {
  const css = await fs.readFile(cssPath, 'utf8')
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title><style>${css}</style></head>
<body class="owner-console">
<div class="console-shell">
<aside class="console-sidebar" aria-label="Owner workspace">
<a href="#" class="console-brand"><img src="file://${root}/public/logo.svg" alt="Nomad Magazine" width="150" height="32"/><span>Directory owner workspace</span></a>
<nav aria-label="Console navigation">
<a href="#"${title === 'My listings' ? ' aria-current="page"' : ''}>My listings</a>
<a href="#"${title === 'Add a listing' ? ' aria-current="page"' : ''}>Add a listing</a>
<a href="#">Updates</a>
<a href="#">Affiliate programmes</a>
<a href="#">Your badges</a>
<a href="#"${title === 'Review queue' ? ' aria-current="page"' : ''}>Review queue</a>
</nav>
<form class="signout"><button class="button secondary" type="button">Sign out</button></form>
</aside>
<main class="console-main" id="main-content">
<header class="console-topbar"><h1>${title}</h1><a class="link" href="#">View directory ↗</a></header>
<div class="console-content">${main}</div>
</main></div></body></html>`
}

const pages = {
  listings: () =>
    shell(
      'My listings',
      `<div class="row"><div><p class="eyebrow">Your space in the nomad community</p><h2>Make your next connection.</h2><p class="muted">Manage your listings, share what’s new and bring your offers to nomads.</p></div><a href="#" class="button">Add a listing</a></div>
<div class="stats"><div class="panel"><strong>0</strong><span class="muted">Your listings</span></div><div class="panel"><strong>0</strong><span class="muted">Published</span></div><div class="panel"><strong>0</strong><span class="muted">Awaiting review</span></div></div>
<section class="panel"><h3>Let’s get your business listed.</h3><p class="muted">Create a listing or claim one below using its original contact email.</p><a href="#" class="button actions">Create your first listing</a></section>
<section class="panel"><h3>Already in the directory?</h3><p class="muted">Claim your existing listing using its original contact email.</p></section>`,
    ),
  review: () =>
    shell(
      'Review queue',
      `<p class="eyebrow">Directory moderation</p><h2>Review before it goes live.</h2><p class="muted">Compare proposed changes with what is live today.</p>
<p class="muted actions">2 submissions awaiting review</p>
<section class="panel"><div class="row"><h3>Example Coliving Space</h3><span class="tag pending">listing</span></div>
<div class="field"><label>Reviewer notes (optional)</label><textarea rows="3" placeholder="Share feedback if changes are needed."></textarea></div>
<div class="actions"><button class="button" type="button">Approve and publish</button><button class="button secondary" type="button">Request changes</button></div></section>`,
    ),
  form: () =>
    shell(
      'Add a listing',
      `<p class="eyebrow">Your business, your story</p><h2>Introduce your business to nomads.</h2><p class="muted">Submit details for review before they appear in the directory.</p>
<form style="display:block" class="actions"><section class="panel">
<div class="grid"><div class="field"><label for="name">Business name</label><input id="name" value="Sample Workspace Co."/></div>
<div class="field"><label for="cat">Category</label><select id="cat"><option>Coliving</option></select></div></div>
<div class="field"><label for="desc">Description</label><textarea id="desc" rows="4">A friendly workspace for remote workers.</textarea></div>
<div class="actions"><button class="button" type="button">Submit for review</button><button class="button secondary" type="button">Save draft</button></div>
</section></form>`,
    ),
}

async function shot(page, name, html, width, height = 900) {
  const tmp = path.join(outDir, `.tmp-${name}.html`)
  await fs.writeFile(tmp, html)
  const out = path.join(outDir, `${phase}-${name}-${width}.png`)
  await page.setViewportSize({ width, height })
  await page.goto(`file://${tmp}`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: out, fullPage: true })
  await fs.unlink(tmp)
  return out
}

await fs.mkdir(outDir, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const names = []
for (const [key, build] of Object.entries(pages)) {
  const html = await build()
  names.push(await shot(page, `${key}`, html, 1280, 1000))
  names.push(await shot(page, `${key}-mobile`, html, 390, 1200))
}
await browser.close()
console.log(JSON.stringify({ phase, outDir, files: names }))