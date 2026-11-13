import type { SupabaseClient } from '@supabase/supabase-js'
import { loadWorkspace, textField, workspaceError, type WorkspaceListing, type WorkspacePost } from './directory-workspace'
export async function ownerPostPage(client: SupabaseClient, request: Request, kind: 'update' | 'affiliate') {
  const url = new URL(request.url)
  let listings: WorkspaceListing[] = [],
    posts: WorkspacePost[] = [],
    selected: WorkspacePost | undefined
  let error = '',
    values: Record<string, string> = {},
    listingId = url.searchParams.get('listing') || '',
    redirect = ''
  try {
    const workspace = await loadWorkspace(client)
    listings = workspace.listings
    posts = workspace.posts.filter((post) => post.kind === kind)
    const id = url.searchParams.get('id')
    selected = posts.find((post) => post.id === id)
    if (id && !selected) throw new Error('Submission not found or not owned by this account.')
    values = selected?.draft || {}
    listingId = selected?.listing_id || listingId || listings[0]?.id || ''
    if (request.method === 'POST') {
      const form = await request.formData()
      const intent = textField(form, 'intent')
      const postId = textField(form, 'id')
      if (intent === 'withdraw') {
        if (!posts.some((post) => post.id === postId)) throw new Error('Submission unavailable')
        const result = await client.rpc('directory_withdraw_post', { p_id: postId })
        if (result.error) throw result.error
      } else {
        values = Object.fromEntries(Array.from(form.entries()).filter(([, value]) => typeof value === 'string')) as Record<string, string>
        listingId = textField(form, 'listing_id')
        const result = await client.rpc('directory_save_post', {
          p_id: postId || null,
          p_listing_id: listingId,
          p_kind: kind,
          p_payload: values,
          p_submit: intent === 'submit',
          p_version: Number(form.get('version') || 0),
        })
        if (result.error) throw result.error
      }
      redirect = `${kind === 'update' ? '/console/updates/' : '/console/affiliates/'}?saved=1`
    }
  } catch (err) {
    error = workspaceError(err)
  }
  return { kind, listings, posts, selected, listingId, values, error, saved: url.searchParams.has('saved'), redirect }
}
