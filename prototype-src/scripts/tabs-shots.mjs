// Screenshots every non-Overview tab: node scripts/tabs-shots.mjs <outdir>
import { chromium } from 'playwright'
const out = process.argv[2] ?? 'extraction'
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
for (const t of ['labors', 'materials', 'countertops', 'payment', 'agreements', 'messages', 'forms']) {
  await p.goto(`http://localhost:5178/?tab=${t}`); await p.waitForTimeout(500)
  await p.screenshot({ path: `${out}/tab-${t}.png`, fullPage: true, clip: { x: 324, y: 330, width: 1116, height: 900 } })
}
console.log('errors', errs); await b.close()
