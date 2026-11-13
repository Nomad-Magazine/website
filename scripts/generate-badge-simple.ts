import { chromium } from 'playwright'
import { renderBadgeSvg, type BadgeData } from '../src/utils/directory-awards-render'

type AwardKind = 'week' | 'month' | 'year'

interface DirectoryAward {
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

function awardPeriodLabel(kind: AwardKind, startsAt: string): string {
  const date = new Date(startsAt)
  const label = new Intl.DateTimeFormat('en-GB', { 
    timeZone: 'UTC', 
    ...(kind === 'year' ? { year: 'numeric' as const } : 
       kind === 'month' ? { month: 'long' as const, year: 'numeric' as const } : 
       { day: 'numeric' as const, month: 'short' as const, year: 'numeric' as const }) 
  }).format(date)
  return kind === 'week' ? `Week of ${label}` : label
}

const fixtureAwards: DirectoryAward[] = [
  {
    id: 'weekly-test',
    listing_id: '123',
    listing_title: 'Your Coliving',
    vote_count: 127,
    tied_winners: 1,
    kind: 'week',
    starts_at: '2026-11-02T00:00:00Z',
    ends_at: '2026-11-09T00:00:00Z',
    finalized_at: '2026-11-09T00:00:00Z',
    revoked_at: null
  },
  {
    id: 'monthly-test',
    listing_id: '456',
    listing_title: 'Your Coliving',
    vote_count: 342,
    tied_winners: 1,
    kind: 'month',
    starts_at: '2026-10-01T00:00:00Z',
    ends_at: '2026-11-01T00:00:00Z',
    finalized_at: '2026-11-01T00:00:00Z',
    revoked_at: null
  },
  {
    id: 'yearly-test',
    listing_id: '789',
    listing_title: 'Your Coliving',
    vote_count: 1523,
    tied_winners: 1,
    kind: 'year',
    starts_at: '2025-01-01T00:00:00Z',
    ends_at: '2026-01-01T00:00:00Z',
    finalized_at: '2026-01-01T00:00:00Z',
    revoked_at: null
  }
]

const fixtureAwardsLongName: DirectoryAward = {
  id: 'longname-test',
  listing_id: '999',
  listing_title: 'Casa Azul Digital Nomad Coliving & Coworking Funchal',
  vote_count: 342,
  tied_winners: 1,
  kind: 'month',
  starts_at: '2026-10-01T00:00:00Z',
  ends_at: '2026-11-01T00:00:00Z',
  finalized_at: '2026-11-01T00:00:00Z',
  revoked_at: null
}

async function generateScreenshots() {
  console.log('Generating badge SVGs...')
  const svgs = fixtureAwards.map(award => {
    const badgeData: BadgeData = {
      businessName: award.listing_title,
      period: award.kind === 'week' ? 'weekly' : award.kind === 'month' ? 'monthly' : 'yearly',
      dateLabel: awardPeriodLabel(award.kind, award.starts_at)
    }
    return renderBadgeSvg(badgeData)
  })
  
  const badgeDataLongName: BadgeData = {
    businessName: fixtureAwardsLongName.listing_title,
    period: fixtureAwardsLongName.kind === 'week' ? 'weekly' : fixtureAwardsLongName.kind === 'month' ? 'monthly' : 'yearly',
    dateLabel: awardPeriodLabel(fixtureAwardsLongName.kind, fixtureAwardsLongName.starts_at)
  }
  const svgLongName = renderBadgeSvg(badgeDataLongName)
  
  console.log('Launching browser...')
  const browser = await chromium.launch()
  const context = await browser.newContext({ deviceScaleFactor: 2 })
  const page = await context.newPage()
  
  // Light background v3
  console.log('Rendering badges on light background (v3)...')
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head><style>
      body { margin: 0; padding: 40px; background: #f7f6f2; display: flex; flex-direction: column; gap: 24px; }
    </style></head>
    <body>
      ${svgs.map(svg => `<div>${svg}</div>`).join('\n')}
    </body>
    </html>
  `)
  await page.screenshot({ path: '/opt/cursor/artifacts/badges-light-v3.png', fullPage: true })
  
  // Dark background v3
  console.log('Rendering badges on dark background (v3)...')
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head><style>
      body { margin: 0; padding: 40px; background: #111; display: flex; flex-direction: column; gap: 24px; }
    </style></head>
    <body>
      ${svgs.map(svg => `<div>${svg}</div>`).join('\n')}
    </body>
    </html>
  `)
  await page.screenshot({ path: '/opt/cursor/artifacts/badges-dark-v3.png', fullPage: true })
  
  // Long name test v3
  console.log('Rendering long name badge (v3)...')
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head><style>
      body { margin: 0; padding: 40px; background: #f7f6f2; }
    </style></head>
    <body>
      <div>${svgLongName}</div>
    </body>
    </html>
  `)
  await page.screenshot({ path: '/opt/cursor/artifacts/badges-longname-v3.png' })
  
  await browser.close()
  console.log('Screenshots saved to /opt/cursor/artifacts/')
  console.log('- badges-light-v3.png')
  console.log('- badges-dark-v3.png')
  console.log('- badges-longname-v3.png')
}

generateScreenshots().catch(console.error)
