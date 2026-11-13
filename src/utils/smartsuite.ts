import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type ReportRecords = {
  records: Array<Record<string, any>>
  [key: string]: any
}

const CACHE_PATH = (suffix: string = '') => `nomad_cache_table_${suffix}.json`

export async function fetchReportRecords(reportID: string): Promise<ReportRecords> {
  try {
    const filePath = join(process.cwd(), 'src', 'utils', CACHE_PATH(reportID))
    const fileContents = readFileSync(filePath, 'utf-8')
    const cache = JSON.parse(fileContents) as ReportRecords
    return cache
  } catch (err) {
    console.error(`Error reading cache for report ${reportID}:`, err)
    return { records: [] } as ReportRecords
  }
}
