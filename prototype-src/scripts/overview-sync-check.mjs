// Concept 1 · Option 1 after the Oct 2 Figma sync: lead card details toggle, Kitchen groups, item ⋯, Add from catalog ×3,
// project row ⋯ and status, column switches. Usage: node scripts/overview-sync-check.mjs [base]
import { chromium } from 'playwright'
const base = process.argv[2] ?? 'http://localhost:5178/'
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
let bad = 0; const ok = (c, m, x = '') => { console.log(c ? 'ok  ' : 'FAIL', m, x); if (!c) bad++ }
await p.goto(base, { waitUntil: 'networkidle' }); await p.waitForTimeout(400)
const vis = (sel) => p.locator(sel).first().isVisible().catch(() => false)
ok(await vis('[data-id="264:51998"]'), 'lead card (Show details variant) visible')
await p.click('[data-id="I264:51998;264:51751"]'); await p.waitForTimeout(300)
ok(await vis('[data-id="109:6980"]') && !(await vis('[data-id="264:51998"]')), 'Show details → Hide details variant')
const w = await p.locator('[data-id="109:6980"]').boundingBox(); ok(w && w.width > 700, 'details card fills the row', w?.width)
await p.click('[data-id="I109:6980;109:3071"]'); await p.waitForTimeout(300)
ok(await vis('[data-id="264:51998"]'), 'Hide details → back')
const add = p.getByText('Add from catalog', { exact: true })
ok(await add.count() === 3, 'three Add from catalog links', await add.count())
for (const [i, k] of ['Materials', 'Labors', 'Countertops'].entries()) {
  await add.nth(i).click(); await p.waitForTimeout(400)
  const t = await p.locator('.dialog.catalog .dialog-title').innerText().catch(() => '')
  ok(t === k, `Add from catalog #${i + 1} → ${k}`, t); await p.keyboard.press('Escape'); await p.waitForTimeout(300)
}
const item = p.locator('[data-n^="Line item"]').filter({ hasText: 'Shaker base cabinet' }).first()
await item.hover(); await item.locator('[data-n="Icon button"]').click(); await p.waitForTimeout(250)
ok(await vis('[role="menu"]') && (await p.locator('[role="menu"]').innerText()).includes('Replace from catalog'), 'item ⋯ menu')
await p.keyboard.press('Escape'); await p.waitForTimeout(200)
const row = p.locator('[data-id="93:8375"]'); await row.hover(); await row.locator('> [data-n="Icon button"]').click(); await p.waitForTimeout(250)
ok((await p.locator('[role="menu"]').innerText().catch(() => '')).includes('Delete project'), 'project ⋯ menu')
await p.keyboard.press('Escape'); await p.waitForTimeout(200)
await p.click('[data-id="I226:14358;189:8568"]'); await p.waitForTimeout(250)
ok((await p.locator('[role="menu"]').innerText().catch(() => '')).includes('Kitchen status'), 'status menu')
await p.keyboard.press('Escape'); await p.waitForTimeout(200)
await p.click('[data-id="93:8375"] [data-id="93:8379"]'); await p.waitForTimeout(300)
ok(!(await vis('[data-n^="Group header"]')), 'Kitchen collapses (groups hidden)')
await p.click('[data-id="93:8375"] [data-id="93:8379"]'); await p.waitForTimeout(300)
ok(await vis('[data-n^="Group header"]'), 'Kitchen expands again')
ok(!errs.length, 'console clean', errs.join(' | '))
await b.close(); process.exit(bad ? 1 : 0)
