import { pathToFileURL } from 'node:url'

const callback = 'https://nomad-magazine.com/auth/callback/'

// An intentionally invalid token tests hosted redirect selection without sending mail,
// creating accounts, issuing sessions or changing the Supabase configuration.
export async function checkDirectoryAuthRedirect(fetchImpl = fetch) {
  const url = new URL('https://kmsroigetiipulnosooy.supabase.co/auth/v1/verify')
  url.search = new URLSearchParams({ token: '0'.repeat(64), type: 'magiclink', redirect_to: callback }).toString()
  const response = await fetchImpl(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) })
  if (response.status !== 303) throw new Error(`Auth redirect probe returned HTTP ${response.status}`)
  const target = new URL(response.headers.get('Location') || '', url)
  if (target.origin + target.pathname !== callback) {
    throw new Error('Auth redirected away from the production callback. Check the Supabase Site URL and redirect allowlist.')
  }
  if (!target.searchParams.has('error') && !new URLSearchParams(target.hash.slice(1)).has('error')) {
    throw new Error('Expected an invalid-token error; refusing to treat an unexpected response as a successful check.')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkDirectoryAuthRedirect()
    .then(() => console.log('PASS: hosted Auth keeps the exact production callback on nomad-magazine.com.'))
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
}
