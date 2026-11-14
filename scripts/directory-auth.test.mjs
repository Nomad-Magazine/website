import { describe, expect, test } from 'bun:test'
import { createClient } from '@supabase/supabase-js'
import { consumeDirectoryReturn, sendDirectoryLogin } from '../src/utils/directory-auth'
import { checkDirectoryAuthRedirect } from './check-directory-auth-redirect.mjs'
function cookieJar(initial = {}) {
  const values = new Map(Object.entries(initial))
  const writes = []
  const deleted = []
  const cookies = {
    get: (name) => (values.has(name) ? { value: values.get(name) } : undefined),
    set: (name, value, options) => {
      values.set(name, value)
      writes.push({ name, value, options })
    },
    delete: (name, options) => {
      values.delete(name)
      deleted.push({ name, options })
    },
  }
  return { cookies, values, writes, deleted }
}
function authClient(fail = false) {
  const requests = []
  const client = createClient('https://auth.example.test', 'test-public-key', {
    auth: { flowType: 'pkce', persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input) => {
        requests.push(new URL(String(input)))
        return new Response(JSON.stringify(fail ? { msg: 'Email rate limit exceeded' } : {}), {
          status: fail ? 429 : 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  })
  return { client, requests }
}
describe('directory email login', () => {
  const vote = '/nomad_directory/vote/?listing=example&return_to=%2Fnomad_directory%2F%23listing-example'
  for (const destination of [null, '/console/badges/', vote, '/nomad_directory/coliving/#listing-example']) {
    test(`exact allowed callback and round-trip destination: ${destination ?? 'owner console'}`, async () => {
      const { client, requests } = authClient()
      const jar = cookieJar()
      const url = new URL('https://nomad-magazine.com/nomad-directory-edit/')
      if (destination) url.searchParams.set('next', destination)
      const result = await sendDirectoryLogin(client, jar.cookies, url, 'owner@example.test')
      expect(result.error).toBeNull()
      expect(requests).toHaveLength(1)
      expect(requests[0].pathname).toBe('/auth/v1/otp')
      // This is the actual redirect_to emitted by supabase-js, matched against the live exact allowlist.
      expect(requests[0].searchParams.get('redirect_to')).toBe('https://nomad-magazine.com/auth/callback/')
      expect(jar.writes[0].options).toEqual({ path: '/auth/callback/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 3600 })
      expect(consumeDirectoryReturn(jar.cookies, new URL('https://nomad-magazine.com/auth/callback/?code=test'))).toBe(destination ?? '/console/')
      expect(jar.deleted[0].options.path).toBe('/auth/callback/')
      expect(jar.values.size).toBe(0)
    })
  }
  test('normal login replaces a previous badge destination', async () => {
    const jar = cookieJar({ 'nomad-directory-return': '/console/badges/' })
    await sendDirectoryLogin(authClient().client, jar.cookies, new URL('https://nomad-magazine.com/nomad-directory-edit/'), 'owner@example.test')
    expect(consumeDirectoryReturn(jar.cookies, new URL('https://nomad-magazine.com/auth/callback/'))).toBe('/console/')
  })
  test('failed email send does not store a new destination', async () => {
    const jar = cookieJar()
    expect(
      (await sendDirectoryLogin(authClient(true).client, jar.cookies, new URL('https://nomad-magazine.com/nomad-directory-edit/?next=/console/badges/'), 'owner@example.test'))
        .error,
    ).not.toBeNull()
    expect(jar.writes).toHaveLength(0)
  })
  test('legacy next parameter remains supported and is validated', () => {
    const jar = cookieJar({ 'nomad-directory-return': '/console/badges/' })
    expect(consumeDirectoryReturn(jar.cookies, new URL('https://nomad-magazine.com/auth/callback/?token_hash=test&type=magiclink&next=/nomad_directory/'))).toBe(
      '/nomad_directory/',
    )
    expect(jar.values.size).toBe(0)
  })
  for (const value of ['https://evil.example/', '//evil.example/', '/\\evil.example/', '/console/admin/directory/', '/nomad_directory/../../outside/', '/console/badges/\n']) {
    test(`rejects untrusted destination: ${JSON.stringify(value)}`, async () => {
      const jar = cookieJar({ 'nomad-directory-return': value })
      expect(consumeDirectoryReturn(jar.cookies, new URL('https://nomad-magazine.com/auth/callback/'))).toBe('/console/')
      const url = new URL('https://nomad-magazine.com/nomad-directory-edit/')
      url.searchParams.set('next', value)
      await sendDirectoryLogin(authClient().client, jar.cookies, url, 'owner@example.test')
      expect(jar.writes[0].value).toBe('/console/')
    })
  }
  test('missing or expired cookie safely defaults to owner console', () => {
    expect(consumeDirectoryReturn(cookieJar().cookies, new URL('https://nomad-magazine.com/auth/callback/'))).toBe('/console/')
  })
  test('local HTTP callback remains usable in isolated tests', async () => {
    const { client, requests } = authClient()
    const jar = cookieJar()
    await sendDirectoryLogin(client, jar.cookies, new URL('http://localhost:3000/nomad-directory-edit/?next=/console/badges/'), 'owner@example.test')
    expect(requests[0].searchParams.get('redirect_to')).toBe('http://localhost:3000/auth/callback/')
    expect(jar.writes[0].options.secure).toBe(false)
  })
})
describe('hosted redirect deployment preflight', () => {
  test('accepts an expired-token error sent to the exact production callback', async () => {
    await checkDirectoryAuthRedirect(async (_input, init) => {
      expect(init.redirect).toBe('manual')
      return new Response(null, { status: 303, headers: { Location: 'https://nomad-magazine.com/auth/callback/?error=access_denied&error_code=otp_expired' } })
    })
  })
  for (const location of ['http://localhost:3000/?error=access_denied', 'https://evil.example/auth/callback/', 'https://nomad-magazine.com/?error=access_denied']) {
    test(`fails deployment on fallback: ${location}`, async () => {
      await expect(checkDirectoryAuthRedirect(async () => new Response(null, { status: 303, headers: { Location: location } }))).rejects.toThrow('Auth redirected away')
    })
  }
  test('fails on unavailable auth instead of declaring success', async () => {
    await expect(checkDirectoryAuthRedirect(async () => new Response(null, { status: 503 }))).rejects.toThrow('HTTP 503')
  })
})
