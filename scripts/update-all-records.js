import { writeFileSync } from 'node:fs'
import path from 'node:path'

const SMART_SUITE_APIKEY = process.env.SMART_SUITE_APIKEY
const SMART_SUITE_ACCOUNT_ID = process.env.SMART_SUITE_ACCOUNT_ID
const SMART_SUITE_TABLE_ID_COMPANY = process.env.SMART_SUITE_TABLE_ID_COMPANY
const REPORT_ID = process.env.REPORT_ID

const CACHE_PATH = (suffix = '') => path.resolve(process.cwd(), `src/utils/nomad_cache_table_${suffix}.json`)

async function fetchWithRetry(fn, retries = 3, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (e) {
      if (i === retries - 1) throw e
      await new Promise((res) => setTimeout(res, delay))
    }
  }
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

async function fetchGlobalCache() {
  console.log('Fetching global cache...')

  const response = await fetch(`https://app.smartsuite.com/api/v1/applications/${SMART_SUITE_TABLE_ID_COMPANY}/records/list/?all=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ACCOUNT-ID': SMART_SUITE_ACCOUNT_ID,
      Authorization: `Token ${SMART_SUITE_APIKEY}`,
    },
    body: JSON.stringify({
      sort: [],
      filter: {},
      hydrated: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`SmartSuite API error: ${response.status} ${response.statusText}`)
  }

  const responseJSON = await response.json()
  writeFileSync(CACHE_PATH('global'), JSON.stringify(responseJSON, null, 0), 'utf-8')
  console.log('Updated global cache')

  return responseJSON
}

async function fetchReportRecords(globalCacheJSON, reportId) {
  console.log(`Fetching report records for ${reportId}...`)

  const response = await fetch(`https://app.smartsuite.com/api/v1/applications/${SMART_SUITE_TABLE_ID_COMPANY}/records-for-report/?report=${reportId}&with_empty_values=false`, {
    headers: {
      'ACCOUNT-ID': SMART_SUITE_ACCOUNT_ID,
      Authorization: `Token ${SMART_SUITE_APIKEY}`,
    },
  })

  if (!response.ok) {
    throw new Error(`SmartSuite API error: ${response.status} ${response.statusText}`)
  }

  const responseJSON = await response.json()

  // Merge with global cache data
  responseJSON.records.forEach((record, idx) => {
    if (record.id) {
      const recordFromGlobalCache = globalCacheJSON.items.find((item) => item.id === record.id)
      if (recordFromGlobalCache) {
        responseJSON.records[idx] = recordFromGlobalCache
      }
    }
  })

  // Fetch images in parallel for all records
  if (responseJSON.records) {
    console.log('Fetching images for records...')
    await Promise.all(
      responseJSON.records.map(async (record) => {
        const handle = record.sc584fdf36?.[0]?.handle
        if (handle) {
          try {
            const imageUrl = await fetchWithRetry(() => fetchImageUrlFromHandle(handle))
            if (imageUrl) record.image = imageUrl
          } catch (error) {
            console.error(`Error fetching image for record ${record.id}:`, error)
          }
        }
      }),
    )
  }

  writeFileSync(CACHE_PATH(reportId), JSON.stringify(responseJSON, null, 0), 'utf-8')
  console.log('Updated report cache')

  return responseJSON
}

async function updateAllRecords(reportId) {
  console.log(`Starting full cache update for report ${reportId}...`)

  // Fetch global cache first
  const globalCacheJSON = await fetchGlobalCache()

  // Fetch and update report records
  await fetchReportRecords(globalCacheJSON, reportId)

  console.log('Successfully updated all records in cache')
}

if (!SMART_SUITE_APIKEY || !SMART_SUITE_ACCOUNT_ID || !SMART_SUITE_TABLE_ID_COMPANY || !REPORT_ID) {
  console.error('Error: Missing required environment variables')
  process.exit(1)
}

updateAllRecords(REPORT_ID).catch((error) => {
  console.error('Error updating all records:', error)
  process.exit(1)
})
