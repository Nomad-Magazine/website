import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import cloudflare from '@astrojs/cloudflare'
import { defineConfig, envField } from 'astro/config'

export default defineConfig({
  site: 'https://nomad-magazine.com',
  adapter: cloudflare(),
  env: {
    schema: {
      BENTO_SITE_UUID: envField.string({ context: 'server', access: 'secret' }),
      BENTO_SECRET_KEY: envField.string({ context: 'server', access: 'secret' }),
      BENTO_PUBLISHABLE_KEY: envField.string({ context: 'server', access: 'secret' }),
      SMART_SUITE_APIKEY: envField.string({ context: 'server', access: 'secret' }),
      SMART_SUITE_ACCOUNT_ID: envField.string({ context: 'server', access: 'secret' }),
      SMART_SUITE_TABLE_ID_COMPANY: envField.string({ context: 'server', access: 'secret' }),
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
      Icons({
        compiler: 'astro',
      }),
    ],
  },
  server: {
    open: true,
    port: 3000,
    host: '0.0.0.0',
  },
})
