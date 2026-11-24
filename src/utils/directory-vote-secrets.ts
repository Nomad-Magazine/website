import { env } from 'cloudflare:workers'

type VoteLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> }

function binding(key: string): string | undefined {
  const value = (env as unknown as Record<string, string | undefined>)[key]?.trim()
  if (!value || /_PLACEHOLDER$/i.test(value)) return undefined
  return value
}

export function requireWorkerSecret(name: 'TURNSTILE_SECRET_KEY' | 'DIRECTORY_IP_HASH_SALT' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const value = binding(name)
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

export function workerVoteLimiter(): VoteLimiter | undefined {
  return (env as unknown as { DIRECTORY_VOTE_LIMITER?: VoteLimiter }).DIRECTORY_VOTE_LIMITER
}