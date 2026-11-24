import type { APIRoute } from 'astro'
import { getSecret } from 'astro:env/server'
import { createSupabaseServerClient } from '~/utils/supabase-server'
import { hashClientNetwork, verifyTurnstileToken } from '~/utils/directory-vote-network'

export const prerender = false

type VoteLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> }

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

export const POST: APIRoute = async ({ request, cookies, locals }) => {
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
  const supabase = createSupabaseServerClient(request, cookies)
  let { data: { user } } = await supabase.auth.getUser()
  const ip = request.headers.get('cf-connecting-ip')
  const runtimeEnv = (locals as { runtime?: { env?: Record<string, unknown> } }).runtime?.env
    ?? (locals as { env?: Record<string, unknown> }).env
  const limiter = runtimeEnv?.DIRECTORY_VOTE_LIMITER as VoteLimiter | undefined
  if (limiter) {
    const { success } = await limiter.limit({ key: `${ip ?? 'unknown'}:${payload.listing_id}` })
    if (!success) return json({ error: 'Too many vote attempts. Please wait a moment and try again.' }, 429)
  }

  if (!user) {
    const token = typeof payload.turnstile_token === 'string' ? payload.turnstile_token.trim() : ''
    const secret = getSecret('TURNSTILE_SECRET_KEY') || (runtimeEnv?.TURNSTILE_SECRET_KEY as string | undefined) || ''
    if (!await verifyTurnstileToken(secret, token, ip)) {
      return json({ error: 'Human verification failed. Please try again.' }, 401)
    }
    const { error: anonError } = await supabase.auth.signInAnonymously()
    if (anonError) return json({ error: 'Your vote could not be saved. Please try again.' }, 503)
    ;({ data: { user } } = await supabase.auth.getUser())
    if (!user) return json({ error: 'Your vote could not be saved. Please try again.' }, 503)
  }

  const salt = getSecret('DIRECTORY_IP_HASH_SALT') || (runtimeEnv?.DIRECTORY_IP_HASH_SALT as string | undefined) || ''
  const networkHash = payload.voted ? await hashClientNetwork(request, salt) : null
  if (payload.voted && !networkHash) return json({ error: 'Your vote could not be saved. Please try again.' }, 503)

  const { data, error } = await supabase.rpc('directory_set_vote', {
    p_listing_id: payload.listing_id,
    p_voted: payload.voted,
    p_network_hash: networkHash,
  })
  if (error) {
    if (error.code === '22023') return json({ error: 'This listing is no longer available for voting.' }, 404)
    if (error.code === '42501') return json({ error: 'Sign in to upvote this listing.' }, 401)
    if (error.code === '53200') return json({ error: error.message || 'Vote limit reached. Try again later.' }, 429)
    return json({ error: 'Your vote could not be saved. Please try again.' }, 503)
  }
  return json(data[0])
}