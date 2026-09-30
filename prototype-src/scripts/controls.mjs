// Controls audit: every clickable must visibly act (menu / dialog / toast / DOM change).
import { chromium } from 'playwright'
const url = process.argv[2] ?? 'http://localhost:5178/'
const browser = await chromium.launch({ channel: 'chrome' })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.goto(url, { waitUntil: 'networkidle' })
const targets = await page.evaluate(() => [...document.querySelectorAll('.clickable, .check-hit')].map((e) => ({ id: e.getAttribute('data-id') ?? e.querySelector('[data-id]')?.getAttribute('data-id'), n: e.getAttribute('data-n') ?? e.getAttribute('aria-label') })))
const res = []
for (const t of targets) {
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-id]')
  const snap = () => page.evaluate(() => ({ html: document.getElementById('root').innerHTML.length + ':' + document.getElementById('root').innerText.length, menu: !!document.querySelector('.menu'), dialog: !!document.querySelector('.dialog'), toast: document.querySelector('.toast')?.innerText ?? '' }))
  const before = await snap()
  const sel = `[data-id="${t.id}"]`
  const el = page.locator(sel).first()
  try { await el.scrollIntoViewIfNeeded(); await el.click({ timeout: 2000 }) } catch (e) { res.push({ ...t, ok: false, why: 'click failed ' + String(e).slice(0, 60) }); await page.close(); continue }
  await page.waitForTimeout(350)
  const after = await snap()
  const acted = after.menu ? 'menu' : after.dialog ? 'dialog' : after.toast ? 'toast: ' + after.toast.slice(0, 50) : after.html !== before.html ? 'dom change' : null
  res.push({ ...t, ok: !!acted, acted })
  await page.close()
}
await browser.close()
const bad = res.filter((r) => !r.ok)
console.log(`controls: ${res.length}, acting: ${res.length - bad.length}, dead: ${bad.length}, console errors: ${errors.length}`)
res.forEach((r) => console.log((r.ok ? '  ok  ' : '  DEAD') + ` ${r.id} ${r.n} → ${r.acted ?? r.why ?? ''}`))
if (errors.length) console.log('errors:', errors.slice(0, 5))
