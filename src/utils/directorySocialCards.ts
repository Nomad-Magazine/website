import {
  directoryListingHeroOverrides,
  directoryListingPlaceOverrides,
  directoryListingWebsiteUrls,
  isPhysicalColiving,
  nomadDirectoryUrl,
} from '~/const/newDirectoryListings'

export type DirectoryListingInput = {
  id: string
  title: string
  category: string
  description: string
  specialOffer: string
  link: string
  logo: string
  isDarkLogo: boolean
  slug: string
}

export type IgSlide =
  | { kind: 'cover'; index: number }
  | { kind: 'about'; index: number; text: string; part: number; parts: number }
  | { kind: 'place'; index: number; image: string; alt: string }
  | { kind: 'offer'; index: number; text: string }
  | { kind: 'hero-quote'; index: number; text: string }
  | { kind: 'cta'; index: number }

export type ListingSocialPack = {
  heroImage: string
  heroImageAlt: string
  placeImage?: string
  placeImageAlt?: string
  descriptionChunks: string[]
  offerChunks: string[]
  pullQuote: string
  instagramSlides: IgSlide[]
  instagramSlideCount: number
  linkedInCopy: string
  twitterCopy: string
}

export type BatchListingEntry = DirectoryListingInput & { heroImage: string; placeImage?: string }

export type BatchIgSlide =
  | { kind: 'batch-intro'; index: number }
  | {
      kind: 'batch-detail'
      index: number
      listingSlug: string
      focus: 'about' | 'offer' | 'place'
      text: string
      heroImage: string
      placeImage?: string
      part?: number
    }
  | { kind: 'batch-cta'; index: number }

export type BatchSocialPack = {
  listings: BatchListingEntry[]
  slides: BatchIgSlide[]
  slideCount: number
  linkedInCopy: string
  twitterCopy: string
}

const SLIDE_TEXT_MAX = 130
const BATCH_DETAIL_MAX = 155

export function slugify(str: string): string {
  return str.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function normalizeLink(raw: string): string {
  const t = (raw || '').trim()
  if (!t) return ''
  return /^https?:\/\//i.test(t) ? t.replace(/^Https:/i, 'https:') : `https://${t}`
}

export function displayLink(link: string): string {
  return link.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}

/** Strip URLs and trailing "at domain..." clutter from offer text for card display. */
export function formatOfferForCard(text: string): string {
  return text
    .replace(/https?:\/\/[^\s]+/gi, '')
    .replace(/\s+at\s+[a-z0-9.-]+\.[a-z]{2,}[^\s]*/gi, '')
    .replace(/\s*—\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function splitIntoSentences(text: string): string[] {
  return (
    text
      .trim()
      .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
      ?.map((s) => s.trim())
      .filter(Boolean) ?? []
  )
}

export function chunkText(text: string, maxChars = SLIDE_TEXT_MAX): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (trimmed.length <= maxChars) return [trimmed]

  const sentences = splitIntoSentences(trimmed)
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence
    if (next.length > maxChars && current) {
      chunks.push(current.trim())
      current = sentence
    } else {
      current = next
    }
  }

  if (current.trim()) chunks.push(current.trim())

  const normalized: string[] = []
  for (const chunk of chunks) {
    if (chunk.length <= maxChars) {
      normalized.push(chunk)
      continue
    }
    let rest = chunk
    while (rest.length > maxChars) {
      const cut = rest.lastIndexOf(' ', maxChars)
      const idx = cut > 60 ? cut : maxChars
      normalized.push(rest.slice(0, idx).trim())
      rest = rest.slice(idx).trim()
    }
    if (rest) normalized.push(rest)
  }

  return normalized.length ? normalized : [trimmed.slice(0, maxChars).trim()]
}

function pickPullQuote(description: string): string {
  const sentences = splitIntoSentences(description)
    .filter((s) => s.length >= 40 && s.length <= 200)
    .sort((a, b) => {
      const score = (s: string) => {
        let sc = 0
        const lower = s.toLowerCase()
        if (/\b(nomad|remote|coliving|community|cowork|digital|work|travel|adventure|norway|madeira|china|portugal)\b/.test(lower)) sc += 2
        if (s.length >= 70 && s.length <= 150) sc += 2
        return sc
      }
      return score(b) - score(a)
    })
  return sentences[0] ?? description.slice(0, 160).trim()
}

export function resolveHeroImagePath(listing: DirectoryListingInput): string {
  if (directoryListingHeroOverrides[listing.title]) {
    return directoryListingHeroOverrides[listing.title]
  }
  const slugPath = `/images/directory-social-${listing.slug}.webp`
  return slugPath
}

export async function fetchOgImageUrl(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NomadMagazineBot/1.0)' },
      redirect: 'follow',
    })
    if (!res.ok) return null
    const html = await res.text()
    const match = html.match(
      /property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["']|content=["']([^"']+)["'][^>]*property=["']og:image(?::url)?["']/i,
    )
    const imageUrl = match?.[1] || match?.[2]
    if (!imageUrl) return null
    return imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, pageUrl).href
  } catch {
    return null
  }
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"')
}

function scorePlaceImageCandidate(url: string): number {
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

function collectImageCandidates(html: string, pageUrl: string): string[] {
  const candidates = new Set<string>()

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

  for (const match of html.matchAll(/url\(["']?([^"']+?\.(?:jpe?g|webp|png)[^"']*?)["']?\)/gi)) {
    const raw = decodeHtmlEntities(match[1])
    if (!raw.startsWith('data:')) {
      candidates.add(raw.startsWith('http') ? raw : new URL(raw, pageUrl).href)
    }
  }

  return [...candidates]
}

/** Pick the best physical-space photo from a listing website. */
export async function fetchBestPlaceImageUrl(
  pageUrl: string,
  excludeUrls: string[] = [],
): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NomadMagazineBot/1.0)' },
      redirect: 'follow',
    })
    if (!res.ok) return null

    const html = await res.text()
    const excluded = new Set(excludeUrls.filter(Boolean))
    const ranked = collectImageCandidates(html, pageUrl)
      .map((url) => ({ url, score: scorePlaceImageCandidate(url) }))
      .filter(({ url, score }) => score > 0 && !excluded.has(url))
      .sort((a, b) => b.score - a.score)

    return ranked[0]?.url ?? null
  } catch {
    return null
  }
}

export function resolvePlaceImagePath(listing: DirectoryListingInput): string {
  if (directoryListingPlaceOverrides[listing.title]) {
    return directoryListingPlaceOverrides[listing.title]
  }
  return `/images/directory-place-${listing.slug}.webp`
}

function sameImageAsset(a?: string, b?: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const idA = a.match(/media\/([^/?~]+)/)?.[1]
  const idB = b.match(/media\/([^/?~]+)/)?.[1]
  return !!(idA && idB && idA === idB)
}

export async function resolvePlaceImage(
  listing: DirectoryListingInput,
  heroImage?: string,
): Promise<string | null> {
  if (!isPhysicalColiving(listing.category)) return null

  const candidates: string[] = []

  if (directoryListingPlaceOverrides[listing.title]) {
    candidates.push(directoryListingPlaceOverrides[listing.title])
  }

  const siteUrl = directoryListingWebsiteUrls[listing.title] || listing.link
  if (siteUrl) {
    const exclude = [heroImage, ...candidates].filter(Boolean) as string[]
    const best = await fetchBestPlaceImageUrl(siteUrl, exclude)
    if (best) candidates.unshift(best)
  }

  candidates.push(resolvePlaceImagePath(listing))

  const place = candidates.find((url) => url && url !== heroImage && !sameImageAsset(url, heroImage))
  return place ?? null
}

export async function resolveHeroImage(listing: DirectoryListingInput): Promise<string> {
  if (directoryListingHeroOverrides[listing.title]) {
    return directoryListingHeroOverrides[listing.title]
  }

  const localPath = `/images/directory-social-${listing.slug}.webp`
  const siteUrl = directoryListingWebsiteUrls[listing.title] || listing.link
  if (siteUrl) {
    const og = await fetchOgImageUrl(siteUrl)
    if (og) return og
  }

  return localPath
}

function buildLinkedInCopy(listing: DirectoryListingInput): string {
  const lines = [
    `New at Nomad Directory: ${listing.title} 🌍`,
    '',
    `${listing.category}${listing.description ? ` · ${listing.description.slice(0, 180)}${listing.description.length > 180 ? '…' : ''}` : ''}`,
  ]
  if (listing.specialOffer) lines.push('', `🎁 ${listing.specialOffer}`)
  lines.push('', `Browse 150+ vetted nomad tools, colivings, and services:`, nomadDirectoryUrl, '', '#DigitalNomad #RemoteWork #NomadDirectory #Coliving')
  return lines.join('\n')
}

function buildTwitterCopy(listing: DirectoryListingInput): string {
  const desc = listing.description.slice(0, 100)
  const offer = listing.specialOffer ? ` ${listing.specialOffer.slice(0, 60)}` : ''
  return `New at Nomad Directory: ${listing.title} — ${desc}${listing.description.length > 100 ? '…' : ''}${offer} ${nomadDirectoryUrl}`
}

export function computeListingSocialPack(
  listing: DirectoryListingInput,
  heroImage: string,
  placeImage?: string | null,
): ListingSocialPack {
  const descriptionChunks = chunkText(listing.description)
  const offerText = listing.specialOffer.trim()
  const pullQuote = pickPullQuote(listing.description)
  const placeAlt = `${listing.title} coliving space`

  const slides: IgSlide[] = [{ kind: 'cover', index: 1 }]

  descriptionChunks.forEach((text, i) => {
    slides.push({
      kind: 'about',
      index: slides.length + 1,
      text,
      part: i + 1,
      parts: descriptionChunks.length,
    })
  })

  if (placeImage) {
    slides.push({
      kind: 'place',
      index: slides.length + 1,
      image: placeImage,
      alt: placeAlt,
    })
  }

  if (offerText) {
    slides.push({
      kind: 'offer',
      index: slides.length + 1,
      text: offerText,
    })
  }

  if (pullQuote && heroImage) {
    slides.push({ kind: 'hero-quote', index: slides.length + 1, text: pullQuote })
  }

  slides.push({ kind: 'cta', index: slides.length + 1 })

  const total = slides.length
  const numbered = slides.map((slide, i) => ({ ...slide, index: i + 1 })) as IgSlide[]

  return {
    heroImage,
    heroImageAlt: `${listing.title} — ${listing.category || 'Nomad Directory listing'}`,
    placeImage: placeImage || undefined,
    placeImageAlt: placeImage ? placeAlt : undefined,
    descriptionChunks,
    offerChunks: offerText ? [offerText] : [],
    pullQuote,
    instagramSlides: numbered,
    instagramSlideCount: total,
    linkedInCopy: buildLinkedInCopy(listing),
    twitterCopy: buildTwitterCopy(listing),
  }
}

function buildBatchLinkedInCopy(listings: BatchListingEntry[]): string {
  const lines = [
    'New at Nomad Directory 🌍',
    '',
    ...listings.map((l) => `• ${l.title}${l.category ? ` (${l.category})` : ''}`),
    '',
    'Colivings, coworkings, and nomad services — vetted for the location-independent lifestyle.',
    '',
    nomadDirectoryUrl,
    '',
    '#DigitalNomad #RemoteWork #NomadDirectory #Coliving',
  ]
  return lines.join('\n')
}

function buildBatchTwitterCopy(listings: BatchListingEntry[]): string {
  const names = listings.map((l) => l.title).join(', ')
  return `4 new listings in the Nomad Directory: ${names}. Browse colivings, coworkings & nomad services → ${nomadDirectoryUrl}`
}

export function computeBatchSocialPack(listings: BatchListingEntry[]): BatchSocialPack {
  const slides: BatchIgSlide[] = [{ kind: 'batch-intro', index: 1 }]

  for (const listing of listings) {
    const descChunks = chunkText(listing.description, BATCH_DETAIL_MAX)
    const aboutText = descChunks[0] || listing.description

    slides.push({
      kind: 'batch-detail',
      index: slides.length + 1,
      listingSlug: listing.slug,
      focus: 'about',
      text: aboutText,
      heroImage: listing.heroImage,
      part: descChunks.length > 1 ? 1 : undefined,
    })

    if (listing.placeImage) {
      slides.push({
        kind: 'batch-detail',
        index: slides.length + 1,
        listingSlug: listing.slug,
        focus: 'place',
        text: '',
        heroImage: listing.heroImage,
        placeImage: listing.placeImage,
      })
    }

    const offerText = listing.specialOffer.trim()
    if (offerText) {
      slides.push({
        kind: 'batch-detail',
        index: slides.length + 1,
        listingSlug: listing.slug,
        focus: 'offer',
        text: offerText,
        heroImage: listing.heroImage,
      })
    } else if (descChunks.length > 1) {
      slides.push({
        kind: 'batch-detail',
        index: slides.length + 1,
        listingSlug: listing.slug,
        focus: 'about',
        text: descChunks.slice(1).join(' '),
        heroImage: listing.heroImage,
        part: 2,
      })
    }
  }

  slides.push({ kind: 'batch-cta', index: slides.length + 1 })

  const numbered = slides.map((slide, i) => ({ ...slide, index: i + 1 })) as BatchIgSlide[]

  return {
    listings,
    slides: numbered,
    slideCount: numbered.length,
    linkedInCopy: buildBatchLinkedInCopy(listings),
    twitterCopy: buildBatchTwitterCopy(listings),
  }
}
