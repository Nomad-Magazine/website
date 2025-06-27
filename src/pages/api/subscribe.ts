export const prerender = false

import type { APIRoute } from 'astro'
import { BENTO_SITE_UUID, BENTO_PUBLISHABLE_KEY, BENTO_SECRET_KEY } from 'astro:env/server'

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json()
  if (!body.email)
    return new Response(
      JSON.stringify({
        success: 0,
        message: 'Email is required.',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  try {
    const tag = body.tag
    const email = body.email
    const data = JSON.stringify({ subscriber: { email } })
    // Create Basic Auth header
    const authHeader = 'Basic ' + btoa(`${BENTO_PUBLISHABLE_KEY}:${BENTO_SECRET_KEY}`)
    const response = await fetch(`https://app.bentonow.com/api/v1/fetch/subscribers?site_uuid=${BENTO_SITE_UUID}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: data,
    })
    return new Response(JSON.stringify(await response.json()), {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (response.ok) {
      if (tag) {
        await fetch(`https://app.bentonow.com/api/v1/fetch/commands?site_uuid=${BENTO_SITE_UUID}`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            command: [
              {
                command: 'add_tag',
                email: email,
                query: tag,
              },
            ],
          }),
        })
      }
      return new Response(
        JSON.stringify({
          success: 1,
          message: 'Thank you! Your submission has been received!',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }
    return new Response(
      JSON.stringify({
        success: 0,
        message: 'Something went wrong. Please try again.',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        e: e.message || e.toString(),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }
}
