import { defineCollection, z } from 'astro:content'

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
  author_image_url: z.string().optional(),
  author_url: z.string().optional(),
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
    authorImageUrl: data.author_image_url,
    authorUrl: data.author_url,
    keywords: data.keywords,
    tag: data.tag,
    published: data.published ?? true,
    locale: data.locale || 'en',
    nextBlog: data.next_blog,
    category: data.category,
  }
})

const blog = defineCollection({
  type: 'content',
  schema: blogSchema,
})

const article = defineCollection({
  type: 'content',
  schema: blogSchema,
})

export const collections = { blog, article }
