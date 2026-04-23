import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const blogSchema = z.object({
  // Basic required fields
  title: z.string(),
  description: z.string(),

  // Date fields - handle both formats
  pubDate: z.coerce.date().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),

  // Image fields - handle both formats
  heroImage: z.string().optional(),
  head_image: z.string().optional(),
  head_image_alt: z.string().optional(),

  // Extended format fields
  slug: z.string().optional(),
  author: z.string().optional(),
  /** When set, hero byline reads "{byline_type} by {author}" (e.g. Essay) */
  byline_type: z.string().optional(),
  author_image_url: z.string().optional(),
  author_url: z.string().optional(),
  /** Shown on /authors/{slug}/ when set (usually matches “About the author” in the article) */
  author_bio: z.string().optional(),
  keywords: z.string().optional(),
  tag: z.string().optional(),
  published: z.boolean().optional(),
  locale: z.string().optional(),
  next_blog: z.string().optional(),
  category: z.enum(['article', 'blog']).optional(),
}).transform((data) => {
  // Transform the data to have consistent field names
  return {
    title: data.title,
    description: data.description,
    pubDate: data.pubDate || data.created_at,
    updatedDate: data.updated_at,
    heroImage: data.heroImage || data.head_image,
    heroImageAlt: data.head_image_alt,
    author: data.author,
    bylineType: data.byline_type,
    authorImageUrl: data.author_image_url,
    authorUrl: data.author_url,
    authorBio: data.author_bio,
    // Keep so consumers can read either shape if tooling merges raw + transformed data
    author_bio: data.author_bio,
    keywords: data.keywords,
    tag: data.tag,
    published: data.published ?? true,
    locale: data.locale || 'en',
    nextBlog: data.next_blog,
    category: data.category,
  }
})

const blog = defineCollection({
  loader: glob({ base: './src/content', pattern: 'blog/*.md' }),
  schema: blogSchema,
})

const article = defineCollection({
  loader: glob({ base: './src/content', pattern: 'article/*.md' }),
  schema: blogSchema,
})

export const collections = { blog, article }
