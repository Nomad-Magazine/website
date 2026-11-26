import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './supabase-config'
import { requireWorkerSecret } from './directory-vote-secrets'
import { hashClientNetwork, verifyTurnstileToken } from './directory-vote-network'

export type VoteResult = { listing_id: string; vote_count: number; voted: boolean }

export function serviceClient() {
  const { url } = getSupabaseConfig()
  return createClient(url, requireWorkerSecret('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function castDirectoryVote(options: {
  request: Request
  userId: string
  listingId: string
  voted: boolean
}): Promise<VoteResult> {
  const salt = requireWorkerSecret('DIRECTORY_IP_HASH_SALT')
  const networkHash = options.voted ? await hashClientNetwork(options.request, salt) : null
  if (options.voted && !networkHash) throw new Error('Vote network unavailable')
  const { data, error } = await serviceClient().rpc('directory_set_vote', {
    p_user_id: options.userId,
    p_listing_id: options.listingId,
    p_voted: options.voted,
    p_network_hash: networkHash,
  })
  if (error) throw error
  const row = data?.[0] as { result_listing_id: string; vote_count: number; voted: boolean } | undefined
  if (!row) throw new Error('Vote result missing')
  return { listing_id: row.result_listing_id, vote_count: Number(row.vote_count), voted: row.voted }
}

export async function verifyHumanVote(request: Request, token: string): Promise<void> {
  const secret = requireWorkerSecret('TURNSTILE_SECRET_KEY')
  const ip = request.headers.get('cf-connecting-ip')
  if (!await verifyTurnstileToken(secret, token, ip)) {
    const error = new Error('Human verification failed') as Error & { code?: string }
    error.code = 'turnstile'
    throw error
  }
}