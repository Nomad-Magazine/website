import sitemap from '@astrojs/sitemap'
import Icons from 'unplugin-icons/vite'
import tailwindcss from '@tailwindcss/vite'
import cloudflare from '@astrojs/cloudflare'
import { defineConfig, envField } from 'astro/config'
import { glob } from 'glob'
import { readFileSync, statSync } from 'node:fs'
import rehypeExternalLinks from 'rehype-external-links'

const site = process.env.SITE_URL ?? 'https://nomad-magazine.com'

// Build a map of page paths to their lastmod dates for sitemap
function getPageLastModDates() {
  const lastModMap = new Map()

  // Get blog post dates from frontmatter
  const blogFiles = glob.sync('src/content/blog/*.md')
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

  // Get static page dates from file modification time
  const pageFiles = glob.sync('src/pages/**/*.astro')
  for (const file of pageFiles) {
    const stat = statSync(file)
    // Convert file path to URL path
    let urlPath = file
      .replace('src/pages', '')
      .replace('/index.astro', '/')
      .replace('.astro', '/')
    if (!urlPath.endsWith('/')) urlPath += '/'
    if (!lastModMap.has(urlPath)) {
      lastModMap.set(urlPath, stat.mtime)
    }
  }

  return lastModMap
}

const pageLastModDates = getPageLastModDates()

export default defineConfig({
  output: 'server',
  experimental: {
    rustCompiler: true
  },
  markdown: {
    rehypePlugins: [
      [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
    ],
  },
  server: {
    open: true,
    port: 3000,
    host: '0.0.0.0',
  },
  adapter: cloudflare(),
  vite: {
    build: {
      // Astro 6 + the current Vite stack can surface an `es2024` CSS target
      // that Lightning CSS does not yet accept during minification.
      target: 'es2022',
      cssTarget: 'chrome107',
    },
    plugins: [
      tailwindcss(),
      Icons({
        compiler: 'astro',
      }),
    ],
  },
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      serialize(item) {
        // Check if this URL matches a page with a known lastmod date
        const urlPath = new URL(item.url).pathname
        const lastmod = pageLastModDates.get(urlPath)
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
