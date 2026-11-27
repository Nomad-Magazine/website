import type Stripe from 'stripe'
import { getSecret } from 'astro:env/server'
import { isDirectorySponsorshipMetadata } from './directory-sponsorship'
import { planFromSubscription, upsertDirectorySponsorship } from './directory-sponsorship-store'

function priceIds() {
  return { monthly: getSecret('STRIPE_PRICE_MONTHLY'), yearly: getSecret('STRIPE_PRICE_YEARLY') }
}

export async function syncDirectorySponsorshipCheckout(stripe: Stripe, session: Stripe.Checkout.Session): Promise<boolean> {
  if (session.mode !== 'subscription' || !isDirectorySponsorshipMetadata(session.metadata)) return false
  const listingId = session.metadata?.listing_id
  const userId = session.metadata?.user_id
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
  if (!listingId || !userId || !subscriptionId) {
    throw new Error('Directory sponsorship checkout session missing required metadata')
  }
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const { monthly, yearly } = priceIds()
  const plan = planFromSubscription(subscription, monthly, yearly) ?? (session.metadata?.plan === 'yearly' ? 'yearly' : 'monthly')
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  await upsertDirectorySponsorship({ listingId, userId, customerId, subscription, plan })
  return true
}

export async function syncDirectorySponsorshipSubscription(subscription: Stripe.Subscription): Promise<boolean> {
  if (!isDirectorySponsorshipMetadata(subscription.metadata)) return false
  const listingId = subscription.metadata.listing_id
  const userId = subscription.metadata.user_id
  if (!listingId || !userId) {
    throw new Error('Directory sponsorship subscription missing required metadata')
  }
  const { monthly, yearly } = priceIds()
  const plan = planFromSubscription(subscription, monthly, yearly) ?? 'monthly'
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  await upsertDirectorySponsorship({ listingId, userId, customerId, subscription, plan })
  return true
}