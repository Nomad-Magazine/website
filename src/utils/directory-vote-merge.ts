import type { AstroCookies } from 'astro'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireWorkerSecret } from './directory-vote-secrets'
import { serviceClient } from './directory-vote-cast'
import { directoryReturnTo } from './directory-votes'
import { normalizeVoteEmail } from './directory-vote-email-link'

const mergeCookie = 'nomad-directory-vote-merge'
const mergeExpectedCookie = 'nomad-directory-vote-merge-expected'
const newEmailCookie = 'nomad-directory-vote-new-email'
const returnCookie = 'nomad-directory-return'
const callbackPath = '/auth/callback/'

async function hmacHex(payload: string): Promise<string> {
  const salt = requireWorkerSecret('DIRECTORY_IP_HASH_SALT')
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(salt),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashVoteEmail(email: string): Promise<string> {
  const salt = requireWorkerSecret('DIRECTORY_IP_HASH_SALT')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${email}`))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function existingVerifiedUserForEmail(email: string): Promise<string | null> {
  const { data, error } = await serviceClient().rpc('directory_vote_target_user_for_email', { p_email: email })
  if (error) throw error
  return typeof data === 'string' ? data : null
}

export async function createVotePendingMerge(anonUserId: string, email: string): Promise<string> {
  const targetEmailHash = await hashVoteEmail(email)
  const { data, error } = await serviceClient().rpc('directory_vote_pending_merge_create', {
    p_anon_user_id: anonUserId,
    p_target_email_hash: targetEmailHash,
  })
  if (error) throw error
  if (typeof data !== 'string') throw new Error('Pending merge missing')
  return data
}

export async function signMergeCookieValue(mergeId: string): Promise<string> {
  const signature = await hmacHex(`merge:${mergeId}`)
  return `v1.${mergeId}.${signature}`
}

export async function verifyMergeCookieValue(raw: string | undefined | null): Promise<string | null> {
  if (!raw) return null
  const parts = raw.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') return null
  const mergeId = parts[1]
  if (!/^[0-9a-f-]{36}$/i.test(mergeId)) return null
  const expected = await hmacHex(`merge:${mergeId}`)
  if (expected !== parts[2]) return null
  return mergeId
}

export function setVoteMergeCookie(cookies: AstroCookies, mergeValue: string, secure: boolean) {
  cookies.set(mergeCookie, mergeValue, {
    path: callbackPath,
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 3600,
  })
  cookies.set(mergeExpectedCookie, '1', {
    path: callbackPath,
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 3600,
  })
}

export function setVoteEmailReturnCookie(cookies: AstroCookies, returnTo: string, secure: boolean) {
  cookies.set(returnCookie, directoryReturnTo(returnTo), {
    path: callbackPath,
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 3600,
  })
}

export function clearVoteMergeCookie(cookies: AstroCookies) {
  cookies.delete(mergeCookie, { path: callbackPath })
  cookies.delete(mergeExpectedCookie, { path: callbackPath })
}

export function consumeVoteMergeExpected(cookies: AstroCookies): boolean {
  const expected = cookies.get(mergeExpectedCookie)?.value === '1'
  cookies.delete(mergeExpectedCookie, { path: callbackPath })
  return expected
}

export function markVoteNewEmailConfirm(cookies: AstroCookies, secure: boolean) {
  cookies.set(newEmailCookie, '1', {
    path: callbackPath,
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 3600,
  })
}

export function consumeVoteNewEmailConfirm(cookies: AstroCookies): boolean {
  const pending = cookies.get(newEmailCookie)?.value === '1'
  cookies.delete(newEmailCookie, { path: callbackPath })
  return pending
}

export function readMergeCookie(request: Request): string | undefined {
  const prefix = `${mergeCookie}=`
  for (const part of (request.headers.get('Cookie') ?? '').split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length))
  }
  return undefined
}

export async function tryMergeAnonymousVotes(
  request: Request,
  cookies: AstroCookies,
  targetUserId: string,
  email: string,
): Promise<'no_cookie' | 'failed' | number> {
  const mergeId = await verifyMergeCookieValue(readMergeCookie(request))
  if (!mergeId) return 'no_cookie'
  const normalized = normalizeVoteEmail(email)
  if (!normalized) {
    clearVoteMergeCookie(cookies)
    return 'failed'
  }
  const targetEmailHash = await hashVoteEmail(normalized)
  const { data, error } = await serviceClient().rpc('directory_merge_anonymous_votes', {
    p_merge_id: mergeId,
    p_target_user_id: targetUserId,
    p_target_email_hash: targetEmailHash,
  })
  clearVoteMergeCookie(cookies)
  if (error) return 'failed'
  return typeof data === 'number' ? data : Number(data)
}

export async function sendExistingAccountVoteOtp(
  supabase: SupabaseClient,
  email: string,
  returnTo: string,
  origin: string,
) {
  const redirectTo = new URL(callbackPath, origin)
  redirectTo.searchParams.set('next', directoryReturnTo(returnTo))
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo.href, shouldCreateUser: false },
  })
  if (!error) return
  const message = (error.message ?? '').toLowerCase()
  const code = (error.code ?? '').toLowerCase()
  if (error.status === 429 || message.includes('rate') || message.includes('too many')) {
    const rate = new Error('rate_limited') as Error & { code?: string }
    rate.code = 'rate_limited'
    throw rate
  }
  if (code === 'otp_disabled' || message.includes('signups not allowed')) {
    throw new Error('unavailable')
  }
  if (message.includes('rate')) throw Object.assign(new Error('rate_limited'), { code: 'rate_limited' })
  throw new Error('unavailable')
}

export function directoryVoteMergedNoticeUrl(next: string, origin: string, moved: number): string {
  const url = new URL(next, origin)
  url.searchParams.set('vote_email_notice', 'merged')
  url.searchParams.set('vote_merge_count', String(Math.max(0, moved)))
  return url.pathname + url.search + url.hash
}