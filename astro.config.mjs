import sitemap from '@astrojs/sitemap'
import Icons from 'unplugin-icons/vite'
import tailwindcss from '@tailwindcss/vite'
import cloudflare from '@astrojs/cloudflare'
import { defineConfig, envField } from 'astro/config'
import { glob } from 'glob'
import { readFileSync, statSync } from 'node:fs'
import { basename } from 'node:path'
import rehypeExternalLinks from 'rehype-external-links'

const site = process.env.SITE_URL ?? 'https://nomad-magazine.com'

const normalizeRouteSlug = (value) => value.trim().replace(/^['"]|['"]$/g, '').replace(/^\/+|\/+$/g, '')

function getContentRouteEntries(collection) {
  const files = glob.sync(`src/content/${collection}/*.md`)
  return files.map((file) => {
    const stat = statSync(file)
    const content = readFileSync(file, 'utf-8')
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    const frontmatter = frontmatterMatch?.[1] ?? ''
    const slugMatch = frontmatter.match(/slug:\s*(.+)/)
    const updatedAtMatch = frontmatter.match(/updated_at:\s*(.+)/)

    return {
      slug: normalizeRouteSlug(slugMatch?.[1] ?? basename(file, '.md')),
      lastmod: updatedAtMatch ? new Date(normalizeRouteSlug(updatedAtMatch[1])) : stat.mtime,
    }
  })
}

const injectContentStaticRoutes = () => ({
  name: 'inject-content-static-routes',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      for (const { slug } of getContentRouteEntries('blog')) {
        injectRoute({
          pattern: `/blog/${slug}`,
          entrypoint: './src/generated/pages/blog-post.astro',
          prerender: true,
        })
      }

      for (const { slug } of getContentRouteEntries('article')) {
        injectRoute({
          pattern: `/articles/${slug}`,
          entrypoint: './src/generated/pages/article-post.astro',
          prerender: true,
        })
      }
    },
  },
})

// Build a map of page paths to their lastmod dates for sitemap
function getPageLastModDates() {
  const lastModMap = new Map()

  for (const [collection, basePath] of [['blog', '/blog'], ['article', '/articles']]) {
    for (const { slug, lastmod } of getContentRouteEntries(collection)) {
      lastModMap.set(`${basePath}/${slug}`, lastmod)
      lastModMap.set(`${basePath}/${slug}/`, lastmod)
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
    injectContentStaticRoutes(),
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
