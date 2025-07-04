import path from 'path'
import { readFileSync } from 'fs'

const CACHE_PATH = (suffix: string = '') => path.resolve(process.cwd(), `src/utils/nomad_cache_table_${suffix}.json`)

export async function fetchReportRecords(reportID: string) {
  try {
    const cache = readFileSync(CACHE_PATH(reportID), 'utf-8')
    return JSON.parse(cache)
  } catch (err) {
    console.error(`Error reading cache for report ${reportID}:`, err)
    return { records: [] }
  }
}
