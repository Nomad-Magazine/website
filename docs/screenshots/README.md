# Directory priority and owner management

Real Chrome captures. Website before: commit `5841f16`. Desktop website captures: 1440 × 1000; mobile: 390 × 844. Owner screenshots are full-page captures at 1440px or 390px wide, from authenticated sessions against **isolated local Supabase with fictional demo businesses**. No production accounts or commercial terms are shown. The Astro developer toolbar is hidden.

## Homepage: new hero, original sections underneath

| Before | After |
| --- | --- |
| ![Original homepage](home-before.webp) | ![Directory hero with original homepage sections](home-after.webp) |
| ![Original mobile homepage](home-mobile-before.webp) | ![Mobile directory hero](home-mobile-after.webp) |

The existing directory cards are moved up, and the original magazine presentation remains below the fold:

![Original magazine cover presentation retained below the fold](home-magazine-after.webp)

## Directory: same URL and existing visual design

The hero, sidebar and list cards retain their original design. Listings are now in the initial HTML, and approved owner changes are served immediately. The after screenshot includes local fixture listings used to verify publication.

| Before | After |
| --- | --- |
| ![Directory before](directory-before.webp) | ![Directory with server-rendered listings](directory-after.webp) |
| ![Mobile directory before](directory-mobile-before.webp) | ![Mobile directory after](directory-mobile-after.webp) |

## Owner management — implemented

![Owner dashboard with a live listing, pending edits and a draft](owner-dashboard.webp)

![Edit business details and submit for review](owner-listing.webp)

![Create and manage business updates](owner-updates.webp)

![Submit private affiliate programme terms](owner-affiliates.webp)

![Reviewer queue with the current published version and pending changes](owner-review.webp)

| Mobile dashboard | Mobile affiliate form |
| --- | --- |
| ![Mobile owner dashboard](owner-dashboard-mobile.webp) | ![Mobile affiliate programme](owner-affiliates-mobile.webp) |

Run the scripts in [the owner workspace runbook](../directory-owner-workspace.md) to reproduce the account, form, RLS, publication and browser checks. The migration has not been applied to production.

## Member upvotes

Real local Supabase votes, not production popularity. The highlighted button is the signed-in member's vote; totals are public. The original directory card styling is retained.

![Directory sorted by most upvoted, with the member's vote highlighted](votes-directory.webp)

| Login before voting | Mobile upvotes |
| --- | --- |
| ![Email login returns the visitor to confirm their vote](votes-login.webp) | ![Mobile listing vote controls](votes-mobile.webp) |
