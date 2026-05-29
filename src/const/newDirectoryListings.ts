/** Local hero photos for directory social cards — run scripts/fetch-directory-social-images.mjs to refresh. */
export const directoryListingHeroOverrides: Record<string, string> = {
  'Madeira Remote': '/images/madeira-remote-coliving-terrace.webp',
  'Find Your Coliving': '/images/directory-social-find-your-coliving.webp',
  'Arctic Coliving': '/images/directory-social-arctic-coliving.webp',
  'Nomad Shophouse': '/images/directory-social-nomad-shophouse.webp',
}

/** Physical coliving space photos — run scripts/fetch-directory-social-images.mjs --place to refresh. */
export const directoryListingPlaceOverrides: Record<string, string> = {
  'Madeira Remote': '/images/directory-place-madeira-remote.webp',
  'Arctic Coliving': '/images/directory-place-arctic-coliving.webp',
  'Nomad Shophouse': '/images/directory-place-nomad-shophouse.webp',
}

/** Optional background photos for special-offer slides. */
export const directoryListingOfferOverrides: Record<string, string> = {
  'Madeira Remote': '/images/directory-offer-madeira-remote.webp',
  'Nomad Shophouse': '/images/directory-offer-nomad-shophouse.webp',
}

/** Physical coliving operators (not coliving search platforms or services). */
export function isPhysicalColiving(category: string): boolean {
  const c = category.trim().toLowerCase()
  if (!c.includes('coliving')) return false
  if (c.includes('service') || c.includes('platform') || c.includes('directory')) return false
  return true
}

/** Listings to generate social cards for — update when publishing new directory entries. */
export const newDirectoryListingTitles = [
  'Madeira Remote',
  'Arctic Coliving',
  'Nomad Shophouse',
  'Find Your Coliving',
]

export const nomadDirectoryUrl = 'https://nomad-magazine.com/nomad_directory/'

/** Website URLs used by scripts/fetch-directory-social-images.mjs when og:image fetch is needed. */
export const directoryListingWebsiteUrls: Record<string, string> = {
  'Madeira Remote': 'https://madeiraremote.com/',
  'Find Your Coliving': 'https://findyourcoliving.com/',
  'Arctic Coliving': 'https://www.arcticcoliving.com/',
  'Nomad Shophouse': 'https://nomadshophouse.com/',
}
