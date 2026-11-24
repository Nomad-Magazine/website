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
const net = (n) => `${String(n).padStart(2, '0').repeat(32).slice(0, 64)}`
const vote = (userId, id, voted, network = 1) => service.rpc('directory_set_vote', {
  p_user_id: userId,
  p_listing_id: id,
  p_voted: voted,
  p_network_hash: voted ? net(network) : null,
})
const counts = async () => ok(await anon.rpc('directory_vote_counts'))
const count = async id => Number((await counts()).find(r => r.listing_id === id)?.vote_count || 0)
denied(await a.client.rpc('directory_set_vote', { p_listing_id: target, p_voted: true, p_network_hash: net(1) }))
const anonymous = make()
const anonUser = ok(await anonymous.auth.signInAnonymously()).user
const anonId = anonUser.id
assert.notEqual(anonUser.app_metadata?.vote_verified, true, 'Fresh anonymous users are unverified until Turnstile')
ok(await vote(anonId, secondTarget, true, 5))
ok(await vote(anonId, secondTarget, false, 5))
ok(await vote(anonId, secondTarget, true, 5))
const netUses = ok(await service.from('directory_vote_network_daily').select('vote_events').eq('listing_id', secondTarget))
assert.equal(netUses[0]?.vote_events ?? 1, 1, 'Revote after unvote must not consume another network slot')
for (let i = 0; i < 3; i++) {
  const client = make()
  ok(await vote(ok(await client.auth.signInAnonymously()).user.id, target, true, 99))
}
const overflow = make()
denied(await vote(ok(await overflow.auth.signInAnonymously()).user.id, target, true, 99))
denied(await anon.rpc('directory_my_votes'))
for (const table of ['directory_votes', 'directory_legacy_vote_targets']) denied(await anon.from(table).select('*'))
denied(await a.client.from('directory_legacy_vote_targets').select('*'))
denied(await a.client.from('directory_legacy_vote_targets').insert({ listing_id: 'fake-target' }))
denied(await a.client.from('directory_votes').insert({ listing_id: target, user_id: a.user.id }))
denied(await a.client.from('directory_votes').update({ user_id: b.user.id }).eq('user_id', a.user.id))
denied(await a.client.from('directory_votes').delete().eq('user_id', b.user.id))
denied(await service.rpc('directory_cleanup_vote_change_log', { p_older_than_days: -1 }))
denied(await service.rpc('directory_cleanup_vote_network', { p_keep_days: 0 }))
ok(await service.rpc('directory_cleanup_vote_network', { p_keep_days: 30 }))
denied(await vote(a.user.id, 'not-a-published-listing', true))
denied(await vote(a.user.id, target, null))
const baseline = await count(target)
for (const result of await Promise.all(Array.from({ length: 12 }, (_, i) => vote(i % 2 ? a.user.id : b.user.id, target, true)))) ok(result)
assert.equal(await count(target), baseline + 2, 'Concurrent and repeated requests allow one vote per account')
assert.equal(ok(await a.client.from('directory_votes').select('*')).length, 1)
assert.deepEqual(ok(await b.client.rpc('directory_my_votes')).map(r => r.listing_id), [target])
assert((await counts()).every(r => Object.keys(r).sort().join(',') === 'listing_id,vote_count'), 'No public voter identity')
ok(await vote(a.user.id, target, false)); ok(await vote(a.user.id, target, false))
assert.equal(await count(target), baseline + 1)
assert.equal(ok(await a.client.rpc('directory_my_votes')).length, 0)
ok(await vote(c.user.id, target, true))
ok(await service.auth.admin.deleteUser(c.user.id))
assert.equal(await count(target), baseline + 1, 'Account deletion removes its votes')
const payload = { title: 'Vote test listing', description: 'A local test business used to verify upvotes on published directory entries.', category: 'App', location: 'Portugal', website: 'https://example.com/', image: '', special_offer: '' }
const listing = ok(await a.client.rpc('directory_save_listing', { p_id: null, p_payload: payload, p_submit: false, p_version: 0 }))
denied(await vote(a.user.id, listing, true))
ok(await service.from('directory_managed_listings').update({ published: payload, status: 'approved' }).eq('id', listing))
ok(await vote(a.user.id, listing, true)); assert.equal(await count(listing), 1)
ok(await service.from('directory_managed_listings').update({ published: null }).eq('id', listing))
assert.equal(await count(listing), 0, 'Unpublished listings do not appear in public counts')
denied(await vote(a.user.id, listing, true))
const legacy = 'vote-test-legacy'
ok(await service.from('directory_legacy_vote_targets').upsert({ listing_id: legacy }))
ok(await service.from('directory_legacy_claims').upsert({ legacy_id: legacy, contact_email: a.user.email, payload, published: true }))
ok(await vote(a.user.id, legacy, true))
const claimed = ok(await a.client.rpc('directory_claim_listing', { p_legacy_id: legacy }))
ok(await vote(a.user.id, legacy, true)); assert.equal(await count(legacy), 1, 'Claiming keeps the original vote ID')
denied(await vote(a.user.id, claimed, true))
ok(await service.from('directory_votes').delete().in('listing_id', [legacy, listing]))
ok(await service.from('directory_managed_listings').delete().in('id', [claimed, listing]))
ok(await service.from('directory_legacy_claims').delete().eq('legacy_id', legacy))
ok(await service.from('directory_legacy_vote_targets').delete().eq('listing_id', legacy))
ok(await vote(a.user.id, target, true)); ok(await vote(b.user.id, secondTarget, true))
const login = ok(await service.auth.admin.generateLink({ type: 'magiclink', email: a.user.email }))
await writeFile('/tmp/nomad-vote-fixtures.json', JSON.stringify({ target, secondTarget, title: snapshot[0].title, category: snapshot[0].sb685ab800.label, tokenHash: login.properties.hashed_token, email: a.user.email }), { mode: 0o600 })
console.log('PASS: service-only vote RPC, client bypass denied, network caps, revote fairness, RLS, idempotent votes, publication checks.')