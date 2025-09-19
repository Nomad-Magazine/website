import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { convertAllSmartDocFields } from './smartdoc-converter.js'

const SMART_SUITE_APIKEY = process.env.SMART_SUITE_APIKEY ?? ''
const SMART_SUITE_ACCOUNT_ID = process.env.SMART_SUITE_ACCOUNT_ID ?? ''
const SMART_SUITE_TABLE_ID_COMPANY = process.env.SMART_SUITE_TABLE_ID_COMPANY ?? ''
const REPORT_ID = process.env.REPORT_ID ?? ''

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

async function fetchGlobalCache() {
  console.log('Fetching global cache...')

  const response = await fetchWithRetry(async () => {
    const res = await fetch(`https://app.smartsuite.com/api/v1/applications/${SMART_SUITE_TABLE_ID_COMPANY}/records/list/?all=true`, {
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
  
  // Convert SmartDoc fields to Markdown for all records
  if (responseJSON.items && Array.isArray(responseJSON.items)) {
    console.log('Converting SmartDoc fields to Markdown...')
    let totalConverted = 0
    responseJSON.items.forEach((record) => {
      try {
        const convertedFields = convertAllSmartDocFields(record)
        Object.assign(record, convertedFields)
        totalConverted += Object.keys(convertedFields).length
      } catch (error) {
        console.error(`Error converting SmartDoc fields to Markdown for record ${record.id}:`, error)
        // Keep original fields as fallback
      }
    })
    if (totalConverted > 0) {
      console.log(`Converted ${totalConverted} SmartDoc fields to Markdown across all records`)
    }
  }
  
  writeFileSync(CACHE_PATH('global'), JSON.stringify(responseJSON, null, 0), 'utf-8')
  console.log('Updated global cache')

  return responseJSON
}

async function fetchReportRecords(globalCacheJSON, reportId) {
  console.log(`Fetching report records for ${reportId}...`)

  const response = await fetchWithRetry(async () => {
    const res = await fetch(`https://app.smartsuite.com/api/v1/applications/${SMART_SUITE_TABLE_ID_COMPANY}/records-for-report/?report=${reportId}&with_empty_values=false`, {
      headers: {
        'ACCOUNT-ID': SMART_SUITE_ACCOUNT_ID,
        Authorization: `Token ${SMART_SUITE_APIKEY}`,
      },
    })

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

  // Merge with global cache data
  responseJSON.records.forEach((record, idx) => {
    if (record.id) {
      const recordFromGlobalCache = globalCacheJSON.items.find((item) => item.id === record.id)
      if (recordFromGlobalCache) {
        responseJSON.records[idx] = recordFromGlobalCache
      } else {
        // Convert SmartDoc fields for records not in global cache
        try {
          const convertedFields = convertAllSmartDocFields(record)
          Object.assign(record, convertedFields)
        } catch (error) {
          console.error(`Error converting SmartDoc fields to Markdown for record ${record.id}:`, error)
          // Keep original fields as fallback
        }
      }
    }
  })

  // Fetch images using smart rate limiting
  if (responseJSON.records) {
    console.log('Fetching images for records...')
    await processBatch(responseJSON.records, async (record) => {
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
              console.error(`Error fetching image with handle ${imageObj.handle} for record ${record.id}:`, error)
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
    })
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
