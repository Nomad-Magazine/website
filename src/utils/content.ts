const normalizeSlug = (id: string) => id.replace(/\.md$/, '')

export type LegacyCollectionEntry<T> = T & {
  slug: string
  body: string
}

export function normalizeContentEntry<T extends { data: { slug?: string }, id: string; body?: string }>(entry: T): LegacyCollectionEntry<T> {
  return {
    ...entry,
    slug: entry.data.slug ?? normalizeSlug(entry.id),
    body: entry.body ?? '',
  }
}

export function normalizeContentEntries<T extends { data: { slug?: string }, id: string; body?: string }>(
  entries: Array<T>,
): Array<LegacyCollectionEntry<T>> {
  return entries.map((entry) => normalizeContentEntry(entry))
}
