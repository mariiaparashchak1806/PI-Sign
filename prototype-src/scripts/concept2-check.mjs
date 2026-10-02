// Concept 2: full-page screenshot, kitchen expand, AI drawer, console errors.
import { chromium } from 'playwright'
const out = process.argv[2] ?? 'extraction'
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
await p.goto('http://localhost:5178/concept-2/'); await p.waitForTimeout(600)
await p.screenshot({ path: `${out}/c2-full.png`, fullPage: true })
await p.click('[data-id="93:8375"]'); await p.waitForTimeout(300)
await p.screenshot({ path: `${out}/c2-kitchen.png`, clip: { x: 324, y: 60, width: 1116, height: 900 } })
await p.getByText('AI Assistant', { exact: true }).first().click(); await p.waitForTimeout(300)
await p.screenshot({ path: `${out}/c2-ai.png` })
console.log('errors', errs); await b.close()
