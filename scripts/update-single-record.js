import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { convertAllSmartDocFields } from './smartdoc-converter.js'

const SMART_SUITE_APIKEY = process.env.SMART_SUITE_APIKEY
const SMART_SUITE_ACCOUNT_ID = process.env.SMART_SUITE_ACCOUNT_ID
const SMART_SUITE_TABLE_ID_COMPANY = process.env.SMART_SUITE_TABLE_ID_COMPANY
const RECORD_ID = process.env.RECORD_ID
const REPORT_ID = process.env.REPORT_ID

// Fields actually used by pages and scripts
const REQUIRED_FIELDS = [
  'id', 'title', 'link', 'image', 'images', 'sf4ad525dd', 'sb685ab800',
  'scea90e502', 'description_markdown', 's5576966ee', 'sb788c266b',
  'sed1a49986', 's2d652f699', 's43a4b2808', 's9744d6c51', 's9c0ff01ed',
  's4ad525dd', 'sc584fdf36', 'first_created', 'last_updated',
  'sd6842e687', 's16e7a9d78', 'sfca9050a8',
]

const CACHE_PATH = (suffix = '') => path.resolve(process.cwd(), `src/utils/nomad_cache_table_${suffix}.json`)

function stripUnusedFields(record) {
  const stripped = {}
  for (const field of REQUIRED_FIELDS) {
    if (field in record) {
      stripped[field] = record[field]
    }
  }
  return stripped
}

function directoryLogoUrlFor(title, imageUrl) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const localPath = `/nomad-directory-logos/${slug}.svg`
  return imageUrl || localPath
}

async function fetchSingleRecord(recordId) {
  const response = await fetch(`https://app.smartsuite.com/api/v1/applications/${SMART_SUITE_TABLE_ID_COMPANY}/records/${recordId}/`, {
    headers: {
      'ACCOUNT-ID': SMART_SUITE_ACCOUNT_ID,
      Authorization: `Token ${SMART_SUITE_APIKEY}`,
    },
  })

  if (!response.ok) {
    throw new Error(`SmartSuite API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

async function fetchImageUrlFromHandle(handle) {
  if (!handle) return undefined

  const response = await fetch(`https://app.smartsuite.com/api/v1/shared-files/${handle}/url/`, {
    headers: {
      'ACCOUNT-ID': SMART_SUITE_ACCOUNT_ID,
      authorization: `Token ${SMART_SUITE_APIKEY}`,
    },
  })

  if (!response.ok) {
    console.error(`Error fetching image for handle ${handle}:`, response.statusText)
    return undefined
  }

  const data = await response.json()
  return data.url
}

async function regenerateLatestListings(reportId) {
  if (reportId !== '6857167d82358a0f5e038c3f') return

  console.log('Regenerating latest_directory_listings.json...')
  const cachePath = CACHE_PATH(reportId)
  if (!existsSync(cachePath)) return

  const cache = JSON.parse(readFileSync(cachePath, 'utf-8'))
  
  const latest = cache.records
    .sort((a, b) => {
      const aTime = a.last_updated?.on || a.first_created?.on || ''
      const bTime = b.last_updated?.on || b.first_created?.on || ''
      return bTime.localeCompare(aTime)
    })
    .slice(0, 4)
    .map((r) => ({
      title: r.title,
      category: r.sb685ab800?.label || '',
      image: directoryLogoUrlFor(r.title, r.image && r.image !== '/logo.svg' ? r.image : ''),
    }))

  writeFileSync(
    path.resolve(process.cwd(), 'src/utils/latest_directory_listings.json'),
    JSON.stringify(latest, null, 2),
    'utf-8'
  )
  console.log('Updated latest_directory_listings.json')
}

async function updateSingleRecord(recordId, reportId) {
  console.log(`Updating record: ${recordId} for report: ${reportId}`)

  // Fetch the single record
  const record = await fetchSingleRecord(recordId)

  // Check if record is published
  const isPublished = record.sf4ad525dd

  // Convert SmartDoc fields
  try {
    const convertedFields = convertAllSmartDocFields(record)
    Object.assign(record, convertedFields)
    
    if (Object.keys(convertedFields).length > 0) {
      console.log(`Converted ${Object.keys(convertedFields).length} SmartDoc fields to Markdown for record ${recordId}`)
    }
  } catch (error) {
    console.error(`Error converting SmartDoc fields to Markdown for record ${recordId}:`, error)
  }

  // Fetch images if available
  const imageHandles = record.sc584fdf36 || []
  if (imageHandles.length > 0) {
    const imageUrls = []
    for (const imageObj of imageHandles) {
      if (imageObj?.handle) {
        try {
          const imageUrl = await fetchImageUrlFromHandle(imageObj.handle)
          if (imageUrl) {
            imageUrls.push(imageUrl)
          }
        } catch (error) {
          console.error(`Error fetching image with handle ${imageObj.handle} for record ${recordId}:`, error)
        }
      }
    }
    
    if (imageUrls.length > 0) {
      record.image = imageUrls[0]
      record.images = imageUrls
    }
  }

  // Strip to required fields
  const strippedRecord = stripUnusedFields(record)

  // Update report cache
  const reportCachePath = CACHE_PATH(reportId)
  let reportCache = { records: [] }

  if (existsSync(reportCachePath)) {
    const existingReportCache = readFileSync(reportCachePath, 'utf-8')
    reportCache = JSON.parse(existingReportCache)
  }

  const existingReportIndex = reportCache.records.findIndex((item) => item.id === recordId)

  if (isPublished) {
    // Add or update published record
    if (existingReportIndex !== -1) {
      reportCache.records[existingReportIndex] = strippedRecord
      console.log(`Updated published record ${recordId} in cache`)
    } else {
      reportCache.records.push(strippedRecord)
      console.log(`Added new published record ${recordId} to cache`)
    }
  } else {
    // Remove unpublished record from cache
    if (existingReportIndex !== -1) {
      reportCache.records.splice(existingReportIndex, 1)
      console.log(`Removed unpublished record ${recordId} from cache`)
    } else {
      console.log(`Record ${recordId} is unpublished and not in cache (no action needed)`)
    }
  }

  writeFileSync(reportCachePath, JSON.stringify(reportCache, null, 0), 'utf-8')
  console.log(`Updated report cache: ${reportCache.records.length} published records`)

  // Regenerate latest listings if this is directory cache
  await regenerateLatestListings(reportId)
}

if (!SMART_SUITE_APIKEY || !SMART_SUITE_ACCOUNT_ID || !SMART_SUITE_TABLE_ID_COMPANY || !RECORD_ID || !REPORT_ID) {
  console.error('Error: Missing required environment variables')
  process.exit(1)
}

updateSingleRecord(RECORD_ID, REPORT_ID)
  .then(() => {
    console.log('Successfully updated record in cache')
  })
  .catch((error) => {
    console.error('Error updating record:', error)
    process.exit(1)
  })
