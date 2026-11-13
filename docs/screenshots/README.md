# Directory priority, owner accounts, votes and awards

Real Chrome captures of the implemented website. Before: base commit `5841f16`. After: this branch. **Accounts, votes, updates and awards use isolated local Supabase fixtures; businesses and completed contest periods are demonstrations, not production winners.** The embedded website example uses the actual copied badge HTML. Backend migrations and checks are linked above and below; paid placement/payment and affiliate activation remain proposals.

### Homepage and header — before / after

| Desktop before | Desktop after |
| --- | --- |
| ![Original homepage and header](home-before.webp) | ![Directory hero and original header with one Magazine menu](home-after.webp) |

| Mobile before | Mobile after |
| --- | --- |
| ![Original mobile homepage](home-mobile-before.webp) | ![Mobile directory hero](home-mobile-after.webp) |

The original magazine presentation remains active below the fold:

![Original magazine presentation retained below the fold](home-magazine-after.webp)

### Directory — same URL, existing design

| Desktop before | Desktop after |
| --- | --- |
| ![Original directory](directory-before.webp) | ![Server-rendered directory with winner link](directory-after.webp) |

| Mobile before | Mobile after |
| --- | --- |
| ![Original mobile directory](directory-mobile-before.webp) | ![Mobile server-rendered directory](directory-mobile-after.webp) |

### Account creation, ownership and listing management

![Email account creation and sign in](owner-login.webp)

![Owner dashboard, published listings, drafts and verified claim form](owner-dashboard.webp)

![Edit business details, upload a logo, save a draft or submit changes](owner-listing.webp)

### Business updates — owner and public views

![Owner creates and manages business updates](owner-updates.webp)

![Approved business updates displayed publicly](public-updates.webp)

### Affiliate programme and reviewer workflow

![Private affiliate programme submission and review status](owner-affiliates.webp)

![Reviewer queue for listing changes, updates and affiliate terms](owner-review.webp)

| Mobile owner dashboard | Mobile affiliate programme |
| --- | --- |
| ![Mobile listing management and claim form](owner-dashboard-mobile.webp) | ![Mobile affiliate programme form](owner-affiliates-mobile.webp) |

### Upvotes — login, confirmation and voted state

| Login before voting | Vote confirmation after login |
| --- | --- |
| ![Sign in or create an account to vote](votes-login.webp) | ![Confirm the selected listing upvote](votes-confirm.webp) |

![Most upvoted sorting and signed-in highlighted vote](votes-directory.webp)

![Mobile upvote controls](votes-mobile.webp)

### Daily, weekly, monthly and yearly winners

The four official SVG badge designs:

![Daily, weekly, monthly and yearly Nomad Directory badges](awards-badges.webp)

| Daily winners | Weekly winners |
| --- | --- |
| ![Daily winners with joint first place](awards-winners.webp) | ![Weekly winners](awards-week.webp) |

| Monthly winners | Yearly winners |
| --- | --- |
| ![Monthly winners](awards-month.webp) | ![Yearly winners](awards-year.webp) |

### Live standings and award rules

![Current period standings and rules for earning a badge](awards-standings.webp)

### Public verification, copyable code and badge on another website

![Permanent award verification and copyable website embed code](awards-result.webp)

**Example placement on a fictional business website:** the image is loaded from the real local SVG endpoint, and clicking it was verified to open the official award result. The surrounding sample website is only an embed demonstration.

![Copied Nomad Directory badge displayed on a sample business website](awards-website-embed.webp)

### Owner badge library

![Owner library of earned badges and website embed codes](awards-owner.webp)

| Mobile winners | Mobile badge library |
| --- | --- |
| ![Mobile community winners](awards-winners-mobile.webp) | ![Mobile owned badges and copyable embed code](awards-owner-mobile.webp) |

### Award moderation and withdrawn result

![Reviewer-only award withdrawal with private reasons](awards-review.webp)

![Public withdrawn award with no active badge embed](awards-withdrawn.webp)

## Reproducing the screenshots

The unchanged before captures are from base commit `5841f16`. After captures are real Chrome browser screenshots of the current implementation at 1440 × 1000 desktop and 390 × 844 mobile, with full-page owner form captures. The original vote screenshots also show actual local authenticated votes.

Prepare the isolated local fixtures using the [owner workspace runbook](../directory-owner-workspace.md) and [award runbook](../directory-awards.md), start the built preview on localhost, then run:

```bash
NODE_PATH=/tmp/nomad-browser/node_modules SUPABASE_TEST_CONFIG=/tmp/nomad-owner-secrets.json node scripts/capture-directory-review.cjs
```

The capture script only accepts loopback URLs and fictional `@example.test` accounts. It signs into existing fixtures and captures the pages without changing listing, vote or award records. Screenshots use WebP. No production migration or deployment was performed.
