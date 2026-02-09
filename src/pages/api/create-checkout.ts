import type { APIRoute } from 'astro'
import Stripe from 'stripe'

export const prerender = false

// Product IDs mapping
const PRODUCT_IDS = {
  1: 'prod_TwqPF0bRfQSsTo',
  2: 'prod_QYHQ8VUJ6K8oFp',
  3: 'prod_SL6Cef0uzAorZ9',
  4: 'prod_TpflUlQoCc8URb',
} as const

// 50% discount for any additional editions
const DISCOUNT_PERCENT = 0.50

export const POST: APIRoute = async ({ request }) => {
  try {
    const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY

    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY environment variable is not set')
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-09-30.clover',
    })

    const body = await request.json()
    const { items } = body // items: [{ edition: 1, quantity: 2 }, { edition: 3, quantity: 1 }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid items' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Apply 50% discount to all items (upsell offer)
    const discountPercent = DISCOUNT_PERCENT

    // Get prices for each product
    const lineItems = await Promise.all(
      items.map(async (item: any) => {
        const productId = PRODUCT_IDS[item.edition as keyof typeof PRODUCT_IDS]
        
        if (!productId) {
          throw new Error(`Invalid edition: ${item.edition}`)
        }

        // Get product to find default price
        const product = await stripe.products.retrieve(productId)
        const defaultPriceId = product.default_price as string

        if (!defaultPriceId) {
          throw new Error(`No default price for edition ${item.edition}`)
        }

        return {
          price: defaultPriceId,
          quantity: item.quantity || 1,
        }
      })
    )

    // Create checkout session
    const origin = new URL(request.url).origin
    
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/print-order-success/`,
      cancel_url: `${origin}/print-order-success/`,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'PL', 'CZ', 'GR', 'RO', 'BG', 'HR', 'SI', 'SK', 'EE', 'LV', 'LT', 'LU', 'MT', 'CY', 'AU', 'NZ', 'JP', 'SG', 'HK', 'KR', 'TW', 'TH', 'MY', 'ID', 'PH', 'VN', 'IN', 'AE', 'SA', 'IL', 'TR', 'ZA', 'BR', 'MX', 'AR', 'CL', 'CO'],
      },
      billing_address_collection: 'required',
      customer_email: undefined,
      metadata: {
        upsell_order: 'true',
        discount_applied: (discountPercent * 100).toString(),
      }
    }

    // Create a coupon for 50% discount
    const coupon = await stripe.coupons.create({
      percent_off: discountPercent * 100,
      duration: 'once',
      name: 'Upsell 50% Off',
    })

    // Apply the discount (can't use both allow_promotion_codes and discounts)
    sessionParams.discounts = [{
      coupon: coupon.id,
    }]

    const session = await stripe.checkout.sessions.create(sessionParams)

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to create checkout session' 
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
