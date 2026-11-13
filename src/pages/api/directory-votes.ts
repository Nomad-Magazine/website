import type { APIRoute } from 'astro'
import { createSupabaseServerClient } from '~/utils/supabase-server'

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
  let payload: { listing_id?: unknown; voted?: unknown }
  try {
    const body = await request.text()
    if (body.length > 512) return json({ error: 'Invalid vote.' }, 400)
    payload = JSON.parse(body)
  } catch {
    return json({ error: 'Invalid vote.' }, 400)
  }
  if (!payload || typeof payload.listing_id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(payload.listing_id) || typeof payload.voted !== 'boolean') {
    return json({ error: 'Invalid vote.' }, 400)
  }
  const supabase = createSupabaseServerClient(request, cookies)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json({ error: 'Sign in to upvote this listing.' }, 401)
  const { data, error } = await supabase.rpc('directory_set_vote', { p_listing_id: payload.listing_id, p_voted: payload.voted })
  if (error) return json({ error: error.code === '22023' ? 'This listing is no longer available for voting.' : 'Your vote could not be saved. Please try again.' }, error.code === '22023' ? 404 : 503)
  return json(data[0])
}
