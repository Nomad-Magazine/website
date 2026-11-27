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

  const stripeSecretKey = getSecret('STRIPE_SECRET_KEY')
  if (!stripeSecretKey) return json({ error: 'Billing portal is not configured yet.' }, 503)

  const supabase = createSupabaseServerClient(request, cookies)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return json({ error: 'Sign in to manage billing.' }, 401)

  const { data: sponsorship, error } = await supabase
    .from('directory_sponsorships')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !sponsorship?.stripe_customer_id) {
    return json({ error: 'No active sponsorship billing profile found.' }, 404)
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-02-25.clover' })
  const portal = await stripe.billingPortal.sessions.create({
    customer: sponsorship.stripe_customer_id,
    return_url: `${url.origin}/console/boost/`,
  })

  return json({ url: portal.url })
}