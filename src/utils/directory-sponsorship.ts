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

import type Stripe from 'stripe'

export const SPONSORSHIP_PRODUCT_TYPE = 'directory_sponsorship'

export function isDirectorySponsorshipMetadata(metadata: Stripe.Metadata | null | undefined): boolean {
  return metadata?.product_type === SPONSORSHIP_PRODUCT_TYPE
}

type SubscriptionItemPeriod = Stripe.SubscriptionItem & { current_period_end?: number }

export function subscriptionPeriodEndUnix(subscription: Stripe.Subscription): number {
  const items = subscription.items?.data ?? []
  if (!items.length) throw new Error('Stripe subscription has no items')
  const ends = items
    .map((item) => (item as SubscriptionItemPeriod).current_period_end)
    .filter((value): value is number => typeof value === 'number' && value > 0)
  if (!ends.length) throw new Error('Stripe subscription items missing current_period_end')
  return Math.max(...ends)
}

const BLOCKING_SPONSORSHIP_STATUSES = new Set(['active', 'trialing', 'incomplete'])

export function hasBlockingSponsorship(
  row: Pick<DirectorySponsorship, 'status' | 'current_period_end'> | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!row || !BLOCKING_SPONSORSHIP_STATUSES.has(row.status)) return false
  if (row.status === 'incomplete') return true
  return isSponsorshipActive(row, nowMs)
}

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