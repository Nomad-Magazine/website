import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const origin = process.env.DIRECTORY_TEST_URL || 'http://localhost:3000'
const response = await fetch(`${origin}/nomad_directory/`)
assert.equal(response.status, 200, 'Directory runtime is available')
const html = await response.text()
const home = await readFile('dist/client/index.html', 'utf8')
const { records } = JSON.parse(await readFile('src/utils/nomad_cache_table_6857167d82358a0f5e038c3f.json', 'utf8'))
const published = records.filter((record) => record.sf4ad525dd && record.title)
const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]))
const collection = schemas.find((schema) => schema['@type'] === 'CollectionPage')
assert.equal(collection.url, 'https://nomad-magazine.com/nomad_directory/')
assert(collection.mainEntity.numberOfItems >= published.length)
assert.equal(collection.mainEntity.itemListElement.length, collection.mainEntity.numberOfItems)
for (const record of published) assert(html.includes(`id="listing-${record.id}"`), `Missing rendered listing: ${record.title}`)
for (const [name, page] of [
  ['home', home],
  ['directory', html],
]) {
  assert.equal((page.match(/<main[\s>]/g) || []).length, 1, `${name}: one main landmark`)
  assert.equal((page.match(/<h1[\s>]/g) || []).length, 1, `${name}: one H1`)
  const decode = (value) =>
    value
      .replace(/&#(\d+);/g, (_,code) => String.fromCodePoint(Number(code)))
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
  const title = decode(page.match(/<title>(.*?)<\/title>/s)[1])
  const description = decode(page.match(/<meta name="description" content="([^"]+)"/)[1])
  assert(title.length >= 50 && title.length <= 60, `${name}: title length ${title.length}`)
  assert(description.length >= 150 && description.length <= 160, `${name}: description length ${description.length}`)
  for (const match of page.matchAll(/<img\b[^>]*>/g)) {
    assert(/\balt=/.test(match[0]), `${name}: image without alt text`)
    const src = match[0].match(/\bsrc="([^"]+)"/)?.[1]
    assert(src && /\.(webp|svg)$/.test(src), `${name}: non-WebP image ${src}`)
    if (src.startsWith('/')) assert(existsSync(`dist/client${src}`), `${name}: missing asset ${src}`)
  }
  for (const match of page.matchAll(/<a\b[^>]*href="(\/[^"?#]*)[^"\s]*"[^>]*>/g)) {
    assert(match[1].endsWith('/'), `${name}: internal path without trailing slash ${match[1]}`)
  }
}
const sitemap = await readFile('dist/client/sitemap-0.xml', 'utf8')
assert(sitemap.includes('<loc>https://nomad-magazine.com/nomad_directory/</loc>'), 'Preserve the directory sitemap URL')
console.log(`PASS: ${published.length} rendered listings, collection schema, canonical, sitemap, headings, metadata, internal URLs and local WebP images.`)

const { directoryRoutes } = await import('../src/utils/directory-routes.mjs')
for (const route of directoryRoutes(records)) {
  const path = `/nomad_directory/${route.slug}/`
  assert(sitemap.includes(`<loc>https://nomad-magazine.com${path}</loc>`), `Existing sitemap path preserved: ${path}`)
  const response = await fetch(origin + path)
  assert.equal(response.status, 200, path)
  const page = await response.text()
  assert.equal((page.match(/<main[\s>]/g) || []).length, 1, path)
  assert.equal((page.match(/<h1[\s>]/g) || []).length, 1, path)
  assert(page.includes(`href="https://nomad-magazine.com${path}"`), `Canonical: ${path}`)
  const decode = (value) => value.replace(/&#(\d+);/g, (_,code) => String.fromCodePoint(Number(code))).replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"')
  const title = decode(page.match(/<title>(.*?)<\/title>/s)[1])
  const description = decode(page.match(/<meta name="description" content="([^"]+)"/)[1])
  assert(title.length >= 50 && title.length <= 60, `${path}: title ${title.length}`)
  assert(description.length >= 150 && description.length <= 160, `${path}: description ${description.length}`)
}
console.log('PASS: every existing category/location URL responds, stays in the sitemap, and has a canonical, one main/H1 and compliant metadata.')
