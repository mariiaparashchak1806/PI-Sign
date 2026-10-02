// Concept 2: every tab opens its content (the concept 1 tab content) and the tab bar stays visible; controls on each tab act.
// usage: node scripts/concept2-tabs-check.mjs [base]
import { chromium } from 'playwright'
const base = process.argv[2] ?? 'http://localhost:5178'
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); let bad = 0
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
await p.goto(base + '/concept-2/', { waitUntil: 'networkidle' }); await p.waitForTimeout(400)
const labels = ['Agenda', 'Files & Photos', 'Labors', 'Materials', 'Countertops', 'Payment Plan', 'Signed documents', 'Messages', 'Forms', 'Overview']
const expect = { Agenda: 'Add task', 'Files & Photos': 'Before Photos', Labors: 'Add from catalog', Materials: 'Add from catalog', Countertops: 'Add from catalog', 'Payment Plan': 'Payment Plan', 'Signed documents': 'Signed documents', Messages: 'Messages', Forms: 'Forms', Overview: 'Needs attention' }
for (const l of labels) {
  const tab = p.locator('[data-id="19:1210"] [data-n^="Tab"]', { hasText: l }).first()
  await tab.scrollIntoViewIfNeeded().catch(() => {}); await tab.click(); await p.waitForTimeout(450)
  const bar = await p.locator('[data-id="19:1210"]').first().isVisible().catch(() => false)
  const active = await p.locator('[data-id="19:1210"]').first().innerText().catch(() => '')
  const main = await p.locator('[data-id="19:1231"], .tab-content').first().innerText().catch(() => '')
  const ok = bar && main.includes(expect[l]); if (!ok) bad++
  console.log(ok ? 'ok  ' : 'FAIL', l, JSON.stringify({ tabsVisible: bar, content: main.slice(0, 60).replace(/\n/g, ' ') }))
}
console.log(errs.length ? 'FAIL ' + errs.join(' | ') : 'ok   console clean'); await b.close(); process.exit(bad || errs.length ? 1 : 0)
