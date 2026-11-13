// Shared by runtime directory routes and the build-time sitemap.
/** @type {Record<string,string>} */
export const COUNTRY_TO_CONTINENT = {
  Portugal: 'Europe',
  Spain: 'Europe',
  Italy: 'Europe',
  France: 'Europe',
  Germany: 'Europe',
  'United Kingdom': 'Europe',
  Netherlands: 'Europe',
  Greece: 'Europe',
  Bulgaria: 'Europe',
  Hungary: 'Europe',
  Ireland: 'Europe',
  Slovenia: 'Europe',
  Croatia: 'Europe',
  Slovakia: 'Europe',
  Austria: 'Europe',
  Poland: 'Europe',
  Malta: 'Europe',
  Belgium: 'Europe',
  Switzerland: 'Europe',
  Japan: 'Asia',
  Thailand: 'Asia',
  Vietnam: 'Asia',
  Indonesia: 'Asia',
  India: 'Asia',
  Philippines: 'Asia',
  'South Korea': 'Asia',
  Taiwan: 'Asia',
  Argentina: 'South America',
  Colombia: 'South America',
  Brazil: 'South America',
  'Costa Rica': 'Central America',
  Mexico: 'North America',
  USA: 'North America',
  Canada: 'North America',
  Morocco: 'Africa',
  'South Africa': 'Africa',
}

/** @type {Record<string,string>} */
const COUNTRY_ALIASES = {
  NL: 'Netherlands',
  'The Netherlands': 'Netherlands',
  Slovenija: 'Slovenia',
  UK: 'United Kingdom',
  Bali: 'Indonesia',
}

export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeCountry(raw) {
  return COUNTRY_ALIASES[raw] || raw
}

export function extractCountry(location) {
  if (!location) return ''
  const parts = location.split(',')
  if (parts.length >= 2) return normalizeCountry(parts[parts.length - 1].trim())
  const words = location.trim().split(/\s+/)
  const last = normalizeCountry(words[words.length - 1])
  if (COUNTRY_TO_CONTINENT[last]) return last
  const whole = normalizeCountry(location.trim())
  if (COUNTRY_TO_CONTINENT[whole]) return whole
  return ''
}

export function directoryRoutes(records) {
  const categories = new Set(),
    countries = new Set(),
    continents = new Set()
  for (const record of records.filter((record) => record.sf4ad525dd)) {
    if (record.sb685ab800?.label) categories.add(record.sb685ab800.label)
    const country = extractCountry(record.sed1a49986 || '')
    if (COUNTRY_TO_CONTINENT[country]) {
      countries.add(country)
      continents.add(COUNTRY_TO_CONTINENT[country])
    }
  }
  return [
    ...[...categories].map((filterValue) => ({ type: 'category', filterValue })),
    ...[...countries].map((filterValue) => ({ type: 'country', filterValue })),
    ...[...continents].map((filterValue) => ({ type: 'continent', filterValue })),
  ].map((route) => ({ ...route, slug: slugify(route.filterValue) }))
}
