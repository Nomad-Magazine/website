import path from 'path'
import fs from 'fs/promises'
import pLimit from 'p-limit'
import { SMART_SUITE_APIKEY, SMART_SUITE_ACCOUNT_ID, SMART_SUITE_TABLE_ID_COMPANY } from 'astro:env/server'

const limit = pLimit(2) // 2 concurrent requests

const CACHE_PATH = (suffix: string = '') => path.resolve(process.cwd(), `src/utils/nomad_cache_table_${suffix}.json`)

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

async function globalCache() {
  // Try to read from cache first
  try {
    const cache = await fs.readFile(CACHE_PATH('global'), 'utf-8')
    return JSON.parse(cache)
  } catch (err) {
    // Cache miss or error, proceed to fetch
  }
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
  if (!response.ok) throw new Error(`SmartSuite API error: ${response.status} ${response.statusText}`)
  const responseJSON = await response.json()
  // Write to cache
  await fs.writeFile(CACHE_PATH('global'), JSON.stringify(responseJSON, null, 0), 'utf-8')
  return responseJSON
}

export async function fetchReportRecords(reportID: string) {
  const globalCacheJSON = await globalCache()
  // Try to read from cache first
  try {
    const cache = await fs.readFile(CACHE_PATH(reportID), 'utf-8')
    return JSON.parse(cache)
  } catch (err) {
    // Cache miss or error, proceed to fetch
  }
  const response = await fetch(`https://app.smartsuite.com/api/v1/applications/${SMART_SUITE_TABLE_ID_COMPANY}/records-for-report/?report=${reportID}&with_empty_values=false`, {
    headers: {
      'ACCOUNT-ID': SMART_SUITE_ACCOUNT_ID,
      Authorization: `Token ${SMART_SUITE_APIKEY}`,
    },
  })
  if (!response.ok) throw new Error(`SmartSuite API error: ${response.status} ${response.statusText}`)
  const responseJSON = await response.json()
  responseJSON.records.forEach((record: any, idx: number) => {
    if (record.id) {
      const recordFromGlobalCache = globalCacheJSON.items.find((item: any) => item.id === record.id)
      if (recordFromGlobalCache) responseJSON.records[idx] = recordFromGlobalCache
    }
  })
  // Fetch images in parallel for all records
  if (responseJSON.records) {
    await Promise.all(
      responseJSON.records.map(async (record: any) => {
        const handle = record.sc584fdf36?.[0]?.handle
        if (handle) {
          try {
            const imageUrl = await limit(() => fetchWithRetry(() => fetchImageUrlFromHandle(handle)))
            if (imageUrl) record.image = imageUrl
          } catch (error) {}
        }
      }),
    )
  }
  // Write to cache
  await fs.writeFile(CACHE_PATH(reportID), JSON.stringify(responseJSON, null, 0), 'utf-8')
  return responseJSON
}

/**
 * Fetches a public URL for a SmartSuite file handle
 */
async function fetchImageUrlFromHandle(handle: string): Promise<string | undefined> {
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
