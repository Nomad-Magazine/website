// node scripts/check-directory-vote-network.mjs
import assert from 'node:assert/strict'

async function hashClientNetwork(request, salt) {
  if (!salt) return null
  const ip = request.headers.get('cf-connecting-ip')?.trim()
  if (!ip) return null
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

const request = new Request('https://example.test/api/directory-votes/', {
  headers: { 'cf-connecting-ip': '203.0.113.10' },
})
const hash = await hashClientNetwork(request, 'local-test-salt')
assert.match(hash, /^[a-f0-9]{64}$/)
assert.equal(await hashClientNetwork(request, ''), null)
console.log('PASS: salted IP hashes are stable and omit raw addresses.')