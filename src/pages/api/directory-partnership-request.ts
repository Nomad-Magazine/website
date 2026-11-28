import type { APIRoute } from 'astro'
import { requireWorkerSecret } from '~/utils/directory-vote-secrets'
import { submitPartnershipRequest, validatePartnershipPayload } from '~/utils/directory-partnership'

export const prerender = false

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Robots-Tag': 'noindex, nofollow' },
  })

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Invalid request origin.' }, 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Invalid request.' }, 400)
  let raw: unknown
  try {
    const body = await request.text()
    if (body.length > 4096) return json({ error: 'Invalid request.' }, 400)
    raw = JSON.parse(body)
  } catch {
    return json({ error: 'Invalid request.' }, 400)
  }

  const validated = validatePartnershipPayload(raw)
  if (!validated.ok) return json({ error: validated.error }, validated.status)

  try {
    requireWorkerSecret('SUPABASE_SERVICE_ROLE_KEY')
    requireWorkerSecret('DIRECTORY_IP_HASH_SALT')
    requireWorkerSecret('TURNSTILE_SECRET_KEY')
  } catch {
    return json({ error: 'Partnership requests are temporarily unavailable.' }, 503)
  }

  const result = await submitPartnershipRequest(request, validated.payload)
  if (!result.ok) return json({ error: result.error }, result.status)
  return json({ ok: true })
}