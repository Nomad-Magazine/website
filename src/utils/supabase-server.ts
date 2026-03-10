import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import type { AstroCookies } from 'astro'

const supabaseUrl = 'https://kmsroigetiipulnosooy.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imttc3JvaWdldGlpcHVsbm9zb295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NDk0MzcsImV4cCI6MjA3MTAyNTQzN30.yKGKsfDA4WOAwAOOX6znSNfcT6yL7Y0RWLBc2ylktCI'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSupabaseServerClient(request: Request, cookies: AstroCookies): any {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
