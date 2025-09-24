import type { APIRoute } from 'astro'

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url)
  const title = url.searchParams.get('title') || 'Nomad Magazine'
  const type = url.searchParams.get('type') || 'default'
  const source = url.searchParams.get('source') || 'default'

  // Map parameters to specific images
  const imageMap: Record<string, string> = {
    'coworking': '/images/offsite-coworking-cafe.webp',
    'airbnb': '/images/edition-123-three-together-transparent.webp',
    'social': '/images/Nomad-Magazine-Three-Editions.webp',
    'coliving': '/images/distribution_sowo_coworking_barcelona.webp',
    'default': '/images/edition-003-cover_holded_front_face.webp'
  }

  const selectedImage = imageMap[type] || imageMap[source] || imageMap.default

  // Return a simple JSON response with the recommended image
  // This can be used by external tools or for API-based image selection
  return new Response(
    JSON.stringify({
      image: `${url.origin}${selectedImage}`,
      title,
      type,
      source,
      recommendations: {
        'For social media sharing': `${url.origin}/coworking-coliving-shipments?source=social`,
        'For Airbnb hosts': `${url.origin}/coworking-coliving-shipments?type=airbnb`,
        'For coworking spaces': `${url.origin}/coworking-coliving-shipments?type=coworking`
      }
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    }
  )
}
