import type Stripe from 'stripe'
import { serviceClient } from './directory-vote-cast'
import { sponsorshipPlanFromPrice, subscriptionPeriodEndUnix, type SponsorshipPlan } from './directory-sponsorship'

export async function upsertDirectorySponsorship(options: {
  listingId: string
  userId: string
  customerId: string
  subscription: Stripe.Subscription
  plan: SponsorshipPlan
}) {
  const periodEnd = new Date(subscriptionPeriodEndUnix(options.subscription) * 1000).toISOString()
  const { error } = await serviceClient().from('directory_sponsorships').upsert(
    {
      listing_id: options.listingId,
      user_id: options.userId,
      stripe_customer_id: options.customerId,
      stripe_subscription_id: options.subscription.id,
      status: options.subscription.status,
      current_period_end: periodEnd,
      plan: options.plan,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'listing_id' },
  )
  if (error) throw error
}

export function planFromSubscription(
  subscription: Stripe.Subscription,
  monthlyPriceId: string | undefined,
  yearlyPriceId: string | undefined,
): SponsorshipPlan | null {
  const priceId = subscription.items.data[0]?.price?.id
  if (!priceId) return null
  const fromPrice = sponsorshipPlanFromPrice(priceId, monthlyPriceId, yearlyPriceId)
  if (fromPrice) return fromPrice
  const metaPlan = subscription.metadata?.plan
  if (metaPlan === 'monthly' || metaPlan === 'yearly') return metaPlan
  return null
}