import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { convertAllSmartDocFields } from './smartdoc-converter.js'

const SMART_SUITE_APIKEY = process.env.SMART_SUITE_APIKEY
const SMART_SUITE_ACCOUNT_ID = process.env.SMART_SUITE_ACCOUNT_ID
const SMART_SUITE_TABLE_ID_COMPANY = process.env.SMART_SUITE_TABLE_ID_COMPANY
const RECORD_ID = process.env.RECORD_ID
const REPORT_ID = process.env.REPORT_ID

const CACHE_PATH = (suffix = '') => path.resolve(process.cwd(), `src/utils/nomad_cache_table_${suffix}.json`)

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

async function updateSingleRecord(recordId, reportId) {
  console.log(`Updating record: ${recordId} for report: ${reportId}`)

  // Fetch the single record
  const record = await fetchSingleRecord(recordId)

  // Convert all SmartDoc fields to Markdown
  try {
    const convertedFields = convertAllSmartDocFields(record)
    Object.assign(record, convertedFields)
    
    if (Object.keys(convertedFields).length > 0) {
      console.log(`Converted ${Object.keys(convertedFields).length} SmartDoc fields to Markdown for record ${recordId}`)
    }
  } catch (error) {
    console.error(`Error converting SmartDoc fields to Markdown for record ${recordId}:`, error)
    // Keep original fields as fallback
  }

  // Fetch images if available
  const imageHandles = record.sc584fdf36 || []
  if (imageHandles.length > 0) {
    // Fetch all images, handling individual failures gracefully
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
          // Continue processing other images
        }
      }
    }
    
    // Set the first image as the main image and all images in the images array
    if (imageUrls.length > 0) {
      record.image = imageUrls[0] // Keep first image in main image field
      record.images = imageUrls   // Store all images in images array
    }
  }

  // Update global cache
  const globalCachePath = CACHE_PATH('global')
  let globalCache = { items: [] }

  if (existsSync(globalCachePath)) {
    const existingGlobalCache = readFileSync(globalCachePath, 'utf-8')
    globalCache = JSON.parse(existingGlobalCache)
  }

  // Update or add record in global cache
  const existingIndex = globalCache.items.findIndex((item) => item.id === recordId)
  if (existingIndex !== -1) {
    globalCache.items[existingIndex] = record
  } else {
    globalCache.items.push(record)
  }

  writeFileSync(globalCachePath, JSON.stringify(globalCache, null, 0), 'utf-8')
  console.log('Updated global cache')

  // Update report cache
  const reportCachePath = CACHE_PATH(reportId)
  let reportCache = { records: [] }

  if (existsSync(reportCachePath)) {
    const existingReportCache = readFileSync(reportCachePath, 'utf-8')
    reportCache = JSON.parse(existingReportCache)
  }

  // Update or add record in report cache
  const existingReportIndex = reportCache.records.findIndex((item) => item.id === recordId)
  if (existingReportIndex !== -1) {
    reportCache.records[existingReportIndex] = record
  } else {
    reportCache.records.push(record)
  }

  writeFileSync(reportCachePath, JSON.stringify(reportCache, null, 0), 'utf-8')
  console.log('Updated report cache')
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
