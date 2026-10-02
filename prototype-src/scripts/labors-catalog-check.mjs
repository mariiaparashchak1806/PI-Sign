// Labors catalog (redrawn from staging): opens from the Labors tab and Overview, PICK → right panel, qty, cost toggle, OK adds lines
import { chromium } from 'playwright'
const base = process.argv[2] ?? 'http://localhost:5178/PI-Sign/prototype'
const out = process.argv[3]
const b = await chromium.launch({ channel: 'chrome' }); let bad = 0
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
for (const path of ['concept-1/?tab=labors', 'concept-1/option-2/?tab=labors']) {
  await p.goto(base + '/' + path); await p.waitForTimeout(800)
  const btn = p.locator('.tgroup .btn', { hasText: 'Add from catalog' }).first(); await btn.click(); await p.waitForTimeout(700)
  const title = await p.locator('.dialog.lc .dialog-title').innerText().catch(() => null)
  if (out && path.startsWith('concept-1/?')) await p.screenshot({ path: out + '/lc-empty.png' })
  await p.locator('.lc-pick').nth(2).click(); await p.locator('.lc-pick').nth(2).click(); await p.locator('.lc-pick').nth(4).click(); await p.waitForTimeout(200)
  const cart = await p.locator('.lc-cart-row').count(); const q = await p.locator('.lc-qty > span').first().innerText()
  await p.locator('.lc-toggles button').first().click(); await p.waitForTimeout(200)
  const cols = await p.locator('.lc-row.head').innerText()
  if (out && path.startsWith('concept-1/?')) await p.screenshot({ path: out + '/lc-picked.png' })
  await p.locator('.lc .catalog-foot .btn-primary').click(); await p.waitForTimeout(600)
  const lines = await p.locator('.tgroup').first().innerText()
  const ok = title === 'Labors' && cart === 2 && q === '2' && /COST/i.test(cols) && /MULTIPLIER/i.test(cols) && /Blind Shade/.test(lines)
  if (!ok) bad++
  console.log(ok ? 'ok  ' : 'FAIL', path, JSON.stringify({ title, cart, q, cols: cols.replace(/\n/g, ' '), added: /Blind Shade/.test(lines) }))
}
// Concept 2: Labors tab is inert there → Overview, expand Kitchen, Labors "Add from catalog"
await p.goto(base + '/concept-2/'); await p.waitForTimeout(900)
await p.locator('[data-id="93:8375"]').first().click(); await p.waitForTimeout(500)
await p.locator('[data-n="Link Button"]', { hasText: 'Add from catalog' }).nth(1).click().catch(() => {}); await p.waitForTimeout(700)
const t1 = await p.locator('.dialog.lc .dialog-title').innerText().catch(() => null); if (t1 !== 'Labors') bad++
console.log(t1 === 'Labors' ? 'ok  ' : 'FAIL', 'concept 2 overview link', t1)
await p.keyboard.press('Escape'); await p.waitForTimeout(500)
// Overview link (Kitchen expanded → Labors "Add from catalog")
await p.goto(base + '/concept-1/'); await p.waitForTimeout(900)
await p.locator('[data-n="Link Button"]', { hasText: 'Add from catalog' }).nth(1).click(); await p.waitForTimeout(700)
const t2 = await p.locator('.dialog.lc .dialog-title').innerText().catch(() => null); if (t2 !== 'Labors') bad++
console.log(t2 === 'Labors' ? 'ok  ' : 'FAIL', 'overview link', t2)
await p.keyboard.press('Escape'); await p.waitForTimeout(500)
await p.locator('[data-n="Link Button"]', { hasText: 'Add from catalog' }).nth(0).click(); await p.waitForTimeout(700)
const t3 = await p.locator('.dialog.pc .dialog-title').innerText().catch(() => null)
console.log(t3 === 'Materials' ? 'ok  ' : 'FAIL', 'materials opens its own (original) picker', t3)
if (t3 !== 'Materials') bad++
console.log('console errors', errs.length, errs.slice(0, 3))
await b.close(); process.exit(bad || errs.length ? 1 : 0)
