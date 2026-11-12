import type { APIRoute } from 'astro'
import { readPublicDirectory } from '~/utils/directory-public'
import { awardSite, awardPath, escapeMarkup, type DirectoryAward } from '~/utils/directory-awards'
export const prerender = false
// A static directory route takes precedence over award ID verification pages.
export const GET: APIRoute = async () => {
  try {
    const awards: DirectoryAward[] = []
    // At most 50,000 URLs per sitemap. History pages keep older awards crawlable.
    for (let offset = 0; offset < 50000; offset += 1000) {
      const batch = await readPublicDirectory<DirectoryAward>('directory_public_awards', { p_limit: 1000, p_offset: offset })
      awards.push(...batch)
      if (batch.length < 1000) break
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${awards.map(award => `<url><loc>${escapeMarkup(awardSite+awardPath(award))}</loc><lastmod>${new Date(award.finalized_at).toISOString()}</lastmod></url>`).join('')}</urlset>`
    return new Response(xml, { headers: { 'Content-Type':'application/xml; charset=utf-8', 'Cache-Control':'public, max-age=300' } })
  } catch { return new Response('Sitemap temporarily unavailable', { status:503, headers:{'Retry-After':'60','Cache-Control':'no-store'} }) }
}
