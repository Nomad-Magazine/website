import type { AstroCookies } from 'astro'
import type { SupabaseClient } from '@supabase/supabase-js'
import { directoryReturnTo } from './directory-votes'

const returnCookie = 'nomad-directory-return'
const callbackPath = '/auth/callback/'

export async function sendDirectoryLogin(supabase: SupabaseClient, cookies: AstroCookies, url: URL, email: string) {
  // Supabase matches the entire redirect URL. Keep it identical to the allowed callback;
  // the same-browser PKCE flow carries the destination in an HttpOnly cookie instead.
  const result = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: new URL(callbackPath, url.origin).href, shouldCreateUser: true },
  })
  if (!result.error) {
    cookies.set(returnCookie, directoryReturnTo(url.searchParams.get('next')), {
      path: callbackPath,
      httpOnly: true,
      secure: url.protocol === 'https:',
      sameSite: 'lax',
      maxAge: 3600,
    })
  }
  return result
}

export function consumeDirectoryReturn(cookies: AstroCookies, url: URL) {
  // Continue supporting existing token-hash links with an explicit next parameter.
  const next = directoryReturnTo(url.searchParams.get('next') ?? cookies.get(returnCookie)?.value ?? null)
  cookies.delete(returnCookie, { path: callbackPath })
  return next
}
