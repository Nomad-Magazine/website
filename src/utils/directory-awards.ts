import { readPublicDirectory } from './directory-public'

// Remove 'day' - only weekly, monthly, yearly awards
export const awardKinds = ['week', 'month', 'year'] as const
export type AwardKind = typeof awardKinds[number]
export const awardNames: Record<AwardKind, string> = { week: 'Weekly', month: 'Monthly', year: 'Yearly' }
export const awardSite = 'https://nomad-magazine.com'

export interface DirectoryAward {
  id: string
  listing_id: string
  listing_title: string
  vote_count: number
  tied_winners: number
  kind: AwardKind
  starts_at: string
  ends_at: string
  finalized_at: string
  revoked_at: string | null
}

export interface AwardLeader {
  listing_id: string
  listing_title: string
  vote_count: number
  starts_at: string
  ends_at: string
  awards_started_at: string
}

export function awardKind(value: string | null): AwardKind {
  // Default to 'week' instead of 'day'
  return awardKinds.includes(value as AwardKind) ? value as AwardKind : 'week'
}

export function awardPeriodLabel(kind: AwardKind, startsAt: string): string {
  const date = new Date(startsAt)
  // Remove UTC suffix per requirements
  const label = new Intl.DateTimeFormat('en-GB', { 
    timeZone: 'UTC', 
    ...(kind === 'year' ? { year: 'numeric' as const } : 
       kind === 'month' ? { month: 'long' as const, year: 'numeric' as const } : 
       { day: 'numeric' as const, month: 'short' as const, year: 'numeric' as const }) 
  }).format(date)
  return kind === 'week' ? `Week of ${label}` : label
}

export const awardPath = (award: Pick<DirectoryAward, 'id'>) => `/nomad_directory/awards/${award.id}/`
export const awardBadgePath = (award: Pick<DirectoryAward, 'id'>) => `${awardPath(award)}badge.svg/`

export const awardAlt = (award: DirectoryAward) => 
  // Remove "joint winner" terminology per requirements
  `${award.listing_title} — Nomad Directory ${awardNames[award.kind].toLowerCase()} winner, ${awardPeriodLabel(award.kind, award.starts_at)}`

export const validAwardId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

export const escapeMarkup = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!)

export async function getAward(id: string): Promise<DirectoryAward | undefined> {
  if (!validAwardId(id)) return undefined
  return (await readPublicDirectory<DirectoryAward>('directory_public_awards', { p_award_id: id }))[0]
}

export function badgeEmbed(award: DirectoryAward): string {
  if (award.revoked_at) return ''
  // Update dimensions to 328x116
  return `<a href="${awardSite}${awardPath(award)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeMarkup(awardAlt(award))} (opens in new tab)">\n  <img src="${awardSite}${awardBadgePath(award)}" alt="${escapeMarkup(awardAlt(award))}" width="328" height="116" loading="lazy" style="max-width:100%;height:auto" />\n</a>`
}

// Editorial ticket badge design matching C2 direction
export function awardBadgeSvg(award: DirectoryAward): string {
  const name = Array.from(award.listing_title)
  // Truncate long names to fit badge (adjusted for new layout)
  const business = escapeMarkup(name.length > 28 ? `${name.slice(0,27).join('')}…` : award.listing_title)
  const periodText = escapeMarkup(awardPeriodLabel(award.kind, award.starts_at))
  const titleText = `${awardNames[award.kind]} winner`
  const periodWord = award.kind.toUpperCase()
  
  // Badge shape with dashed perforation and notches (from C2 reference)
  const badgeShape = 'M 18.00 9.00 H 81.00 A 7.00 7.00 0 0 0 95.00 9.00 H 306.00 A 8.00 8.00 0 0 1 314.00 17.00 V 93.00 A 8.00 8.00 0 0 1 306.00 101.00 H 95.00 A 7.00 7.00 0 0 0 81.00 101.00 H 18.00 A 8.00 8.00 0 0 1 10.00 93.00 V 17.00 A 8.00 8.00 0 0 1 18.00 9.00 Z'
  const shadowShape = 'M 21.00 12.00 H 84.00 A 7.00 7.00 0 0 0 98.00 12.00 H 309.00 A 8.00 8.00 0 0 1 317.00 20.00 V 96.00 A 8.00 8.00 0 0 1 309.00 104.00 H 98.00 A 7.00 7.00 0 0 0 84.00 104.00 H 21.00 A 8.00 8.00 0 0 1 13.00 96.00 V 20.00 A 8.00 8.00 0 0 1 21.00 12.00 Z'
  
  // N::M wordmark paths (from official logo)
  const wordmarkG = `<g transform="translate(21.39,35.25) scale(0.681818)">
  <path d="M3.07812 21.3187V7.19859C3.07812 5.00258 4.85834 3.22236 7.05435 3.22236V3.22236C9.25036 3.22236 11.0306 5.00258 11.0306 7.19859V15.1728C11.0306 17.3397 12.7872 19.0964 14.9542 19.0964V19.0964C17.1212 19.0964 18.8778 17.3397 18.8778 15.1728V1" stroke="#121111" stroke-width="5.62179" fill="none"/>
  <rect x="26.2656" y="1" width="8.49693" height="8.49693" rx="4.24846" fill="#121111"/>
  <rect x="26.2656" y="12.8203" width="8.49693" height="8.49693" rx="4.24846" fill="#121111"/>
  <rect x="38.0859" y="12.8203" width="8.49693" height="8.49693" rx="4.24846" fill="#121111"/>
  <path d="M53.9727 21.3214V7.71296C53.9727 5.53722 55.7364 3.77344 57.9122 3.77344V3.77344C60.0879 3.77344 61.8517 5.53722 61.8517 7.71296V12.5429C61.8517 14.6707 63.5767 16.3957 65.7045 16.3957V16.3957C67.8324 16.3957 69.5573 14.6707 69.5573 12.5429V7.67272C69.5573 5.51924 71.3031 3.77349 73.4566 3.77349V3.77349C75.6101 3.77349 77.3558 5.51924 77.3558 7.67273V21.3214" stroke="#121111" stroke-width="5.57769" fill="none"/>
</g>`
  
  // Handwritten script path for "winner of the [period]"
  const scriptText = `winner of the ${award.kind}`
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="328" height="116" viewBox="0 0 328 116" role="img" aria-label="${escapeMarkup(awardAlt(award))}">
  <defs>
    <clipPath id="badge-shape">
      <path d="${badgeShape}"/>
    </clipPath>
    <mask id="shadow-mask" maskUnits="userSpaceOnUse">
      <rect width="328" height="116" fill="black"/>
      <path d="${shadowShape}" fill="white"/>
      <path d="${badgeShape}" fill="black"/>
      <path d="M 81.00 9.00 A 7.00 7.00 0 1 0 95.00 9.00 A 7.00 7.00 0 1 0 81.00 9.00 Z" fill="black"/>
      <path d="M 81.00 101.00 A 7.00 7.00 0 1 0 95.00 101.00 A 7.00 7.00 0 1 0 81.00 101.00 Z" fill="black"/>
    </mask>
  </defs>
  
  <!-- Shadow -->
  <g mask="url(#shadow-mask)">
    <path d="${shadowShape}" fill="#121111"/>
  </g>
  
  <!-- Badge body -->
  <g clip-path="url(#badge-shape)">
    <!-- White background -->
    <rect x="10" y="9" width="304" height="92" fill="#FFFFFF"/>
    
    <!-- Yellow stub -->
    <rect x="10" y="9" width="78" height="92" fill="#FFD21F"/>
    
    <!-- Dashed perforation line -->
    <line x1="88" y1="19" x2="88" y2="91" stroke="#121111" stroke-width="1" stroke-dasharray="2.2 2.6"/>
    
    <!-- N::M wordmark -->
    ${wordmarkG}
    
    <!-- Period word (WEEKLY/MONTHLY/YEARLY) -->
    <text x="49" y="72.68" text-anchor="middle" fill="#121111" font-family="Arial,Helvetica,sans-serif" font-size="10" font-weight="700" letter-spacing="0.5">${periodWord}</text>
    
    <!-- Text content -->
    <text x="108.5595703125" y="25.9072265625" fill="#5A5854" font-family="Arial,Helvetica,sans-serif" font-size="10" font-weight="400" letter-spacing="1.2">NOMAD DIRECTORY</text>
    <text x="108.5595703125" y="53" fill="#121111" font-family="Arial,Helvetica,sans-serif" font-size="19" font-weight="700">${titleText}</text>
    <text x="108.5595703125" y="72" fill="#121111" font-family="Arial,Helvetica,sans-serif" font-size="12" font-weight="400">${business}</text>
    <text x="211.8798828125" y="31" fill="#5A5854" font-family="Arial,Helvetica,sans-serif" font-size="10" font-weight="400" text-anchor="end">${periodText}</text>
    
    <!-- Handwritten script -->
    <g transform="translate(182.52,96.0) rotate(-4)">
      <text x="0" y="0" fill="#121111" font-family="'Just Me Again Down Here',cursive,fantasy" font-size="16" font-weight="400">${scriptText}</text>
    </g>
  </g>
  
  <!-- Border -->
  <path d="${badgeShape}" fill="none" stroke="#121111" stroke-width="1.75" stroke-linejoin="round"/>
</svg>`
}
