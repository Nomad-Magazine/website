/** Strip markup for Pagefind result excerpts shown in /search/. */
export function cleanSearchExcerpt(excerpt: string | undefined): string {
  if (!excerpt) return ''
  let text = excerpt.replace(/<[^>]*>/g, ' ')
  text = decodeHtmlEntities(text)
  text = text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/(^|\s)#{1,6}(\s+)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*\w])\*([^*\n]+)\*([^*\w]|$)/g, '$1$2$3')
    .replace(/(^|\s)>\s+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  return text
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

/** Clean non-highlight text in a Pagefind excerpt while preserving <mark> nodes. */
export function cleanSearchExcerptDom(root: HTMLElement): void {
  const cleanNode = (parent: Node) => {
    for (const child of [...parent.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const raw = child.textContent ?? ''
        const cleaned = cleanSearchExcerpt(raw)
        if (cleaned !== raw) child.textContent = cleaned
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element
        if (el.tagName === 'MARK') continue
        cleanNode(el)
      }
    }
  }
  cleanNode(root)
}