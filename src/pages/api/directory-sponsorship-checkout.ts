import type { APIRoute } from 'astro'
import Stripe from 'stripe'
import { getSecret } from 'astro:env/server'
import { createSupabaseServerClient } from '~/utils/supabase-server'
import { hasBlockingSponsorship, SPONSORSHIP_PRODUCT_TYPE } from '~/utils/directory-sponsorship'

export const prerender = false

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  })

export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (request.headers.get('origin') !== url.origin) return json({ error: 'Invalid request origin.' }, 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Invalid request.' }, 400)

  const stripeSecretKey = getSecret('STRIPE_SECRET_KEY')
  const monthlyPrice = getSecret('STRIPE_PRICE_MONTHLY')
  const yearlyPrice = getSecret('STRIPE_PRICE_YEARLY')
  if (!stripeSecretKey || !monthlyPrice || !yearlyPrice) return json({ error: 'Sponsorship checkout is not configured yet.' }, 503)

  let body: { listing_id?: unknown; plan?: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request.' }, 400)
  }

  const listingId = typeof body.listing_id === 'string' ? body.listing_id.trim() : ''
  const plan = body.plan === 'yearly' ? 'yearly' : body.plan === 'monthly' ? 'monthly' : null
  if (!listingId || !/^[0-9a-f-]{36}$/i.test(listingId) || !plan) return json({ error: 'Choose a listing and billing period.' }, 400)

  const supabase = createSupabaseServerClient(request, cookies)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return json({ error: 'Sign in to sponsor a listing.' }, 401)

  const { data: listing, error: listingError } = await supabase
    .from('directory_managed_listings')
    .select('id, owner_id, published, status')
    .eq('id', listingId)
    .maybeSingle()
  if (listingError || !listing || listing.owner_id !== user.id) return json({ error: 'Listing unavailable.' }, 403)
  if (!listing.published || listing.status !== 'approved') return json({ error: 'Only published listings can be sponsored.' }, 400)

  const { data: existingSponsorship } = await supabase
    .from('directory_sponsorships')
    .select('status, current_period_end')
    .eq('listing_id', listingId)
    .maybeSingle()
  if (hasBlockingSponsorship(existingSponsorship)) {
    return json({ error: 'This listing already has an active sponsorship subscription.' }, 409)
  }

  const { data: priorBilling } = await supabase
    .from('directory_sponsorships')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .not('stripe_customer_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-02-25.clover' })
  const priceId = plan === 'yearly' ? yearlyPrice : monthlyPrice
  const site = url.origin

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${site}/console/boost/?success=1`,
    cancel_url: `${site}/console/boost/?canceled=1`,
    client_reference_id: listingId,
    ...(priorBilling?.stripe_customer_id
      ? { customer: priorBilling.stripe_customer_id }
      : user.email
        ? { customer_email: user.email }
        : {}),
    metadata: {
      product_type: SPONSORSHIP_PRODUCT_TYPE,
      listing_id: listingId,
      user_id: user.id,
      plan,
    },
    subscription_data: {
      metadata: {
        product_type: SPONSORSHIP_PRODUCT_TYPE,
        listing_id: listingId,
        user_id: user.id,
        plan,
      },
    },
  })

  if (!session.url) return json({ error: 'Checkout could not be started.' }, 503)
  return json({ url: session.url })
}