import sitemap from '@astrojs/sitemap'
import Icons from 'unplugin-icons/vite'
import tailwindcss from '@tailwindcss/vite'
import cloudflare from '@astrojs/cloudflare'
import { defineConfig, envField } from 'astro/config'
import { glob } from 'glob'
import { readFileSync } from 'fs'

const site = process.env.SITE_URL ?? 'https://nomad-magazine.com'

// Build a map of blog slugs to their updated_at dates for sitemap lastmod
function getBlogLastModDates() {
  const blogFiles = glob.sync('src/content/blog/*.md')
  const lastModMap = new Map()

  for (const file of blogFiles) {
    const content = readFileSync(file, 'utf-8')
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1]
      const updatedAtMatch = frontmatter.match(/updated_at:\s*(.+)/)
      const slugMatch = frontmatter.match(/slug:\s*(.+)/)
      if (updatedAtMatch && slugMatch) {
        const slug = slugMatch[1].trim()
        const updatedAt = updatedAtMatch[1].trim()
        lastModMap.set(`/blog/${slug}`, new Date(updatedAt))
        lastModMap.set(`/blog/${slug}/`, new Date(updatedAt))
      }
    }
  }

  return lastModMap
}

const blogLastModDates = getBlogLastModDates()

export default defineConfig({
  output: 'server',
  server: {
    open: true,
    port: 3000,
    host: '0.0.0.0',
  },
  adapter: cloudflare(),
  vite: {
    plugins: [
      tailwindcss(),
      Icons({
        compiler: 'astro',
      }),
    ],
  },
  integrations: [
    sitemap({
      serialize(item) {
        // Check if this URL matches a blog post with a known lastmod date
        const urlPath = new URL(item.url).pathname
        const lastmod = blogLastModDates.get(urlPath)
        if (lastmod) {
          item.lastmod = lastmod.toISOString()
        }
        return item
      },
    }),
  ],
  site,
  env: {
    schema: {
      OPENAI_API_KEY: envField.string({ context: 'server', access: 'secret' }),
      STRIPE_SECRET_KEY: envField.string({ context: 'server', access: 'secret' }),
      STRIPE_WEBHOOK_SECRET: envField.string({ context: 'server', access: 'secret' }),
      BENTO_SITE_UUID: envField.string({ context: 'server', access: 'secret' }),
      BENTO_PUBLISHABLE_KEY: envField.string({ context: 'server', access: 'secret' }),
      BENTO_SECRET_KEY: envField.string({ context: 'server', access: 'secret' }),
    },
  },
})
