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

export async function getDirectoryEntries(): Promise<DirectoryEntry[]> {
  const { records } = await fetchReportRecords('6857167d82358a0f5e038c3f')
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
        image: directoryLogoUrlOverrides[record.title] || (localLogos.has(`${record.id}.webp`) ? localLogo : ''),
      }
    })
}

export function getDirectoryCategories(entries: DirectoryEntry[]) {
  const counts = new Map<string, number>()
  for (const entry of entries) counts.set(entry.category, (counts.get(entry.category) || 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])
}

export function directoryCategoryUrl(category: string): string {
  const slug = category.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `/nomad_directory/${slug}/`
}
