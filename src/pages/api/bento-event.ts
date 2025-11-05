import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request, site }) => {
  console.log('[BENTO-EVENT] Processing event request')

  // Check origin/referer to ensure request is from our website
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const allowedOrigins = [
    site?.origin || 'https://nomad-magazine.com',
    'http://localhost:4321',
    'http://localhost:3000',
  ]

  const isValidOrigin = origin && allowedOrigins.some((allowed) => origin.startsWith(allowed))
  const isValidReferer = referer && allowedOrigins.some((allowed) => referer.startsWith(allowed))

  if (!isValidOrigin && !isValidReferer) {
    console.error('[BENTO-EVENT] Unauthorized request - invalid origin/referer')
    console.error(`[BENTO-EVENT] Origin: ${origin}, Referer: ${referer}`)
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log('[BENTO-EVENT] Request authorized from:', origin || referer)

  try {
    const formData = await request.formData()
    const email = formData.get('email')
    const eventType = formData.get('event_type')

    console.log(`[BENTO-EVENT] Email provided: ${email ? 'yes' : 'no'}`)
    console.log(`[BENTO-EVENT] Event type: ${eventType}`)

    if (!email) {
      console.error('[BENTO-EVENT] Missing email')
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!eventType) {
      console.error('[BENTO-EVENT] Missing event_type')
      return new Response(JSON.stringify({ error: 'Event type is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get Bento credentials from environment
    const BENTO_SITE_UUID = import.meta.env.BENTO_SITE_UUID
    const BENTO_PUBLISHABLE_KEY = import.meta.env.BENTO_PUBLISHABLE_KEY
    const BENTO_SECRET_KEY = import.meta.env.BENTO_SECRET_KEY

    if (!BENTO_SITE_UUID || !BENTO_PUBLISHABLE_KEY || !BENTO_SECRET_KEY) {
      console.error('[BENTO-EVENT] Missing Bento environment variables')
      return new Response(JSON.stringify({ error: 'Configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Collect all form fields except email and event_type
    const fields: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      if (key !== 'email' && key !== 'event_type' && typeof value === 'string') {
        fields[key] = value
      }
    }

    console.log('[BENTO-EVENT] Submitting to Bento Events API')
    console.log(`[BENTO-EVENT] Fields: ${JSON.stringify(fields)}`)

    // Create base64 auth header: publishableKey:secretKey
    const authString = `${BENTO_PUBLISHABLE_KEY}:${BENTO_SECRET_KEY}`
    const base64 = Buffer.from(authString).toString('base64')

    const bentoResponse = await fetch(`https://app.bentonow.com/api/v1/batch/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${base64}`,
        'User-Agent': 'Nomad-Magazine-API/1.0',
      },
      body: JSON.stringify({
        site_uuid: BENTO_SITE_UUID,
        events: [
          {
            email: email,
            type: eventType,
            fields: fields,
          },
        ],
      }),
    })

    console.log(`[BENTO-EVENT] Bento API response status: ${bentoResponse.status}`)

    if (!bentoResponse.ok) {
      const errorText = await bentoResponse.text()
      console.error(`[BENTO-EVENT] Bento API error (status ${bentoResponse.status}): ${errorText}`)
      return new Response(JSON.stringify({ error: 'Failed to track event' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const responseData = await bentoResponse.json()
    console.log('[BENTO-EVENT] Successfully submitted event:', JSON.stringify(responseData))

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[BENTO-EVENT] Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
