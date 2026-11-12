# Directory priority and growth proposal

## Implemented in this PR

The new directory hero stays. The rest of the homepage uses its original sections, cards, magazine cover stack, typography and visual styling. The existing directory section is moved immediately below the hero; the magazine follows below the fold. Articles, videos, distribution, partners, community and team sections remain. The original header layout and Magazine menu are retained, with the directory taking the existing yellow primary button. The magazine is not archived, and all edition URLs remain unchanged.

The exact **/nomad_directory/** URL, existing category/location URLs and stable record-ID anchors are retained. The directory keeps its original hero, filter sidebar and list-card design. Its content now arrives in server-rendered HTML instead of depending on client-side card generation. JavaScript enhances search, 20-result pagination, sorting and description expansion. Without JavaScript, all listings and category links remain available.

SEO work includes the directory canonical, targeted title/description, CollectionPage/ItemList/breadcrumb data, crawlable category links, descriptive listing links, and local compact WebP logos. The homepage links directly to the existing directory and category URLs. Existing video thumbnails are converted to WebP without changing their images. Accessibility work includes the single main landmark, live result count, keyboard pagination, explicit outbound labels, focus styles, accessible navigation state/Escape/focus trap, and small contrast/link-underline fixes.

## Working account management

This PR includes **Supabase migration 20261112000001**, owner management pages and the reviewer queue, not just a future proposal. Owners can create an email-link account, add listings, verify claims to existing listings, save drafts, upload logos, submit edits, post updates and submit private affiliate programmes. Reviewers publish listings and updates or return feedback. Current published content stays visible while edits are pending.

Approved changes appear immediately on the public directory and its category/location pages. Approved updates appear under the business and on the new updates feed. Affiliate terms and contact details remain private; acceptance does not automatically activate an affiliate link. Payments are not enabled.

See [database, security, deployment and test details](directory-owner-workspace.md). The migration and flows have been tested locally. No production database changes or deployment have been made.

## Proposed paid visibility

Add a small sponsored area above organic results and optional sponsored positions inside relevant categories. Label every paid placement **Sponsored**, including homepage placements. Keep organic ordering independent of payment and affiliate commission; paid placement must not imply editorial endorsement.

Start with a fixed-duration placement, limited inventory, a start/end date and a preview of exactly where it appears. Do not publish prices, subscription promises or tier names until terms are agreed. Keep the Visibility tab informational until checkout exists.

Implementation: server-owned prices and inventory, Stripe Checkout, signed/idempotent webhook processing and a placement ledger (`listing_id`, category/slot, start/end, status, checkout/payment IDs). Browser return URLs cannot activate placements. Expiration, cancellation, refunds and failed payments must remove eligibility. Paid eligibility never bypasses listing approval. Qualify compensated outbound links with `rel="sponsored noopener noreferrer"`.

## Affiliate activation after intake

The owner submission and private review workflow are implemented. The next step is for an administrator to agree the partnership, join the provider's programme where necessary, verify the tracked destination and activate an approved affiliate link. Owners cannot replace public destinations with unreviewed affiliate terms.

Show a nearby disclosure such as “Affiliate link — Nomad Magazine may earn a commission.” Label any reader discount independently and only when verified. Use `rel="sponsored noopener noreferrer"`; do not alter the canonical directory URL. Preserve an ordinary website destination when a programme expires. Commission size must not determine organic rank.

Start with aggregate click counts and network-reported conversions. Avoid collecting visitor identities or adding third-party tracking pixels by default. If a redirect is added later, restrict destinations to approved URLs to prevent an open redirect. Agree retention and access controls before storing click-level data. Reconcile commissions, reversals and actual payouts; a click is not revenue.

## SEO measurement after deployment

Retain a Search Console baseline for the existing directory URL: indexed status, queries, clicks, impressions, CTR and average position. After deployment, inspect the same URL, confirm listing text and crawlable links, and request recrawling. Compare 28- and 56-day windows while separating directory and homepage traffic. There is no measured ranking improvement claimed by this PR.

Track directory visits → outbound visits, account creation → submitted listings → approved listings, and paid/affiliate revenue separately. Production Core Web Vitals must be measured after deployment; local screenshots and automated checks are not production PageSpeed results.

The homepage remains static for performance. Live directory and category pages read only the public approved projections; account pages are private and noindex. Existing category/location routes stay in the sitemap. Newly populated country routes should be added to the sitemap when the bundled directory snapshot is refreshed. Avoid indexing search/filter combinations as separate pages.

Google's [JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) supports server-rendered content, its [link guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) requires real links for reliable discovery, and its [paid-link guidance](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links) specifies sponsored relationships. These changes do not guarantee rankings or rich results.

## Review evidence

[Before/after homepage and directory screenshots, plus real owner workspace screens](screenshots/README.md). The owner screenshots use fictional businesses and actual local Supabase sessions. The [workspace runbook](directory-owner-workspace.md) lists repeatable security, signup, form, publication and browser checks. Payment prices, paid placement inventory and affiliate commercial terms are proposals, not new published offers.

## Validation results

- Build: zero TypeScript errors and warnings (eight informational hints).
- SEO CLI: 363 prerendered pages, zero errors and five existing warnings on the unchanged Instagram, search and author pages. Runtime directory pages are checked separately rather than omitted from validation.
- Runtime HTML: all 234 original records plus approved local fixtures rendered in HTML; canonical, sitemap entries, metadata lengths, heading/main landmarks, trailing slashes and WebP assets checked. Every existing category/location route responds at its original URL.
- Headless Chrome: search, sorting, pagination and keyboard focus, category links, direct listing anchors, no-JavaScript rendering, mobile menu, homepage search and magazine below the fold. No horizontal overflow at 390, 768 or 1440px. Axe WCAG A/AA reports zero violations on home, directory, updates and the tested owner screens.
- Supabase: verified claims, account isolation, mutation/approval permissions, optimistic versions, preserved publication during edits, reviewer feedback, update publication/withdrawal, affiliate privacy, owner-only immutable WebP uploads, legacy submission backfill and JSON-LD escaping.
- Real forms: email signup through local delivery and PKCE, saved/reloaded drafts, logo upload, listing/update/affiliate submissions, reviewer approval, immediate public/category rendering, CSRF rejection and signout.

Production email delivery, production Core Web Vitals, search rankings, payments and live affiliate tracking have not been verified or enabled.
