// Show cost / Show sale off → remaining columns stretch (concept 1 switches, concept 2 columns popover).
import { chromium } from 'playwright'
const out = process.argv[2] ?? 'extraction'
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
const edges = () => p.evaluate(() => ['93:8360', '93:8375', '42:10752'].map((id) => { const row = document.querySelector(`[data-id="${id}"]`); return [...row.children].slice(0, 6).map((c) => Math.round(c.getBoundingClientRect().right)) }))
await p.goto('http://localhost:5178/'); await p.waitForTimeout(500)
const shot = async (name) => { const box = await p.locator('[data-id="42:10511"]').boundingBox(); await p.screenshot({ path: `${out}/${name}.png`, clip: { x: box.x, y: box.y, width: box.width, height: 330 } }) }
console.log('both on  ', JSON.stringify(await edges()))
await p.click('[role=switch][aria-label="Show sale"]'); await p.waitForTimeout(150)
console.log('sale off ', JSON.stringify(await edges()))
await p.click('[role=switch][aria-label="Show cost"]'); await p.waitForTimeout(150)
console.log('both off ', JSON.stringify(await edges())); await shot('cols-off')
await p.goto('http://localhost:5178/?concept=2'); await p.waitForTimeout(500)
await p.click('[data-id="93:8348"]'); await p.waitForTimeout(200)
await p.click('.menu >> text=Show cost'); await p.click('.menu >> text=Show sale'); await p.keyboard.press('Escape'); await p.waitForTimeout(200)
console.log('c2 off   ', JSON.stringify(await edges())); await shot('cols-off-c2')
console.log('errors', errs); await b.close()
