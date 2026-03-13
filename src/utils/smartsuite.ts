type ReportRecords = {
  records: Array<Record<string, any>>
  [key: string]: any
}

const cacheModules = import.meta.glob<ReportRecords>('./nomad_cache_table_*.json', {
  eager: true,
  import: 'default',
})

const CACHE_PATH = (suffix: string = '') => `./nomad_cache_table_${suffix}.json`

export async function fetchReportRecords(reportID: string) {
  try {
    const cache = cacheModules[CACHE_PATH(reportID)]
    if (!cache) {
      throw new Error(`Missing bundled cache file for report ${reportID}`)
    }
    return cache as ReportRecords
  } catch (err) {
    console.error(`Error reading cache for report ${reportID}:`, err)
    return { records: [] } as ReportRecords
  }
}
