/** Strip markup for Pagefind result excerpts shown in /search/. */
export function cleanSearchExcerpt(excerpt: string | undefined): string {
  if (!excerpt) return ''
  return excerpt
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:#x?[0-9a-f]+|[a-z]+);/gi, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/`+/g, '')
    .replace(/[*_#>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}