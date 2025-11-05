import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request }) => {
  console.log('[SUBSCRIBE-ARTICLE] Processing subscription request')

  try {
    const formData = await request.formData()
    const email = formData.get('email')
    const firstName = formData.get('first_name')

    console.log(`[SUBSCRIBE-ARTICLE] Email provided: ${email ? 'yes' : 'no'}`)
    console.log(`[SUBSCRIBE-ARTICLE] First name provided: ${firstName ? 'yes' : 'no'}`)

    if (!email) {
      console.error('[SUBSCRIBE-ARTICLE] Missing email')
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get Bento credentials from environment
    const BENTO_SITE_UUID = import.meta.env.BENTO_SITE_UUID
    const BENTO_PUBLISHABLE_KEY = import.meta.env.BENTO_PUBLISHABLE_KEY
    const BENTO_SECRET_KEY = import.meta.env.BENTO_SECRET_KEY

    if (!BENTO_SITE_UUID || !BENTO_PUBLISHABLE_KEY || !BENTO_SECRET_KEY) {
      console.error('[SUBSCRIBE-ARTICLE] Missing Bento environment variables')
      return new Response(JSON.stringify({ error: 'Configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log('[SUBSCRIBE-ARTICLE] Submitting to Bento API')

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
            type: '$free_article_download',
            fields: {
              first_name: firstName || '',
            },
          },
        ],
      }),
    })

    console.log(`[SUBSCRIBE-ARTICLE] Bento API response status: ${bentoResponse.status}`)

    if (!bentoResponse.ok) {
      const errorText = await bentoResponse.text()
      console.error(`[SUBSCRIBE-ARTICLE] Bento API error (status ${bentoResponse.status}): ${errorText}`)
      return new Response(JSON.stringify({ error: 'Failed to subscribe' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const responseData = await bentoResponse.json()
    console.log('[SUBSCRIBE-ARTICLE] Successfully submitted subscriber:', JSON.stringify(responseData))

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[SUBSCRIBE-ARTICLE] Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
