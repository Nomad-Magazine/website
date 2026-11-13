// SUPABASE_TEST_CONFIG=/tmp/local-keys.json node scripts/check-directory-votes.mjs
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
const keys = JSON.parse(await readFile(process.env.SUPABASE_TEST_CONFIG, 'utf8'))
assert(['localhost', '127.0.0.1'].includes(new URL(keys.API_URL).hostname), 'Local Supabase only')
const make = (key = keys.ANON_KEY) => createClient(keys.API_URL, key, { auth: { persistSession: false, autoRefreshToken: false } })
const service = make(keys.SERVICE_ROLE_KEY), anon = make()
const ok = ({ data, error }) => { assert.ifError(error); return data }
const denied = result => assert(result.error, 'Expected permission/validation failure')
const snapshot = JSON.parse(await readFile('src/utils/nomad_cache_table_6857167d82358a0f5e038c3f.json', 'utf8')).records.filter(r => r.sf4ad525dd && r.title)
const registered = new Set(ok(await service.from('directory_legacy_vote_targets').select('listing_id')).map(r => r.listing_id))
assert(snapshot.every(r => registered.has(r.id)), 'Every published legacy listing must be votable')
const target = snapshot[0].id, secondTarget = snapshot[1].id
const accounts = []
for (let n = 1; n <= 3; n++) {
  const email = `directory-voter-${n}@example.test`
  const old = ok(await service.auth.admin.listUsers()).users.find(u => u.email === email)
  if (old) ok(await service.auth.admin.deleteUser(old.id))
  const password = `Local-${crypto.randomUUID()}`
  const user = ok(await service.auth.admin.createUser({ email, password, email_confirm: true })).user
  const client = make()
  ok(await client.auth.signInWithPassword({ email, password }))
  accounts.push({ user, client })
}
const [a, b, c] = accounts
const vote = (client, id, voted) => client.rpc('directory_set_vote', { p_listing_id: id, p_voted: voted })
const counts = async () => ok(await anon.rpc('directory_vote_counts'))
const count = async id => Number((await counts()).find(r => r.listing_id === id)?.vote_count || 0)
const unverifiedPassword = `Local-${crypto.randomUUID()}`
const unverified = ok(await service.auth.admin.createUser({ email: `unverified-${crypto.randomUUID()}@example.test`, password: unverifiedPassword, email_confirm: false })).user
assert.equal(unverified.email_confirmed_at, undefined)
const unverifiedClient = make()
const unverifiedSession = await unverifiedClient.auth.signInWithPassword({ email: unverified.email, password: unverifiedPassword })
if (!unverifiedSession.error) denied(await vote(unverifiedClient, target, true))
else assert.match(unverifiedSession.error.message, /confirm/i)
ok(await service.auth.admin.deleteUser(unverified.id))
denied(await anon.rpc('directory_my_votes'))
denied(await vote(anon, target, true))
for (const table of ['directory_votes', 'directory_legacy_vote_targets']) denied(await anon.from(table).select('*'))
denied(await a.client.from('directory_legacy_vote_targets').select('*'))
denied(await a.client.from('directory_legacy_vote_targets').insert({ listing_id: 'fake-target' }))
denied(await a.client.from('directory_votes').insert({ listing_id: target, user_id: a.user.id }))
denied(await a.client.from('directory_votes').update({ user_id: b.user.id }).eq('user_id', a.user.id))
denied(await a.client.from('directory_votes').delete().eq('user_id', b.user.id))
denied(await vote(a.client, 'not-a-published-listing', true))
denied(await vote(a.client, target, null))
denied(await a.client.rpc('directory_set_vote', { p_listing_id: target, p_voted: true, user_id: b.user.id }))
const baseline = await count(target)
for (const result of await Promise.all(Array.from({ length: 12 }, (_, i) => vote(i % 2 ? a.client : b.client, target, true)))) ok(result)
assert.equal(await count(target), baseline + 2, 'Concurrent and repeated requests allow one vote per account')
assert.equal(ok(await a.client.from('directory_votes').select('*')).length, 1)
assert.deepEqual(ok(await b.client.rpc('directory_my_votes')).map(r => r.listing_id), [target])
assert((await counts()).every(r => Object.keys(r).sort().join(',') === 'listing_id,vote_count'), 'No public voter identity')
ok(await vote(a.client, target, false)); ok(await vote(a.client, target, false))
assert.equal(await count(target), baseline + 1)
assert.equal(ok(await a.client.rpc('directory_my_votes')).length, 0)
ok(await vote(c.client, target, true))
ok(await service.auth.admin.deleteUser(c.user.id))
assert.equal(await count(target), baseline + 1, 'Account deletion removes its votes')
const payload = { title: 'Vote test listing', description: 'A local test business used to verify upvotes on published directory entries.', category: 'App', location: 'Portugal', website: 'https://example.com/', image: '', special_offer: '' }
const listing = ok(await a.client.rpc('directory_save_listing', { p_id: null, p_payload: payload, p_submit: false, p_version: 0 }))
denied(await vote(a.client, listing, true))
ok(await service.from('directory_managed_listings').update({ published: payload, status: 'approved' }).eq('id', listing))
ok(await vote(a.client, listing, true)); assert.equal(await count(listing), 1)
ok(await service.from('directory_managed_listings').update({ published: null }).eq('id', listing))
assert.equal(await count(listing), 0, 'Unpublished listings do not appear in public counts')
denied(await vote(a.client, listing, true))
const legacy = 'vote-test-legacy'
ok(await service.from('directory_legacy_vote_targets').upsert({ listing_id: legacy }))
ok(await service.from('directory_legacy_claims').upsert({ legacy_id: legacy, contact_email: a.user.email, payload, published: true }))
ok(await vote(a.client, legacy, true))
const claimed = ok(await a.client.rpc('directory_claim_listing', { p_legacy_id: legacy }))
ok(await vote(a.client, legacy, true)); assert.equal(await count(legacy), 1, 'Claiming keeps the original vote ID')
denied(await vote(a.client, claimed, true))
// Keep only baseline votes as clearly local screenshot fixtures.
ok(await service.from('directory_votes').delete().in('listing_id', [legacy, listing]))
ok(await service.from('directory_managed_listings').delete().in('id', [claimed, listing]))
ok(await service.from('directory_legacy_claims').delete().eq('legacy_id', legacy))
ok(await service.from('directory_legacy_vote_targets').delete().eq('listing_id', legacy))
ok(await vote(a.client, target, true)); ok(await vote(b.client, secondTarget, true))
const login = ok(await service.auth.admin.generateLink({ type: 'magiclink', email: a.user.email }))
await writeFile('/tmp/nomad-vote-fixtures.json', JSON.stringify({ target, secondTarget, title: snapshot[0].title, category: snapshot[0].sb685ab800.label, tokenHash: login.properties.hashed_token, email: a.user.email }), { mode: 0o600 })
console.log('PASS: all legacy IDs, verified-account RPC grants, RLS isolation, public privacy, concurrent/idempotent upvotes, removal, account deletion, publication checks and stable votes after claims.')
