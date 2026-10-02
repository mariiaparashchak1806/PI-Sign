// "Add from catalog" picker (Figma 264:49341), every concept / option: title, switches (Show cost → Cost + Multiplier,
// Show price → Price, start from the table), "+ Add" → stepper + highlighted row, Selected · N + Clear, Subtotal,
// "Add N items to Kitchen" adds lines, Replace mode, filters + "N of M".   usage: node scripts/catalog-check.mjs [base]
import { chromium } from 'playwright'
const base = process.argv[2] ?? 'http://localhost:5178'
const b = await chromium.launch({ channel: 'chrome' }); let bad = 0
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
const ok = (c, m, x = '') => { console.log(c ? 'ok  ' : 'FAIL', m, x); if (!c) bad++ }
const title = () => p.locator('.cpk .dialog-title').innerText().catch(() => '')
const head = async () => (await p.locator('.cpk-row.head').innerText()).replace(/\n/g, ' ')
const sw = (l) => p.locator('.cpk-switches .tswitch', { hasText: l })
const row = (t) => p.locator('.cpk-row', { hasText: t }).first()
for (const path of ['/', '/concept-1/option-2/']) {
  await p.goto(base + path + '?tab=labors', { waitUntil: 'networkidle' }); await p.waitForTimeout(400)
  await p.locator('.tgroup .btn', { hasText: 'Add from catalog' }).first().click(); await p.waitForTimeout(500)
  ok(await title() === 'Add labors to Kitchen', `${path} title`, await title())
  let h = await head(); ok(/Price/.test(h) && !/Cost/.test(h), `${path} starts from the tab: price only`, h)
  await sw('Show cost').click(); h = await head(); ok(/Cost/.test(h) && /Multiplier/.test(h), `${path} Show cost → Cost + Multiplier`, h)
  await sw('Show price').click(); h = await head(); ok(!/Price/.test(h), `${path} Show price off → no Price`, h)
  await sw('Show price').click()
  ok(/No labors selected yet/.test(await p.locator('.cpk-side').innerText()) && await p.locator('.cpk-clear').count() === 0, `${path} empty selection`)
  await row('Fly Screen').getByRole('button', { name: 'Add' }).click(); await row('Blind Shade for').click()
  await row('Blind Shade for').getByLabel(/^Increase/).click(); await p.waitForTimeout(100)
  ok(await p.locator('.cpk-row.is-picked').count() === 2, `${path} Add + row click pick, rows highlighted`)
  ok(/Selected · 2/.test(await p.locator('.cpk-side-head').innerText()), `${path} Selected · 2`)
  ok(/\$16\.20/.test(await p.locator('.cpk-subtotal').innerText()) && await p.locator('.cpk-foot .btn-primary').innerText() === 'Add 2 items to Kitchen', `${path} subtotal + button`)
  await row('Fly Screen').getByLabel(/^Remove/).click(); await p.waitForTimeout(100)
  ok(await p.locator('.cpk-row.is-picked').count() === 1, `${path} − at 1 removes`)
  await p.getByLabel('Search labors').fill('glass'); await p.waitForTimeout(100)
  ok(/4 of 12/.test(await p.locator('.cpk-count').innerText()), `${path} search + N of M`, await p.locator('.cpk-count').innerText())
  await p.getByLabel('Search labors').fill('')
  await p.locator('.cpk-foot .btn-primary').click(); await p.waitForTimeout(500)
  ok(/Blind Shade for siding installation/.test(await p.locator('.tgroup').first().innerText()), `${path} adds the line to Kitchen`)
  await p.locator('.tgroup [aria-label^="Actions for Demolition"]').first().click(); await p.getByRole('menuitem', { name: /Replace from catalog/ }).click(); await p.waitForTimeout(500)
  ok(/^Replace “Demolition/.test(await title()) && !(await p.locator('.cpk-side').count()), `${path} replace mode`, await title())
  await row('Roof Blind Shade').getByRole('button', { name: 'Replace' }).click(); await p.waitForTimeout(500)
  ok(/Roof Blind Shade installation/.test(await p.locator('.tgroup').first().innerText()), `${path} replace swaps the line`)
  // Overview → Countertops (Show cost + Show sale on): all columns, brands / vendors / in stock, Clear
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(400)
  const links = p.getByText('Add from catalog', { exact: true })
  if (await links.count() >= 3) {
    await links.nth(2).click(); await p.waitForTimeout(500)
    ok(await title() === 'Add countertops to Kitchen', `${path} countertops title`)
    h = await head(); ok(/Cost/.test(h) && /Multiplier/.test(h) && /Price/.test(h), `${path} overview switches carried over`, h)
    ok(/7 of 7/.test(await p.locator('.cpk-count').innerText()), `${path} 7 of 7`)
    await p.getByLabel('Brand').selectOption('Silestone'); await p.waitForTimeout(100)
    ok(/1 of 7/.test(await p.locator('.cpk-count').innerText()), `${path} brand filter`)
    await p.getByLabel('Brand').selectOption(''); await p.locator('.cpk-cat', { hasText: 'Cambria' }).click(); await p.waitForTimeout(100)
    ok(/5 of 5/.test(await p.locator('.cpk-count').innerText()), `${path} category Cambria`, await p.locator('.cpk-count').innerText())
    await row('Rose Bay').getByRole('button', { name: 'Add' }).click()
    ok(await p.locator('.cpk-foot .btn-primary').innerText() === 'Add 1 item to Kitchen' && /\$162\.00/.test(await p.locator('.cpk-subtotal').innerText()), `${path} countertops selection`)
    await p.locator('.cpk-clear').click(); await p.waitForTimeout(100)
    ok(/No countertops selected yet/.test(await p.locator('.cpk-side').innerText()), `${path} Clear`)
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  }
}
await p.goto(base + '/concept-2/', { waitUntil: 'networkidle' }); await p.waitForTimeout(400)
await p.locator('[data-id="93:8375"]').first().click(); await p.waitForTimeout(300)
await p.getByText('Add from catalog', { exact: true }).first().click(); await p.waitForTimeout(500)
ok(await title() === 'Add materials to Kitchen', 'concept 2 materials', await title())
ok(!errs.length, 'console clean', errs.join(' | '))
await b.close(); process.exit(bad ? 1 : 0)
