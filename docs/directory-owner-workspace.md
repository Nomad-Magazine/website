# Directory owner workspace

This PR includes the database and working owner/admin flows. It has only been exercised against an isolated local Supabase instance; no production migration, import or deployment has been performed.

## What is implemented

- Email-link account creation/sign-in at `/nomad-directory-edit/`, with the existing PKCE/token-hash callback. `/nomad-directory-submit/` leads into the authenticated new-listing flow.
- `/console/`: multiple owned listings, live/draft/review status, verified claims and links to management actions.
- `/console/directory-submission/`: business details, category, location, website, offer and immutable WebP logo uploads; save draft and submit for review.
- `/console/updates/`: draft, submit, edit and withdraw business updates.
- `/console/affiliates/`: private programme URL, network, commission, attribution window, eligible countries, contact and payout/exclusion terms; save, submit, edit and withdraw.
- `/console/admin/directory/`: review pending listings, updates and affiliate proposals; compare the live version, publish/accept, or request changes with owner feedback.
- Approved listings are server-rendered immediately at the existing directory and category/location URLs. Approved updates appear under the listing and at `/nomad_directory/updates/`. Drafts, private terms and account identifiers are never part of the public projections.
- Public upvote totals on directory/category/location cards, with one removable vote per verified account and a **Most upvoted** sort. Existing email login returns visitors to confirm their vote, then back to the original listing. Voting also works without JavaScript.

The homepage remains static, with its existing selected listing cards and a lower-bound listing count. Public directory results are live. The feed shows the latest 100 published updates, and each listing shows its latest two.

## Migration and ownership

`supabase/migrations/20261112000001_directory_owner_workspace.sql` creates:

| Table | Purpose |
| --- | --- |
| `directory_admins` | Private reviewer role assignment |
| `directory_legacy_claims` | Trusted private contact mapping for existing SmartSuite IDs |
| `directory_managed_listings` | Owner, stable legacy ID, draft, published snapshot, status, version and review feedback |
| `directory_owner_posts` | Updates and private affiliate proposals with review state |

All tables use RLS. Authenticated users can read their own rows; reviewers can read the review queue. Mutations go through functions with explicit ownership/reviewer checks and fixed search paths. Anonymous clients can call only the public listing/update projections. Clients cannot update approval or owner fields directly. Version checks reject stale edits and reviews. There is a 25-listing account limit and a 20-new-post daily limit; these are basic abuse limits, not a substitute for auth rate limits.

Existing `directory_submissions` rows, if present, are copied into the owner workspace with their IDs, owner, content and feedback preserved. They require review: the old table allowed owners to write their own status, so that value cannot establish approval. The original records remain untouched. Existing public SmartSuite listings remain visible from the bundled snapshot.

Claims require a verified Supabase email matching a privately imported trusted contact. The existing record ID is preserved for public anchors. An email mismatch requires support verification; selecting a public business name grants no access. Changing a claimed listing does not unpublish its current approved version.

The `directory-owner-logos` bucket accepts WebP up to 2 MB. Upload paths belong to the authenticated user; objects are immutable through the user API, so a published logo cannot be replaced without review. Logos are public assets. The application validates the upload header as well as MIME/size. Orphaned draft uploads can be removed later with a privileged maintenance job after checking both draft and published references.

## Upvotes

`supabase/migrations/20261112000002_directory_upvotes.sql` adds `directory_votes` and the private `directory_legacy_vote_targets` registry. The migration registers all 234 published legacy listing IDs; newly approved managed listings qualify automatically. When adding published records to the legacy snapshot, register their IDs in a migration too. The security test checks this coverage. Claims keep the legacy ID, so claiming a listing preserves its votes.

The `(listing_id, user_id)` primary key prevents duplicate votes. `directory_set_vote` requires a verified email and a published listing, derives the account from `auth.uid()`, and sets the requested state idempotently. It serializes writes per listing; retries cannot add another vote. Direct writes are denied, and RLS only permits reading one's own vote rows. Account deletion cascades to its votes. Unpublished listings are excluded from public counts and cannot receive new votes.

`directory_vote_counts` exposes totals only, with no voter names, emails or IDs. Public HTML contains these totals; personal vote state comes from the uncached `/api/directory-votes/` endpoint. Mutations require a matching request origin. Authentication redirects accept only local directory paths. Private account/voting pages are noindex. A failed write retains the original count and shows a retry message.

Verified email and one vote per account provide basic integrity, not protection against someone creating multiple email accounts. Keep Supabase Auth email/verification limits enabled; assess CAPTCHA or moderation against observed abuse. No fake starting votes or purchased votes are included. Paid placements proposed later must remain separate from community vote totals.

## Deployment order

1. Review and apply both new migrations, owner workspace followed by upvotes, to the intended Supabase project before deploying this branch. They are additive and do not change existing public page URLs. Public directory runtime reads return HTTP 503 with `Retry-After` if the publication/vote RPCs are unavailable.
2. Import a trusted SmartSuite export into the private claims table. Validate its source and original contact field (`sd6842e687`); the importer selects the first valid contact email and skips entries without one. It never logs contacts and never overwrites an existing mapping.

   ```sh
   node scripts/import-directory-claims.mjs --input=/private/trusted-export.json
   # Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY securely in the shell environment.
   node scripts/import-directory-claims.mjs --input=/private/trusted-export.json --apply
   ```

3. The migration grants the initial reviewer role to an existing verified `hey@nomadgossip.com` account. If that account has not signed up yet, create/verify it first, then provision its ID with privileged SQL:

   ```sql
   insert into public.directory_admins(user_id)
   select id from auth.users
   where lower(email) = 'hey@nomadgossip.com' and email_confirmed_at is not null
   on conflict do nothing;
   ```

4. Configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` as Worker bindings when using a staging project. The existing production project/public anon key remain the default. The website never receives a service-role key. Confirm the Auth site URL and redirect allowlist permit `https://nomad-magazine.com/auth/callback/` including its `next` query parameter (a callback-scoped wildcard such as `https://nomad-magazine.com/auth/callback/**`), and verify SMTP delivery and the vote return flow in staging.
5. Deploy and exercise signup → claim/new listing → submit → review → publication, plus private affiliate review. Test normal and reviewer accounts separately. The committed screenshots use fictional businesses in local Supabase; they are not production accounts.

For rollback, roll the application back first. Keep the additive tables/data so owner submissions are retained. A rollback to the old application resumes the previous SmartSuite editing workflow; do not drop the new tables while owners have saved data.

## Reproduce local verification

Use a dedicated local Supabase project, never a shared production/staging database. Start it from an isolated directory with unique ports/project ID, then apply this migration through its local SQL connection. Existing migrations are not required to exercise the new tables; applying the old `directory_submissions` migration additionally enables the legacy backfill check.

Keep a local keys JSON file outside Git (`supabase status --output json`), with `API_URL`, `ANON_KEY` and `SERVICE_ROLE_KEY`. Set the app's gitignored `.dev.vars` to the same local `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Restart the dev server after changing bindings. No local keys or fixture users are committed.

```sh
bun run build
bun run seo:check
bun run dev
# Run the remaining commands in another shell.
npm install --prefix /tmp/nomad-browser playwright @axe-core/playwright
SUPABASE_TEST_CONFIG=/tmp/local-keys.json node scripts/check-directory-workspace.mjs
NODE_PATH=/tmp/nomad-browser/node_modules node scripts/check-directory-workspace-browser.cjs
DIRECTORY_TEST_MAIL_URL=http://127.0.0.1:54324 NODE_PATH=/tmp/nomad-browser/node_modules node scripts/check-directory-signup.cjs
NODE_PATH=/tmp/nomad-browser/node_modules node scripts/check-directory-browser.cjs
node scripts/check-directory-html.mjs
SUPABASE_TEST_CONFIG=/tmp/local-keys.json node scripts/check-directory-votes.mjs
DIRECTORY_TEST_MAIL_URL=http://127.0.0.1:54324 NODE_PATH=/tmp/nomad-browser/node_modules node scripts/check-directory-votes-browser.cjs
```

The security script rejects non-loopback Supabase URLs. It recreates only its `directory-owner`, `directory-other` and `directory-reviewer` fixture accounts and their data, then creates short-lived login links in `/tmp/nomad-owner-fixtures.json`. The browser script consumes those links; rerun the security script before rerunning that browser script. Signup tests send mail only to local Mailpit and use an `example.test` address. Override `DIRECTORY_TEST_URL` if the app uses another local origin.

The vote scripts separately recreate their three `directory-voter-*` fixture accounts and write a short-lived login token to `/tmp/nomad-vote-fixtures.json`. Run the vote security script before its browser script. Browser verification creates a local signup account, checks delivered email/PKCE and return-to-listing, vote/removal persistence, concurrency, isolation, write failures, keyboard input, sorting, category cards, expired sessions and the no-JavaScript fallback. Screenshot counts are local test votes, not production popularity.

Checks cover account creation through delivered email/PKCE, authenticated form persistence, cross-account access, verified claims, direct-write denial, reviewer-only approval, stale versions, rejection feedback, preservation of published versions, immediate directory/category publication, update withdrawal, affiliate privacy, upload ownership, CSRF rejection and signout. Browser checks include keyboard behavior, mobile overflow and automated WCAG A/AA audits; they are not a full manual accessibility audit.

## Next features

Payments, paid ranking, affiliate click tracking/payouts and collaborator invitations are not implemented. See the [growth proposal](directory-growth-proposal.md) for the proposed commercial workflow. Submitting or accepting an affiliate programme does not automatically activate a tracked outbound link.

The restored newsletter section uses its existing production Turnstile key. Cloudflare rejects localhost with [error 110200 (domain not authorized)](https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/). The public browser check reports and excludes only that exact local-domain exception; newsletter signup itself is not part of this verification. Directory account signup is separately tested through local Supabase mail delivery.

`node scripts/check-directory-schema.mjs` also verifies that owner-supplied HTML cannot terminate a JSON-LD script. Shared SEO titles are rendered as escaped text.
