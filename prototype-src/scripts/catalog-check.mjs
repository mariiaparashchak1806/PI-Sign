// Opens each "Add from catalog" link and screenshots the picker.
import { chromium } from 'playwright'
const out = process.argv[2] ?? 'extraction'
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []; p.on('pageerror', (e) => errs.push(e.message))
await p.goto('http://localhost:5178/'); await p.waitForTimeout(500)
for (const id of ['72:6325', '72:6346', '72:6363']) {
  await p.click(`[data-id="${id}"]`); await p.waitForTimeout(400)
  await p.screenshot({ path: `${out}/catalog-${id.replace(':', '-')}.png` })
  console.log(id, await p.locator('.dialog.catalog .dialog-title').innerText())
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
}
console.log('errors', errs); await b.close()
