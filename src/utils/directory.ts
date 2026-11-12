import { readPublicDirectory, directoryImageUrl } from './directory-public'
import type { ListingPayload } from './directory-workspace'
import { fetchReportRecords } from './smartsuite'
import { directoryLogoUrlOverrides } from '../const/nomadDirectoryWhiteLogos'

import logoFiles from './directory-logo-files.json'

const localLogos = new Set(logoFiles)

export interface DirectoryEntry {
  id: string
  title: string
  category: string
  description: string
  offer: string
  website: string
  image: string
}

function websiteUrl(value: string): string {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

export async function getPublishedDirectoryRecords() {
  const { records } = await fetchReportRecords('6857167d82358a0f5e038c3f')
  const merged: Array<Record<string, any>> = records.map((record) => ({
    ...record,
    image: directoryLogoUrlOverrides[record.title] || (localLogos.has(`${record.id}.webp`) ? `/images/directory-logos/${record.id}.webp` : ''),
  }))
  const published = await readPublicDirectory<{ id: string; payload: ListingPayload }>('directory_public_listings')
  for (const { id, payload } of published) {
    const index = merged.findIndex((item) => item.id === id)
    const record = {
      ...(index >= 0 ? merged[index] : {}),
      id,
      title: payload.title,
      sf4ad525dd: true,
      scea90e502: payload.description,
      sb685ab800: { label: payload.category },
      link: payload.website,
      s5576966ee: payload.special_offer,
      sed1a49986: payload.location,
      image: directoryImageUrl(payload.image),
      managedImage: true,
    }
    if (index >= 0) merged[index] = record
    else merged.unshift(record)
  }
  return merged
}

export async function getDirectoryEntries(includeManaged = false): Promise<DirectoryEntry[]> {
  const records = includeManaged ? await getPublishedDirectoryRecords() : (await fetchReportRecords('6857167d82358a0f5e038c3f')).records
  return getDirectoryEntriesFromRecords(records)
}
export function getDirectoryEntriesFromRecords(records: any[]): DirectoryEntry[] {
  return records
    .filter((record) => record.sf4ad525dd && record.title)
    .map((record) => {
      const localLogo = `/images/directory-logos/${record.id}.webp`
      return {
        id: String(record.id),
        title: String(record.title),
        category: String(record.sb685ab800?.label || 'Other'),
        description: String(record.scea90e502 || ''),
        offer: String(record.s5576966ee || ''),
        website: websiteUrl(record.link || record.sb788c266b?.[0] || ''),
        image: record.managedImage ? record.image : directoryLogoUrlOverrides[record.title] || (localLogos.has(`${record.id}.webp`) ? localLogo : ''),
      }
    })
}

export function getDirectoryCategories(entries: DirectoryEntry[]) {
  const counts = new Map<string, number>()
  for (const entry of entries) counts.set(entry.category, (counts.get(entry.category) || 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])
}

export function directoryCategoryUrl(category: string): string {
  const slug = category
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `/nomad_directory/${slug}/`
}
