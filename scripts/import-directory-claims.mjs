// Import a trusted SmartSuite export into the private claim map. Dry-run by default.
import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
const input = process.argv.find((arg) => arg.startsWith('--input='))?.slice(8)
if (!input) throw new Error('Usage: node scripts/import-directory-claims.mjs --input=/private/smartsuite-export.json [--apply]')
const source = JSON.parse(await readFile(input, 'utf8'))
const records = source.records || source
const logos = new Set(JSON.parse(await readFile('src/utils/directory-logo-files.json', 'utf8')))
const rows = records.flatMap((record) => {
  const contacts = record.sd6842e687
  const email = (Array.isArray(contacts) ? contacts : [contacts]).find((value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
  if (!record.id || !record.title || !email) return []
  return [
    {
      legacy_id: String(record.id),
      contact_email: email.trim().toLowerCase(),
      published: !!record.sf4ad525dd,
      payload: {
        title: record.title,
        description: record.scea90e502 || '',
        website: record.link || record.sb788c266b?.[0] || '',
        category: record.sb685ab800?.label || 'Other',
        location: record.sed1a49986 || '',
        special_offer: record.s5576966ee || '',
        image: logos.has(`${record.id}.webp`) ? `/images/directory-logos/${record.id}.webp` : '',
      },
    },
  ]
})
console.log(`${rows.length} claimable entries; ${records.length - rows.length} without a valid contact skipped. Contact values are not logged.`)
if (process.argv.includes('--apply')) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.')
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  // Never overwrite a previously trusted contact with a later, potentially changed export.
  const { error } = await client.from('directory_legacy_claims').upsert(rows, { onConflict: 'legacy_id', ignoreDuplicates: true })
  if (error) throw new Error(`Claim import failed: ${error.message}`)
  console.log('Trusted claim mapping imported; existing mappings preserved.')
} else console.log('Dry run only. Review the source before importing with --apply.')
