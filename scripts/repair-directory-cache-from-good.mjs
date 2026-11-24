#!/usr/bin/env node
// Repair published directory cache fields from last good CI snapshot (6d46fb6).
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { normalizeRecordCategoryField } from './directory-category-field.js'

const CACHE_PATH = path.resolve('src/utils/nomad_cache_table_6857167d82358a0f5e038c3f.json')
const LATEST_PATH = path.resolve('src/utils/latest_directory_listings.json')
const GOOD_REF = process.env.GOOD_CACHE_REF || '6d46fb6:src/utils/nomad_cache_table_6857167d82358a0f5e038c3f.json'

const RESTORE_FIELDS = [
  'sb685ab800',
  'sed1a49986',
  's2d652f699',
  'description_markdown',
  's43a4b2808',
  'sfca9050a8',
  's9744d6c51',
  's9c0ff01ed',
]

function isEmpty(value, field) {
  if (value === undefined || value === null) return true
  if (field === 'sb685ab800') {
    if (typeof value === 'string') return true
    if (typeof value === 'object' && !value?.label) return true
    return false
  }
  if (typeof value === 'boolean') return false
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

function directoryLogoUrlFor(title, imageUrl) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return imageUrl && imageUrl !== '/logo.svg' ? imageUrl : `/nomad-directory-logos/${slug}.svg`
}

const good = JSON.parse(execSync(`git show ${GOOD_REF}`, { encoding: 'utf8', maxBuffer: 80 * 1024 * 1024 }))
const goodById = new Map(good.records.filter((r) => r.sf4ad525dd).map((r) => [r.id, r]))

const cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
let restored = 0

for (const record of cache.records) {
  if (record.sf4ad525dd !== true) continue
  const source = goodById.get(record.id)
  if (!source) continue

  for (const field of RESTORE_FIELDS) {
    if (!(field in source)) continue
    if (!isEmpty(record[field], field)) continue
    if (isEmpty(source[field], field)) continue
    record[field] = source[field]
    restored += 1
  }
  normalizeRecordCategoryField(record)
}

writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 0)}\n`, 'utf8')

const latest = cache.records
  .filter((r) => r.sf4ad525dd && r.title)
  .sort((a, b) => {
    const aTime = a.last_updated?.on || a.first_created?.on || ''
    const bTime = b.last_updated?.on || b.first_created?.on || ''
    return bTime.localeCompare(aTime)
  })
  .slice(0, 4)
  .map((r) => ({
    title: r.title,
    category: r.sb685ab800?.label || '',
    image: directoryLogoUrlFor(r.title, r.image),
  }))

writeFileSync(LATEST_PATH, `${JSON.stringify(latest, null, 2)}\n`, 'utf8')
console.log(`Restored ${restored} field values on published records from ${GOOD_REF}`)