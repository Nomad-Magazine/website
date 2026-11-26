export const DIRECTORY_ANON_VOTE_LIMIT = 5

export function normalizeVoteEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

export function mapVoteEmailError(error: { message?: string; code?: string; status?: number }): { status: number; error: string } {
  const message = (error.message ?? '').toLowerCase()
  if (error.status === 429 || message.includes('rate') || message.includes('too many')) {
    return { status: 429, error: 'rate_limited' }
  }
  if (message.includes('invalid') && message.includes('email')) return { status: 400, error: 'invalid_email' }
  return { status: 503, error: 'unavailable' }
}

export function mapVoteEmailClientError(code: string): string {
  switch (code) {
    case 'invalid_email': return 'Enter a valid email address.'
    case 'rate_limited': return 'Too many attempts. Please wait a moment and try again.'
    case 'turnstile_required': return 'Human verification failed. Please try again.'
    case 'sign_in_required': return 'Your session expired. Reload the page and try again.'
    case 'already_confirmed': return 'Your email is already confirmed. You can keep voting.'
    default: return 'We could not send the confirmation email. Please try again.'
  }
}