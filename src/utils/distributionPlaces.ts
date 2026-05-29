export type DistributionPlace = {
  name: string
  location: string
  country: string
  website: string | null
  maps: string | null
}

export function parseDistributionRecords(records: any[]): DistributionPlace[] {
  return records
    .filter((r: any) => r.sd07d77f5e === true && r.title && r.s43a4b2808)
    .map((r: any) => {
      const loc = r.sed1a49986 || ''
      const parts = loc.split(',').map((s: string) => s.trim())
      const country = parts.length > 1 ? parts[parts.length - 1] : parts[0] || 'Other'
      return {
        name: r.title,
        location: loc,
        country,
        website: (() => {
          const u = r.sb788c266b?.[0]
          if (!u || typeof u !== 'string') return null
          const t = u.trim()
          if (!t) return null
          return /^https?:\/\//i.test(t) ? t.replace(/^Https:/i, 'https:') : `https://${t}`
        })(),
        maps: r.s2d652f699?.[0] || null,
      }
    })
}

export function getDistributionCountries(places: DistributionPlace[]): string[] {
  return [...new Set(places.map((p) => p.country))].sort()
}
