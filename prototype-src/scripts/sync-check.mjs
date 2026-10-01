// Checks the controls added in the Oct 1 Figma sync (concept 1).
import { chromium } from 'playwright'
const out = process.argv[2] ?? 'extraction'
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const toast = async () => (await p.locator('.toast').count()) ? (await p.locator('.toast').innerText()).replace(/\n/g, ' ') : '-'
await p.goto('http://localhost:5178/'); await p.waitForTimeout(500)
const salesCells = () => p.locator('[data-n="Cell / Total"]').count()
console.log('sales/total header cells before', await salesCells())
await p.click('[role=switch][aria-label="Show sale"] >> nth=0'); await p.waitForTimeout(200)
console.log('after Show sale off', await salesCells(), 'aria', await p.locator('[role=switch][aria-label="Show sale"]').getAttribute('aria-checked'))
await p.screenshot({ path: out + '/sync-switch.png', clip: { x: 348, y: 400, width: 740, height: 200 } })
await p.click('text=Preview PDF'); await p.waitForTimeout(200); console.log('Preview PDF →', await toast())
await p.click('text=Add from wishlist'); await p.waitForTimeout(300); console.log('wishlist dialog', await p.locator('.dialog-title').innerText()); await p.keyboard.press('Escape'); await p.waitForTimeout(300)
await p.click('text=Add project'); await p.waitForTimeout(300); console.log('project dialog', await p.locator('.dialog-title').innerText()); await p.keyboard.press('Escape'); await p.waitForTimeout(300)
await p.click('[role=checkbox][aria-label="Mark as done"] >> nth=0'); await p.waitForTimeout(200)
console.log('agenda pill', await p.locator('text=/open tasks?$/').first().innerText())
await p.click('text=Complete settings'); await p.waitForTimeout(300)
console.log('tab after Complete settings', await p.locator('.tcard-head h2').first().innerText())
await b.close()
