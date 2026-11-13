# Nomad Directory awards and website badges

This is implemented in `20261112000003_directory_awards.sql`, public winner/result pages, SVG image endpoints, the owner badge library and reviewer withdrawal controls. It has been verified with isolated local Supabase data; no production migration or deployment has been performed.

## Award rules

| Award | UTC calendar period |
| --- | --- |
| Weekly | Monday midnight to the following Monday |
| Monthly | First day of a month to the first day of the next month |
| Yearly | January 1 to the following January 1 |

The highest positive eligible vote total wins. All tied leaders share first place. A period without eligible votes issues no badges. The public rules are at `/nomad_directory/awards/#rules`.

Each verified account's **first** upvote for a listing must have been received during the period, and that vote must be active at the closing instant. Removing and re-adding a vote preserves the first receipt timestamp, so it cannot manufacture a new weekly/monthly/yearly vote. A vote exactly at midnight belongs to the new period; a withdrawal exactly at that boundary does not invalidate the preceding period. The listing must still be published when the award is finalized.

The migration records the award launch timestamp. Earlier votes do not become retroactive awards, even if re-added. The inaugural periods count only votes received from launch onward; the calendar period labels remain the full week/month/year. Existing all-time directory totals and the one-vote-per-account model remain unchanged.

## Database and scheduled processing

- `directory_vote_history` remembers first receipt per account/listing; `directory_vote_intervals` records active intervals. Both are private, with no anonymous or member table access.
- Triggers on accepted votes record history and acquire a shared transaction lock. Finalization takes the matching exclusive lock, so a delayed vote transaction cannot silently change an already closed result.
- Account deletion closes active intervals and removes the account ID from history before FK cascades. Anonymous history older than the previous UTC year is pruned after catch-up finalization. Live-account first-receipt history is retained to prevent repeated voting from resetting eligibility.
- `directory_award_periods` records every finalized period, including empty periods. `directory_awards` freezes the winning listing ID, title, vote count and tie count. Later votes, withdrawals and listing renames do not rewrite these records.
- `directory_finalize_awards()` is available only to `service_role`/database administration. It catches up all completed periods since launch and is idempotent under concurrent execution.
- Supabase `pg_cron` job **`nomad-directory-awards`** runs `select public.directory_finalize_awards();` at **00:05 daily**, using Supabase's UTC/GMT cron timezone. Each run settles any weekly, monthly and yearly periods that closed. No service-role key is added to the website.
- Clients cannot mint awards, alter scores, backdate vote history or access private moderation reasons. Public RPCs expose only award/result metadata and current top-ten standings.

Verified email and one vote per account do not prevent someone creating multiple email accounts. Existing Auth limits still apply. Reviewers can withdraw invalid awards; stronger fraud controls can be added based on observed abuse. Payments and affiliate commissions never influence these results.

## Public pages, embeds and management

- `/nomad_directory/awards/`: weekly/monthly/yearly results, paginated history, live standings and published rules. The existing homepage/header design is unchanged; the directory gets a small **Winners & badges** link.
- `/nomad_directory/awards/<award-id>/`: permanent verification page showing the awarded business, period, score, finalization time and badge. It preserves historical identity even if a business later renames itself.
- `/nomad_directory/awards/<award-id>/badge.svg/`: a real 328 × 116 branded SVG with the business, award type and calendar period. Only an issued, active award receives an image. Unknown IDs return 404; withdrawn awards return 410. SVG text is escaped and the endpoint uses a restrictive CSP with no external resources.
- `/console/badges/`: badges for the signed-in owner's listings, including verified legacy claims. Copyable HTML contains an image and a link back to the official verification page, accessible alt text, dimensions and safe new-tab attributes. There is no tracking script, pixel, installation step or required JavaScript on the business's website. Manual copying remains available without JavaScript.
- `/console/admin/awards/`: reviewer-only withdrawal with a private reason. Withdrawal does not rewrite history or automatically award a runner-up. Verification pages show the withdrawal immediately; cached badge images may remain visible for up to five minutes.

Anyone can verify an award and copy its public image, so the badge names its awarded business and links to that business's result. The badge is not proof of ownership of the website hosting it. Preview screenshots use simulated completed periods and local test votes; they are not production endorsements.

Winner/result pages use canonical URLs and structured data. The dynamic awards sitemap at `/nomad_directory/awards/sitemap/` is included in the main sitemap index, so new results are discoverable without a website rebuild. It lists up to the latest 50,000 active awards; paginated public history retains links to older results. Private console pages are noindex.

## Deployment and operations

1. Apply all three migrations in order: owner workspace, upvotes, then awards. The awards migration adds public listing titles to the private legacy voting registry. Future legacy snapshot additions must register both the ID and public title; retire eligibility when a legacy record is unpublished. Newly approved managed listings qualify automatically.
2. Enable/permit `pg_cron` in the target Supabase project. The migration creates the extension and named job. Confirm the cron timezone is UTC/GMT and the job is active:

   ```sql
   select current_setting('cron.timezone', true);
   select jobid, jobname, schedule, command, active
   from cron.job where jobname = 'nomad-directory-awards';
   ```

3. Deploy the site and verify the public empty state, account badge link, role boundaries and SVG response. New production awards are generated after periods close; the migration does not seed winners or fake counts.
4. Check actual scheduled execution after the first close:

   ```sql
   select status, return_message, start_time, end_time
   from cron.job_run_details
   where jobid = (select jobid from cron.job where jobname = 'nomad-directory-awards')
   order by start_time desc limit 10;
   ```

   After an outage, a privileged `select public.directory_finalize_awards();` safely catches up missed periods. Do not change `starts_at` in production to invent historical awards. The local tests verify the configured schedule and execute its real function; they do not claim that a production scheduled run has happened.

5. If withdrawing an award, use the reviewer page and record why. Private reasons are not exposed publicly. Owners should remove withdrawn badges from their own sites.

For application rollback, keep history and award tables intact. If pausing award issuance is necessary, a database administrator can set the named cron job inactive; reactivation catches up completed periods. Do not delete published award records or reset their period rows.

## Local verification

Use only a dedicated loopback Supabase project. The SQL test runs in a transaction and rolls back; the JavaScript test deliberately resets award fixtures and creates local `example.test` accounts. It asserts the supplied Docker database contains the account created through the supplied local API before changing fixtures.

```sh
# All three migrations must already be applied to the isolated database.
docker exec -i supabase_db_TEST_PROJECT psql -v ON_ERROR_STOP=1 -U postgres -d postgres < scripts/check-directory-awards.sql
SUPABASE_TEST_CONFIG=/tmp/local-keys.json DIRECTORY_TEST_DB_CONTAINER=supabase_db_TEST_PROJECT node scripts/check-directory-awards.mjs
NODE_PATH=/tmp/nomad-browser/node_modules node scripts/check-directory-awards-browser.cjs
node scripts/check-directory-award-markup.mjs
bun run build
bun run seo:check
```

The browser script consumes short-lived fixture login tokens from `/tmp/nomad-award-fixtures.json`; rerun the fixture test before repeating it. Browser tooling uses Playwright and axe in `/tmp/nomad-browser`, as described in the owner workspace runbook.

Checks cover UTC/DST/ISO-week/leap-month/year boundaries, exact-midnight votes and removals, ties, empty/open periods, fixed snapshots, re-vote history, concurrent finalization, account anonymization, permissions, reviewer withdrawal, public privacy, all four winner pages, clipboard copying, actual embedded SVG loading/link verification, missing/withdrawn badges, sitemap discovery, mobile overflow and WCAG A/AA audits.
