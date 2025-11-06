import type { APIRoute } from 'astro'
import { getSecret } from 'astro:env/server'

export const POST: APIRoute = async ({ request }) => {
  console.log('[BENTO-EVENT] Processing event request')

  // Check origin/referer to ensure request is from our website
  const originHeader = request.headers.get('origin')
  const refererHeader = request.headers.get('referer')

  const allowedDomains = ['nomad-magazine.com', 'localhost']

  console.log(`[BENTO-EVENT] Origin: ${originHeader}, Referer: ${refererHeader}`)

  // Extract and validate domain from origin
  let isValidOrigin = false
  if (originHeader) {
    try {
      const originUrl = new URL(originHeader)
      const domain = originUrl.hostname
      isValidOrigin = allowedDomains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`))
      console.log(`[BENTO-EVENT] Origin domain: ${domain}, valid: ${isValidOrigin}`)
    } catch (e) {
      console.error('[BENTO-EVENT] Invalid origin URL:', originHeader)
    }
  }

  // Extract and validate domain from referer
  let isValidReferer = false
  if (refererHeader) {
    try {
      const refererUrl = new URL(refererHeader)
      const domain = refererUrl.hostname
      isValidReferer = allowedDomains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`))
      console.log(`[BENTO-EVENT] Referer domain: ${domain}, valid: ${isValidReferer}`)
    } catch (e) {
      console.error('[BENTO-EVENT] Invalid referer URL:', refererHeader)
    }
  }

  if (!isValidOrigin && !isValidReferer) {
    console.error('[BENTO-EVENT] Unauthorized - invalid domain')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log('[BENTO-EVENT] Authorized')

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
    const BENTO_SITE_UUID = getSecret('BENTO_SITE_UUID')
    const BENTO_PUBLISHABLE_KEY = getSecret('BENTO_PUBLISHABLE_KEY')
    const BENTO_SECRET_KEY = getSecret('BENTO_SECRET_KEY')

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
