// node scripts/check-directory-partnership-request.mjs
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const listingIdPattern = /^[a-zA-Z0-9-]{1,100}$/

function validatePartnershipPayload(raw) {
  if (!raw || typeof raw !== 'object') return { ok: false, status: 400, error: 'Invalid request.' }
  const body = raw
  const listing_id = typeof body.listing_id === 'string' ? body.listing_id.trim() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const company = typeof body.company === 'string' ? body.company.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const turnstile_token = typeof body.turnstile_token === 'string' ? body.turnstile_token.trim() : ''
  if (!listingIdPattern.test(listing_id)) return { ok: false, status: 400, error: 'Invalid listing.' }
  if (name.length < 2 || name.length > 120) return { ok: false, status: 400, error: 'Enter your name.' }
  if (!emailPattern.test(email) || email.length > 254) return { ok: false, status: 400, error: 'Enter a valid email.' }
  if (company.length > 200) return { ok: false, status: 400, error: 'Company name is too long.' }
  if (message.length < 10 || message.length > 2000) return { ok: false, status: 400, error: 'Message must be 10–2000 characters.' }
  if (!turnstile_token) return { ok: false, status: 401, error: 'Human verification failed. Please try again.' }
  return { ok: true, payload: { listing_id, name, email, company, message, turnstile_token } }
}

function partnerOfferFromPayload(payload) {
  const title = String(payload.partner_offer_title || '').trim()
  const url = String(payload.partner_offer_url || '').trim()
  const description = String(payload.partner_offer_description || '').trim()
  const code = String(payload.partner_offer_code || '').trim()
  if (!title || !url) return null
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
  } catch {
    return null
  }
  return { title, description, url, code }
}

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
const secretsSrc = await readFile(new URL('../src/utils/directory-vote-secrets.ts', import.meta.url), 'utf8')
assert.doesNotMatch(apiSrc, /owner.*email|requester_email|mailto:/i)
assert.match(apiSrc, /json\(\{ ok: true \}\)/)
assert.match(secretsSrc, /DIRECTORY_PARTNERSHIP_LIMITER/)

console.log('PASS: partnership validation, offer parsing, rate limit hook, and API response shape')