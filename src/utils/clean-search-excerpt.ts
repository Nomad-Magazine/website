/** Strip markup for Pagefind result excerpts shown in /search/. */
export function cleanSearchExcerpt(excerpt: string | undefined): string {
  if (!excerpt) return ''
  const text = cleanSearchExcerptFragment(excerpt.replace(/<[^>]*>/g, ' '))
  return text.trim()
}

/** Clean excerpt text without edge trim (safe beside preserved `<mark>` nodes). */
export function cleanSearchExcerptFragment(text: string): string {
  let out = text
  out = decodeHtmlEntities(out)
  out = out
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/(^|\s)#{1,6}(\s+)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*\w])\*([^*\n]+)\*([^*\w]|$)/g, '$1$2$3')
    .replace(/(^|\n)>\s+/g, '$1')
    .replace(/\s+/g, ' ')
  return out
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

function unwrapNonMarkElements(root: HTMLElement): void {
  const unwrap = (parent: Node) => {
    for (const child of [...parent.childNodes]) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element
        if (el.tagName === 'MARK') {
          unwrap(el)
          continue
        }
        unwrap(el)
        while (el.firstChild) parent.insertBefore(el.firstChild, el)
        parent.removeChild(el)
      }
    }
  }
  unwrap(root)
}

function collectTextNodesInOrder(root: Node): Text[] {
  const nodes: Text[] = []
  const walk = (parent: Node) => {
    for (const child of parent.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) nodes.push(child as Text)
      else if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName === 'MARK') walk(child)
    }
  }
  walk(root)
  return nodes
}

function cleanTextNodesPreserveMarkSpacing(root: HTMLElement): void {
  const textNodes = collectTextNodesInOrder(root)
  for (const node of textNodes) {
    const raw = node.textContent ?? ''
    const cleaned = cleanSearchExcerptFragment(raw)
    if (cleaned !== raw) node.textContent = cleaned
  }
  const first = textNodes[0]
  const last = textNodes[textNodes.length - 1]
  if (first?.textContent) {
    const t = first.textContent.replace(/^\s+/, '')
    if (t !== first.textContent) first.textContent = t
  }
  if (last?.textContent) {
    const t = last.textContent.replace(/\s+$/, '')
    if (t !== last.textContent) last.textContent = t
  }
}

/** Clean a Pagefind excerpt: text + `<mark>` only; preserves spacing beside highlights. */
export function cleanSearchExcerptDom(root: HTMLElement): void {
  unwrapNonMarkElements(root)
  cleanTextNodesPreserveMarkSpacing(root)
}