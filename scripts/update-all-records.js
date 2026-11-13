import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { convertAllSmartDocFields } from './smartdoc-converter.js'

const SMART_SUITE_APIKEY = process.env.SMART_SUITE_APIKEY ?? ''
const SMART_SUITE_ACCOUNT_ID = process.env.SMART_SUITE_ACCOUNT_ID ?? ''
const SMART_SUITE_TABLE_ID_COMPANY = process.env.SMART_SUITE_TABLE_ID_COMPANY ?? ''
const REPORT_ID = process.env.REPORT_ID ?? ''

// Fields actually used by pages and scripts
const REQUIRED_FIELDS = [
  'id', 'title', 'link', 'image', 'images', 'sf4ad525dd', 'sb685ab800',
  'scea90e502', 'description_markdown', 's5576966ee', 'sb788c266b',
  'sed1a49986', 's2d652f699', 's43a4b2808', 's9744d6c51', 's9c0ff01ed',
  's4ad525dd', 'sc584fdf36', 'first_created', 'last_updated',
  'sd6842e687', 's16e7a9d78', 'sfca9050a8', 'sd07d77f5e', 'styrldtq', 's5716bab58',
]

function shouldKeepRecord(record, reportId) {
  // Directory table: keep only published records
  if (reportId === '6857167d82358a0f5e038c3f') {
    return record.sf4ad525dd === true
  }
  
  // Distribution table: keep if ANY page would show it
  if (reportId === '68614a111208586bd05d3c3a') {
    const hasTitle = !!record.title
    const hasDistributionFlag = record.s43a4b2808 === true
    const isColiving = record.sb685ab800?.label?.toLowerCase() === 'coliving'
    
    // Keep if: (title AND distribution flag) OR (title AND coliving)
    return hasTitle && (hasDistributionFlag || isColiving)
  }
  
  // Default: keep all
  return true
}

// Dynamic rate limiting based on API headers
let rateLimitInfo = {
  limit: null,
  remaining: null,
  resetTime: null,
  retryAfter: null,
}

const CACHE_PATH = (suffix = '') => path.resolve(process.cwd(), `src/utils/nomad_cache_table_${suffix}.json`)

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseRateLimitHeaders(headers) {
  const info = {
    limit: headers.get('x-ratelimit-limit') || headers.get('ratelimit-limit'),
    remaining: headers.get('x-ratelimit-remaining') || headers.get('ratelimit-remaining'),
    reset: headers.get('x-ratelimit-reset') || headers.get('ratelimit-reset'),
    retryAfter: headers.get('retry-after'),
  }

  return {
    limit: info.limit ? parseInt(info.limit) : null,
    remaining: info.remaining ? parseInt(info.remaining) : null,
    resetTime: info.reset ? parseInt(info.reset) * 1000 : null, // Convert to ms
    retryAfter: info.retryAfter ? parseInt(info.retryAfter) * 1000 : null, // Convert to ms
  }
}

async function waitForRateLimit() {
  if (!rateLimitInfo.remaining || rateLimitInfo.remaining > 5) {
    return // Plenty of requests left
  }

  if (rateLimitInfo.retryAfter) {
    console.log(`Rate limited, waiting ${rateLimitInfo.retryAfter}ms...`)
    await sleep(rateLimitInfo.retryAfter)
    return
  }

  if (rateLimitInfo.resetTime) {
    const waitTime = rateLimitInfo.resetTime - Date.now()
    if (waitTime > 0) {
      console.log(`Rate limit low (${rateLimitInfo.remaining} remaining), waiting ${waitTime}ms for reset...`)
      await sleep(waitTime)
    }
    return
  }

  // Fallback: small delay when approaching limits
  if (rateLimitInfo.remaining <= 10) {
    const delay = Math.max(100, (11 - rateLimitInfo.remaining) * 200)
    console.log(`Rate limit low (${rateLimitInfo.remaining} remaining), waiting ${delay}ms...`)
    await sleep(delay)
  }
}

async function fetchWithRetry(fn, retries = 3, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      await waitForRateLimit()
      const response = await fn()

      // Update rate limit info from response headers
      if (response && response.headers) {
        const newRateLimit = parseRateLimitHeaders(response.headers)
        rateLimitInfo = { ...rateLimitInfo, ...newRateLimit }

        if (rateLimitInfo.remaining !== null) {
          console.log(`Rate limit: ${rateLimitInfo.remaining}/${rateLimitInfo.limit} remaining`)
        }
      }

      return response
    } catch (e) {
      if (i === retries - 1) throw e

      // Handle 429 Too Many Requests
      if (e.status === 429) {
        const retryAfter = e.headers?.get('retry-after')
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay * (i + 1) * 2
        console.log(`429 Too Many Requests, waiting ${waitTime}ms...`)
        await sleep(waitTime)
      } else {
        await sleep(delay * (i + 1)) // Exponential backoff
      }
    }
  }
}

async function processBatch(items, processor, maxConcurrency = 10) {
  const results = []
  let concurrency = Math.min(maxConcurrency, items.length)

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    console.log(`Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(items.length / concurrency)} (${batch.length} items)`)

    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)

    // Dynamically adjust concurrency based on rate limit
    if (rateLimitInfo.remaining !== null) {
      if (rateLimitInfo.remaining < 20) {
        concurrency = Math.max(1, Math.floor(concurrency / 2))
        console.log(`Reducing concurrency to ${concurrency} due to low rate limit`)
      } else if (rateLimitInfo.remaining > 100 && concurrency < maxConcurrency) {
        concurrency = Math.min(maxConcurrency, concurrency * 2)
        console.log(`Increasing concurrency to ${concurrency}`)
      }
    }
  }

  return results
}

async function fetchImageUrlFromHandle(handle) {
  if (!handle) return undefined

  const response = await fetchWithRetry(async () => {
    const res = await fetch(`https://app.smartsuite.com/api/v1/shared-files/${handle}/url/`, {
      headers: {
        'ACCOUNT-ID': SMART_SUITE_ACCOUNT_ID,
        authorization: `Token ${SMART_SUITE_APIKEY}`,
      },
    })

    if (!res.ok) {
      if (res.status === 429) {
        const error = new Error(`Rate limited: ${res.statusText}`)
        error.status = 429
        error.headers = res.headers
        throw error
      }
      console.error(`Error fetching image for handle ${handle}:`, res.statusText)
      return undefined
    }

    return res
  })

  if (!response) return undefined

  const data = await response.json()
  return data.url
}

function stripUnusedFields(record) {
  const stripped = {}
  for (const field of REQUIRED_FIELDS) {
    if (field in record) {
      stripped[field] = record[field]
    }
  }
  return stripped
}

async function fetchReportRecords(reportId) {
  console.log(`Fetching records for report ${reportId}...`)

  const response = await fetchWithRetry(async () => {
    const res = await fetch(
      `https://app.smartsuite.com/api/v1/applications/${SMART_SUITE_TABLE_ID_COMPANY}/records-for-report/?report=${reportId}&with_empty_values=false`,
      {
        headers: {
          'ACCOUNT-ID': SMART_SUITE_ACCOUNT_ID,
          Authorization: `Token ${SMART_SUITE_APIKEY}`,
        },
      }
    )

    if (!res.ok) {
      if (res.status === 429) {
        const error = new Error(`Rate limited: ${res.statusText}`)
        error.status = 429
        error.headers = res.headers
        throw error
      }
      throw new Error(`SmartSuite API error: ${res.status} ${res.statusText}`)
    }

    return res
  })

  const responseJSON = await response.json()

  // Filter based on report-specific rules
  const filteredRecords = responseJSON.records.filter((record) => shouldKeepRecord(record, reportId))
  console.log(`Filtered ${filteredRecords.length} records from ${responseJSON.records.length} total`)
  
  if (reportId === '6857167d82358a0f5e038c3f') {
    console.log(`  → Directory: kept published records only (sf4ad525dd = true)`)
  } else if (reportId === '68614a111208586bd05d3c3a') {
    const distCount = filteredRecords.filter(r => r.s43a4b2808).length
    const colivingCount = filteredRecords.filter(r => r.sb685ab800?.label?.toLowerCase() === 'coliving').length
    console.log(`  → Distribution: kept ${distCount} with distribution flag + ${colivingCount} coliving`)
  }

  // Convert SmartDoc fields and strip unused fields
  filteredRecords.forEach((record) => {
    try {
      const convertedFields = convertAllSmartDocFields(record)
      Object.assign(record, convertedFields)
    } catch (error) {
      console.error(`Error converting SmartDoc fields for record ${record.id}:`, error)
    }
  })

  const strippedRecords = filteredRecords.map(stripUnusedFields)

  // Fetch images using smart rate limiting
  console.log('Fetching images for records...')
  await processBatch(strippedRecords, async (record) => {
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
            console.error(`Error fetching image with handle ${imageObj.handle} for record ${record.id}:`, error)
          }
        }
      }

      if (imageUrls.length > 0) {
        record.image = imageUrls[0]
        record.images = imageUrls
      }
    }
  })

  const output = { records: strippedRecords }
  writeFileSync(CACHE_PATH(reportId), JSON.stringify(output, null, 0), 'utf-8')
  console.log(`Updated cache: ${strippedRecords.length} published records with ${REQUIRED_FIELDS.length} fields each`)

  return output
}

function directoryLogoUrlFor(title, imageUrl) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const localPath = `/nomad-directory-logos/${slug}.svg`
  return imageUrl || localPath
}

async function regenerateLatestListings(reportId) {
  if (reportId !== '6857167d82358a0f5e038c3f') return

  console.log('Regenerating latest_directory_listings.json...')
  const cachePath = CACHE_PATH(reportId)
  const cache = JSON.parse(require('fs').readFileSync(cachePath, 'utf-8'))
  
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

async function updateAllRecords(reportId) {
  console.log(`Starting optimized cache update for report ${reportId}...`)
  console.log(`Fetching only published records with ${REQUIRED_FIELDS.length} required fields`)

  await fetchReportRecords(reportId)
  await regenerateLatestListings(reportId)

  console.log('Successfully updated cache with optimized data')
}

if (!SMART_SUITE_APIKEY || !SMART_SUITE_ACCOUNT_ID || !SMART_SUITE_TABLE_ID_COMPANY || !REPORT_ID) {
  console.error('Error: Missing required environment variables')
  process.exit(1)
}

updateAllRecords(REPORT_ID).catch((error) => {
  console.error('Error updating all records:', error)
  process.exit(1)
})
