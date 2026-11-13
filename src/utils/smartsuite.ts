// Trimmed SmartSuite caches (published / used records only, ~1 MB total), imported
// statically so they work both in prerender (workerd, no fs) and at runtime.
import directoryCache from './nomad_cache_table_6857167d82358a0f5e038c3f.json'
import distributionCache from './nomad_cache_table_68614a111208586bd05d3c3a.json'

type ReportRecords = {
  records: Array<Record<string, any>>
  [key: string]: any
}

const CACHES: Record<string, ReportRecords> = {
  '6857167d82358a0f5e038c3f': directoryCache as unknown as ReportRecords,
  '68614a111208586bd05d3c3a': distributionCache as unknown as ReportRecords,
}

export async function fetchReportRecords(reportID: string): Promise<ReportRecords> {
  const cache = CACHES[reportID]
  if (!cache) {
    console.error(`No SmartSuite cache bundled for report ${reportID}`)
    return { records: [] }
  }
  return cache
}
