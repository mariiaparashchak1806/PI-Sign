// AI side panel (Figma 236:4266): opens from each concept's entry point, fills the viewport height, every control acts
import { chromium } from 'playwright'
const base = process.argv[2] ?? 'http://localhost:5178/PI-Sign/prototype'
const pages = [['concept-1/', '222:12622'], ['concept-1/option-2/', '206:6024'], ['concept-2/', '222:12622']]
const b = await chromium.launch({ channel: 'chrome' }); let bad = 0
for (const [path, entry] of pages) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  await p.goto(base + '/' + path); await p.waitForTimeout(800)
  await p.locator(`[data-id="${entry}"]`).first().click(); await p.waitForTimeout(900)
  const box = await p.locator('.ai-panel').boundingBox()
  const foot = await p.locator('[data-id="236:4370"]').boundingBox()
  await p.locator('[data-id="236:4362"]').click(); await p.waitForTimeout(300)
  await p.locator('.ai-panel input').fill('Hello'); await p.keyboard.press('Enter'); await p.waitForTimeout(300)
  const turns = await p.locator('.aip-turn').count()
  const name = await p.locator('[data-id="236:4273"]').innerText()
  await p.locator('[data-id="236:4282"]').click(); await p.waitForTimeout(1200)
  const closed = !(await p.locator('.ai-panel').count())
  const ok = box && Math.round(box.height) === 900 && Math.round(box.x + box.width) === 1440 && foot && foot.y + foot.height <= 900 && turns === 2 && closed && !errs.length
  if (!ok) bad++
  console.log(ok ? 'ok  ' : 'FAIL', path, JSON.stringify({ box, footBottom: foot && foot.y + foot.height, turns, name, closed, errs }))
  await p.close()
}
await b.close(); process.exit(bad ? 1 : 0)
