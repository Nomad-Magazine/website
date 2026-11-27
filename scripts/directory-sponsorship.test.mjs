import { describe, expect, test } from 'bun:test'
import { hasBlockingSponsorship, subscriptionPeriodEndUnix } from '../src/utils/directory-sponsorship.ts'
import { selectSpotlightListings } from '../src/utils/directory-spotlight.ts'

describe('subscriptionPeriodEndUnix', () => {
  test('uses first subscription item current_period_end', () => {
    const unix = subscriptionPeriodEndUnix({
      items: { data: [{ current_period_end: 1_700_000_000 }] },
    })
    expect(unix).toBe(1_700_000_000)
  })

  test('falls back to max current_period_end across items', () => {
    const unix = subscriptionPeriodEndUnix({
      items: {
        data: [{ current_period_end: 1_700_000_000 }, { current_period_end: 1_800_000_000 }],
      },
    })
    expect(unix).toBe(1_800_000_000)
  })

  test('throws when current_period_end is missing', () => {
    expect(() =>
      subscriptionPeriodEndUnix({
        items: { data: [{ id: 'si_test' }] },
      }),
    ).toThrow(/missing current_period_end/)
  })
})

describe('selectSpotlightListings sponsored filter', () => {
  const listings = [
    { id: 'a', category: 'Coliving', country: 'Portugal', continent: 'Europe' },
    { id: 'b', category: 'Coworking', country: 'Bulgaria', continent: 'Europe' },
    { id: 'c', category: 'Coliving', country: 'Thailand', continent: 'Asia' },
    { id: 'd', category: 'Café', country: 'Portugal', continent: 'Europe' },
  ].map((row) => ({
    ...row,
    title: row.id,
    description: 'desc',
    image: '/x.webp',
    screenshot: '/y.webp',
    addedAt: '',
    logoBoxClass: '',
    logoImageClass: '',
  }))

  test('category page does not show sponsors from other categories', () => {
    const sponsored = new Set(['b', 'd'])
    const chosen = selectSpotlightListings(listings, 'category', 'Coliving', sponsored, 4, 2)
    expect(chosen.some((item) => item.id === 'b')).toBe(false)
    expect(chosen.some((item) => item.id === 'd')).toBe(false)
  })
})

describe('hasBlockingSponsorship', () => {
  test('blocks incomplete subscriptions', () => {
    expect(hasBlockingSponsorship({ status: 'incomplete', current_period_end: '2099-01-01T00:00:00Z' })).toBe(true)
  })
})