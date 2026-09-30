// Page height per tab vs content bottom (no empty tail).
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
for (const t of ['', 'agenda', 'files', 'forms']) {
  await p.goto('http://localhost:5178/' + (t ? `?tab=${t}` : '')); await p.waitForTimeout(400)
  console.log(t || 'overview', await p.evaluate(() => ({ page: document.documentElement.scrollHeight, content: Math.round(document.querySelector('[data-id="19:1099"]').getBoundingClientRect().bottom + scrollY) })))
}
console.log('errors', errs); await b.close()
