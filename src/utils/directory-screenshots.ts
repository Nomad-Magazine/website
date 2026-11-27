import manifest from './directory-screenshots.json'

export type DirectoryScreenshotEntry = {
  file: string
  capturedAt: string
  website: string
}

const screenshots = manifest as Record<string, DirectoryScreenshotEntry>

export function getListingScreenshot(listingId: string): string | null {
  return screenshots[listingId]?.file ?? null
}