/** Companies with white/light logos that need a dark logo container background. */
export const nomadDirectoryWhiteLogos = [
  'Fresh Global',
  'Falmouth University',
  'SUMA',
  'Scaglia y Asociados',
  'goldenweeks',
  'Anytime Mailbox',
  'WESPA Spaces',
  'Madeira Remote',
]

export function needsDarkLogoBackground(title: string): boolean {
  return nomadDirectoryWhiteLogos.includes(title)
}

const directoryLogoBoxBaseClass =
  'w-14 h-14 rounded-xl shrink-0 overflow-hidden flex items-center justify-center'

/** Shared logo container — same size and background everywhere. */
export const directoryLogoBoxClass = `${directoryLogoBoxBaseClass} bg-black`

/** Logo tile background matched to parent surface; dark only when the mark needs contrast. */
export function directoryLogoBoxClassFor(title: string): string {
  const background = needsDarkLogoBackground(title) ? 'bg-black' : 'bg-white/10'
  return `${directoryLogoBoxBaseClass} ${background}`
}

export const directoryLogoImageClass = 'w-full h-full object-cover'

export const directoryLogoInitialClass = 'font-bold text-lg text-white'

/** Wide logos that must use contain instead of cover. */
export const directoryLogoContainTitles = ['Madeira Remote'] as const

export const directoryLogoUrlOverrides: Record<string, string> = {
  'Madeira Remote': '/images/madeira-remote-logo.webp',
}

export function directoryLogoImageClassFor(title: string): string {
  if (directoryLogoContainTitles.includes(title as (typeof directoryLogoContainTitles)[number])) {
    return 'w-full h-full object-contain'
  }
  return directoryLogoImageClass
}

export function directoryLogoUrlFor(title: string, fallback: string): string {
  return directoryLogoUrlOverrides[title] || fallback
}

/** Dark logo tiles that need a hairline edge on dark card backgrounds. */
export const directoryLogoSubtleBorderTitles = ['Find Your Coliving'] as const

export function directoryLogoIntroBorderClass(title: string): string {
  return (directoryLogoSubtleBorderTitles as readonly string[]).includes(title) ? 'ring-1 ring-white/10' : ''
}
