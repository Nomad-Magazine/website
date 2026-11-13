export type VoteCount = { listing_id: string; vote_count: number }
export type VoteResult = VoteCount & { voted: boolean }

// Only directory pages and the badge library may be post-login destinations, never external URLs.
export function directoryReturnTo(value: string | null, fallback = '/console/'): string {
  if (!value || value.length > 2000 || !value.startsWith('/') || /[\\\u0000-\u0020]/.test(value)) return fallback
  try {
    const url = new URL(value, 'https://nomad-magazine.com')
    if (url.origin !== 'https://nomad-magazine.com' || (!/^\/nomad_directory\/(?:[a-z0-9-]+\/)?$/.test(url.pathname) && url.pathname !== '/console/badges/')) return fallback
    return url.pathname + url.search + url.hash
  } catch {
    return fallback
  }
}

export function votePageUrl(listingId: string, returnTo: string): string {
  return `/nomad_directory/vote/?${new URLSearchParams({ listing: listingId, return_to: returnTo })}`
}
