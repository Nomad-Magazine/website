// These routes serve account flows, internal tools, private offers, or receipts.
const excludedSections = ['/auth/', '/console/', '/internal/', '/flipbooks/']
const excludedPages = new Set([
  '/404/', '/test/', '/test-api/', '/thank-you/', '/print-order-success/',
  '/coworking-submission-confirmation/', '/magazine-shipment-confirmation/',
  '/nomad-directory-confirmation/', '/nomad-directory-edit/', '/nomad-directory-submit/',
  '/nomad-directory-ig/', '/nomad_directory/vote/', '/search/',
  '/armenia-premium-sponsorship/', '/turkey-premium-sponsorship/',
  '/brand-placement-falmouth-847291/', '/brand-placement-databench-847291/',
  '/country-sponsorship-draft/',
])

export function isSearchLandingPage(pathname) {
  const path = pathname.endsWith('/') ? pathname : pathname + '/'
  return !excludedPages.has(path) && !excludedSections.some(section => path.startsWith(section))
}
