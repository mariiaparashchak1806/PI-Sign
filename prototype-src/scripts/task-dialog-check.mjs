// Add task = the staging original's three fields (Task, Due Date, Description); adding puts the task into Agenda.
// usage: node scripts/task-dialog-check.mjs [base]
import { chromium } from 'playwright'
const base = process.argv[2] ?? 'http://localhost:5178'
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); let bad = 0
const errs = []; p.on('pageerror', (e) => errs.push(e.message))
const ok = (c, m, x = '') => { console.log(c ? 'ok  ' : 'FAIL', m, x); if (!c) bad++ }
for (const path of ['/concept-1/', '/concept-1/option-2/', '/concept-2/']) {
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(300)
  await p.getByText('Add task', { exact: true }).first().click(); await p.waitForTimeout(300)
  const d = p.locator('[role="dialog"]')
  const labels = await d.locator('.field-label, label > span:first-child').allInnerTexts().catch(() => [])
  const txt = await d.innerText()
  ok(/Task/.test(txt) && /Due Date/.test(txt) && /Description/.test(txt) && !/Title|Task type|Assignee|Optional/.test(txt), `${path} three fields only`, txt.replace(/\n/g, ' | ').slice(0, 140))
  ok(await d.locator('button', { hasText: 'Add task' }).isDisabled(), `${path} Add disabled until filled`)
  await d.locator('select').first().selectOption('Measurement'); await d.locator('input[placeholder="MM/DD/YYYY"]').fill('10/06/2026')
  await d.locator('button', { hasText: 'Add task' }).click(); await p.waitForTimeout(400)
  ok((await p.locator('[data-id="42:10916"]').first().innerText()).includes('Measurement'), `${path} task added to Agenda`)
}
ok(!errs.length, 'console clean', errs.join(' | ')); await b.close(); process.exit(bad ? 1 : 0)
