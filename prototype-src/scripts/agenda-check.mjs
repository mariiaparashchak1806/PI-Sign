// Agenda state logic (designer's spec, Oct 2): order, counters, per-state menus, On hold, Cancel filter, Resume with a past date, US date in Edit, Delete rights + Undo
import { chromium } from 'playwright'
const base = process.argv[2] ?? 'http://localhost:5178/PI-Sign/prototype'
const b = await chromium.launch({ channel: 'chrome' }); let bad = 0
const check = (ok, label, extra = '') => { if (!ok) bad++; console.log(ok ? 'ok  ' : 'FAIL', label, extra) }
for (const path of ['concept-1/', 'concept-1/option-2/', 'concept-2/']) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  await p.goto(base + '/' + path); await p.waitForTimeout(900)
  const rows = () => p.evaluate(() => [...document.querySelectorAll('[data-id^="50:951#"][data-n^="Row / Task"]')].filter((e) => e.offsetParent).map((e) => e.innerText.replace(/\s+/g, ' ').trim()))
  const count = () => p.evaluate(() => [...document.querySelectorAll('[data-n="Agenda"] *, [data-id="42:10916"] *')].find((e) => /open task/.test(e.textContent) && e.children.length === 0)?.textContent)
  const row = (name) => p.locator('[data-id^="50:951#"][data-n^="Row / Task"]', { hasText: name }).first()
  const menu = async (name) => { await row(name).hover(); await row(name).locator('[data-n="Button"], [data-n="Icon button"]').first().click(); await p.waitForTimeout(250); const items = await p.locator('.menu .menu-item').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim() + (e.disabled ? ' [disabled]' : ''))); return items }
  const pickMenu = async (label) => { await p.locator('.menu .menu-item', { hasText: label }).first().click(); await p.waitForTimeout(400) }
  console.log('==', path)
  let r = await rows()
  check(r[0]?.includes('Measure') && r[0]?.includes('Overdue') && r[1]?.includes('Prepare') && r[1]?.includes('Due today') && r[2]?.includes('Done'), 'order overdue → due today → done', JSON.stringify(r))
  check(/^2 open tasks/.test(await count()), 'counter', await count())
  let m = await menu('Measure'); check(m.join('|') === 'Edit task|Attach file|Put on hold|Cancel task|Delete task', 'overdue menu', m.join('|'))
  await pickMenu('Put on hold')
  r = await rows(); check(r[0]?.includes('Prepare') && r[1]?.includes('Measure') && r[1]?.includes('On hold'), 'on hold goes below open, pill On hold', JSON.stringify(r))
  const dueColor = await row('Measure').locator('[data-n="Due date"]').evaluate((e) => getComputedStyle(e).color); check(!/194, 65|180, 35|rgb\(2[0-9]{2}, [0-9]{1,2}, [0-9]{1,2}\)/.test(dueColor), 'on hold date not red', dueColor)
  check(/2 open tasks · 1 on hold/.test(await count()), 'counter with on hold', await count())
  m = await menu('Measure'); check(m.includes('Resume') && !m.includes('Put on hold'), 'on hold menu has Resume', m.join('|'))
  await p.keyboard.press('Escape')
  m = await menu('Prepare'); check(m.some((x) => x.startsWith('Delete task') && x.includes('[disabled]')), 'Delete disabled for another author (Mark Davis)', m.join('|'))
  await pickMenu('Cancel task')
  r = await rows(); check(r.length === 2 && r.some((x) => x.includes('Measure')) && !r.some((x) => x.includes('Prepare')), 'cancelled hidden, on-hold task still listed', JSON.stringify(r))
  check(/1 open task · 1 on hold/.test(await count()), 'counter after cancel', await count())
  const tog = p.locator('.agenda-toggle'); check(/Show 1 cancelled task/.test(await tog.innerText()), 'cancelled toggle'); await tog.click(); await p.waitForTimeout(200)
  r = await rows(); check(r[r.length - 1]?.includes('Prepare') && r[r.length - 1]?.includes('Cancelled'), 'cancelled shown last', r[r.length - 1])
  m = await menu('Prepare'); check(m[0] === 'Reopen task' && m.length === 2, 'cancelled menu = Reopen · Delete', m.join('|')); await p.keyboard.press('Escape')
  m = await menu('Confirm'); check(m[0] === 'Reopen task' && m.length === 2, 'done menu = Reopen · Delete', m.join('|')); await p.keyboard.press('Escape')
  // Resume with a past date → dialog asks for a new date
  await menu('Measure'); await pickMenu('Resume')
  const sub = await p.locator('[role="dialog"]').innerText(); check(/has passed/.test(sub) && /09\/24\/2026/.test(await p.locator('[role="dialog"] input[placeholder="MM/DD/YYYY"]').inputValue()), 'resume asks for a new date, US format', '')
  await p.locator('[role="dialog"] input[placeholder="MM/DD/YYYY"]').fill('10/05/2026'); await p.locator('[role="dialog"] button', { hasText: 'Resume task' }).click(); await p.waitForTimeout(400)
  r = await rows(); check(r.some((x) => x.includes('Measure') && x.includes('Oct 5, 2026') && x.includes('Upcoming')), 'resumed with new date → Upcoming', JSON.stringify(r))
  // checkbox: done / reopen
  await row('Measure').locator('[role="checkbox"]').click(); await p.waitForTimeout(300); r = await rows(); check(r.some((x) => x.includes('Measure') && x.includes('Done')), 'checkbox → Done')
  await p.locator('.toast button', { hasText: 'Undo' }).last().click(); await p.waitForTimeout(300); r = await rows(); check(r.some((x) => x.includes('Measure') && x.includes('Upcoming')), 'Undo after Done')
  // delete own task with Undo
  await menu('Confirm'); await pickMenu('Delete task'); r = await rows(); check(!r.some((x) => x.includes('Confirm')), 'delete')
  await p.locator('.toast button', { hasText: 'Undo' }).last().click(); await p.waitForTimeout(300); r = await rows(); check(r.some((x) => x.includes('Confirm')), 'Undo after delete')
  // header
  const head = await p.evaluate(() => document.querySelector('[data-id="42:11145"]')?.innerText.replace(/\s+/g, ' '))
  check(/Assignee/.test(head) && !/Created by/.test(head), 'header shows Assignee', head)
  check(!errs.length, 'console clean', errs.slice(0, 2).join(' | '))
  await p.close()
}
await b.close(); process.exit(bad ? 1 : 0)
