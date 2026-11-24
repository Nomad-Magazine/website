// SmartSuite hydrated record fetch (records/list + per-record GET).

/**
 * @param {import('node:http').IncomingHttpHeaders | Headers} headers
 */
export function smartSuiteHeaders(accountId, apiKey, extra = {}) {
  return {
    'Content-Type': 'application/json',
    'ACCOUNT-ID': accountId,
    Authorization: `Token ${apiKey}`,
    ...extra,
  }
}

/**
 * Paginate POST records/list with hydrated:true and return id → record map.
 * @param {{ accountId: string, apiKey: string, tableId: string, fetchWithRetry: (fn: () => Promise<Response>) => Promise<Response> }} ctx
 */
export async function fetchHydratedRecordsMap({ accountId, apiKey, tableId, fetchWithRetry }) {
  const byId = new Map()
  let offset = 0
  const limit = 1000
  let total = Infinity

  console.log('Fetching hydrated records from records/list...')

  while (offset < total) {
    const response = await fetchWithRetry(async () => {
      const res = await fetch(
        `https://app.smartsuite.com/api/v1/applications/${tableId}/records/list/?offset=${offset}&limit=${limit}`,
        {
          method: 'POST',
          headers: smartSuiteHeaders(accountId, apiKey),
          body: JSON.stringify({ sort: [], filter: {}, hydrated: true }),
        },
      )
      if (!res.ok) {
        if (res.status === 429) {
          const error = new Error(`Rate limited: ${res.statusText}`)
          error.status = 429
          error.headers = res.headers
          throw error
        }
        throw new Error(`SmartSuite list error: ${res.status} ${res.statusText}`)
      }
      return res
    })

    const page = await response.json()
    total = typeof page.total === 'number' ? page.total : page.items?.length || 0
    const items = page.items || []
    for (const item of items) {
      if (item?.id) byId.set(item.id, item)
    }
    console.log(`  hydrated page offset=${offset}: ${items.length} items (${byId.size}/${total})`)
    if (!items.length) break
    offset += items.length
    if (items.length < limit) break
  }

  console.log(`Loaded ${byId.size} hydrated records`)
  return byId
}

/**
 * records-for-report returns view-shaped (often dehydrated) rows — merge with hydrated copies.
 * @param {Array<Record<string, unknown>>} reportRecords
 * @param {Map<string, Record<string, unknown>>} hydratedById
 */
export function mergeReportWithHydratedRecords(reportRecords, hydratedById) {
  let merged = 0
  let missing = 0
  const rows = reportRecords.map((record) => {
    if (!record?.id) return record
    const hydrated = hydratedById.get(record.id)
    if (hydrated) {
      merged += 1
      return hydrated
    }
    missing += 1
    console.warn(`No hydrated record for report row ${record.id}`)
    return record
  })
  console.log(`Merged ${merged} hydrated records (${missing} missing from list)`)
  return rows
}

/**
 * @param {{ accountId: string, apiKey: string, tableId: string, recordId: string, fetchWithRetry?: (fn: () => Promise<Response>) => Promise<Response> }} ctx
 */
export async function fetchSingleHydratedRecord({ accountId, apiKey, tableId, recordId, fetchWithRetry }) {
  const run = fetchWithRetry || ((fn) => fn())
  const response = await run(async () => {
    const res = await fetch(
      `https://app.smartsuite.com/api/v1/applications/${tableId}/records/${recordId}/?hydrated=true`,
      { headers: smartSuiteHeaders(accountId, apiKey) },
    )
    if (!res.ok) {
      throw new Error(`SmartSuite API error: ${res.status} ${res.statusText}`)
    }
    return res
  })
  return response.json()
}

/**
 * @param {{ accountId: string, apiKey: string, tableId: string, reportId: string, fetchWithRetry: (fn: () => Promise<Response>) => Promise<Response> }} ctx
 */
export async function fetchRecordsForReport({ accountId, apiKey, tableId, reportId, fetchWithRetry }) {
  const response = await fetchWithRetry(async () => {
    const res = await fetch(
      `https://app.smartsuite.com/api/v1/applications/${tableId}/records-for-report/?report=${reportId}&with_empty_values=false`,
      { headers: smartSuiteHeaders(accountId, apiKey) },
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
  return response.json()
}