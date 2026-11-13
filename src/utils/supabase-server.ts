import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import type { AstroCookies } from 'astro'

import { getSupabaseConfig } from './supabase-config'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSupabaseServerClient(request: Request, cookies: AstroCookies): any {
  const { url, anonKey } = getSupabaseConfig()
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '').map(({ name, value }) => ({
          name,
          value: value ?? '',
        }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options as Parameters<AstroCookies['set']>[2])
        })
      },
    },
  })
}
