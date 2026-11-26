export async function hashClientNetwork(request: Request, salt: string): Promise<string | null> {
  if (!salt) return null
  const ip = request.headers.get('cf-connecting-ip')?.trim()
  if (!ip) return null
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function verifyTurnstileToken(secret: string, token: string, remoteIp?: string | null): Promise<boolean> {
  if (!secret || !token) return false
  const body = new URLSearchParams({ secret, response: token })
  if (remoteIp) body.set('remoteip', remoteIp)
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) return false
  const result = await response.json() as { success?: boolean }
  return result.success === true
}