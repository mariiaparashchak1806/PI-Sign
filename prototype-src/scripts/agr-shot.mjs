// Screenshot of the Agreement Settings block (Signed documents tab).
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:5178/?tab=agreements'); await p.waitForTimeout(500)
const box = await p.locator('.tcard-body').boundingBox()
await p.screenshot({ path: process.argv[2] + '/agr.png', clip: { x: box.x, y: box.y, width: box.width, height: 320 } }); await b.close()
