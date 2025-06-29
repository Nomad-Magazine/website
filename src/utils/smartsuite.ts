import path from 'path'
import fs from 'fs/promises'
import { SMART_SUITE_APIKEY, SMART_SUITE_ACCOUNT_ID, SMART_SUITE_TABLE_ID_COMPANY } from 'astro:env/server'

const CACHE_PATH = (suffix: string = '') => path.resolve(process.cwd(), `src/utils/nomad_cache_table_${suffix}.json`)

/**
 * Fetches a single page of records from SmartSuite API
 */
export async function fetchRecordsPage(offset: number, limit: number = 100) {
  const response = await fetch(`https://app.smartsuite.com/api/v1/applications/${SMART_SUITE_TABLE_ID_COMPANY}/records/list/?offset=${offset}&limit=${limit}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ACCOUNT-ID': SMART_SUITE_ACCOUNT_ID,
      Authorization: `Token ${SMART_SUITE_APIKEY}`,
    },
    body: JSON.stringify({ sort: [], filter: {} }),
  })
  if (!response.ok) throw new Error(`SmartSuite API error: ${response.status} ${response.statusText}`)
  return await response.json()
}

export async function fetchReportRecords(reportID: string) {
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
  // Fetch images in parallel for all records
  if (responseJSON.records) {
    await Promise.all(
      responseJSON.records.map(async (record: any) => {
        const handle = record.sc584fdf36?.[0]?.handle
        if (handle) {
          try {
            const imageUrl = await fetchImageUrlFromHandle(handle)
            if (imageUrl) record.image = imageUrl
          } catch (error) {}
        }
      }),
    )
  }
  // Write to cache
  await fs.writeFile(CACHE_PATH(reportID), JSON.stringify(responseJSON, null, 2), 'utf-8')
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
  // if (data.url) {
  //   const urlResponse = await fetch(data.url, { method: 'HEAD', redirect: 'follow' })
  //   return urlResponse.url || data.url
  // }
  return data.url
}

/**
 * Fetches all records from SmartSuite API by handling pagination and fetching images in parallel
 * Caches the result in a JSON file. If the cache exists, returns its contents.
 */
export async function fetchAllRecords() {
  const allRecords: any[] = []
  let offset = 0
  const limit = 100 // Maximum records per request
  let hasMoreRecords = true
  while (hasMoreRecords) {
    try {
      const response = await fetchRecordsPage(offset, limit)
      allRecords.push(...response.items)
      if (response.items.length < limit || offset + response.items.length >= response.total) {
        hasMoreRecords = false
      } else {
        offset += response.items.length
      }
    } catch (error) {
      console.error('Error fetching records from SmartSuite:', error)
      throw error
    }
  }
  // Fetch images in parallel for all records
  await Promise.all(
    allRecords.map(async (record: any, idx: number) => {
      // If the image field exists and has at least one file, use its handle
      const handle = record.se05f2fd75?.[0]?.handle
      record.image = '/logo.svg'
      if (handle) record.image = await fetchImageUrlFromHandle(handle)
      allRecords[idx].image = record.image
    }),
  )
  return allRecords
}
