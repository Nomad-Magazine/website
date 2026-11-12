import type { APIRoute } from 'astro'
import { getAward, awardBadgeSvg } from '~/utils/directory-awards'
export const prerender = false
export const GET: APIRoute = async ({ params }) => {
  try {
    const award = await getAward(params.id || '')
    if (!award) return new Response('Award not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })
    if (award.revoked_at) return new Response('This award has been withdrawn', { status: 410, headers: { 'Cache-Control': 'no-store' } })
    return new Response(awardBadgeSvg(award), { headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, must-revalidate',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    } })
  } catch {
    return new Response('Badge temporarily unavailable', { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } })
  }
}
