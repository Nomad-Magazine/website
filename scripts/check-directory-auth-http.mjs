// Exercises the built Worker and real HTTP cookies with a fake Auth transport only.
// No Supabase stack, real emails, accounts, sessions or production writes.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { chromium } from 'playwright'

const origin = 'http://127.0.0.1:4318'
const redirects = []
const configPath = 'dist/server/auth-smoke.wrangler.json'
let worker
let workerLog = ''
let browser
const auth = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  res.setHeader('Content-Type', 'application/json')
  if (url.pathname === '/auth/v1/otp') {
    redirects.push(url.searchParams.get('redirect_to'))
    res.end('{}')
  } else if (url.pathname === '/auth/v1/token') {
    let body = ''
    for await (const chunk of req) body += chunk
    assert(JSON.parse(body).code_verifier, 'PKCE verifier must survive the real cookie round trip')
    const now = Math.floor(Date.now() / 1000)
    const user = {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'fixture@example.test',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    }
    const token = [
      Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
      Buffer.from(JSON.stringify({ sub: user.id, aud: user.aud, iat: now, exp: now + 3600 })).toString('base64url'),
      Buffer.from('local-test-signature-only').toString('base64url'),
    ].join('.')
    res.end(JSON.stringify({ access_token: token, refresh_token: 'local-test-refresh', expires_in: 3600, token_type: 'bearer', user }))
  } else {
    res.statusCode = 404
    res.end('{}')
  }
})

try {
  // Keep the built entry/assets, but do not let the production route rewrite the
  // local request's host (which would invalidate Astro's same-origin POST check).
  const config = JSON.parse(await readFile('dist/server/wrangler.json', 'utf8'))
  config.routes = []
  config.workers_dev = true
  await writeFile(configPath, JSON.stringify(config))
  await new Promise((resolve) => auth.listen(0, '127.0.0.1', resolve))
  const authPort = auth.address().port
  worker = spawn(
    process.execPath,
    [
      'node_modules/wrangler/bin/wrangler.js',
      'dev',
      '--config',
      configPath,
      '--port',
      '4318',
      '--local',
      '--var',
      `SUPABASE_URL:http://127.0.0.1:${authPort}`,
      '--var',
      'SUPABASE_ANON_KEY:local-test-public-key',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  worker.stdout.on('data', (data) => {
    workerLog += data
  })
  worker.stderr.on('data', (data) => {
    workerLog += data
  })
  let ready = false
  for (let i = 0; i < 60; i++) {
    if (worker.exitCode !== null) throw new Error(`Worker exited before startup: ${workerLog.slice(-3000)}`)
    try {
      if ((await fetch(origin + '/nomad-directory-edit/')).status === 200) {
        ready = true
        break
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  assert(ready, 'Built Worker did not start within 30 seconds')
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const vote = '/nomad_directory/vote/?listing=example&return_to=%2Fnomad_directory%2F%23listing-example'
  for (const next of ['/console/', '/console/badges/', vote]) {
    const context = await browser.newContext()
    const login = origin + '/nomad-directory-edit/' + (next === '/console/' ? '' : '?' + new URLSearchParams({ next }))
    const response = await context.request.post(login, { headers: { Origin: origin }, form: { email: 'fixture@example.test' }, maxRedirects: 0 })
    assert.equal(response.status(), 200, await response.text())
    assert((await response.text()).includes('Check fixture@example.test'))
    assert.equal(redirects.at(-1), origin + '/auth/callback/')
    const cookie = (await context.cookies(origin + '/auth/callback/')).find((c) => c.name === 'nomad-directory-return')
    assert(cookie?.httpOnly)
    assert.equal(cookie.sameSite, 'Lax')
    assert.equal(cookie.path, '/auth/callback/')
    assert.equal(
      (await context.cookies(origin + '/')).some((c) => c.name === 'nomad-directory-return'),
      false,
    )
    const callback = await context.request.get(origin + '/auth/callback/?code=local-test-code', { maxRedirects: 0 })
    assert.equal(callback.status(), 302)
    assert.equal(callback.headers().location, next)
    assert.equal(
      (await context.cookies(origin + '/auth/callback/')).some((c) => c.name === 'nomad-directory-return'),
      false,
    )
    assert(
      (await context.cookies()).some((c) => c.name.includes('auth-token')),
      'Session cookie is set after code exchange',
    )
    await context.close()
  }
  console.log(
    'PASS: built Worker HTTP signup/PKCE callback for account, badges and voting; exact email redirect, browser cookie scope/flags, return destination, session issuance and return-cookie deletion. Auth responses were mocked; no real email sent.',
  )
} finally {
  if (browser) await browser.close()
  if (worker) {
    worker.kill('SIGTERM')
    await new Promise((resolve) => {
      if (worker.exitCode !== null) resolve()
      else worker.once('exit', resolve)
    })
  }
  await new Promise((resolve) => auth.close(resolve))
  await unlink(configPath).catch(() => {})
}
