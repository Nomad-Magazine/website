import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
// Exercise the actual pure badge helpers without the Cloudflare-only public data transport.
const source=await readFile('src/utils/directory-awards.ts','utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const sandbox={exports:{},require(name){assert.equal(name,'./directory-public');return {readPublicDirectory(){throw new Error('No network in markup checks')}}}}
vm.runInNewContext(compiled,sandbox)
const {awardBadgeSvg,badgeEmbed,awardPeriodLabel,validAwardId}=sandbox.exports
const award={id:'11111111-2222-3333-4444-555555555555',listing_id:'demo',listing_title:'"><script>alert(1)</script> & <img onerror="bad">',vote_count:7,tied_winners:2,kind:'week',starts_at:'2025-12-29T00:00:00Z',ends_at:'2026-01-05T00:00:00Z',finalized_at:'2026-01-05T00:05:00Z',revoked_at:null}
const svg=awardBadgeSvg(award),embed=badgeEmbed(award)
assert(!svg.includes('<script')&&!svg.includes('<img'))
assert(svg.includes('&lt;script&gt;')&&svg.includes('&amp;'))
assert(!embed.includes('<script')&&!embed.includes(' onerror="bad"'))
assert(embed.includes('&quot;')&&embed.includes('&lt;img'))
assert(embed.includes('/badge.svg/"')&&embed.includes('rel="noopener noreferrer"'))
assert.equal(badgeEmbed({...award,revoked_at:'2026-01-06T00:00:00Z'}),'')
assert.equal(awardPeriodLabel('week',award.starts_at),'Week of 29 Dec 2025')
assert.equal(awardPeriodLabel('month','2024-02-29T23:59:59Z'),'February 2024')
assert(!validAwardId('../forged')&&!validAwardId('not-an-award'))
assert(!awardBadgeSvg({...award,listing_title:'A\u0001B'}).includes('\u0001'))
console.log('PASS: SVG/HTML escaping, no executable business-name markup, canonical embed paths, revoked badge refusal, UTC labels and invalid ID rejection.')
