import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './supabase-config'
import { requireWorkerSecret, workerPartnershipLimiter } from './directory-vote-secrets'
import { verifyTurnstileToken, hashClientNetwork } from './directory-vote-network'
import {
  validatePartnershipPayload,
  partnerOfferFromPayload,
  type PartnershipSubmitPayload,
  type PartnerOffer,
} from './directory-partnership-validate'

export { validatePartnershipPayload, partnerOfferFromPayload, type PartnershipSubmitPayload, type PartnerOffer }

export function partnershipServiceClient() {
  const { url } = getSupabaseConfig()
  return createClient(url, requireWorkerSecret('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function submitPartnershipRequest(request: Request, payload: PartnershipSubmitPayload): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const secret = requireWorkerSecret('TURNSTILE_SECRET_KEY')
  const ip = request.headers.get('cf-connecting-ip')
  if (!await verifyTurnstileToken(secret, payload.turnstile_token, ip)) {
    return { ok: false, status: 401, error: 'Human verification failed. Please try again.' }
  }
  const limiter = workerPartnershipLimiter()
  if (!limiter) return { ok: false, status: 503, error: 'Partnership requests are temporarily unavailable.' }
  const salt = requireWorkerSecret('DIRECTORY_IP_HASH_SALT')
  const networkHash = await hashClientNetwork(request, salt)
  const rateKey = networkHash ? `${networkHash}:${payload.listing_id}` : `${ip ?? 'unknown'}:${payload.listing_id}`
  const { success } = await limiter.limit({ key: rateKey })
  if (!success) return { ok: false, status: 429, error: 'Too many requests. Please wait a moment and try again.' }
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