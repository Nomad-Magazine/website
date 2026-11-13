type ReportRecords = {
  records: Array<Record<string, any>>
  [key: string]: any
}

const cacheModules = import.meta.glob<ReportRecords>('./nomad_cache_table_*.json', {
  eager: false,
  import: 'default',
})

const CACHE_PATH = (suffix: string = '') => `./nomad_cache_table_${suffix}.json`

export async function fetchReportRecords(reportID: string) {
  try {
    const loader = cacheModules[CACHE_PATH(reportID)]
    if (!loader) {
      throw new Error(`Missing bundled cache file for report ${reportID}`)
    }
    const cache = await loader()
    return cache as ReportRecords
  } catch (err) {
    console.error(`Error reading cache for report ${reportID}:`, err)
    return { records: [] } as ReportRecords
  }
}
