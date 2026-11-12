import { getSupabaseConfig } from './supabase-config'
export function directoryImageUrl(value: string): string {
  if (!value.startsWith('storage://')) return value
  return `${getSupabaseConfig().url}/storage/v1/object/public/directory-owner-logos/${value.slice(10)}`
}
export async function readPublicDirectory<T>(name: 'directory_public_listings' | 'directory_public_updates' | 'directory_vote_counts'): Promise<T[]> {
  const { url, anonKey } = getSupabaseConfig()
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw new Error('Directory publication data is unavailable')
  return (await response.json()) as T[]
}
export type PublicUpdate = { id: string; listing_id: string; listing_title: string; payload: { title: string; body: string; url: string }; published_at: string }
