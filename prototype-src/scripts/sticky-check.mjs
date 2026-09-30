// Scrolls Overview and screenshots the viewport (sticky sidebar + filter badge).
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto(process.argv[3] ?? 'http://localhost:5178/'); await p.waitForTimeout(500)
await p.mouse.wheel(0, 1200); await p.waitForTimeout(400)
await p.screenshot({ path: process.argv[2] + '/sticky.png' })
console.log('sidebar top', await p.evaluate(() => document.querySelector('[data-id="19:974"]').getBoundingClientRect().top), 'badge', await p.locator('.count-badge').innerText())
await b.close()
