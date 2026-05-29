#!/usr/bin/env node
/**
 * Downloads hero and place images for Nomad Directory social cards.
 * Saves WebP files to public/images/
 *
 * Usage:
 *   node scripts/fetch-directory-social-images.mjs              # hero images
 *   node scripts/fetch-directory-social-images.mjs --place      # coliving place photos
 *   node scripts/fetch-directory-social-images.mjs "Madeira Remote"
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMAGES_DIR = path.join(__dirname, '../public/images')

const DEFAULT_LISTINGS = [
  { title: 'Madeira Remote', url: 'https://madeiraremote.com/', category: 'Coliving' },
  { title: 'Find Your Coliving', url: 'https://findyourcoliving.com/', category: 'Coliving Service' },
  { title: 'Arctic Coliving', url: 'https://www.arcticcoliving.com/', category: 'Coliving' },
  { title: 'Nomad Shophouse', url: 'https://nomadshophouse.com/', category: 'Coliving' },
]

const PLACE_OVERRIDES = {
  'Madeira Remote': 'https://madeiraremote.com/casa-do-pico-rooms/strelitzia/1.jpg',
}

function slugify(str) {
  return str.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function isPhysicalColiving(category) {
  const c = (category || '').trim().toLowerCase()
  if (!c.includes('coliving')) return false
  if (c.includes('service') || c.includes('platform') || c.includes('directory')) return false
  return true
}

function decodeHtmlEntities(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"')
}

function scorePlaceImageCandidate(url) {
  const lower = url.toLowerCase()
  let score = 0
  if (/\.(jpe?g|webp)(\?|$)/.test(lower)) score += 4
  if (/\.png(\?|$)/.test(lower)) score += 1
  if (/logo|icon|favicon|avatar|badge|sprite|emoji|svg/.test(lower)) score -= 20
  const widthMatch = lower.match(/(?:width=|w_)(\d{3,4})/)
  const heightMatch = lower.match(/(?:height=|h_)(\d{3,4})/)
  const width = widthMatch ? Number(widthMatch[1]) : 0
  const height = heightMatch ? Number(heightMatch[1]) : 0
  if (width >= 1200 || height >= 800) score += 8
  else if (width >= 800 || height >= 600) score += 5
  else if (width >= 400 || height >= 300) score += 2
  else if ((width > 0 && width < 200) || (height > 0 && height < 200)) score -= 8
  if (/hero|banner|terrace|villa|lodge|coliving|cowork|space|property|room|house|interior|exterior|view|landscape|community/.test(lower)) {
    score += 4
  }
  return score
}

function collectImageCandidates(html, pageUrl) {
  const candidates = new Set()
  const metaPatterns = [
    /property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["']/gi,
    /content=["']([^"']+)["'][^>]*property=["']og:image(?::url)?["']/gi,
    /property=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/gi,
    /content=["']([^"']+)["'][^>]*property=["']twitter:image(?::src)?["']/gi,
  ]
  for (const pattern of metaPatterns) {
    for (const match of html.matchAll(pattern)) {
      const raw = decodeHtmlEntities(match[1])
      if (!raw) continue
      candidates.add(raw.startsWith('http') ? raw : new URL(raw, pageUrl).href)
    }
  }
  for (const match of html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)) {
    const raw = decodeHtmlEntities(match[1])
    if (!raw || raw.startsWith('data:')) continue
    candidates.add(raw.startsWith('http') ? raw : new URL(raw, pageUrl).href)
  }
  return [...candidates]
}

async function fetchOgImage(pageUrl) {
  const res = await fetch(pageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NomadMagazineBot/1.0)' },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${pageUrl}`)
  const html = await res.text()
  const match = html.match(
    /property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["']|content=["']([^"']+)["'][^>]*property=["']og:image(?::url)?["']/i,
  )
  const imageUrl = match?.[1] || match?.[2]
  if (!imageUrl) throw new Error(`No og:image on ${pageUrl}`)
  return imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, pageUrl).href
}

async function fetchBestPlaceImage(listing) {
  if (PLACE_OVERRIDES[listing.title]) {
    return PLACE_OVERRIDES[listing.title]
  }
  const res = await fetch(listing.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NomadMagazineBot/1.0)' },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${listing.url}`)
  const html = await res.text()
  const ranked = collectImageCandidates(html, listing.url)
    .map((url) => ({ url, score: scorePlaceImageCandidate(url) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
  if (!ranked[0]) throw new Error(`No place image candidates on ${listing.url}`)
  return ranked[0].url
}

async function downloadWebp(imageUrl, outPath) {
  const res = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`Failed to download ${imageUrl}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  await sharp(buffer).webp({ quality: 82 }).toFile(outPath)
}

async function downloadHero(listing) {
  const slug = slugify(listing.title)
  const outPath = path.join(IMAGES_DIR, `directory-social-${slug}.webp`)
  const ogUrl = await fetchOgImage(listing.url)
  await downloadWebp(ogUrl, outPath)
  console.log(`✓ ${listing.title} → /images/directory-social-${slug}.webp`)
}

async function downloadPlace(listing) {
  if (!isPhysicalColiving(listing.category)) {
    console.log(`– ${listing.title}: skipped (not a physical coliving)`)
    return
  }
  const slug = slugify(listing.title)
  const outPath = path.join(IMAGES_DIR, `directory-place-${slug}.webp`)
  const imageUrl = PLACE_OVERRIDES[listing.title] || (await fetchBestPlaceImage(listing))
  await downloadWebp(imageUrl, outPath)
  console.log(`✓ ${listing.title} → /images/directory-place-${slug}.webp`)
}

async function main() {
  await fs.mkdir(IMAGES_DIR, { recursive: true })
  const args = process.argv.slice(2)
  const placeMode = args.includes('--place')
  const names = args.filter((a) => a !== '--place')
  const listings = names.length
    ? DEFAULT_LISTINGS.filter((l) => names.includes(l.title))
    : DEFAULT_LISTINGS

  if (!listings.length) {
    console.error('No matching listings. Available:', DEFAULT_LISTINGS.map((l) => l.title).join(', '))
    process.exit(1)
  }

  for (const listing of listings) {
    try {
      if (placeMode) await downloadPlace(listing)
      else await downloadHero(listing)
    } catch (err) {
      console.error(`✗ ${listing.title}:`, err.message)
    }
  }
}

main()
