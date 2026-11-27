export type SponsorshipPlan = 'monthly' | 'yearly'

export type DirectorySponsorship = {
  listing_id: string
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  status: string
  current_period_end: string
  plan: SponsorshipPlan
  created_at: string
  updated_at: string
}

export const SPONSORSHIP_PRODUCT_TYPE = 'directory_sponsorship'

export function isSponsorshipActive(row: Pick<DirectorySponsorship, 'status' | 'current_period_end'>, nowMs = Date.now()): boolean {
  if (!['active', 'trialing'].includes(row.status)) return false
  const end = Date.parse(row.current_period_end)
  if (Number.isNaN(end)) return false
  return end > nowMs
}

export function sponsorshipPlanFromPrice(
  priceId: string,
  monthlyPriceId: string | undefined,
  yearlyPriceId: string | undefined,
): SponsorshipPlan | null {
  if (monthlyPriceId && priceId === monthlyPriceId) return 'monthly'
  if (yearlyPriceId && priceId === yearlyPriceId) return 'yearly'
  return null
}