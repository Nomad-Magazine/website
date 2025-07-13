import type { APIRoute } from 'astro'
import Stripe from 'stripe'
import { getSecret } from 'astro:env/server'

export const prerender = false

export const POST: APIRoute = async ({ request }) => {
  console.log('🔗 Stripe webhook received')
  
  const stripeSecretKey = getSecret('STRIPE_SECRET_KEY')
  const webhookSecret = getSecret('STRIPE_WEBHOOK_SECRET')
  const bentoSiteUuid = getSecret('BENTO_SITE_UUID')
  const bentoPublishableKey = getSecret('BENTO_PUBLISHABLE_KEY')
  const bentoSecretKey = getSecret('BENTO_SECRET_KEY')

  // Log environment variable status (without exposing values)
  console.log('📋 Environment variables check:', {
    stripeSecretKey: !!stripeSecretKey,
    webhookSecret: !!webhookSecret,
    bentoSiteUuid: !!bentoSiteUuid,
    bentoPublishableKey: !!bentoPublishableKey,
    bentoSecretKey: !!bentoSecretKey
  })

  if (!stripeSecretKey || !webhookSecret || !bentoSiteUuid || !bentoPublishableKey || !bentoSecretKey) {
    const missing = []
    if (!stripeSecretKey) missing.push('STRIPE_SECRET_KEY')
    if (!webhookSecret) missing.push('STRIPE_WEBHOOK_SECRET')
    if (!bentoSiteUuid) missing.push('BENTO_SITE_UUID')
    if (!bentoPublishableKey) missing.push('BENTO_PUBLISHABLE_KEY')
    if (!bentoSecretKey) missing.push('BENTO_SECRET_KEY')
    
    console.error('❌ Missing required environment variables:', missing.join(', '))
    return new Response(`Missing configuration: ${missing.join(', ')}`, { status: 500 })
  }

  const stripe = new Stripe(stripeSecretKey)
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  console.log('📝 Request details:', {
    bodyLength: body.length,
    hasSignature: !!signature,
    contentType: request.headers.get('content-type')
  })

  if (!signature) {
    console.error('❌ Missing Stripe signature header')
    return new Response('Missing signature', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
    console.log('✅ Webhook signature verified successfully')
    console.log('📦 Event details:', {
      id: event.id,
      type: event.type,
      created: new Date(event.created * 1000).toISOString(),
      livemode: event.livemode
    })
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', {
      error: err instanceof Error ? err.message : 'Unknown error',
      signatureHeader: signature?.substring(0, 20) + '...',
      bodyLength: body.length
    })
    return new Response('Invalid signature', { status: 400 })
  }

  // Handle the event
  try {
    console.log(`🎯 Processing event: ${event.type}`)
    
    switch (event.type) {
      // One-time purchases
      case 'checkout.session.completed':
        console.log('💳 Handling checkout session completed')
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
        break
      case 'payment_intent.succeeded':
        console.log('💰 Handling payment intent succeeded')
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
        break
      
      // Subscription events
      case 'customer.subscription.created':
        console.log('🔄 Handling subscription created')
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
        break
      case 'customer.subscription.updated':
        console.log('🔄 Handling subscription updated')
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
        break
      case 'customer.subscription.deleted':
        console.log('❌ Handling subscription deleted')
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
        break
      case 'invoice.payment_succeeded':
        console.log('✅ Handling invoice payment succeeded')
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
        break
      case 'invoice.payment_failed':
        console.log('❌ Handling invoice payment failed')
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
        break
      
      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`)
        console.log('📄 Event data preview:', JSON.stringify(event.data.object, null, 2).substring(0, 500) + '...')
    }

    console.log(`✅ Successfully processed event: ${event.type}`)
    return new Response('Success', { status: 200 })
  } catch (error) {
    console.error(`❌ Error processing webhook event ${event.type}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      eventId: event.id,
      eventType: event.type
    })
    return new Response(`Error processing webhook: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, bentoSiteUuid: string, bentoPublishableKey: string, bentoSecretKey: string) {
  console.log('🛒 Processing checkout session:', {
    sessionId: session.id,
    mode: session.mode,
    paymentStatus: session.payment_status,
    customerId: session.customer
  })

  const customerEmail = session.customer_email || session.customer_details?.email
  
  if (!customerEmail) {
    console.error('❌ No customer email found in checkout session:', {
      sessionId: session.id,
      customerEmail: session.customer_email,
      customerDetails: session.customer_details
    })
    return
  }

  console.log('👤 Customer email found:', customerEmail)

  try {
    // Get line items to determine the product SKU
    const stripe = new Stripe(getSecret('STRIPE_SECRET_KEY')!)
    console.log('📋 Fetching line items for session:', session.id)
    
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ['data.price.product']
    })

    console.log('📦 Found line items:', lineItems.data.length)

    for (const [index, item] of lineItems.data.entries()) {
      const product = item.price?.product as Stripe.Product
      const sku = product?.metadata?.sku || product?.id
      
      // Determine if this is a one-time purchase or subscription
      const isSubscription = session.mode === 'subscription'
      const eventType = isSubscription ? 'subscription_purchase' : 'one_time_purchase'

      console.log(`📊 Processing line item ${index + 1}:`, {
        sku,
        productName: product?.name,
        amount: item.amount_total,
        currency: item.currency,
        quantity: item.quantity,
        isSubscription,
        eventType
      })

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
    
    console.log(`✅ Completed processing ${lineItems.data.length} line items for session ${session.id}`)
  } catch (error) {
    console.error('❌ Error processing checkout session:', {
      sessionId: session.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, bentoSiteUuid: string, bentoPublishableKey: string, bentoSecretKey: string) {
  // Get customer email from payment intent
  const stripe = new Stripe(getSecret('STRIPE_SECRET_KEY')!)
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
  const stripe = new Stripe(getSecret('STRIPE_SECRET_KEY')!)
  let subscription: Stripe.Subscription | null = null
  
  if ((invoice as any).subscription && typeof (invoice as any).subscription === 'string') {
    subscription = await stripe.subscriptions.retrieve((invoice as any).subscription)
  }

  // Collect all products in an array
  const products = []
  let totalAmount = 0
  let currency = 'usd'

  for (const line of invoice.lines.data) {
    const sku = line.pricing?.price_details?.product

    products.push({
      sku,
      amount: line.amount,
      currency: line.currency,
      quantity: line.quantity
    })

    totalAmount += line.amount
    currency = line.currency
  }

  // Send single event with all products
  await sendBentoEvent(customerEmail, 'subscription_payment_succeeded', {
    products,
    total_amount: totalAmount,
    currency,
    invoice_id: invoice.id,
    subscription_id: subscription?.id,
    purchase_type: 'subscription'
  }, bentoSiteUuid, bentoPublishableKey, bentoSecretKey)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, bentoSiteUuid: string, bentoPublishableKey: string, bentoSecretKey: string) {
  const customerEmail = invoice.customer_email
  
  if (!customerEmail) {
    console.error('No customer email found in failed invoice')
    return
  }

  // Get subscription details if available
  const stripe = new Stripe(getSecret('STRIPE_SECRET_KEY')!)
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
  const stripe = new Stripe(getSecret('STRIPE_SECRET_KEY')!)
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
  const stripe = new Stripe(getSecret('STRIPE_SECRET_KEY')!)
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
  const stripe = new Stripe(getSecret('STRIPE_SECRET_KEY')!)
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
  console.log('📧 Preparing to send Bento event:', {
    email,
    eventType,
    dataKeys: Object.keys(eventData),
    siteUuid: bentoSiteUuid.substring(0, 8) + '...'
  })

  const requestBody = {
    events: [{
      email,
      type: eventType,
      details: eventData
    }]
  }

  console.log('📤 Request payload:', JSON.stringify(requestBody, null, 2))

  try {
    const url = `https://app.bentonow.com/api/v1/batch/events?site_uuid=${bentoSiteUuid}`
    console.log('🌐 Making request to:', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${bentoPublishableKey}:${bentoSecretKey}`)}`,
        'User-Agent': 'Nomad-Magazine-Webhook/1.0'
      },
      body: JSON.stringify(requestBody)
    })

    console.log('📨 Bento API response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Failed to send Bento event:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText,
        email,
        eventType,
        requestUrl: url
      })
      throw new Error(`Bento API error: ${response.status} - ${errorText}`)
    } else {
      const responseData = await response.text()
      console.log('✅ Successfully sent Bento event:', {
        email,
        eventType,
        responseBody: responseData
      })
    }
  } catch (error) {
    console.error('❌ Error sending event to Bento:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      email,
      eventType,
      eventData
    })
    throw error
  }
} 
