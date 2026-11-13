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

function shouldKeepRecord(record, reportId) {
  // Directory table: keep published OR records with testimonials
  if (reportId === '6857167d82358a0f5e038c3f') {
    return record.sf4ad525dd === true || !!record.s5716bab58
  }
  
  // Distribution table: keep if ANY page would show it
  if (reportId === '68614a111208586bd05d3c3a') {
    const hasTitle = !!record.title
    const hasDistributionFlag = record.s43a4b2808 === true
    const isColiving = record.sb685ab800?.label?.toLowerCase() === 'coliving'
    const isCoworkingContest = record.sb685ab800?.label === 'Coworking' && record.styrldtq === true
    
    // Keep if: (title AND distribution flag) OR (title AND coliving) OR coworking contest
    return hasTitle && (hasDistributionFlag || isColiving) || isCoworkingContest
  }
  
  // Default: keep all
  return true
}

// Regenerate directory cache
console.log('='.repeat(80))
console.log('REGENERATING DIRECTORY CACHE (6857167d82358a0f5e038c3f)')
console.log('='.repeat(80))

const dirCache = JSON.parse(readFileSync('/tmp/dir_main.json', 'utf-8'))
console.log(`Original: ${dirCache.records.length} records`)

const dirFiltered = dirCache.records.filter(r => shouldKeepRecord(r, '6857167d82358a0f5e038c3f'))
console.log(`After filter: ${dirFiltered.length} records`)

const dirPublished = dirFiltered.filter(r => r.sf4ad525dd).length
const dirTestimonials = dirFiltered.filter(r => r.s5716bab58).length
const dirBoth = dirFiltered.filter(r => r.sf4ad525dd && r.s5716bab58).length
console.log(`  → ${dirPublished} published`)
console.log(`  → ${dirTestimonials} with testimonials`)
console.log(`  → ${dirBoth} with both`)

const dirStripped = dirFiltered.map(stripUnusedFields)
const dirOutput = { records: dirStripped }

const dirPath = path.resolve(process.cwd(), 'src/utils/nomad_cache_table_6857167d82358a0f5e038c3f.json')
writeFileSync(dirPath, JSON.stringify(dirOutput, null, 0), 'utf-8')

const dirSizeMB = (JSON.stringify(dirOutput).length / 1024 / 1024).toFixed(2)
console.log(`New cache size: ${dirSizeMB} MB`)
console.log(`Kept ${REQUIRED_FIELDS.length} fields per record`)

// Regenerate distribution cache
console.log('\n' + '='.repeat(80))
console.log('REGENERATING DISTRIBUTION CACHE (68614a111208586bd05d3c3a)')
console.log('='.repeat(80))

const distCache = JSON.parse(readFileSync('/tmp/dist_main.json', 'utf-8'))
console.log(`Original: ${distCache.records.length} records`)

const distFiltered = distCache.records.filter(r => shouldKeepRecord(r, '68614a111208586bd05d3c3a'))
console.log(`After filter: ${distFiltered.length} records`)

const distFlag = distFiltered.filter(r => r.s43a4b2808).length
const distColiving = distFiltered.filter(r => r.sb685ab800?.label?.toLowerCase() === 'coliving').length
const distContest = distFiltered.filter(r => r.sb685ab800?.label === 'Coworking' && r.styrldtq === true).length
console.log(`  → ${distFlag} with distribution flag`)
console.log(`  → ${distColiving} coliving`)
console.log(`  → ${distContest} coworking contest (styrldtq)`)

const distStripped = distFiltered.map(stripUnusedFields)
const distOutput = { records: distStripped }

const distPath = path.resolve(process.cwd(), 'src/utils/nomad_cache_table_68614a111208586bd05d3c3a.json')
writeFileSync(distPath, JSON.stringify(distOutput, null, 0), 'utf-8')

const distSizeMB = (JSON.stringify(distOutput).length / 1024 / 1024).toFixed(2)
console.log(`New cache size: ${distSizeMB} MB`)
console.log(`Kept ${REQUIRED_FIELDS.length} fields per record`)

console.log('\n' + '='.repeat(80))
console.log('✅ CACHE REGENERATION COMPLETE')
console.log('='.repeat(80))
