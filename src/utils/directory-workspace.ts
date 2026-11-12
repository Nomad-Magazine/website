import type { SupabaseClient } from '@supabase/supabase-js'

export type ListingPayload = { title: string; description: string; website: string; category: string; location: string; special_offer: string; image: string }
export type WorkspaceListing = {
  id: string
  owner_id: string
  legacy_id: string | null
  draft: ListingPayload
  published: ListingPayload | null
  status: string
  review_notes: string
  version: number
  updated_at: string
}
export type WorkspacePost = {
  id: string
  listing_id: string
  kind: 'update' | 'affiliate'
  draft: Record<string, string>
  published: Record<string, string> | null
  status: string
  review_notes: string
  version: number
  updated_at: string
}
export const emptyListing: ListingPayload = { title: '', description: '', website: '', category: '', location: '', special_offer: '', image: '' }
export const textField = (form: FormData, key: string) => String(form.get(key) || '').trim()
export function workspaceError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message)
  return 'Could not save your changes. Please try again.'
}
export async function loadWorkspace(client: SupabaseClient, review = false) {
  const {
    data: { user },
    error,
  } = await client.auth.getUser()
  if (error || !user) throw new Error('Sign in to manage your directory entries.')
  let listingQuery = client.from('directory_managed_listings').select('*').order('created_at', { ascending: false })
  let postQuery = client.from('directory_owner_posts').select('*').order('updated_at', { ascending: false })
  if (!review) {
    listingQuery = listingQuery.eq('owner_id', user.id)
    postQuery = postQuery.eq('owner_id', user.id)
  }
  const [listings, posts] = await Promise.all([listingQuery, postQuery])
  if (listings.error || posts.error) throw new Error('Could not load directory management. Please try again shortly.')
  return { listings: listings.data as WorkspaceListing[], posts: posts.data as WorkspacePost[] }
}
export async function uploadListingLogo(client: SupabaseClient, ownerId: string, value: FormDataEntryValue | null): Promise<string | null> {
  if (!(value instanceof File) || !value.size) return null
  if (value.size > 2 * 1024 * 1024) throw new Error('Logo must be under 2 MB.')
  const bytes = new Uint8Array(await value.arrayBuffer())
  const header = new TextDecoder('ascii').decode(bytes.slice(0, 12))
  if (value.type !== 'image/webp' || !header.startsWith('RIFF') || header.slice(8) !== 'WEBP') throw new Error('Upload a WebP logo.')
  const path = `${ownerId}/${crypto.randomUUID()}.webp`
  const { error } = await client.storage.from('directory-owner-logos').upload(path, bytes, { contentType: 'image/webp', upsert: false })
  if (error) throw new Error('Logo upload failed. Please try again.')
  return `storage://${path}`
}
