/**
 * Fallback “About the author” HTML for /authors/{slug}/ when a post’s `author_bio`
 * frontmatter is missing or not parsed. Keys match URL param `author` (lowercase kebab).
 */
export const AUTHOR_PAGE_BIOS: Record<string, string> = {
  leonie:
    'Leonie is a freelance project manager and co-founder of ' +
    '<a href="https://nomadwise.io/" rel="noopener noreferrer">Nomadwise</a>. ' +
    'She began working and studying remotely during the Covid pandemic and transitioned into full-time nomad life in early 2023. ' +
    'Today, she splits her time between Portugal and trips around the world. ' +
    'For Leonie, the ideal perfect place to live is near the beach, surrounded by like-minded people, and within easy reach of a bakery serving excellent croissants.',
}
