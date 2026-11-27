import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './supabase-config'
import { requireWorkerSecret, workerPartnershipLimiter } from './directory-vote-secrets'
import { verifyTurnstileToken, hashClientNetwork } from './directory-vote-network'

export type PartnershipSubmitPayload = {
  listing_id: string
  name: string
  email: string
  company: string
  message: string
  turnstile_token: string
}

export function partnershipServiceClient() {
  const { url } = getSupabaseConfig()
  return createClient(url, requireWorkerSecret('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
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

export async function submitPartnershipRequest(request: Request, payload: PartnershipSubmitPayload): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const secret = requireWorkerSecret('TURNSTILE_SECRET_KEY')
  const ip = request.headers.get('cf-connecting-ip')
  if (!await verifyTurnstileToken(secret, payload.turnstile_token, ip)) {
    return { ok: false, status: 401, error: 'Human verification failed. Please try again.' }
  }
  const limiter = workerPartnershipLimiter()
  const salt = requireWorkerSecret('DIRECTORY_IP_HASH_SALT')
  const networkHash = await hashClientNetwork(request, salt)
  const rateKey = networkHash ? `${networkHash}:${payload.listing_id}` : `${ip ?? 'unknown'}:${payload.listing_id}`
  if (limiter) {
    const { success } = await limiter.limit({ key: rateKey })
    if (!success) return { ok: false, status: 429, error: 'Too many requests. Please wait a moment and try again.' }
  }
  const { error } = await partnershipServiceClient().rpc('directory_submit_partnership_request', {
    p_public_listing_id: payload.listing_id,
    p_name: payload.name,
    p_email: payload.email,
    p_company: payload.company,
    p_message: payload.message,
  })
  if (error) {
    const message = error.message || ''
    if (message.includes('Listing unavailable')) return { ok: false, status: 404, error: 'This listing is not accepting partnership requests.' }
    if (message.includes('Invalid') || message.includes('must be')) return { ok: false, status: 400, error: 'Check the form and try again.' }
    return { ok: false, status: 503, error: 'Could not send your request. Please try again.' }
  }
  return { ok: true }
}

export type PartnerOffer = {
  title: string
  description: string
  url: string
  code: string
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