import { isSearchLandingPage } from './src/utils/search-index.mjs'
import {directoryRoutes} from './src/utils/directory-routes.mjs'
import sitemap from '@astrojs/sitemap'
import Icons from 'unplugin-icons/vite'
import tailwindcss from '@tailwindcss/vite'
import cloudflare from '@astrojs/cloudflare'
import pagefind from 'astro-pagefind'
import { defineConfig, envField } from 'astro/config'
import { glob } from 'glob'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import rehypeExternalLinks from 'rehype-external-links'

const site = process.env.SITE_URL ?? 'https://nomad-magazine.com'

const normalizeRouteSlug = (value) => value.trim().replace(/^['"]|['"]$/g, '').replace(/^\/+|\/+$/g, '')

function getContentRouteEntries(collection) {
  const files = glob.sync(`src/content/${collection}/*.md`)
  return files.map((file) => {
    const content = readFileSync(file, 'utf-8')
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    const frontmatter = frontmatterMatch?.[1] ?? ''
    const slugMatch = frontmatter.match(/slug:\s*(.+)/)
    const updatedAtMatch = frontmatter.match(/updated_at:\s*(.+)/)

    return {
      slug: normalizeRouteSlug(slugMatch?.[1] ?? basename(file, '.md')),
      lastmod: updatedAtMatch ? new Date(normalizeRouteSlug(updatedAtMatch[1])) : undefined,
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

  return lastModMap
}

const redirectPaths = new Set(readFileSync('public/_redirects', 'utf8')
  .split('\n')
  .filter(line => line.startsWith('/'))
  .map(line => line.split(/\s+/)[0]))

const pageLastModDates = getPageLastModDates()

export default defineConfig({
  output: 'server',
  experimental: {
    rustCompiler: true,
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
    pagefind(),
    sitemap({
      customPages: [`${site}/nomad_directory/`, `${site}/nomad_directory/updates/`, `${site}/nomad_directory/awards/`, ...directoryRoutes(JSON.parse(readFileSync('src/utils/nomad_cache_table_6857167d82358a0f5e038c3f.json','utf8')).records).map(route => `${site}/nomad_directory/${route.slug}/`)],
      customSitemaps: [`${site}/nomad_directory/awards/sitemap/`],
      filter: url => {
        const pathname = new URL(url).pathname
        if (pathname === '/horoscope/' || pathname === '/horoscope') return false
        if (pathname === '/newsletter-may-2026-content/' || pathname === '/newsletter-may-2026-content') return false
        return isSearchLandingPage(pathname) && !redirectPaths.has(pathname)
      },
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
      OPENAI_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      STRIPE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      STRIPE_WEBHOOK_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      BENTO_SITE_UUID: envField.string({ context: 'server', access: 'secret', optional: true }),
      BENTO_PUBLISHABLE_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      BENTO_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      SMART_SUITE_APIKEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      SMART_SUITE_ACCOUNT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      SMART_SUITE_TABLE_ID_COMPANY: envField.string({ context: 'server', access: 'secret', optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      DIRECTORY_IP_HASH_SALT: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
})
