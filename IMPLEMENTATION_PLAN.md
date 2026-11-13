# Directory Awards Badge Redesign Implementation Plan

## Summary
Redesigning directory award badges from the old design to the new C2 editorial ticket style, and removing daily awards entirely.

## Changes Required

### 1. Core Type & Utility Updates (`src/utils/directory-awards.ts`)
- Remove 'day' from awardKinds array (keep only week, month, year)
- Update awardNames record
- Change default in awardKind() function from 'day' to 'week'
- Update awardPeriodLabel() to remove UTC suffix
- Update awardAlt() to remove "joint winner" text
- Update badgeEmbed() dimensions to 328x116
- Completely rewrite awardBadgeSvg() with new editorial ticket design

### 2. Database Migration (`supabase/migrations/20261112000003_directory_awards.sql`)
- Update check constraint: `check(kind in ('week','month','year'))` (remove 'day')
- Update foreach loop: `array['week','month','year']` (remove 'day')
- Update default function parameter: `p_kind text default 'week'` (change from 'day')

### 3. Documentation (`docs/directory-awards.md`)
- Search and remove all daily/day award references
- Update badge dimensions mentioned
- Update screenshots section

### 4. Test Scripts (`scripts/check-directory-awards.sql`, `scripts/check-directory-awards.mjs`)
- Remove daily test cases
- Update default kind references

### 5. Screenshot Generation
- Start dev server with fresh build
- Capture badges at 1440px viewport for weekly, monthly, yearly
- Capture with long listing name for truncation test  
- Capture on both light and dark backgrounds
- Convert to WebP and save to docs/screenshots/awards-badges.webp

## Badge Design Specs (from C2 reference)
- Dimensions: 328x116px
- Yellow stub (left): 78px wide, #FFD21F fill
- White body: remainder
- N::M wordmark on yellow stub (scaled 0.68)
- Period word (WEEKLY/MONTHLY/YEARLY) below wordmark
- Dashed perforation line at x=88 with notches
- Text layout:
  - "NOMAD DIRECTORY" kicker (10px, gray #5A5854, letter-spacing 1.2)
  - Title "Weekly/Monthly/Yearly winner" (19px bold, black)
  - Business name (12px, black, truncate at ~28 chars)
  - Date top-right (10px, gray, no UTC)
  - Handwritten script bottom-right rotated -4deg: "winner of the week/month/year"
- Border: 1.75px black rounded rect
- Shadow: offset shape filled with #121111

## Files to Change
1. src/utils/directory-awards.ts
2. supabase/migrations/20261112000003_directory_awards.sql
3. docs/directory-awards.md
4. docs/screenshots/awards-badges.webp (regenerate)
5. scripts/check-directory-awards.sql
6. scripts/check-directory-awards.mjs (if it references daily)

## Testing
1. `bun run build` must pass (ignore pre-existing flipbooks errors)
2. Start preview server
3. Test badge endpoint with sample award IDs for each period
4. Verify badge renders correctly
5. Verify no daily options anywhere in UI/code
