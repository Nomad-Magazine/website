import type { APIRoute } from 'astro'
import Stripe from 'stripe'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET
  const bentoSiteUuid = import.meta.env.BENTO_SITE_UUID
  const bentoPublishableKey = import.meta.env.BENTO_PUBLISHABLE_KEY
  const bentoSecretKey = import.meta.env.BENTO_SECRET_KEY

  if (!stripeSecretKey || !webhookSecret || !bentoSiteUuid || !bentoPublishableKey || !bentoSecretKey) {
    console.error('Missing required environment variables')
    return new Response('Missing configuration', { status: 500 })
  }

  const stripe = new Stripe(stripeSecretKey)
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('Missing Stripe signature')
    return new Response('Missing signature', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // Handle the event
  try {
    switch (event.type) {
      // One-time purchases
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
        break
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
        break
      
      // Subscription events
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response('Success', { status: 200 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response('Error processing webhook', { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, bentoSiteUuid: string, bentoPublishableKey: string, bentoSecretKey: string) {
  const customerEmail = session.customer_email || session.customer_details?.email
  
  if (!customerEmail) {
    console.error('No customer email found in checkout session')
    return
  }

  // Get line items to determine the product SKU
  const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY)
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ['data.price.product']
  })

  for (const item of lineItems.data) {
    const product = item.price?.product as Stripe.Product
    const sku = product?.metadata?.sku || product?.id
    
    // Determine if this is a one-time purchase or subscription
    const isSubscription = session.mode === 'subscription'
    const eventType = isSubscription ? 'subscription_purchase' : 'one_time_purchase'

    await sendBentoEvent(customerEmail, eventType, {
      sku,
      product_name: product?.name,
      amount: item.amount_total,
      currency: item.currency,
      quantity: item.quantity,
      session_id: session.id,
      purchase_type: isSubscription ? 'subscription' : 'one_time'
    }, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, bentoSiteUuid: string, bentoPublishableKey: string, bentoSecretKey: string) {
  // Get customer email from payment intent
  const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY)
  let customerEmail: string | null = null
  
  if (paymentIntent.customer) {
    const customer = await stripe.customers.retrieve(paymentIntent.customer as string)
    if (customer && !customer.deleted) {
      customerEmail = customer.email
    }
  }
  
  // If no customer email from customer, try to get from receipt_email
  if (!customerEmail && paymentIntent.receipt_email) {
    customerEmail = paymentIntent.receipt_email
  }
  
  if (!customerEmail) {
    console.error('No customer email found in payment intent')
    return
  }

  // For payment intents, we need to get product info from metadata or charges
  const sku = paymentIntent.metadata?.sku || paymentIntent.id
  const productName = paymentIntent.metadata?.product_name || 'Unknown Product'

  await sendBentoEvent(customerEmail, 'one_time_purchase', {
    sku,
    product_name: productName,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    payment_intent_id: paymentIntent.id,
    purchase_type: 'one_time'
  }, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, bentoSiteUuid: string, bentoPublishableKey: string, bentoSecretKey: string) {
  const customerEmail = invoice.customer_email
  
  if (!customerEmail) {
    console.error('No customer email found in invoice')
    return
  }

  // Get subscription details if available
  const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY)
  let subscription: Stripe.Subscription | null = null
  
  if ((invoice as any).subscription && typeof (invoice as any).subscription === 'string') {
    subscription = await stripe.subscriptions.retrieve((invoice as any).subscription)
  }

  for (const line of invoice.lines.data) {
    const product = (line as any).price?.product as Stripe.Product
    const sku = product?.metadata?.sku || product?.id

    await sendBentoEvent(customerEmail, 'subscription_payment_succeeded', {
      sku,
      product_name: product?.name,
      amount: line.amount,
      currency: line.currency,
      quantity: line.quantity,
      invoice_id: invoice.id,
      subscription_id: subscription?.id,
      purchase_type: 'subscription'
    }, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, bentoSiteUuid: string, bentoPublishableKey: string, bentoSecretKey: string) {
  const customerEmail = invoice.customer_email
  
  if (!customerEmail) {
    console.error('No customer email found in failed invoice')
    return
  }

  // Get subscription details if available
  const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY)
  let subscription: Stripe.Subscription | null = null
  
  if ((invoice as any).subscription && typeof (invoice as any).subscription === 'string') {
    subscription = await stripe.subscriptions.retrieve((invoice as any).subscription)
  }

  for (const line of invoice.lines.data) {
    const product = (line as any).price?.product as Stripe.Product
    const sku = product?.metadata?.sku || product?.id

    await sendBentoEvent(customerEmail, 'subscription_payment_failed', {
      sku,
      product_name: product?.name,
      amount: line.amount,
      currency: line.currency,
      quantity: line.quantity,
      invoice_id: invoice.id,
      subscription_id: subscription?.id,
      purchase_type: 'subscription'
    }, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription, bentoSiteUuid: string, bentoPublishableKey: string, bentoSecretKey: string) {
  const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY)
  const customer = await stripe.customers.retrieve(subscription.customer as string)
  
  if (!customer || customer.deleted || !customer.email) {
    console.error('No customer email found for subscription')
    return
  }

  for (const item of subscription.items.data) {
    const product = item.price.product as Stripe.Product
    const sku = product?.metadata?.sku || product?.id

    await sendBentoEvent(customer.email, 'subscription_created', {
      sku,
      product_name: product?.name,
      subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: (subscription as any).current_period_start,
      current_period_end: (subscription as any).current_period_end
    }, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, bentoSiteUuid: string, bentoPublishableKey: string, bentoSecretKey: string) {
  const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY)
  const customer = await stripe.customers.retrieve(subscription.customer as string)
  
  if (!customer || customer.deleted || !customer.email) {
    console.error('No customer email found for subscription')
    return
  }

  for (const item of subscription.items.data) {
    const product = item.price.product as Stripe.Product
    const sku = product?.metadata?.sku || product?.id

    await sendBentoEvent(customer.email, 'subscription_updated', {
      sku,
      product_name: product?.name,
      subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: (subscription as any).current_period_start,
      current_period_end: (subscription as any).current_period_end
    }, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, bentoSiteUuid: string, bentoPublishableKey: string, bentoSecretKey: string) {
  const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY)
  const customer = await stripe.customers.retrieve(subscription.customer as string)
  
  if (!customer || customer.deleted || !customer.email) {
    console.error('No customer email found for subscription')
    return
  }

  for (const item of subscription.items.data) {
    const product = item.price.product as Stripe.Product
    const sku = product?.metadata?.sku || product?.id

    await sendBentoEvent(customer.email, 'subscription_cancelled', {
      sku,
      product_name: product?.name,
      subscription_id: subscription.id,
      status: subscription.status,
      cancelled_at: subscription.canceled_at
    }, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
  }
}

async function sendBentoEvent(email: string, eventType: string, eventData: any, bentoSiteUuid: string, bentoPublishableKey: string, bentoSecretKey: string) {
  try {
    const response = await fetch(`https://app.bentonow.com/api/v1/batch/events?site_uuid=${bentoSiteUuid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${bentoPublishableKey}:${bentoSecretKey}`)}`
      },
      body: JSON.stringify({
        events: [{
          email,
          type: eventType,
          details: eventData
        }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Failed to send Bento event: ${response.status} - ${errorText}`)
    } else {
      console.log(`Successfully sent ${eventType} event to Bento for ${email}`)
    }
  } catch (error) {
    console.error('Error sending event to Bento:', error)
  }
} 
