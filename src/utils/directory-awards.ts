import { readPublicDirectory } from './directory-public'

export const awardKinds = ['day', 'week', 'month', 'year'] as const
export type AwardKind = typeof awardKinds[number]
export const awardNames: Record<AwardKind, string> = { day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly' }
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
  return awardKinds.includes(value as AwardKind) ? value as AwardKind : 'day'
}
export function awardPeriodLabel(kind: AwardKind, startsAt: string): string {
  const date = new Date(startsAt)
  const label = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...(kind === 'year' ? { year: 'numeric' as const } : kind === 'month' ? { month: 'long' as const, year: 'numeric' as const } : { day: 'numeric' as const, month: 'short' as const, year: 'numeric' as const }) }).format(date)
  return kind === 'week' ? `Week of ${label}` : label
}
export const awardPath = (award: Pick<DirectoryAward, 'id'>) => `/nomad_directory/awards/${award.id}/`
export const awardBadgePath = (award: Pick<DirectoryAward, 'id'>) => `${awardPath(award)}badge.svg/`
export const awardAlt = (award: DirectoryAward) => `${award.listing_title} — Nomad Directory ${awardNames[award.kind].toLowerCase()} ${award.tied_winners > 1 ? 'joint winner' : 'winner'}, ${awardPeriodLabel(award.kind, award.starts_at)}`
export const validAwardId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
export const escapeMarkup = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!)

export async function getAward(id: string): Promise<DirectoryAward | undefined> {
  if (!validAwardId(id)) return undefined
  return (await readPublicDirectory<DirectoryAward>('directory_public_awards', { p_award_id: id }))[0]
}
export function badgeEmbed(award: DirectoryAward): string {
  if (award.revoked_at) return ''
  return `<a href="${awardSite}${awardPath(award)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeMarkup(awardAlt(award))} (opens in new tab)">\n  <img src="${awardSite}${awardBadgePath(award)}" alt="${escapeMarkup(awardAlt(award))}" width="360" height="112" loading="lazy" style="max-width:100%;height:auto" />\n</a>`
}

export function awardBadgeSvg(award: DirectoryAward): string {
  const name = Array.from(award.listing_title)
  const business = escapeMarkup(name.length > 34 ? `${name.slice(0,33).join('')}…` : award.listing_title)
  const label = `${awardNames[award.kind]} ${award.tied_winners > 1 ? 'joint winner' : 'winner'}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="112" viewBox="0 0 360 112" role="img" aria-labelledby="title desc">
  <title id="title">${escapeMarkup(awardAlt(award))}</title><desc id="desc">Awarded by Nomad Directory with ${award.vote_count} community votes. Follow the badge link to verify this award.</desc>
  <rect x="1" y="1" width="358" height="110" rx="16" fill="#171b17" stroke="#facc15" stroke-width="2"/>
  <circle cx="47" cy="53" r="29" fill="#facc15"/>
  <path d="M32 41h30l-4 18H36zM35 41l-5-8 12 5 5-9 5 9 12-5-5 8M38 64h18" fill="none" stroke="#171b17" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="47" y="94" text-anchor="middle" fill="#facc15" font-family="Arial,sans-serif" font-size="10" font-weight="700">NOMAD</text>
  <g font-family="Arial,sans-serif"><text x="91" y="24" fill="#facc15" font-size="10" font-weight="700" letter-spacing="1.4">NOMAD DIRECTORY</text>
  <text x="91" y="48" fill="#ffffff" font-size="19" font-weight="700">${label}</text>
  <defs><clipPath id="business-name"><rect x="91" y="54" width="250" height="22"/></clipPath></defs><text x="91" y="69" fill="#eeeeea" font-size="12" clip-path="url(#business-name)">${business}</text>
  <text x="91" y="91" fill="#bec6b8" font-size="11">${escapeMarkup(awardPeriodLabel(award.kind,award.starts_at))} · UTC</text></g></svg>`
}
