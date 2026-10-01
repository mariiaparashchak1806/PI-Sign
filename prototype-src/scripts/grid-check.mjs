// Files & Photos grid view: render, card menu delete + undo, upload, viewer from a card.
import { chromium } from 'playwright'
const out = process.argv[2] ?? 'extraction'
const base = process.argv[3] ?? 'http://localhost:5178/concept-1/'
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
await p.goto(base + '?tab=files'); await p.waitForTimeout(500)
await p.click('[aria-label="Grid view"]'); await p.waitForTimeout(300)
await p.screenshot({ path: out + '/grid.png', fullPage: true })
const cards = () => p.locator('.fg-card').count()
console.log('cards', await cards())
await p.click('[aria-label="Actions for Before photo 1"] >> nth=0'); await p.waitForTimeout(150)
await p.screenshot({ path: out + '/grid-menu.png', clip: { x: 324, y: 300, width: 1116, height: 500 } })
await p.click('.fg-card-menu >> text=Delete'); await p.waitForTimeout(200); console.log('after delete', await cards(), (await p.locator('.toast').last().innerText()).replace(/\n/g, ' '))
await p.locator('.toast-undo').last().click(); await p.waitForTimeout(200); console.log('after undo', await cards())
await p.click('[aria-label="Open Before photo 3"] >> nth=0'); await p.waitForTimeout(300); console.log('viewer', await p.locator('.pv .dialog-sub').innerText()); await p.keyboard.press('Escape'); await p.waitForTimeout(300)
console.log('errors', errs); await b.close()
