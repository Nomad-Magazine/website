import type { APIRoute } from 'astro'
import { createSupabaseServerClient } from '~/utils/supabase-server'
import { castDirectoryVote, verifyHumanVote } from '~/utils/directory-vote-cast'
import { requireWorkerSecret, workerVoteLimiter } from '~/utils/directory-vote-secrets'

export const prerender = false

const json = (data: unknown, status = 200) => Response.json(data, {
  status,
  headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Robots-Tag': 'noindex, nofollow' },
})

export const GET: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerClient(request, cookies)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ authenticated: false, votes: [] })
  const { data, error } = await supabase.rpc('directory_my_votes')
  if (error) return json({ error: 'Your votes are temporarily unavailable. Please try again.' }, 503)
  return json({ authenticated: true, votes: data.map((vote: { listing_id: string }) => vote.listing_id) })
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Invalid request origin.' }, 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Invalid vote.' }, 400)
  let payload: { listing_id?: unknown; voted?: unknown; turnstile_token?: unknown }
  try {
    const body = await request.text()
    if (body.length > 2048) return json({ error: 'Invalid vote.' }, 400)
    payload = JSON.parse(body)
  } catch {
    return json({ error: 'Invalid vote.' }, 400)
  }
  if (!payload || typeof payload.listing_id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(payload.listing_id) || typeof payload.voted !== 'boolean') {
    return json({ error: 'Invalid vote.' }, 400)
  }

  try {
    requireWorkerSecret('SUPABASE_SERVICE_ROLE_KEY')
    requireWorkerSecret('DIRECTORY_IP_HASH_SALT')
    requireWorkerSecret('TURNSTILE_SECRET_KEY')
  } catch {
    return json({ error: 'Voting is temporarily unavailable.' }, 503)
  }

  const ip = request.headers.get('cf-connecting-ip')
  const limiter = workerVoteLimiter()
  if (limiter) {
    const { success } = await limiter.limit({ key: `${ip ?? 'unknown'}:${payload.listing_id}` })
    if (!success) return json({ error: 'Too many vote attempts. Please wait a moment and try again.' }, 429)
  }

  const supabase = createSupabaseServerClient(request, cookies)
  let { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const token = typeof payload.turnstile_token === 'string' ? payload.turnstile_token.trim() : ''
    if (!token) return json({ error: 'Human verification failed. Please try again.' }, 401)
    try {
      await verifyHumanVote(request, token)
    } catch {
      return json({ error: 'Human verification failed. Please try again.' }, 401)
    }
    const { error: anonError } = await supabase.auth.signInAnonymously()
    if (anonError) return json({ error: 'Your vote could not be saved. Please try again.' }, 503)
    ;({ data: { user } } = await supabase.auth.getUser())
    if (!user) return json({ error: 'Your vote could not be saved. Please try again.' }, 503)
  }

  try {
    const vote = await castDirectoryVote({
      request,
      userId: user!.id,
      listingId: payload.listing_id,
      voted: payload.voted,
    })
    return json(vote)
  } catch (error: unknown) {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : ''
    if (code === '22023') return json({ error: 'This listing is no longer available for voting.' }, 404)
    if (code === '42501') return json({ error: 'Sign in to upvote this listing.' }, 401)
    if (code === '53200') return json({ error: (error as { message?: string }).message || 'Vote limit reached. Try again later.' }, 429)
    return json({ error: 'Your vote could not be saved. Please try again.' }, 503)
  }
}