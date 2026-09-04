import { env } from 'cloudflare:workers'

function readEnv(name: 'BENTO_SITE_UUID' | 'BENTO_PUBLISHABLE_KEY' | 'BENTO_SECRET_KEY'): string {
  const fromCf = (env as Record<string, string | undefined>)[name]
  const fromProcess = typeof process !== 'undefined' ? process.env[name] : undefined
  const value = String(fromCf || fromProcess || '').trim()
  if (!value || value.includes('PLACEHOLDER')) return ''
  return value
}

function bentoAuthHeader(publishableKey: string, secretKey: string): string {
  return `Basic ${Buffer.from(`${publishableKey}:${secretKey}`).toString('base64')}`
}

export async function subscribeToNewsletter(options: {
  email: string
  firstName?: string
  tags?: string
  eventType?: string
  fields?: Record<string, string>
}): Promise<boolean> {
  const email = options.email.trim().toLowerCase()
  if (!email) return false

  const siteUuid = readEnv('BENTO_SITE_UUID')
  const publishableKey = readEnv('BENTO_PUBLISHABLE_KEY')
  const secretKey = readEnv('BENTO_SECRET_KEY')

  if (!siteUuid || !publishableKey || !secretKey) {
    console.error('[BENTO] Missing Bento environment variables')
    return false
  }

  const auth = bentoAuthHeader(publishableKey, secretKey)
  const eventType = options.eventType || '$subscribe_newsletter'
  const tags = options.tags || 'Nomad_directory_form'
  const fields = { ...(options.fields || {}) }
  if (options.firstName?.trim()) fields.first_name = options.firstName.trim()

  try {
    const eventRes = await fetch(
      `https://app.bentonow.com/api/v1/batch/events?site_uuid=${encodeURIComponent(siteUuid)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: auth,
          'User-Agent': 'Nomad-Magazine-API/1.0',
        },
        body: JSON.stringify({
          events: [{ email, type: eventType, fields }],
        }),
      },
    )
    if (!eventRes.ok) {
      console.error('[BENTO] Event failed', eventRes.status, await eventRes.text().catch(() => ''))
      return false
    }

    const subscriber: Record<string, string> = { email, tags }
    if (fields.first_name) subscriber.first_name = fields.first_name

    const subRes = await fetch(
      `https://app.bentonow.com/api/v1/batch/subscribers?site_uuid=${encodeURIComponent(siteUuid)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: auth,
          'User-Agent': 'Nomad-Magazine-API/1.0',
        },
        body: JSON.stringify({ subscribers: [subscriber] }),
      },
    )
    if (!subRes.ok) {
      console.error('[BENTO] Subscriber import failed', subRes.status, await subRes.text().catch(() => ''))
      return false
    }

    return true
  } catch (error) {
    console.error('[BENTO] Subscribe error', error)
    return false
  }
}
