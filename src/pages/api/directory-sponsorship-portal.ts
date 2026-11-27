import type { APIRoute } from 'astro'
import Stripe from 'stripe'
import { getSecret } from 'astro:env/server'
import { createSupabaseServerClient } from '~/utils/supabase-server'

export const prerender = false

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  })

export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (request.headers.get('origin') !== url.origin) return json({ error: 'Invalid request origin.' }, 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Invalid request.' }, 400)

  let body: { listing_id?: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request.' }, 400)
  }

  const listingId = typeof body.listing_id === 'string' ? body.listing_id.trim() : ''
  if (!listingId || !/^[0-9a-f-]{36}$/i.test(listingId)) return json({ error: 'Choose a listing to manage.' }, 400)

  const stripeSecretKey = getSecret('STRIPE_SECRET_KEY')
  if (!stripeSecretKey) return json({ error: 'Billing portal is not configured yet.' }, 503)

  const supabase = createSupabaseServerClient(request, cookies)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return json({ error: 'Sign in to manage billing.' }, 401)

  const { data: listing, error: listingError } = await supabase
    .from('directory_managed_listings')
    .select('id, owner_id')
    .eq('id', listingId)
    .maybeSingle()
  if (listingError || !listing || listing.owner_id !== user.id) return json({ error: 'Listing unavailable.' }, 403)

  const { data: sponsorship, error } = await supabase
    .from('directory_sponsorships')
    .select('stripe_customer_id')
    .eq('listing_id', listingId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !sponsorship?.stripe_customer_id) {
    return json({ error: 'No billing profile found for this listing.' }, 404)
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-02-25.clover' })
  const portal = await stripe.billingPortal.sessions.create({
    customer: sponsorship.stripe_customer_id,
    return_url: `${url.origin}/console/boost/`,
  })

  return json({ url: portal.url })
}