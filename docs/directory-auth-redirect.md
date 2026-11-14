# Directory login redirect fix

## Confirmed production cause

On 14 November 2026, a read-only inspection of project `kmsroigetiipulnosooy` found:

- Site URL: `http://localhost:3000`.
- Redirect allowlist: `http://localhost:3000/auth/callback/` and `https://nomad-magazine.com/auth/callback/`.
- Both confirmation and magic-link email templates use Supabase's `{{ .ConfirmationURL }}`.

The app added `?next=...` for voting and badges. Supabase matches the complete redirect URL, so those requests did not match the exact allowed callback and fell back to the localhost Site URL. This is the [documented Supabase fallback behavior](https://supabase.com/kb/troubleshooting/why-am-i-being-redirected-to-the-wrong-url-when-using-auth-redirectto-option-_vqIeO).

Read-only probes using an intentionally invalid token reproduced the redirect selection without sending email, creating users or issuing sessions:

| Requested redirect | Observed redirect origin/path |
| --- | --- |
| `https://nomad-magazine.com/auth/callback/` | `https://nomad-magazine.com/auth/callback/` |
| Callback with `next=/console/badges/` | `http://localhost:3000` |
| Callback with `next=/nomad_directory/vote/?listing=test` | `http://localhost:3000` |

## Fix and rollout

New email requests always send the exact `/auth/callback/` URL on the requesting site's origin. After a successful send, the validated destination is stored in an HttpOnly, SameSite=Lax cookie, Secure on HTTPS, scoped to the callback and expiring after one hour. The callback consumes and deletes it before handling success or failure. Missing or expired cookies default to `/console/`; untrusted destinations cannot redirect off-site. A normal account login overwrites any previous badge/vote destination. Existing token-hash or PKCE links with an explicit `next` query remain compatible and validated.

This fixes newly requested links on the current production allowlist when the PR is deployed. It does not require a new GitHub secret, broaden allowed redirect hosts, change email templates or mutate hosted configuration. The existing same-browser PKCE requirement remains. Already-sent emails retain their old URLs: request a fresh email after deployment.

The hosted Site URL should separately be corrected to `https://nomad-magazine.com/` in Supabase Auth URL Configuration so other/future flows have a production default. Keep the exact production callback in the redirect allowlist. This PR does not apply that dashboard change, and the new login flow does not depend on it. Do not push the repository's entire local `supabase/config.toml` to production to change one setting; it also contains unrelated local auth/database defaults.

## Regression checks

```sh
bun test scripts/directory-auth.test.mjs
node scripts/check-directory-auth-redirect.mjs
bun run build
bun run seo:check
node scripts/check-directory-auth-http.mjs
```

The tests use the real Supabase JavaScript client's PKCE email request serialization with a mocked HTTP transport. They check the exact outgoing `redirect_to`, round-trip account/vote/category/badge destinations, cookie flags and expiry, legacy links, missing cookies, rejected destinations and send failures. They send no real email. The hosted preflight uses an invalid-token request and requires the error redirect to stay on the exact production callback. It fails on localhost, a different host/path, an unexpected status, or a missing error response. Both checks run in the production deployment workflow.

The HTTP smoke check starts the built Cloudflare Worker on loopback with a fake Auth transport (no Supabase stack). It verifies the real login form and PKCE callback for account, badges and voting, the browser cookie's path/flags, session-cookie creation and return-cookie deletion. It uses installed Chrome through Playwright and shuts down its Worker/transport afterward. Its temporary Worker config removes the production route so local POST requests pass the same-origin checks; application code is unchanged.

The tests do not claim production email delivery or a completed production login. No production accounts, sessions, database rows or Auth settings were changed during diagnosis.
