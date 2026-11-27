import type Stripe from 'stripe'
import { getSecret } from 'astro:env/server'
import { SPONSORSHIP_PRODUCT_TYPE } from './directory-sponsorship'
import { planFromSubscription, upsertDirectorySponsorship } from './directory-sponsorship-store'

function isSponsorshipMetadata(metadata: Stripe.Metadata | null | undefined): boolean {
  return metadata?.product_type === SPONSORSHIP_PRODUCT_TYPE
}

function priceIds() {
  return { monthly: getSecret('STRIPE_PRICE_MONTHLY'), yearly: getSecret('STRIPE_PRICE_YEARLY') }
}

export async function syncDirectorySponsorshipCheckout(stripe: Stripe, session: Stripe.Checkout.Session): Promise<boolean> {
  if (session.mode !== 'subscription' || !isSponsorshipMetadata(session.metadata)) return false
  const listingId = session.metadata?.listing_id
  const userId = session.metadata?.user_id
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
  if (!listingId || !userId || !subscriptionId) return false
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const { monthly, yearly } = priceIds()
  const plan = planFromSubscription(subscription, monthly, yearly) ?? (session.metadata?.plan === 'yearly' ? 'yearly' : 'monthly')
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  await upsertDirectorySponsorship({ listingId, userId, customerId, subscription, plan })
  return true
}

export async function syncDirectorySponsorshipSubscription(subscription: Stripe.Subscription): Promise<boolean> {
  if (!isSponsorshipMetadata(subscription.metadata)) return false
  const listingId = subscription.metadata.listing_id
  const userId = subscription.metadata.user_id
  if (!listingId || !userId) return false
  const { monthly, yearly } = priceIds()
  const plan = planFromSubscription(subscription, monthly, yearly) ?? 'monthly'
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  await upsertDirectorySponsorship({ listingId, userId, customerId, subscription, plan })
  return true
}