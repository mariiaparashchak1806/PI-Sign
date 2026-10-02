// Messages = team thread: widget (Figma 296:13036) on every page shows the last team message; tab sends and updates it
import { chromium } from 'playwright'
const base = process.argv[2] ?? 'http://localhost:5178/PI-Sign/prototype'
const out = process.argv[3]
const b = await chromium.launch({ channel: 'chrome' }); let bad = 0
const check = (ok, label, extra = '') => { if (!ok) bad++; console.log(ok ? 'ok  ' : 'FAIL', label, extra) }
for (const path of ['concept-1/', 'concept-1/option-2/', 'concept-2/']) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }); const errs = []
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  await p.goto(base + '/' + path); await p.waitForTimeout(900)
  const W = path === 'concept-2/' ? { w: '334:11136', all: '334:11139' } : { w: '310:13676', all: 'I310:13676;184:7470' } // concept 2: own frame (Figma 334:11136)
  const w = p.locator(`[data-id="${W.w}"]`)
  const txt = (await w.innerText()).replace(/\s+/g, ' ')
  check(/Messages View all.*TD Tobby Domson Oct 2, 2026 at 12:37 Work on this tomorrow/.test(txt) && !(await p.locator('text=Thanks, see you tomorrow').count()), path + ' widget', txt)
  if (out) await w.screenshot({ path: `${out}/msgw-${path.replace(/\W+/g, '_')}.png` })
  {
    await w.locator(`[data-id="${W.all}"]`).click(); await p.waitForTimeout(500)
    const tab = await p.locator('.tcard').first().innerText()
    check(/Messages\s*1/.test(tab) && tab.includes('Tobby Domson') && tab.includes('Work on this tomorrow') && !/SMS|Email/.test(tab), path + ' tab = team thread', '')
    await p.locator('.msg-text').fill('Measurements are in the Files tab'); await p.keyboard.press('Enter'); await p.waitForTimeout(400)
    const last = await p.locator('.msg').last().innerText(); check(last.includes('Test Designer (you)') && last.includes('Measurements are in the Files tab'), path + ' send', '')
    if (out && path === 'concept-1/') await p.locator('.tcard').first().screenshot({ path: `${out}/msg-tab.png` })
    await p.locator('[data-n^="Tab / "]', { hasText: /^Overview$/ }).first().click(); await p.waitForTimeout(500)
    const w2 = (await p.locator(`[data-id="${W.w}"]`).innerText()).replace(/\s+/g, ' ')
    check(w2.includes('TD Test Designer') && w2.includes('Measurements are in the Files tab'), path + ' widget shows the new last message', w2)
  }
  check(!errs.length, path + ' console clean', errs.slice(0, 2).join(' | '))
  await p.close()
}
await b.close(); process.exit(bad ? 1 : 0)
