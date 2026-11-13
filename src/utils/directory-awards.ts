import { readPublicDirectory } from './directory-public'
import { renderAwardBadgeSvg, type AwardBadgeInput } from './award-badge/directory-award-badge'

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
  return awardKinds.includes(value as AwardKind) ? value as AwardKind : 'week'
}

export function awardPeriodLabel(kind: AwardKind, startsAt: string): string {
  const date = new Date(startsAt)
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
  `${award.listing_title} — Nomad Directory ${awardNames[award.kind].toLowerCase()} winner, ${awardPeriodLabel(award.kind, award.starts_at)}`

export const validAwardId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

export const escapeMarkup = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!)

export async function getAward(id: string): Promise<DirectoryAward | undefined> {
  if (!validAwardId(id)) return undefined
  return (await readPublicDirectory<DirectoryAward>('directory_public_awards', { p_award_id: id }))[0]
}

export function badgeEmbed(award: DirectoryAward): string {
  if (award.revoked_at) return ''
  return `<a href="${awardSite}${awardPath(award)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeMarkup(awardAlt(award))} (opens in new tab)">\n  <img src="${awardSite}${awardBadgePath(award)}" alt="${escapeMarkup(awardAlt(award))}" width="328" height="116" loading="lazy" style="max-width:100%;height:auto" />\n</a>`
}

export function awardBadgeSvg(award: DirectoryAward): string {
  const period = award.kind
  const businessName = award.listing_title
  const dateLabel = awardPeriodLabel(award.kind, award.starts_at)
  return renderAwardBadgeSvg({ period, businessName, dateLabel })
}
