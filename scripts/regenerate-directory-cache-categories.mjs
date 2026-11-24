#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { normalizeRecordCategoryField } from './directory-category-field.js'

const REPORT_ID = '6857167d82358a0f5e038c3f'
const cachePath = path.resolve('src/utils/nomad_cache_table_6857167d82358a0f5e038c3f.json')
const latestPath = path.resolve('src/utils/latest_directory_listings.json')

const cache = JSON.parse(readFileSync(cachePath, 'utf-8'))

for (const record of cache.records) {
  if (record.sf4ad525dd !== true) continue
  normalizeRecordCategoryField(record)
}

writeFileSync(cachePath, JSON.stringify(cache, null, 0), 'utf-8')

const latest = cache.records
  .filter((r) => r.sf4ad525dd === true && r.title)
  .sort((a, b) => {
    const aTime = a.last_updated?.on || a.first_created?.on || ''
    const bTime = b.last_updated?.on || b.first_created?.on || ''
    return bTime.localeCompare(aTime)
  })
  .slice(0, 4)
  .map((r) => ({
    title: r.title,
    category: r.sb685ab800?.label || '',
    image: r.image && r.image !== '/logo.svg' ? r.image : '',
  }))

writeFileSync(latestPath, `${JSON.stringify(latest, null, 2)}\n`, 'utf-8')

console.log(`Normalized category field on ${cache.records.filter((r) => r.sf4ad525dd).length} published records in ${REPORT_ID}`)