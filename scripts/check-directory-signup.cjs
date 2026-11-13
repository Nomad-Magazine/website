const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const base = process.env.DIRECTORY_TEST_URL || 'http://localhost:3000'
const mail = process.env.DIRECTORY_TEST_MAIL_URL || 'http://127.0.0.1:54324'
for (const url of [base, mail]) assert(['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'Local fixtures only')
;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true })
  const p = await b.newPage()
  const email = `directory-signup-${Date.now()}@example.test`
  await p.goto(base + '/nomad-directory-edit/')
  await p.getByRole('textbox', { name: 'Email address' }).fill(email)
  await p.getByRole('form', { name: 'Sign in or create a directory account' }).getByRole('button').click()
  await p.waitForLoadState('domcontentloaded')
  assert((await p.locator('body').textContent()).includes(`Check ${email}`))
  let msg
  for (let n = 0; n < 10; n++) {
    const r = await fetch(mail + '/api/v1/messages').then((r) => r.json())
    msg = r.messages.find((m) => m.To.some((t) => t.Address === email))
    if (msg) break
    await new Promise((r) => setTimeout(r, 200))
  }
  assert(msg, 'Local signup email delivered')
  const detail = await fetch(`${mail}/api/v1/message/${msg.ID}`).then((r) => r.json())
  const link = detail.HTML.match(/href="([^"]*\/auth\/v1\/verify[^\"]+)"/)[1].replaceAll('&amp;', '&')
  await p.goto(link)
  await p.waitForURL(base + '/console/')
  assert(await p.getByRole('heading', { name: 'Let’s get your business listed.' }).isVisible())
  await b.close()
  console.log('PASS: public signup form → local email delivery → PKCE confirmation → authenticated empty owner workspace.')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
