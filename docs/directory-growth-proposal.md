# Directory first: design and growth proposal

## This pull request

Make the Nomad Directory the main product while keeping **/nomad_directory/** and every existing page route intact. The homepage introduces the directory, search, categories and business submissions. Articles and four existing magazine editions remain accessible; the homepage, header and footer no longer promote a future edition.

The directory ships all published listings in its initial HTML, with complete descriptions, offers and outbound links. JavaScript adds filtering, sorting and 24-result pagination; without JavaScript, every listing remains readable. Listings have stable record-ID anchors, so homepage cards can link directly to a listing without inventing new page URLs. The canonical remains the original directory URL, including on search/category query variants.

CollectionPage, ItemList and breadcrumb structured data describe the visible content. Title and description target digital nomad resources rather than business intelligence. Local 112px WebP logos replace externally hosted originals; missing logos fall back to initials. No new client framework or runtime dependency is added. After refreshing the source snapshot, run `node scripts/cache-directory-logos.mjs` to download missing local logos and refresh their manifest; use `--refresh` when existing logos have changed. New listings otherwise safely use initials.

The navigation uses a native disclosure on mobile, supports Escape and keyboard focus, and exposes Directory before the magazine archive. Search has a visible result count announced to assistive technology, category selection exposes its state, pagination moves focus to results, and the directory has a single main landmark.

## Accounts: build on what exists

The existing `/nomad-directory-edit/` page already calls Supabase magic-link sign-in with `shouldCreateUser: true`. The console matches listings to the authenticated email, allows changes and sends edits back for review. Public pages read a bundled SmartSuite snapshot, so approval alone does not instantly publish a change: a sync/build is also needed.

This PR makes those account and submission routes prominent. It does not introduce another authentication system or claim that owner posts or payments are live. Authentication email delivery and authenticated production writes are outside the visual review; they must be exercised on a staging account before launching additional owner features.

### Proposed next release: owner workspace

1. Introduce a stable ownership mapping (`listing_id`, `user_id`, `role`, verification evidence and timestamps). Backfill current email-matched listings after verification. Verify legacy claims by the existing contact email or an administrator-reviewed domain proof; knowing a business name is never sufficient.
2. Show a clear account dashboard: **My listings**, **Edit details**, **Post an update**, **Offers & affiliates**, and **Visibility**. Support several listings per owner and collaborator invitations later.
3. Save edits as revisions. Keep the last approved version visible while the revision is under review; the current flow makes edited listings unpublished, which is undesirable for directory continuity.
4. Add short dated updates: title, body, optional WebP image and destination link. Statuses: draft → submitted → approved/rejected → archived. Ownership checks must run server-side on every write, with rate limits and moderated links. Show approved updates under the listing, with author and date, like a lightweight Product Hunt activity feed. Add reactions only after moderation and abuse controls exist.
5. Publish approved revisions and updates through an idempotent snapshot sync/build. Record approved/published timestamps and failures; retain the last good public snapshot on failure. Owner UI should distinguish “approved” from “published”.

Suggested records: `listing_owners`, `listing_revisions`, `listing_updates`, and an approval audit trail. Choose one public source of truth; avoid maintaining independent editable copies in SmartSuite and the existing Supabase submission table.

## Proposed paid visibility

Add a small sponsored area above organic results and optional sponsored positions inside relevant categories. Label every paid placement **Sponsored**, including homepage placements. Keep organic ordering independent of payment and affiliate commission; paid placement must not imply editorial endorsement.

Start with a fixed-duration placement, limited inventory, a start/end date and a preview of exactly where it appears. Do not publish prices, subscription promises or tier names until terms are agreed. Keep the Visibility tab informational until checkout exists.

Implementation: server-owned prices and inventory, Stripe Checkout, signed/idempotent webhook processing and a placement ledger (`listing_id`, category/slot, start/end, status, checkout/payment IDs). Browser return URLs cannot activate placements. Expiration, cancellation, refunds and failed payments must remove eligibility. Paid eligibility never bypasses listing approval. Qualify compensated outbound links with `rel="sponsored noopener noreferrer"`.

## Proposed affiliate partnerships

Let owners submit their existing affiliate programme in the account dashboard: programme URL, network/provider, tracked destination URL, commission model and amount, attribution window, payout terms/currency, eligible countries, exclusions and a contact. Keep negotiated terms and payout details private.

Workflow: **submitted → reviewing → accepted/rejected → paused/expired**. An administrator reviews the programme, joins it where required, verifies the destination and confirms terms before publishing an affiliate link. An owner submission must not automatically replace the directory's ordinary website link.

Show a nearby disclosure such as “Affiliate link — Nomad Magazine may earn a commission.” Label any reader discount independently and only when verified. Use `rel="sponsored noopener noreferrer"`; do not alter the canonical directory URL. Preserve an ordinary website destination when a programme expires. Commission size must not determine organic rank.

Start with aggregate click counts and network-reported conversions. Avoid collecting visitor identities or adding third-party tracking pixels by default. If a redirect is added later, restrict destinations to approved URLs to prevent an open redirect. Agree retention and access controls before storing click-level data. Reconcile commissions, reversals and actual payouts; a click is not revenue.

## SEO rollout and measurement

- Before deployment, retain a Search Console baseline for the directory: indexed URL, queries, clicks, impressions, CTR and average position. This PR does not claim a measured ranking improvement.
- After deployment, inspect the exact existing URL in Search Console and request recrawling. Confirm all listing text/links in rendered HTML and keep sitemap references pointed to the existing route.
- Review at 28 and 56 days, separating directory traffic from homepage traffic. Track directory visits → outbound visits and listing submissions → approved listings → verified owners. Track paid/affiliate revenue separately.
- Existing category and country landing pages under `/nomad_directory/` remain intact. The homepage links to relevant existing categories, and the directory now links to all 28 category pages with crawlable anchors. Improve the unique editorial content of these existing pages next. Individual listing pages could be additive later, never replacements or redirects of `/nomad_directory/`; do not mass-index thin filter/search combinations.
- Validate production Core Web Vitals after deployment. Local screenshots, build checks and accessibility tests are not production PageSpeed measurements.

References: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable), and [qualifying paid links](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links). These support crawlable HTML and sponsorship semantics; structured data does not guarantee enhanced search results or rankings.

## Review scope

This is a proposal PR, not a production deployment. Account management is existing functionality surfaced by the redesign. Owner updates, ownership migration, checkout and affiliate intake are proposed follow-up work, not implemented features. Existing edition/waitlist URLs are retained for compatibility; archive-wide copy cleanup can follow separately.

## Validation and reproduction

- `bun run build` passed (zero TypeScript errors; seven existing informational hints).
- `bun run seo:check` passed across 405 pages: zero errors, five warnings. Warnings are on the unchanged directory Instagram, search and three author pages; the CLI also emits informational notices.
- `node scripts/check-directory-html.mjs` passed: all 234 published records appear in the built HTML; schema count, canonical, sitemap, one H1/main landmark, metadata lengths, local WebP assets and category destinations are checked.
- `scripts/check-directory-browser.cjs` passed in headless Chrome: search, category selection, empty state, reset, sorting, pagination/focus, direct listing anchors, canonical query handling, homepage search, mobile menu/Escape and all 234 visible listings with JavaScript disabled. No horizontal overflow at 390, 768 or 1440px. No browser exceptions. Axe found zero WCAG 2/2.1 A/AA violations on the homepage and directory. This automated audit is not a full manual screen-reader audit.

To repeat browser checks, run the local app on port 3000 and install the optional test tools outside the repository:

```sh
npm install --prefix /tmp/nomad-browser playwright @axe-core/playwright
NODE_PATH=/tmp/nomad-browser/node_modules node scripts/check-directory-browser.cjs
```

Chrome must be installed. `DIRECTORY_TEST_URL` can override the local origin. Tests do not submit forms that send emails or write listings. The test expectations use the committed 234-listing snapshot.

[Desktop and mobile screenshot comparisons](screenshots/README.md).
