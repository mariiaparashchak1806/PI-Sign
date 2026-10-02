// "Add from catalog" pickers after the designer's review (Oct 2), every concept / option:
// title "Add <kind> to <project>", columns follow the table's Cost / Sale switches, row click and "+" pick,
// − n + in the row and in the selection, chips, search across categories, "Clear" / "Add N … · $X" adds lines, Replace mode.
// usage: node scripts/catalog-check.mjs [base]   (base = http://localhost:5178)
import { chromium } from 'playwright'
const base = process.argv[2] ?? 'http://localhost:5178'
const b = await chromium.launch({ channel: 'chrome' }); let bad = 0
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
const ok = (c, m, x = '') => { console.log(c ? 'ok  ' : 'FAIL', m, x); if (!c) bad++ }
const title = () => p.locator('.dialog.catalog .dialog-title').innerText().catch(() => '')
for (const path of ['/', '/concept-1/option-2/']) {
  // Labors tab: Cost off / Sale on by default → one "Sale price" column
  await p.goto(base + path + '?tab=labors', { waitUntil: 'networkidle' }); await p.waitForTimeout(400)
  await p.locator('.tgroup .btn', { hasText: 'Add from catalog' }).first().click(); await p.waitForTimeout(500)
  ok(await title() === 'Add labors to Kitchen', `${path} labors tab title`, await title())
  const head = await p.locator('.cp .lc-row.head').innerText()
  ok(/Sale price/.test(head) && !/Cost/.test(head) && !/#/.test(head), `${path} columns follow the tab (sale only, no #)`, head.replace(/\n/g, ' '))
  ok(!(await p.locator('.cp .lc-pick, .cp .lc-field, .cp .lc-toggles').count()), `${path} no PICK buttons / price fields / $ toggles`)
  ok(/No labors selected yet/.test(await p.locator('.cp-side').innerText()), `${path} empty selection text`)
  const row = (t) => p.locator('.cp-row', { hasText: t }).first()
  await row('Fly Screen').click(); await row('Blind Shade for').locator('.cp-add').click()
  await row('Blind Shade for').getByLabel(/^Increase/).click(); await p.waitForTimeout(150)
  ok(await p.locator('.cp-row.is-picked').count() === 2, `${path} row click + "+" pick, rows highlighted`)
  const foot = await p.locator('.cp .catalog-foot .btn-primary').innerText()
  ok(foot === 'Add 2 labors · $16.20', `${path} footer`, foot)
  ok(/\$5\.40 \/ pcs/.test(await row('Fly Screen').innerText()), `${path} price with unit`)
  await row('Fly Screen').click(); await p.waitForTimeout(100)
  ok(await p.locator('.cp-row.is-picked').count() === 1, `${path} clicking a picked row removes it`)
  await p.locator('.cp-nav .lc-nav-item', { hasText: 'Carpentry work' }).click(); await p.waitForTimeout(100)
  ok(await p.locator('.cp-chip').count() === 1 && await p.locator('.cp-row').count() === 1, `${path} category chip + filter`)
  await p.getByLabel('Search all labors').fill('glass'); await p.waitForTimeout(150)
  ok(await p.locator('.cp-row').count() === 4 && /in all categories/.test(await p.locator('.cp-chips').innerText()), `${path} search runs across categories`)
  await p.locator('.cp-chip button').first().click(); await p.waitForTimeout(100)
  await p.locator('.cp .catalog-foot .btn-primary').click(); await p.waitForTimeout(500)
  ok(/Blind Shade for siding installation/.test(await p.locator('.tgroup').first().innerText()), `${path} Add puts the line into Kitchen`)
  // Replace mode from the row menu
  await p.locator('.tgroup [aria-label^="Actions for Demolition"]').first().click(); await p.getByRole('menuitem', { name: /Replace from catalog/ }).click(); await p.waitForTimeout(500)
  ok(/^Replace “Demolition/.test(await title()) && !(await p.locator('.cp-side').count()), `${path} replace mode title, no selection panel`, await title())
  await row('Roof Blind Shade').click(); await p.waitForTimeout(500)
  ok(/Roof Blind Shade installation/.test(await p.locator('.tgroup').first().innerText()), `${path} replace swaps the line`)
  // Countertops from Overview (Show cost + Show sale on) → both columns, image thumbs in the selection
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(400)
  const links = p.getByText('Add from catalog', { exact: true })
  if (await links.count() >= 3) {
    await links.nth(2).click(); await p.waitForTimeout(500)
    ok(await title() === 'Add countertops to Kitchen', `${path} overview countertops title`, await title())
    const h2 = await p.locator('.cp .lc-row.head').innerText()
    ok(/Cost/.test(h2) && /Sale price/.test(h2), `${path} overview: cost + sale columns`, h2.replace(/\n/g, ' '))
    await p.locator('.cp-row').first().click(); await p.locator('.cp-row').nth(1).locator('.cp-add').click(); await p.waitForTimeout(100)
    ok(await p.locator('.cp-cart-row').count() === 2 && await p.locator('.cp-cart-row .cp-thumb img').count() === 2, `${path} selection with thumbnails`)
    ok(await p.locator('.cp .catalog-foot .btn-primary').innerText() === 'Add 2 countertops · $324', `${path} countertops footer`)
    await p.locator('.cp .catalog-foot .btn-secondary').click(); await p.waitForTimeout(100)
    ok(/No countertops selected yet/.test(await p.locator('.cp-side').innerText()), `${path} Clear empties the selection`)
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  }
}
// Concept 2: Kitchen → Materials "Add from catalog"
await p.goto(base + '/concept-2/', { waitUntil: 'networkidle' }); await p.waitForTimeout(400)
await p.locator('[data-id="93:8375"]').first().click(); await p.waitForTimeout(300)
await p.getByText('Add from catalog', { exact: true }).first().click(); await p.waitForTimeout(500)
ok(await title() === 'Add materials to Kitchen', 'concept 2 materials title', await title())
ok(!errs.length, 'console clean', errs.join(' | '))
await b.close(); process.exit(bad ? 1 : 0)
