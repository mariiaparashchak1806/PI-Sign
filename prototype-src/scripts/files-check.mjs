// Files & Photos v2: list, viewer (names, nav, rename, delete+undo), real upload, grid; both concepts.
import { chromium } from 'playwright'
import fs from 'fs'
const out = process.argv[2] ?? 'extraction'
const b = await chromium.launch({ channel: 'chrome' })
const errs = []
for (const c of ['', '&concept=2']) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  await p.goto(`http://localhost:5178/?tab=files${c}`); await p.waitForTimeout(600)
  await p.screenshot({ path: `${out}/files${c ? '-c2' : ''}.png`, fullPage: true })
  if (c) { await p.close(); continue }
  await p.click('[aria-label="Open Before photo 3"]'); await p.waitForTimeout(400)
  await p.screenshot({ path: `${out}/viewer.png` })
  console.log('viewer:', await p.locator('.pv .dialog-title').innerText(), '|', await p.locator('.pv .dialog-sub').innerText(), '|', await p.locator('.pv-name b').innerText(), '|', await p.locator('.pv-meta').innerText())
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150); console.log('→', await p.locator('.pv-name b').innerText())
  await p.click('[aria-label="Rename"]'); await p.fill('.pv-rename', 'Left wall'); await p.keyboard.press('Enter'); await p.waitForTimeout(150); console.log('renamed', await p.locator('.pv-name b').innerText())
  console.log('no Move to folder', !(await p.locator('text=Move to folder').count()))
  await p.click('.pv >> text=Delete'); await p.waitForTimeout(250); console.log('after delete', await p.locator('.pv .dialog-sub').innerText(), '|', (await p.locator('.toast').last().innerText()).replace(/\n/g, ' '))
  await p.locator('.toast-undo').last().click(); await p.waitForTimeout(200); console.log('after undo', await p.locator('.pv .dialog-sub').innerText())
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  // real upload into Bathroom · Before Photos (image + a pdf that must be skipped)
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  const [chooser] = await Promise.all([p.waitForEvent('filechooser'), p.locator('.files-group').nth(1).locator('text=Add photos').first().click()])
  await chooser.setFiles([{ name: 'IMG_9001.png', mimeType: 'image/png', buffer: png }, { name: 'quote.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') }])
  await p.waitForTimeout(300); console.log('upload toast:', (await p.locator('.toast').last().innerText()).replace(/\n/g, ' '))
  console.log('bathroom warning gone:', (await p.locator('.files-group').nth(1).locator('.files-required-pill').count()) === 0)
  await p.click('[aria-label="Grid view"]'); await p.waitForTimeout(200)
  await p.screenshot({ path: `${out}/files-grid.png`, fullPage: true })
  await p.goto('http://localhost:5178/'); await p.waitForTimeout(300)
  await p.close()
}
console.log('errors', errs); await b.close()
