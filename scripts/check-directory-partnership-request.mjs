// node scripts/check-directory-partnership-request.mjs
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const libUrl = pathToFileURL(new URL('../src/utils/directory-partnership-validate.ts', import.meta.url).pathname).href
const { validatePartnershipPayload, partnerOfferFromPayload } = await import(libUrl)

const valid = validatePartnershipPayload({
  listing_id: 'abc-123',
  name: 'Alex Nomad',
  email: 'alex@example.com',
  company: 'Example Co',
  message: 'We would love to partner on events.',
  turnstile_token: 'token',
})
assert.equal(valid.ok, true)

const badEmail = validatePartnershipPayload({
  listing_id: 'abc',
  name: 'Alex',
  email: 'not-an-email',
  company: '',
  message: 'Short',
  turnstile_token: 'token',
})
assert.equal(badEmail.ok, false)

const offer = partnerOfferFromPayload({
  partner_offer_title: '15% off',
  partner_offer_description: 'Valid for nomads.',
  partner_offer_url: 'https://example.com/offer/',
  partner_offer_code: 'NOMAD15',
})
assert.ok(offer)

assert.equal(
  partnerOfferFromPayload({
    partner_offer_title: 'x',
    partner_offer_url: 'javascript:alert(1)',
  }),
  null,
)

const apiSrc = await readFile(new URL('../src/pages/api/directory-partnership-request.ts', import.meta.url), 'utf8')
const tsSrc = await readFile(new URL('../src/utils/directory-partnership.ts', import.meta.url), 'utf8')
assert.doesNotMatch(apiSrc, /owner.*email|requester_email|mailto:/i)
assert.match(apiSrc, /json\(\{ ok: true \}\)/)
assert.match(tsSrc, /if \(!limiter\) return \{ ok: false, status: 503/)

console.log('PASS: partnership validation (module import), offer parsing, fail-closed limiter, API response shape')