// Runs ONLY against an isolated, loopback Supabase instance with this migration applied.
// SUPABASE_TEST_CONFIG=/tmp/local-keys.json node scripts/check-directory-workspace.mjs
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
const keys = JSON.parse(await readFile(process.env.SUPABASE_TEST_CONFIG, 'utf8'))
assert(['127.0.0.1', 'localhost'].includes(new URL(keys.API_URL).hostname), 'Tests must use a local Supabase instance')
const make = (key = keys.ANON_KEY) => createClient(keys.API_URL, key, { auth: { persistSession: false, autoRefreshToken: false } })
const service = make(keys.SERVICE_ROLE_KEY),
  anon = make()
const ok = ({ data, error }) => {
  assert.ifError(error)
  return data
}
const denied = (result) => assert(result.error, 'Expected authorization or validation failure')
const password = `Local-test-${crypto.randomUUID()}`
const users = {}
for (const role of ['owner', 'other', 'reviewer']) {
  const email = `directory-${role}@example.test`
  const existing = ok(await service.auth.admin.listUsers()).users.find((user) => user.email === email)
  if (existing) {
    const files = ok(await service.storage.from('directory-owner-logos').list(existing.id))
    if (files.length) ok(await service.storage.from('directory-owner-logos').remove(files.map((file) => `${existing.id}/${file.name}`)))
    ok(await service.auth.admin.deleteUser(existing.id))
  }
  const user = ok(await service.auth.admin.createUser({ email, password, email_confirm: true })).user
  const client = make()
  ok(await client.auth.signInWithPassword({ email, password }))
  users[role] = { client, user }
}
const owner = users.owner.client,
  other = users.other.client,
  reviewer = users.reviewer.client
ok(await service.from('directory_admins').insert({ user_id: users.reviewer.user.id }))
const payload = {
  title: 'Roam House',
  description: 'A community coliving home for remote workers in Madeira, with shared workspaces and weekly local events.',
  category: 'Coliving',
  location: 'Funchal, Portugal',
  website: 'https://example.com/',
  special_offer: '10% off your first month. Ask for the Nomad community offer.',
  image: '',
}
const claim = 'workspace-test-legacy'
ok(await service.from('directory_legacy_claims').upsert({ legacy_id: claim, contact_email: users.owner.user.email, payload, published: true }))
for (const table of ['directory_admins', 'directory_legacy_claims', 'directory_managed_listings', 'directory_owner_posts']) denied(await anon.from(table).select('*'))
denied(await other.from('directory_legacy_claims').select('*'))
denied(await anon.rpc('directory_claim_listing', { p_legacy_id: claim }))
denied(await other.rpc('directory_claim_listing', { p_legacy_id: claim }))
const id = ok(await owner.rpc('directory_claim_listing', { p_legacy_id: claim }))
assert.equal(ok(await owner.rpc('directory_claim_listing', { p_legacy_id: claim })), id)
assert.equal(ok(await other.from('directory_managed_listings').select('*')).length, 0)
denied(await owner.from('directory_managed_listings').update({ status: 'approved' }).eq('id', id))
denied(await other.rpc('directory_save_listing', { p_id: id, p_payload: payload, p_submit: true, p_version: 1 }))
const publicListings = async () => ok(await anon.rpc('directory_public_listings'))
assert.equal((await publicListings()).find((row) => row.id === claim).payload.title, 'Roam House')
const getListing = async () => ok(await owner.from('directory_managed_listings').select('*').eq('id', id).single())
const edit = { ...payload, title: 'Roam House Madeira' }
ok(await owner.rpc('directory_save_listing', { p_id: id, p_payload: edit, p_submit: false, p_version: 1 }))
assert.equal((await publicListings()).find((row) => row.id === claim).payload.title, 'Roam House')
denied(await owner.rpc('directory_save_listing', { p_id: id, p_payload: edit, p_submit: true, p_version: 1 }))
ok(await owner.rpc('directory_save_listing', { p_id: id, p_payload: edit, p_submit: true, p_version: 2 }))
denied(await owner.rpc('directory_review', { p_kind: 'listing', p_id: id, p_approve: true, p_notes: '', p_version: 3 }))
ok(await reviewer.rpc('directory_review', { p_kind: 'listing', p_id: id, p_approve: true, p_notes: '', p_version: 3 }))
assert.equal((await publicListings()).find((row) => row.id === claim).payload.title, edit.title)
const rejected = { ...edit, description: 'A changed description submitted for editorial review.' }
ok(await owner.rpc('directory_save_listing', { p_id: id, p_payload: rejected, p_submit: true, p_version: 4 }))
ok(await reviewer.rpc('directory_review', { p_kind: 'listing', p_id: id, p_approve: false, p_notes: 'Please add practical details about the workspace.', p_version: 5 }))
assert.equal((await getListing()).review_notes, 'Please add practical details about the workspace.')
assert.equal((await publicListings()).find((row) => row.id === claim).payload.description, edit.description)
const post = ok(
  await owner.rpc('directory_save_post', {
    p_id: null,
    p_listing_id: id,
    p_kind: 'update',
    p_payload: {
      title: 'Our new workspace is open',
      body: 'We have opened a quiet workspace with ocean views, standing desks and a weekly community lunch.',
      url: 'https://example.com/workspace/',
    },
    p_submit: true,
    p_version: 0,
  }),
)
assert(!ok(await anon.rpc('directory_public_updates')).some((row) => row.id === post))
denied(
  await other.rpc('directory_save_post', {
    p_id: null,
    p_listing_id: id,
    p_kind: 'update',
    p_payload: { title: 'Invalid', body: 'This owner cannot post to someone else’s listing.' },
    p_submit: true,
  }),
)
ok(await reviewer.rpc('directory_review', { p_kind: 'update', p_id: post, p_approve: true, p_notes: '', p_version: 1 }))
assert(ok(await anon.rpc('directory_public_updates')).some((row) => row.id === post))
const affiliate = ok(
  await owner.rpc('directory_save_post', {
    p_id: null,
    p_listing_id: id,
    p_kind: 'affiliate',
    p_payload: {
      program_url: 'https://example.com/partners/',
      network: 'Direct partnership',
      commission: '10% of the first completed booking',
      cookie_window: '30 days',
      countries: 'Worldwide',
      terms: 'Commission is payable after the guest completes their stay. Cancellations and refunds are excluded.',
      contact_email: 'partnerships@example.test',
    },
    p_submit: true,
    p_version: 0,
  }),
)
ok(
  await reviewer.rpc('directory_review', { p_kind: 'affiliate', p_id: affiliate, p_approve: true, p_notes: 'Thanks. We will contact you to agree the partnership.', p_version: 1 }),
)
assert(!ok(await anon.rpc('directory_public_updates')).some((row) => row.id === affiliate))
assert(!JSON.stringify(await publicListings()).includes('partnerships@example.test'))
assert.equal(ok(await other.from('directory_owner_posts').select('*')).length, 0)
denied(await other.rpc('directory_withdraw_post', { p_id: post }))
ok(await owner.rpc('directory_withdraw_post', { p_id: post }))
assert(!ok(await anon.rpc('directory_public_updates')).some((row) => row.id === post))
// Republish fixture for the real UI screenshots.
const withdrawn = ok(await owner.from('directory_owner_posts').select('*').eq('id', post).single())
ok(await owner.rpc('directory_save_post', { p_id: post, p_listing_id: id, p_kind: 'update', p_payload: withdrawn.draft, p_submit: true, p_version: withdrawn.version }))
ok(await reviewer.rpc('directory_review', { p_kind: 'update', p_id: post, p_approve: true, p_notes: '', p_version: withdrawn.version + 1 }))
const logo = await readFile('public/images/directory-logos/68571d8b0219410eefd42e23.webp').catch(async () => {
  const files = JSON.parse(await readFile('src/utils/directory-logo-files.json'))
  return readFile(`public/images/directory-logos/${files[0]}`)
})
denied(await other.storage.from('directory-owner-logos').upload(`${users.owner.user.id}/bad.webp`, logo, { contentType: 'image/webp' }))
const logoPath = `${users.owner.user.id}/${crypto.randomUUID()}.webp`
ok(await owner.storage.from('directory-owner-logos').upload(logoPath, logo, { contentType: 'image/webp' }))
denied(await owner.storage.from('directory-owner-logos').upload(logoPath, logo, { contentType: 'image/webp', upsert: true }))
denied(await owner.storage.from('directory-owner-logos').upload(`${users.owner.user.id}/bad.png`, logo, { contentType: 'image/png' }))
ok(await owner.rpc('directory_save_listing', { p_id: id, p_payload: { ...edit, image: `storage://${logoPath}` }, p_submit: true, p_version: (await getListing()).version }))
const pendingVersion = (await getListing()).version
ok(await reviewer.rpc('directory_review', { p_kind: 'listing', p_id: id, p_approve: true, p_notes: '', p_version: pendingVersion }))
// One live entry, one draft, and pending changes give meaningful management screenshots.
ok(
  await owner.rpc('directory_save_listing', {
    p_id: null,
    p_payload: {
      ...payload,
      title: 'Roam Weekends',
      category: 'Events',
      description: 'Small group weekend adventures for remote workers who want to discover Madeira and meet their community.',
    },
    p_submit: false,
    p_version: 0,
  }),
)
ok(
  await owner.rpc('directory_save_listing', {
    p_id: id,
    p_payload: { ...(await getListing()).draft, special_offer: '10% off your first month, plus a free community dinner.' },
    p_submit: true,
    p_version: (await getListing()).version,
  }),
)
const fixture = { listingId: id, postId: post, affiliateId: affiliate, accounts: {} }
for (const role of ['owner', 'reviewer']) {
  const link = ok(await service.auth.admin.generateLink({ type: 'magiclink', email: users[role].user.email }))
  fixture.accounts[role] = { email: users[role].user.email, callback: `/auth/callback/?token_hash=${link.properties.hashed_token}&type=magiclink` }
}
await writeFile('/tmp/nomad-owner-fixtures.json', JSON.stringify(fixture), { mode: 0o600 })
console.log(
  'PASS: verified claims, RLS isolation, write restrictions, review permissions, draft/live versions, optimistic concurrency, review feedback, publication, withdrawal, private affiliates, and immutable owner-only WebP storage. Local screenshot fixtures ready.',
)
