import sitemap from '@astrojs/sitemap'
import Icons from 'unplugin-icons/vite'
import tailwindcss from '@tailwindcss/vite'
import cloudflare from '@astrojs/cloudflare'
import { defineConfig, envField } from 'astro/config'

const site = process.env.SITE_URL ?? 'https://workers.nomad-magazine.com'

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
  integrations: [sitemap()],
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
