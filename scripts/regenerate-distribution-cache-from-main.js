import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const REQUIRED_FIELDS = [
  'id', 'title', 'link', 'image', 'images', 'sf4ad525dd', 'sb685ab800',
  'scea90e502', 'description_markdown', 's5576966ee', 'sb788c266b',
  'sed1a49986', 's2d652f699', 's43a4b2808', 's9744d6c51', 's9c0ff01ed',
  's4ad525dd', 'sc584fdf36', 'first_created', 'last_updated',
  'sd6842e687', 's16e7a9d78', 'sfca9050a8', 'sd07d77f5e', 'styrldtq', 's5716bab58',
]

function stripUnusedFields(record) {
  const stripped = {}
  for (const field of REQUIRED_FIELDS) {
    if (field in record) {
      stripped[field] = record[field]
    }
  }
  return stripped
}

function shouldKeepRecord(record) {
  const hasTitle = !!record.title
  const hasDistributionFlag = record.s43a4b2808 === true
  const isColiving = record.sb685ab800?.label?.toLowerCase() === 'coliving'
  
  // Keep if: (title AND distribution flag) OR (title AND coliving)
  return hasTitle && (hasDistributionFlag || isColiving)
}

const cachePath = path.resolve(process.cwd(), 'src/utils/nomad_cache_table_68614a111208586bd05d3c3a.json')
const cache = JSON.parse(readFileSync(cachePath, 'utf-8'))

console.log(`Original: ${cache.records.length} records`)

const filteredRecords = cache.records.filter(shouldKeepRecord)
console.log(`After filter: ${filteredRecords.length} records`)

const distCount = filteredRecords.filter(r => r.s43a4b2808).length
const colivingCount = filteredRecords.filter(r => r.sb685ab800?.label?.toLowerCase() === 'coliving').length
console.log(`  → ${distCount} with distribution flag`)
console.log(`  → ${colivingCount} coliving`)

const strippedRecords = filteredRecords.map(stripUnusedFields)

const output = { records: strippedRecords }
writeFileSync(cachePath, JSON.stringify(output, null, 0), 'utf-8')

const sizeMB = (JSON.stringify(output).length / 1024 / 1024).toFixed(2)
console.log(`\nNew cache size: ${sizeMB} MB`)
console.log(`Kept ${REQUIRED_FIELDS.length} fields per record`)
