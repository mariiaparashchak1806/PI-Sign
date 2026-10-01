// Each concept URL renders its own layout and no concept switch.
import { chromium } from 'playwright'
const base = process.argv[2] ?? 'http://localhost:5178'
const b = await chromium.launch({ channel: 'chrome' })
for (const path of ['/', '/concept-1/', '/concept-2/']) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  const r = await p.goto(base + path); await p.waitForTimeout(700)
  const isC2 = await p.locator('[data-id="124:2658"], [data-id^="124:"]').count() > 0
  const isC1 = await p.locator('[data-id="206:5636"]').count() > 0
  console.log(path, 'http', r?.status(), 'concept', isC2 ? 2 : isC1 ? 1 : '?', 'switch', await p.locator('.concept-switch').count(), 'errors', errs.length)
  await p.close()
}
await b.close()
