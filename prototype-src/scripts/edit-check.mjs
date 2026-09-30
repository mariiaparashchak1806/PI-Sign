import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:5178/?tab=materials'); await p.waitForTimeout(400)
await p.click('[role=radio]:has-text("Edit")'); await p.fill('[aria-label="Quantity of Cabinet pulls, brushed nickel"]', '30'); await p.waitForTimeout(200)
console.log(await p.locator('.tline.subtotal .tline-total').innerText())
await p.click('.tcard-toolbar .btn-primary'); await p.waitForTimeout(300); console.log(await p.locator('.dialog.catalog .dialog-title').innerText())
await p.screenshot({ path: process.argv[2] + '/edit.png', clip: { x: 324, y: 330, width: 1116, height: 560 } })
await b.close()
