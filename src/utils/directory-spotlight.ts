import { COUNTRY_TO_CONTINENT } from './directory-routes.mjs'
import { directoryLogoBoxClassFor, directoryLogoImageClassFor } from '../const/nomadDirectoryWhiteLogos'
import type { DirectoryEntry } from './directory'
import { getListingScreenshot } from './directory-screenshots'

export const SPOTLIGHT_NEW_DAYS = 30

export type SpotlightListing = {
  id: string
  title: string
  category: string
  description: string
  image: string
  screenshot: string
  addedAt: string
  country: string
  continent: string
  logoBoxClass: string
  logoImageClass: string
}

export function getRecordAddedAt(record: Record<string, unknown> | undefined): string {
  const nested = record?.first_created as { on?: string } | undefined
  return typeof nested?.on === 'string' ? nested.on : ''
}

function oneLineDescription(raw: string, max = 120): string {
  const text = raw.trim().replace(/\s+/g, ' ')
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export function buildSpotlightListings(
  entries: DirectoryEntry[],
  recordsById: Map<string, Record<string, unknown>>,
): SpotlightListing[] {
  const result: SpotlightListing[] = []
  for (const entry of entries) {
    const screenshot = getListingScreenshot(entry.id)
    if (!screenshot || !entry.image?.trim()) continue
    const description = oneLineDescription(entry.description)
    if (!description) continue
    const country = entry.country || ''
    result.push({
      id: entry.id,
      title: entry.title,
      category: entry.category,
      description,
      image: entry.image,
      screenshot,
      addedAt: getRecordAddedAt(recordsById.get(entry.id)),
      country,
      continent: country ? COUNTRY_TO_CONTINENT[country] || '' : '',
      logoBoxClass: directoryLogoBoxClassFor(entry.title),
      logoImageClass: directoryLogoImageClassFor(entry.title),
    })
  }
  return result
}

export function isSpotlightListingNew(addedAt: string, nowMs = Date.now()): boolean {
  if (!addedAt) return false
  const created = Date.parse(addedAt)
  if (Number.isNaN(created)) return false
  return nowMs - created <= SPOTLIGHT_NEW_DAYS * 24 * 60 * 60 * 1000
}

export type SpotlightPageType = 'all' | 'category' | 'country' | 'continent'

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function selectSpotlightListings(
  listings: SpotlightListing[],
  pageType: SpotlightPageType,
  filterValue: string,
  sponsoredIds: ReadonlySet<string> = new Set(),
  max = 4,
  maxSponsored = 2,
): SpotlightListing[] {
  const sponsored = listings.filter((item) => sponsoredIds.has(item.id))
  let preferredSponsored = sponsored
  if (pageType === 'category') preferredSponsored = sponsored.filter((item) => item.category === filterValue)
  else if (pageType === 'country') preferredSponsored = sponsored.filter((item) => item.country === filterValue)
  else if (pageType === 'continent') preferredSponsored = sponsored.filter((item) => item.continent === filterValue)

  const pickedSponsored = shuffle(
    preferredSponsored.length ? preferredSponsored : sponsored,
  ).slice(0, maxSponsored)

  const used = new Set(pickedSponsored.map((item) => item.id))

  let preferred: SpotlightListing[] = listings.filter((item) => !used.has(item.id))
  if (pageType === 'category') preferred = preferred.filter((item) => item.category === filterValue)
  else if (pageType === 'country') preferred = preferred.filter((item) => item.country === filterValue)
  else if (pageType === 'continent') preferred = preferred.filter((item) => item.continent === filterValue)

  const freePicked = shuffle(preferred).slice(0, max - pickedSponsored.length)
  for (const item of freePicked) used.add(item.id)

  if (pickedSponsored.length + freePicked.length >= max) {
    return [...pickedSponsored, ...freePicked].slice(0, max)
  }

  const fill = shuffle(listings.filter((item) => !used.has(item.id)))
  return [...pickedSponsored, ...freePicked, ...fill].slice(0, max)
}