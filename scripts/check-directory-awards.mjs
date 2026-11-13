// Resets award fixtures ONLY in an isolated local Supabase project; never use production.
// SUPABASE_TEST_CONFIG=/tmp/local-keys.json DIRECTORY_TEST_DB_CONTAINER=supabase_db_project node scripts/check-directory-awards.mjs
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
const keys=JSON.parse(await readFile(process.env.SUPABASE_TEST_CONFIG,'utf8'))
assert(['localhost','127.0.0.1'].includes(new URL(keys.API_URL).hostname),'Local Supabase only')
const container=process.env.DIRECTORY_TEST_DB_CONTAINER || 'supabase_db_nomad-directory-pr18'
assert(container.startsWith('supabase_db_'))
const make=(key=keys.ANON_KEY)=>createClient(keys.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false}})
const service=make(keys.SERVICE_ROLE_KEY),anon=make(),accounts=[]
const ok=({data,error})=>{assert.ifError(error);return data}
const denied=result=>assert(result.error,'Expected permission denial')
const sql=input=>execFileSync('docker',['exec','-i',container,'psql','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres','-At'],{input,encoding:'utf8'})
for(const role of ['owner','other','reviewer',...Array.from({length:7},(_,i)=>`voter-${i}`)]) {
 const email=`awards-${role}@example.test`,old=ok(await service.auth.admin.listUsers({perPage:1000})).users.find(u=>u.email===email)
 if(old)ok(await service.auth.admin.deleteUser(old.id))
 const password=`Local-${crypto.randomUUID()}`,user=ok(await service.auth.admin.createUser({email,password,email_confirm:true})).user,client=make()
 ok(await client.auth.signInWithPassword({email,password}));accounts.push({role,user,client})
}
const [owner,other,reviewer,...voters]=accounts
ok(await service.from('directory_admins').insert({user_id:reviewer.user.id}))
const listing=async(account,title)=>{
 const id=ok(await account.client.rpc('directory_save_listing',{p_id:null,p_payload:{title,description:'A community-led coliving home with shared workspaces and local experiences for digital nomads.',website:'https://example.com/',category:'Coliving',location:'Portugal',special_offer:'',image:''},p_submit:true,p_version:0}))
 ok(await reviewer.client.rpc('directory_review',{p_kind:'listing',p_id:id,p_approve:true,p_notes:'',p_version:1}));return id
}
const grove=await listing(owner,'Nomad Grove'),atlas=await listing(other,'Atlas House')
for(let i=0;i<6;i++) ok(await voters[i].client.rpc('directory_set_vote',{p_listing_id:i===4?atlas:grove,p_voted:true}))
// Re-voting preserves first receipt and creates a separate active interval.
const original=ok(await service.from('directory_vote_history').select('*').eq('user_id',voters[0].user.id).eq('listing_id',grove).single())
ok(await voters[0].client.rpc('directory_set_vote',{p_listing_id:grove,p_voted:false}));ok(await voters[0].client.rpc('directory_set_vote',{p_listing_id:grove,p_voted:true}))
const readded=ok(await service.from('directory_vote_history').select('*').eq('user_id',voters[0].user.id).eq('listing_id',grove).single())
assert.equal(readded.first_voted_at,original.first_voted_at)
assert.equal(ok(await service.from('directory_vote_intervals').select('*').eq('history_id',original.id)).length,2)
// Account deletion closes and anonymizes history without retaining its auth identity.
ok(await voters[6].client.rpc('directory_set_vote',{p_listing_id:atlas,p_voted:true}))
const removedHistory=ok(await service.from('directory_vote_history').select('*').eq('user_id',voters[6].user.id).single())
ok(await service.auth.admin.deleteUser(voters[6].user.id))
assert.equal(ok(await service.from('directory_vote_history').select('*').eq('id',removedHistory.id).single()).user_id,null)
assert(ok(await service.from('directory_vote_intervals').select('*').eq('history_id',removedHistory.id)).every(i=>i.ended_at))
for(const table of ['directory_awards','directory_award_periods','directory_vote_history','directory_vote_intervals','directory_award_settings']) {
 denied(await anon.from(table).select('*'));denied(await owner.client.from(table).select('*'))
}
denied(await anon.rpc('directory_finalize_awards'));denied(await owner.client.rpc('directory_finalize_awards'))
denied(await owner.client.from('directory_awards').insert({listing_id:grove,vote_count:999999}))
denied(await owner.client.from('directory_vote_history').update({first_voted_at:'2000-01-01'}).eq('user_id',owner.user.id))
const dates=["date_trunc('year',now())-interval '15 days'","date_trunc('month',now())-interval '15 days'","date_trunc('week',now())-interval '3 days'","date_trunc('day',now())-interval '12 hours'","date_trunc('day',now())-interval '12 hours'","now()"]
// Simulate completed periods with real account votes. This is local test data, not production popularity.
const updates=voters.slice(0,6).map((v,i)=>`update public.directory_vote_history set first_voted_at=${dates[i]} where user_id='${v.user.id}';`).join('\n')
sql(`begin; set local timezone='UTC'; select pg_advisory_xact_lock(hashtextextended('directory-awards-ledger',0));
 do $$begin if not exists(select 1 from auth.users where id='${owner.user.id}') then raise exception 'Wrong test database'; end if; end;$$;
 delete from public.directory_awards; delete from public.directory_award_periods;
 update public.directory_award_settings set starts_at=date_trunc('year',now())-interval '1 year';
 ${updates}
 delete from public.directory_vote_intervals where history_id in (select id from public.directory_vote_history where user_id in (${voters.slice(0,6).map(v=>`'${v.user.id}'`).join(',')}));
 insert into public.directory_vote_intervals(history_id,started_at) select id,first_voted_at from public.directory_vote_history where user_id in (${voters.slice(0,6).map(v=>`'${v.user.id}'`).join(',')});
 select public.directory_finalize_awards(); commit;`)
const all=ok(await anon.rpc('directory_public_awards',{p_limit:1000})),own=all.filter(a=>a.listing_id===grove)
for(const kind of ['day','week','month','year'])assert(own.some(a=>a.kind===kind),`Missing ${kind} winner`)
const latestDay=own.find(a=>a.kind==='day');assert.equal(latestDay.tied_winners,2)
const countBefore=all.length
for(const result of await Promise.all([service.rpc('directory_finalize_awards'),service.rpc('directory_finalize_awards'),voters[5].client.rpc('directory_set_vote',{p_listing_id:grove,p_voted:true})]))ok(result)
assert.equal(ok(await anon.rpc('directory_public_awards',{p_limit:1000})).length,countBefore)
const before=ok(await anon.rpc('directory_public_awards',{p_award_id:latestDay.id}))[0]
ok(await voters[3].client.rpc('directory_set_vote',{p_listing_id:grove,p_voted:false}))
assert.deepEqual(ok(await anon.rpc('directory_public_awards',{p_award_id:latestDay.id}))[0],before)
ok(await voters[3].client.rpc('directory_set_vote',{p_listing_id:grove,p_voted:true}))
assert.equal(ok(await anon.rpc('directory_award_leaderboard',{p_kind:'day'})).find(l=>l.listing_id===grove).vote_count,1)
const revoked=own.filter(a=>a.kind==='day').at(-1)
denied(await owner.client.rpc('directory_revoke_award',{p_id:revoked.id,p_reason:'Unauthorized withdrawal'}))
ok(await reviewer.client.rpc('directory_revoke_award',{p_id:revoked.id,p_reason:'Private fixture moderation reason'}))
assert(!ok(await anon.rpc('directory_public_awards',{p_limit:1000})).some(a=>a.id===revoked.id))
const withdrawn=ok(await anon.rpc('directory_public_awards',{p_award_id:revoked.id}))[0]
assert(withdrawn.revoked_at);assert(!JSON.stringify(withdrawn).includes('Private fixture moderation reason'))
assert(all.every(a=>!Object.keys(a).some(k=>/user|email|reason/.test(k))))
const job=sql("select schedule||'|'||command||'|'||active::text from cron.job where jobname='nomad-directory-awards';").trim()
assert.equal(job,'5 0 * * *|select public.directory_finalize_awards();|true')
const tokens={}
for(const account of [owner,other,reviewer])tokens[account.role]=ok(await service.auth.admin.generateLink({type:'magiclink',email:account.user.email})).properties.hashed_token
await writeFile('/tmp/nomad-award-fixtures.json',JSON.stringify({grove,atlas,tokens,awards:own.filter(a=>a.id!==revoked.id),revoked:revoked.id}),{mode:0o600})
console.log('PASS: scheduled job, period winners/ties, immutable results, concurrent finalization, re-vote history, account anonymization, RLS, owner minting denial, reviewer-only withdrawal and private moderation reasons. Local award fixtures ready.')
