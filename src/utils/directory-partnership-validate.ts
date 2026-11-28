export type PartnershipSubmitPayload = {
  listing_id: string
  name: string
  email: string
  company: string
  message: string
  turnstile_token: string
}

export type PartnerOffer = {
  title: string
  description: string
  url: string
  code: string
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const listingIdPattern = /^[a-zA-Z0-9-]{1,100}$/

export function validatePartnershipPayload(raw: unknown): { ok: true; payload: PartnershipSubmitPayload } | { ok: false; status: number; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, status: 400, error: 'Invalid request.' }
  const body = raw as Record<string, unknown>
  const listing_id = typeof body.listing_id === 'string' ? body.listing_id.trim() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const company = typeof body.company === 'string' ? body.company.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const turnstile_token = typeof body.turnstile_token === 'string' ? body.turnstile_token.trim() : ''
  if (!listingIdPattern.test(listing_id)) return { ok: false, status: 400, error: 'Invalid listing.' }
  if (name.length < 2 || name.length > 120) return { ok: false, status: 400, error: 'Enter your name.' }
  if (!emailPattern.test(email) || email.length > 254) return { ok: false, status: 400, error: 'Enter a valid email.' }
  if (company.length > 200) return { ok: false, status: 400, error: 'Company name is too long.' }
  if (message.length < 10 || message.length > 2000) return { ok: false, status: 400, error: 'Message must be 10–2000 characters.' }
  if (!turnstile_token) return { ok: false, status: 401, error: 'Human verification failed. Please try again.' }
  return { ok: true, payload: { listing_id, name, email, company, message, turnstile_token } }
}

export function partnerOfferFromPayload(payload: Record<string, string>): PartnerOffer | null {
  const title = String(payload.partner_offer_title || '').trim()
  const url = String(payload.partner_offer_url || '').trim()
  const description = String(payload.partner_offer_description || '').trim()
  const code = String(payload.partner_offer_code || '').trim()
  if (!title || !url) return null
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
  } catch {
    return null
  }
  return { title, description, url, code }
}