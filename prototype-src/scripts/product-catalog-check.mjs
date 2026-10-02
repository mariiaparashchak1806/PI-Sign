// Materials / Countertops catalog (redrawn from staging): columns, filters, toggles, PICK → panel, OK adds to the project
import { chromium } from 'playwright'
const base = process.argv[2] ?? 'http://localhost:5178/PI-Sign/prototype'
const out = process.argv[3]
const b = await chromium.launch({ channel: 'chrome' }); let bad = 0
const check = (ok, label, extra = '') => { if (!ok) bad++; console.log(ok ? 'ok  ' : 'FAIL', label, extra) }
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
for (const path of ['concept-1/', 'concept-1/option-2/']) {
  for (const [tab, kind] of [['countertops', 'Countertops'], ['materials', 'Materials']]) {
    await p.goto(`${base}/${path}?tab=${tab}`); await p.waitForTimeout(800)
    await p.locator('.tgroup .btn', { hasText: 'Add from catalog' }).first().click(); await p.waitForTimeout(700)
    const d = p.locator('.dialog.pc')
    check(await d.locator('.dialog-title').innerText() === kind, `${path} ${kind}: title`)
    const head = (await d.locator('.lc-row.head').innerText()).replace(/\s+/g, ' ')
    check(/IMAGE TITLE DESCRIPTION CATEGORY PRICE/i.test(head), `${kind}: columns`, head)
    if (out && path === 'concept-1/') await p.screenshot({ path: `${out}/pc-${tab}.png` })
    if (kind === 'Countertops') {
      check(await d.locator('.pc-row').count() === 7, 'countertops rows', String(await d.locator('.pc-row').count()))
      const r1 = await d.locator('.pc-row').first().innerText(); check(r1.includes('SKU1727986026007 - Cambria') && r1.includes('Finish: Polished Only') && r1.includes('Cost: 90.00 USD') && r1.includes('Multiplier: 1.80') && r1.includes('Sale: 162.00 USD'), 'row as in original', '')
      await d.locator('input[aria-label="Brand"]').fill('Silestone'); await p.waitForTimeout(150); check(await d.locator('.pc-row').count() === 1, 'brand filter')
      await d.locator('input[aria-label="Brand"]').fill('')
      await d.locator('.lc-toggles button').first().click(); await p.waitForTimeout(100); check(!(await d.locator('.pc-row').first().innerText()).includes('Cost:'), '$ toggle hides cost'); await d.locator('.lc-toggles button').first().click()
    }
    await d.locator('.lc-pick').first().click(); await d.locator('.lc-pick').first().click(); await p.waitForTimeout(150)
    check(await d.locator('.lc-cart-row').count() === 1 && await d.locator('.lc-qty > span').first().innerText() === '2', `${kind}: PICK twice → qty 2`)
    if (out && path === 'concept-1/' && kind === 'Countertops') await p.screenshot({ path: `${out}/pc-picked.png` })
    await d.locator('.catalog-foot .btn-primary').click(); await p.waitForTimeout(600)
    const g = await p.locator('.tgroup').first().innerText(); check(kind === 'Countertops' ? g.includes('Cambria Ridgegate') : g.includes('Shaker base cabinet 36"\n') || /10 pcs/.test(g), `${kind}: OK adds to Kitchen`, '')
  }
}
check(!errs.length, 'console clean', errs.slice(0, 2).join(' | '))
await b.close(); process.exit(bad ? 1 : 0)
