import type { APIRoute } from 'astro'
import { readPublicDirectory } from '~/utils/directory-public'

export const prerender = false

export const GET: APIRoute = async () => {
  try {
    const rows = await readPublicDirectory<{ listing_id: string }>('directory_public_active_sponsorships')
    const listingIds = rows.map((row) => row.listing_id).filter(Boolean)
    return Response.json(
      { listing_ids: listingIds },
      {
        headers: {
          'Cache-Control': 'public, max-age=120, stale-while-revalidate=300',
          'Access-Control-Allow-Origin': '*',
        },
      },
    )
  } catch {
    return Response.json(
      { listing_ids: [] },
      {
        headers: {
          'Cache-Control': 'public, max-age=60',
        },
      },
    )
  }
}