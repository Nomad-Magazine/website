import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const out = path.resolve(import.meta.dirname, '../public/pagefind')
const base = 'https://nomad-magazine.com'
const urls = new Set()

const core = [
  'pagefind.js',
  'pagefind-worker.js',
  'pagefind-entry.json',
  'wasm.en.pagefind',
  'pagefind.en_8f08c6751a.pf_meta',
]

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('request', (r) => {
  const u = r.url()
  if (u.includes('/pagefind/') && !u.includes('?')) urls.add(u.split('?')[0])
})

await page.goto(`${base}/search/`, { waitUntil: 'networkidle' })
for (const q of ['a', 'e', 'i', 'o', 'nomad', 'dali', 'china', 'edition', 'magazine', 'remote']) {
  const input = page.locator('input[type="text"]').first()
  await input.fill('')
  await input.fill(q)
  await page.waitForTimeout(2500)
}
await browser.close()

for (const f of core) urls.add(`${base}/pagefind/${f}`)

await mkdir(path.join(out, 'index'), { recursive: true })
await mkdir(path.join(out, 'fragment'), { recursive: true })

for (const url of urls) {
  const rel = url.replace(`${base}/pagefind/`, '')
  const dest = path.join(out, rel)
  await mkdir(path.dirname(dest), { recursive: true })
  const res = await fetch(url)
  if (!res.ok) {
    console.warn('skip', url, res.status)
    continue
  }
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, buf)
  console.log('ok', rel, buf.length)
}