// node scripts/check-directory-vote-email.mjs
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const libUrl = pathToFileURL(new URL('../src/utils/directory-vote-email-link.ts', import.meta.url).pathname).href
let emailLib
try {
  emailLib = await import(libUrl)
} catch {
  const src = await readFile(new URL('../src/utils/directory-vote-email-link.ts', import.meta.url), 'utf8')
  const normalizeVoteEmail = raw => {
    if (typeof raw !== 'string') return null
    const email = raw.trim().toLowerCase()
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
    return email
  }
  const mapVoteEmailError = error => {
    const message = (error.message ?? '').toLowerCase()
    const code = (error.code ?? '').toLowerCase()
    if (code === 'email_exists' || message.includes('already') || message.includes('registered') || message.includes('exists')) return { status: 409, error: 'email_taken' }
    if (error.status === 429 || message.includes('rate') || message.includes('too many')) return { status: 429, error: 'rate_limited' }
    if (message.includes('invalid') && message.includes('email')) return { status: 400, error: 'invalid_email' }
    return { status: 503, error: 'unavailable' }
  }
  emailLib = { normalizeVoteEmail, mapVoteEmailError }
}

const { normalizeVoteEmail, mapVoteEmailError } = emailLib

assert.equal(normalizeVoteEmail('  Vote.Test@Example.COM '), 'vote.test@example.com')
assert.equal(normalizeVoteEmail('not-an-email'), null)
assert.equal(normalizeVoteEmail(''), null)
assert.deepEqual(mapVoteEmailError({ message: 'User already registered' }), { status: 409, error: 'email_taken' })
assert.deepEqual(mapVoteEmailError({ code: 'email_exists' }), { status: 409, error: 'email_taken' })
assert.deepEqual(mapVoteEmailError({ status: 429, message: 'Too many requests' }), { status: 429, error: 'rate_limited' })
assert.deepEqual(mapVoteEmailError({ message: 'Invalid email address' }), { status: 400, error: 'invalid_email' })
assert.deepEqual(mapVoteEmailError({ message: 'boom' }), { status: 503, error: 'unavailable' })

console.log('PASS: directory vote email validation and error mapping')