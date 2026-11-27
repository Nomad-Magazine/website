import { COUNTRY_TO_CONTINENT } from './directory-routes.mjs'
import { directoryLogoBoxClassFor, directoryLogoImageClassFor } from '../const/nomadDirectoryWhiteLogos'
import type { DirectoryEntry } from './directory'
import { getListingScreenshot } from './directory-screenshots'

export const SPOTLIGHT_NEW_DAYS = 30

export type SpotlightListing = {
  id: string
  title: string
  category: string
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

export function buildSpotlightListings(
  entries: DirectoryEntry[],
  recordsById: Map<string, Record<string, unknown>>,
): SpotlightListing[] {
  const result: SpotlightListing[] = []
  for (const entry of entries) {
    const screenshot = getListingScreenshot(entry.id)
    if (!screenshot || !entry.image?.trim()) continue
    const country = entry.country || ''
    result.push({
      id: entry.id,
      title: entry.title,
      category: entry.category,
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