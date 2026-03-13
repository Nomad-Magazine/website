const normalizeSlug = (id: string) => id.replace(/^.*\//, '').replace(/\.md$/, '')
const sanitizeSlug = (slug: string) => slug.replace(/^\/+|\/+$/g, '')

type ContentDataWithOptionalSlug = Record<string, unknown> & {
  slug?: string
}

type ContentEntryLike = {
  data: ContentDataWithOptionalSlug
  id: string
  body?: string
}

export type LegacyCollectionEntry<T extends ContentEntryLike> = Omit<T, 'slug' | 'body'> & {
  slug: string
  body: string
}

export function normalizeContentEntry<T extends ContentEntryLike>(entry: T): LegacyCollectionEntry<T> {
  return {
    ...entry,
    slug: sanitizeSlug(entry.data.slug ?? normalizeSlug(entry.id)),
    body: entry.body ?? '',
  }
}

export function normalizeContentEntries<T extends ContentEntryLike>(
  entries: Array<T>,
): Array<LegacyCollectionEntry<T>> {
  return entries.map((entry) => normalizeContentEntry(entry))
}
