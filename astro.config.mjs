import sitemap from '@astrojs/sitemap'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import cloudflare from '@astrojs/cloudflare'
import { defineConfig, envField } from 'astro/config'

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
  site: 'https://nomad-magazine.com',
  env: {
    schema: {
      SMART_SUITE_APIKEY: envField.string({ context: 'server', access: 'secret' }),
      SMART_SUITE_ACCOUNT_ID: envField.string({ context: 'server', access: 'secret' }),
      SMART_SUITE_TABLE_ID_COMPANY: envField.string({ context: 'server', access: 'secret' }),
      OPENAI_API_KEY: envField.string({ context: 'server', access: 'secret' }),
      STRIPE_SECRET_KEY: envField.string({ context: 'server', access: 'secret' }),
      STRIPE_WEBHOOK_SECRET: envField.string({ context: 'server', access: 'secret' }),
      BENTO_SITE_UUID: envField.string({ context: 'server', access: 'secret' }),
      BENTO_PUBLISHABLE_KEY: envField.string({ context: 'server', access: 'secret' }),
      BENTO_SECRET_KEY: envField.string({ context: 'server', access: 'secret' }),
    },
  },
})
