import { env } from 'cloudflare:workers'
import { fetchReportRecords } from '~/utils/smartsuite'

export const DIRECTORY_SUBMIT_URL = '/nomad-directory-submit/'

export const DIRECTORY_CATEGORIES: { label: string; value: string }[] = [
  { label: 'Accommodation', value: 't82f5' },
  { label: 'Accommodation App', value: '3tv1j' },
  { label: 'App', value: 'xxdGM' },
  { label: 'Blog', value: 'TyOkL' },
  { label: 'Book Store', value: 'ZGel5' },
  { label: 'Cafe', value: '5NOmA' },
  { label: 'Citizenship', value: 'u8z9o' },
  { label: 'Coaching', value: '69e27485-baeb-410a-88a4-d6b6870394c9' },
  { label: 'Coliving', value: '46e2f0e9-76bf-4a13-ac13-be5f58a6e2e4' },
  { label: 'Coliving Service', value: 'vGNZ2' },
  { label: 'Community', value: 'GSLo9' },
  { label: 'Community Platform', value: '7cfb2bf3-5014-46ac-afc6-af086802127a' },
  { label: 'Conference', value: 'd1f6a587-709b-4e6c-8553-bdf076b48861' },
  { label: 'Coworking', value: '4e15941d-588c-4ba7-b613-fc0e70d386a8' },
  { label: 'Dating', value: 'dDRqt' },
  { label: 'Destination', value: 'o5v2U' },
  { label: 'Education', value: '891OF' },
  { label: 'eSim', value: 'KEjxy' },
  { label: 'Events', value: 'tRmX9' },
  { label: 'Freelance', value: 'fuPyC' },
  { label: 'Fulfillment', value: '2mcbh' },
  { label: 'Game', value: 'PoFAk' },
  { label: 'Health', value: 'oHLgN' },
  { label: 'Hostel', value: '2c92aacb-5a07-475c-94c6-9b66a720c26c' },
  { label: 'Insurance', value: 'ff03dc4a-1cce-411d-b6d4-4059caaf0fbd' },
  { label: 'Investment', value: 'jUYll' },
  { label: 'Job Platform', value: 'a0fd9f4c-f728-4429-9446-ab3e90b1921b' },
  { label: 'Legal & Taxes', value: '2c09f109-21b4-49b8-bc99-daca03425054' },
  { label: 'Media', value: 'wonaW' },
  { label: 'Other', value: 'rHyst' },
  { label: 'Photography', value: 'u2Kj3' },
  { label: 'Platform', value: 'DpdIb' },
  { label: 'Podcast', value: 'peKRj' },
  { label: 'Publishing Software', value: 'GIpyx' },
  { label: 'Rentals', value: '8912ebff-f814-40fa-8829-04ee8136aebe' },
  { label: 'Retreats', value: 'oqQH3' },
  { label: 'Service', value: 'bNZrz' },
  { label: 'Software', value: '51efb876-c196-45ad-8f06-2239aac199a9' },
  { label: 'TravelTech', value: 'f28a91f5-232f-4be8-85b6-3978ef74325c' },
]

const EMAIL_FIELD = 'sd6842e687'
const EXCLUDE_TAGS = new Set([
  'Shipping Waiting List',
  'Paid Shipment Subscription',
  'Coworking New Submition',
  'Coworking Nominated',
  'Customer',
])

export type DirectoryListing = {
  id: string
  title: string
  description: string
  website: string
  category: string
  categoryValue: string
  specialOffer: string
  location: string
  image: string
  published: boolean
  contactName: string
}

type SmartSuiteRecord = Record<string, any>

function asRecord(value: unknown): SmartSuiteRecord {
  return value && typeof value === 'object' ? (value as SmartSuiteRecord) : {}
}

function readEnv(name: 'SMART_SUITE_APIKEY' | 'SMART_SUITE_ACCOUNT_ID' | 'SMART_SUITE_TABLE_ID_COMPANY'): string {
  const fromCf = (env as unknown as Record<string, string | undefined>)[name]
  const fromProcess = typeof process !== 'undefined' ? process.env[name] : undefined
  const value = String(fromCf || fromProcess || '').trim()
  if (!value || value.includes('PLACEHOLDER')) return ''
  return value
}

function getCreds() {
  return {
    apiKey: readEnv('SMART_SUITE_APIKEY'),
    accountId: readEnv('SMART_SUITE_ACCOUNT_ID'),
    tableId: readEnv('SMART_SUITE_TABLE_ID_COMPANY'),
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))
}

function normalizeWebsiteUrl(raw: string): string {
  let value = raw.trim().replace(/^['"]+|['"|]+$/g, '').trim()
  if (!value) return ''
  value = value.split(/[\s,]+/)[0] || ''
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) {
    // keep
  } else if (/^\/\//.test(value)) {
    value = `https:${value}`
  } else {
    value = `https://${value}`
  }
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    if (!parsed.hostname.includes('.')) return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

function recordEmails(record: SmartSuiteRecord): string[] {
  const raw = record[EMAIL_FIELD]
  if (Array.isArray(raw)) return raw.map((e) => normalizeEmail(String(e || ''))).filter(Boolean)
  if (typeof raw === 'string' && raw) return [normalizeEmail(raw)]
  return []
}

function recordHasEmail(record: SmartSuiteRecord, email: string): boolean {
  return recordEmails(record).includes(normalizeEmail(email))
}

function isDirectoryListing(record: SmartSuiteRecord): boolean {
  if (!record?.id || !record.title) return false
  const tag = String(record.s90e9b59f5?.label || '').trim()
  if (EXCLUDE_TAGS.has(tag)) return false
  return true
}

export function mapDirectoryListing(record: SmartSuiteRecord): DirectoryListing {
  const image = record.image && record.image !== '/logo.svg' ? String(record.image) : ''
  return {
    id: String(record.id),
    title: String(record.title || ''),
    description: String(record.scea90e502 || ''),
    website: String(record.link || record.sb788c266b?.[0] || ''),
    category: String(record.sb685ab800?.label || ''),
    categoryValue: String(record.sb685ab800?.value || ''),
    specialOffer: String(record.s5576966ee || ''),
    location: String(record.sed1a49986 || ''),
    image,
    published: Boolean(record.sf4ad525dd),
    contactName: String(record.s16e7a9d78 || record.sfca9050a8 || ''),
  }
}

async function smartSuiteFetch(path: string, init: RequestInit = {}): Promise<Response | null> {
  const { apiKey, accountId, tableId } = getCreds()
  if (!apiKey || !accountId || !tableId) return null
  return fetch(`https://app.smartsuite.com/api/v1/applications/${tableId}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'ACCOUNT-ID': accountId,
      Authorization: `Token ${apiKey}`,
      ...(init.headers || {}),
    },
  })
}

async function findRecordsByEmailApi(email: string): Promise<SmartSuiteRecord[] | null> {
  const normalized = normalizeEmail(email)
  const filters = [
    { operator: 'and', fields: [{ field: EMAIL_FIELD, comparison: 'has_any_of', value: [normalized] }] },
    { operator: 'and', fields: [{ field: EMAIL_FIELD, comparison: 'is', value: normalized }] },
    { operator: 'and', fields: [{ field: EMAIL_FIELD, comparison: 'contains', value: normalized }] },
  ]

  let lastFailed = false
  for (const filter of filters) {
    const res = await smartSuiteFetch('/records/list/?offset=0&limit=50', {
      method: 'POST',
      body: JSON.stringify({ hydrated: true, filter }),
    })
    if (!res) return null
    if (!res.ok) {
      lastFailed = true
      await res.text().catch(() => '')
      continue
    }
    lastFailed = false
    const data = asRecord(await res.json())
    const raw = data.items || data.records
    const items: SmartSuiteRecord[] = Array.isArray(raw) ? raw : []
    const matched = items.filter((record) => recordHasEmail(record, normalized) && isDirectoryListing(record))
    if (matched.length) return matched
  }

  return lastFailed ? null : []
}

async function findRecordsByEmailCache(email: string): Promise<SmartSuiteRecord[]> {
  const { records = [] } = await fetchReportRecords('6857167d82358a0f5e038c3f')
  return (records as SmartSuiteRecord[]).filter(
    (record) => recordHasEmail(record, email) && isDirectoryListing(record),
  )
}

async function fetchImageUrl(handle: string): Promise<string> {
  const { apiKey, accountId } = getCreds()
  if (!apiKey || !accountId || !handle) return ''
  const res = await fetch(`https://app.smartsuite.com/api/v1/shared-files/${handle}/url/`, {
    headers: {
      'ACCOUNT-ID': accountId,
      Authorization: `Token ${apiKey}`,
    },
  })
  if (!res.ok) return ''
  const data = asRecord(await res.json().catch(() => ({})))
  return String(data.url || '')
}

async function hydrateRecordImage(record: SmartSuiteRecord): Promise<SmartSuiteRecord> {
  if (record.image && record.image !== '/logo.svg') return record
  const handle = record.sc584fdf36?.[0]?.handle
  if (!handle) return record
  const image = await fetchImageUrl(handle)
  if (image) record.image = image
  return record
}

export async function findListingsByEmail(email: string): Promise<DirectoryListing[]> {
  if (!email) return []
  const fromApi = await findRecordsByEmailApi(email)
  const records = fromApi ?? (await findRecordsByEmailCache(email))
  const hydrated = await Promise.all(records.map((record) => hydrateRecordImage(record)))
  return hydrated.map(mapDirectoryListing)
}

export async function findListingForEmail(email: string, id?: string): Promise<DirectoryListing | null> {
  const listings = await findListingsByEmail(email)
  if (!listings.length) return null
  if (id) return listings.find((listing) => listing.id === id) || null
  return listings[0]
}

export type DirectoryListingUpdate = {
  title: string
  description: string
  website: string
  specialOffer: string
  location: string
  categoryValue: string
  contactName?: string
}

export async function updateListingForEmail(
  email: string,
  id: string,
  update: DirectoryListingUpdate,
): Promise<{ ok: boolean; error?: string; listing?: DirectoryListing }> {
  const existing = await findListingForEmail(email, id)
  if (!existing) return { ok: false, error: 'Listing not found for this email.' }

  const { apiKey, accountId, tableId } = getCreds()
  if (!apiKey || !accountId || !tableId) {
    return { ok: false, error: 'Listing updates are not configured yet.' }
  }

  if (!update.website.trim()) {
    return { ok: false, error: 'Website is required. Use a format like company.com' }
  }
  const website = normalizeWebsiteUrl(update.website)
  if (!website) {
    return { ok: false, error: 'Website format is invalid. Use a format like company.com' }
  }

  const wasPublished = existing.published
  const recordRes = await smartSuiteFetch(`/records/${id}/`)
  const current = asRecord(recordRes?.ok ? await recordRes.json().catch(() => ({})) : {})
  const prevNotes = String(current.s099981076 || '').trim()
  const stamp = wasPublished
    ? `Member edited published listing via console ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC — set back to review`
    : `Member edited listing via console ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`
  const notes = prevNotes
    ? prevNotes.includes('Member edited')
      ? prevNotes.replace(/Member edited[^\n]*/i, stamp)
      : `${stamp}\n${prevNotes}`
    : stamp

  const payload: Record<string, unknown> = {
    title: update.title.trim(),
    scea90e502: update.description.trim(),
    sb788c266b: [website],
    s5576966ee: update.specialOffer.trim(),
    sed1a49986: update.location.trim(),
    s099981076: notes,
  }
  // Member edits never stay published — requires staff re-approval.
  if (wasPublished) payload.sf4ad525dd = false
  if (update.contactName?.trim()) payload.s16e7a9d78 = update.contactName.trim()
  if (update.categoryValue) payload.sb685ab800 = update.categoryValue

  const res = await smartSuiteFetch(`/records/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  if (!res) return { ok: false, error: 'Listing updates are not configured yet.' }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('SmartSuite directory update failed', res.status, text)
    if (text.includes('URL is not valid')) {
      return { ok: false, error: 'Website format is invalid. Use a format like company.com' }
    }
    return { ok: false, error: 'Could not save your listing. Try again.' }
  }

  const saved = asRecord(await res.json().catch(() => ({})))
  const nowPublished = wasPublished ? false : existing.published
  return {
    ok: true,
    listing: mapDirectoryListing({
      ...existing,
      ...saved,
      id,
      title: update.title.trim(),
      scea90e502: update.description.trim(),
      sb788c266b: website ? [website] : [],
      s5576966ee: update.specialOffer.trim(),
      sed1a49986: update.location.trim(),
      s16e7a9d78: update.contactName?.trim() || existing.contactName,
      sb685ab800: update.categoryValue
        ? {
            value: update.categoryValue,
            label: DIRECTORY_CATEGORIES.find((c) => c.value === update.categoryValue)?.label || existing.category,
          }
        : existing.categoryValue
          ? { value: existing.categoryValue, label: existing.category }
          : undefined,
      image: existing.image,
      sf4ad525dd: nowPublished,
    }),
  }
}

export type DirectoryListingInput = {
  title: string
  description: string
  website: string
  specialOffer: string
  categoryValue: string
  contactName: string
  email: string
}

function listingPayload(input: DirectoryListingInput): Record<string, unknown> {
  const website = normalizeWebsiteUrl(input.website)
  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    scea90e502: input.description.trim(),
    sb788c266b: website ? [website] : [],
    s5576966ee: input.specialOffer.trim(),
    s16e7a9d78: input.contactName.trim(),
    sd6842e687: [normalizeEmail(input.email)],
    sf4ad525dd: false,
    s90e9b59f5: 'jq7Dr',
    s099981076: 'Submitted via nomad-directory-submit form',
  }
  if (input.categoryValue) payload.sb685ab800 = input.categoryValue
  return payload
}

async function uploadRecordFile(recordId: string, field: string, file: File): Promise<boolean> {
  const { apiKey, accountId, tableId } = getCreds()
  if (!apiKey || !accountId || !tableId) return false
  const body = new FormData()
  body.append('filename', file.name || 'upload')
  body.append('files', file, file.name || 'upload')
  const res = await fetch(`https://app.smartsuite.com/api/v1/recordfiles/${tableId}/${recordId}/${field}/`, {
    method: 'POST',
    headers: {
      'ACCOUNT-ID': accountId,
      Authorization: `Token ${apiKey}`,
    },
    body,
  })
  if (!res.ok) {
    console.error('SmartSuite file upload failed', field, res.status, await res.text().catch(() => ''))
    return false
  }
  return true
}

export async function deleteListingForEmail(
  email: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const existing = await findListingForEmail(email, id)
  if (!existing) return { ok: false, error: 'Listing not found for this email.' }

  const { apiKey, accountId, tableId } = getCreds()
  if (!apiKey || !accountId || !tableId) {
    return { ok: false, error: 'Listing deletions are not configured yet.' }
  }

  const res = await smartSuiteFetch(`/records/${id}/`, { method: 'DELETE' })
  if (!res) return { ok: false, error: 'Listing deletions are not configured yet.' }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('SmartSuite directory delete failed', res.status, text)
    return { ok: false, error: 'Could not delete your listing. Try again.' }
  }
  return { ok: true }
}

export async function createListing(
  input: DirectoryListingInput,
  files: { logo?: File | null; extras?: File[] } = {},
): Promise<{ ok: boolean; error?: string; listing?: DirectoryListing }> {
  const email = normalizeEmail(input.email)
  if (!input.title.trim()) return { ok: false, error: 'Company name is required.' }
  if (!input.website.trim()) return { ok: false, error: 'Website is required. Use a format like company.com' }
  if (!input.description.trim()) return { ok: false, error: 'Company description is required.' }
  if (!input.categoryValue) return { ok: false, error: 'Company type is required.' }
  if (!input.contactName.trim()) return { ok: false, error: 'Full name is required.' }
  if (!email) return { ok: false, error: 'Contact email is required.' }
  if (!isValidEmail(email)) return { ok: false, error: 'Email format is invalid. Use a format like name@company.com' }

  const website = normalizeWebsiteUrl(input.website)
  if (!website) {
    return { ok: false, error: 'Website format is invalid. Use a format like company.com' }
  }

  const { apiKey, accountId, tableId } = getCreds()
  if (!apiKey || !accountId || !tableId) {
    return { ok: false, error: 'Listing submissions are not configured yet.' }
  }

  const res = await smartSuiteFetch('/records/', {
    method: 'POST',
    body: JSON.stringify({ ...listingPayload(input), sb788c266b: [website] }),
  })
  if (!res) return { ok: false, error: 'Listing submissions are not configured yet.' }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('SmartSuite directory create failed', res.status, text, website)
    if (text.includes('URL is not valid')) {
      return { ok: false, error: 'Website format is invalid. Use a format like company.com' }
    }
    return { ok: false, error: 'Could not submit your listing. Try again.' }
  }

  const saved = asRecord(await res.json())
  const id = String(saved.id || '')
  if (!id) return { ok: false, error: 'Could not submit your listing. Try again.' }

  if (files.logo && files.logo.size > 0) {
    await uploadRecordFile(id, 'sc584fdf36', files.logo)
  }
  for (const extra of files.extras || []) {
    if (extra.size > 0) await uploadRecordFile(id, 'scf86721a6', extra)
  }

  const recordRes = await smartSuiteFetch(`/records/${id}/`)
  const record = asRecord(recordRes?.ok ? await recordRes.json() : saved)
  await hydrateRecordImage(record)

  return { ok: true, listing: mapDirectoryListing(record) }
}
