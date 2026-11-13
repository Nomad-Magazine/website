import { chromium } from 'playwright'
import { renderAwardBadgeSvg, type AwardBadgeInput } from '../src/utils/award-badge/directory-award-badge'

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
    const badgeInput: AwardBadgeInput = {
      period: award.kind,
      businessName: award.listing_title,
      dateLabel: awardPeriodLabel(award.kind, award.starts_at)
    }
    return renderAwardBadgeSvg(badgeInput)
  })
  
  const badgeInputLongName: AwardBadgeInput = {
    period: fixtureAwardsLongName.kind,
    businessName: fixtureAwardsLongName.listing_title,
    dateLabel: awardPeriodLabel(fixtureAwardsLongName.kind, fixtureAwardsLongName.starts_at)
  }
  const svgLongName = renderAwardBadgeSvg(badgeInputLongName)
  
  console.log('Launching browser...')
  const browser = await chromium.launch()
  const context = await browser.newContext({ deviceScaleFactor: 2 })
  const page = await context.newPage()
  
  // Light background v4
  console.log('Rendering badges on light background (v4)...')
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
  await page.screenshot({ path: '/opt/cursor/artifacts/badges-light-v4.png', fullPage: true })
  
  // Dark background v4
  console.log('Rendering badges on dark background (v4)...')
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
  await page.screenshot({ path: '/opt/cursor/artifacts/badges-dark-v4.png', fullPage: true })
  
  // Long name test v4
  console.log('Rendering long name badge (v4)...')
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
  await page.screenshot({ path: '/opt/cursor/artifacts/badges-longname-v4.png' })
  
  await browser.close()
  console.log('Screenshots saved to /opt/cursor/artifacts/')
  console.log('- badges-light-v4.png')
  console.log('- badges-dark-v4.png')
  console.log('- badges-longname-v4.png')
}

generateScreenshots().catch(console.error)
