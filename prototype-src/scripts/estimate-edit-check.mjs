// Labors / Materials / Countertops: read-only rows, ⋯ Edit → one inline form, live totals, validation, Enter/Esc, switch prompt, Undo
import { chromium } from 'playwright'
const base = process.argv[2] ?? 'http://localhost:5178/PI-Sign/prototype'
const out = process.argv[3]
const b = await chromium.launch({ channel: 'chrome' }); let bad = 0
const check = (ok, label, extra = '') => { if (!ok) bad++; console.log(ok ? 'ok  ' : 'FAIL', label, extra) }
for (const path of ['concept-1/', 'concept-1/option-2/']) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  console.log('==', path)
  await p.goto(base + '/' + path + '?tab=labors'); await p.waitForTimeout(800)
  const kitchen = p.locator('.tgroup').first()
  const row = (n) => kitchen.locator('.est-row', { hasText: n }).first()
  const menu = async (n) => { await row(n).locator('[aria-haspopup="menu"]').click(); await p.waitForTimeout(200); return p.locator('.menu .menu-item').allInnerTexts() }
  check((await row('Cabinet installation').innerText()).includes('8 pcs') && !(await kitchen.locator('.stepper').count()), 'view mode: qty as text, no stepper')
  const m = await menu('Cabinet installation'); check(m.join('|') === 'Edit|Replace from catalog|Remove', 'row menu', m.join('|'))
  await p.locator('.menu .menu-item', { hasText: 'Edit' }).click(); await p.waitForTimeout(200)
  check(await p.locator('.est-edit').count() === 1, 'one row in edit mode')
  const ed = p.locator('.est-edit')
  await ed.locator('input[aria-label="Qty"]').fill('10'); await p.waitForTimeout(100)
  const totals = await kitchen.innerText()
  check(totals.includes('$1,500') && /Subtotal\s+\$2,700/.test(totals), 'live total + subtotal', '')
  await ed.locator('input[aria-label="Title"]').fill(''); check((await ed.innerText()).includes('Title can’t be empty') && await ed.locator('button', { hasText: 'Save' }).isDisabled(), 'empty title → error, Save disabled')
  await ed.locator('input[aria-label="Title"]').fill('Cabinet installation'); await ed.locator('input[aria-label="Qty"]').fill('0')
  check((await ed.innerText()).includes('Qty must be greater than 0') && await ed.locator('button', { hasText: 'Save' }).isDisabled(), 'qty 0 → error, Save disabled')
  await ed.locator('input[aria-label="Qty"]').fill('10'); await ed.locator('button', { hasText: 'Add description' }).click(); await ed.locator('textarea').fill('Upper cabinets only')
  if (out && path === 'concept-1/') await kitchen.screenshot({ path: out + '/est-edit.png' })
  await ed.locator('input[aria-label="Qty"]').press('Enter'); await p.waitForTimeout(300)
  check(!(await p.locator('.est-edit').count()) && (await row('Cabinet installation').innerText()).includes('10 pcs') && (await row('Cabinet installation').innerText()).includes('Upper cabinets only'), 'Enter saves → view with new values')
  check((await p.locator('.toast').last().innerText()).includes('Cabinet installation updated'), 'toast updated + Undo')
  await p.locator('.toast button', { hasText: 'Undo' }).last().click(); await p.waitForTimeout(300)
  check((await row('Cabinet installation').innerText()).includes('8 pcs'), 'Undo restores')
  // unsaved changes → switching rows asks first
  await menu('Cabinet installation'); await p.locator('.menu .menu-item', { hasText: 'Edit' }).click(); await p.waitForTimeout(150)
  await p.locator('.est-edit input[aria-label="Qty"]').fill('9')
  await menu('Demolition'); await p.locator('.menu .menu-item', { hasText: 'Edit' }).click(); await p.waitForTimeout(150)
  check((await p.locator('.est-edit').innerText()).includes('Save changes to Cabinet installation?'), 'switch prompt')
  await p.locator('.est-edit button', { hasText: 'Discard' }).click(); await p.waitForTimeout(150)
  check((await p.locator('.est-edit input[aria-label="Title"]').inputValue()) === 'Demolition & haul-away' && (await row('Cabinet installation').innerText()).includes('8 pcs'), 'Discard → other row opens, changes dropped')
  await p.locator('.est-edit input[aria-label="Title"]').press('Escape'); await p.waitForTimeout(150)
  check(!(await p.locator('.est-edit').count()), 'Esc cancels')
  await menu('Demolition'); await p.locator('.menu .menu-item', { hasText: 'Remove' }).click(); await p.waitForTimeout(300)
  check(!(await kitchen.innerText()).includes('Demolition') && (await p.locator('.toast').last().innerText()).includes('Demolition & haul-away removed'), 'remove → toast')
  await p.locator('.toast button', { hasText: 'Undo' }).last().click(); await p.waitForTimeout(300); check((await kitchen.innerText()).includes('Demolition'), 'Undo remove')
  // countertops: unit sq ft, edit available
  await p.goto(base + '/' + path + '?tab=countertops'); await p.waitForTimeout(700)
  const ct = p.locator('.tgroup').first(); check((await ct.innerText()).includes('42 sq ft'), 'countertops qty unit sq ft')
  await ct.locator('[aria-haspopup="menu"]').first().click(); await p.locator('.menu .menu-item', { hasText: 'Edit' }).click(); await p.waitForTimeout(150)
  check((await p.locator('.est-edit').innerText()).includes('sq ft'), 'countertops edit shows unit')
  check(!errs.length, 'console clean', errs.slice(0, 2).join(' | '))
  await p.close()
}
await b.close(); process.exit(bad ? 1 : 0)
