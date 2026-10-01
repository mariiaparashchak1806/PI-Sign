// Screenshot of the concept-1 contact card (default and hovering the phone row).
import { chromium } from 'playwright'
const out = process.argv[2] ?? 'extraction'
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
await p.goto('http://localhost:5178/'); await p.waitForTimeout(500)
const box = await p.locator('[data-id="85:3792"]').boundingBox()
await p.screenshot({ path: out + '/contact.png', clip: box })
await p.hover('[data-id="85:5281"]'); await p.waitForTimeout(200)
await p.screenshot({ path: out + '/contact-hover.png', clip: box })
console.log('call/sms in DOM:', await p.locator('[data-id="85:5286"], [data-id="85:5289"]').count(), 'errors', errs); await b.close()
