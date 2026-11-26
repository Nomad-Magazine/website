import type { APIRoute } from 'astro'
import { createSupabaseServerClient } from '~/utils/supabase-server'
import { verifyHumanVote } from '~/utils/directory-vote-cast'
import { markDirectoryVoteVerified, needsDirectoryTurnstile } from '~/utils/directory-vote-session'
import { requireWorkerSecret, workerVoteLimiter } from '~/utils/directory-vote-secrets'
import { directoryReturnTo } from '~/utils/directory-votes'
import { mapVoteEmailError, normalizeVoteEmail } from '~/utils/directory-vote-email-link'

export const prerender = false

const json = (data: unknown, status = 200) => Response.json(data, {
  status,
  headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Robots-Tag': 'noindex, nofollow' },
})

export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'invalid_origin' }, 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'invalid_request' }, 400)
  let payload: { email?: unknown; return_to?: unknown; turnstile_token?: unknown }
  try {
    const body = await request.text()
    if (body.length > 2048) return json({ error: 'invalid_request' }, 400)
    payload = JSON.parse(body)
  } catch {
    return json({ error: 'invalid_request' }, 400)
  }

  const email = normalizeVoteEmail(payload.email)
  if (!email) return json({ error: 'invalid_email' }, 400)
  const returnTo = directoryReturnTo(typeof payload.return_to === 'string' ? payload.return_to : null, '/nomad_directory/')
  const token = typeof payload.turnstile_token === 'string' ? payload.turnstile_token.trim() : ''

  try {
    requireWorkerSecret('SUPABASE_SERVICE_ROLE_KEY')
    requireWorkerSecret('TURNSTILE_SECRET_KEY')
  } catch {
    return json({ error: 'unavailable' }, 503)
  }

  const ip = request.headers.get('cf-connecting-ip')
  const limiter = workerVoteLimiter()
  if (limiter) {
    const { success } = await limiter.limit({ key: `vote-email:${ip ?? 'unknown'}` })
    if (!success) return json({ error: 'rate_limited' }, 429)
  }

  const supabase = createSupabaseServerClient(request, cookies)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ error: 'sign_in_required' }, 401)
  if (user.email_confirmed_at) return json({ error: 'already_confirmed' }, 400)

  if (needsDirectoryTurnstile(user)) {
    if (!token) return json({ error: 'turnstile_required' }, 401)
    try {
      await verifyHumanVote(request, token)
      await markDirectoryVoteVerified(user.id)
      await supabase.auth.refreshSession()
    } catch {
      return json({ error: 'turnstile_required' }, 401)
    }
  }

  const redirectTo = new URL('/auth/callback/', url)
  redirectTo.searchParams.set('next', returnTo)
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: redirectTo.href })
  if (error) {
    const mapped = mapVoteEmailError(error)
    return json({ error: mapped.error }, mapped.status)
  }
  return json({ ok: true })
}