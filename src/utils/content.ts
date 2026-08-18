const normalizeSlug = (id: string) => id.replace(/\/+$/g, '').replace(/^.*\//, '').replace(/\.md$/, '')
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

export function isSeoBotPost(post: { data: { author?: string; authorUrl?: string } }) {
  return post.data.author === 'Martin Donadieu' && post.data.authorUrl === 'https://github.com/riderx'
}

export function authorSlugFromName(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export async function getAuthorPosts() {
  const { getCollection } = await import('astro:content')
  const articles = normalizeContentEntries(await getCollection('article')).map((post) => ({
    ...post,
    href: `/articles/${post.slug}/`,
  }))
  const blogs = normalizeContentEntries(await getCollection('blog'))
    .filter((post) => !isSeoBotPost(post))
    .map((post) => ({
      ...post,
      href: `/blog/${post.slug}/`,
    }))

  return [...articles, ...blogs]
}
