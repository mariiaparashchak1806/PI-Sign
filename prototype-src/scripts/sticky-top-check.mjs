// Top bar stays at the top after scrolling, on every concept / tab. usage: node scripts/sticky-top-check.mjs [base]
import { chromium } from 'playwright'
const base = process.argv[2] ?? 'http://localhost:5178'
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); let bad = 0
const errs = []; p.on('pageerror', (e) => errs.push(e.message))
for (const path of ['/concept-1/', '/concept-1/option-2/', '/concept-2/', '/concept-1/?tab=labors', '/concept-1/?tab=files']) {
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(300)
  await p.mouse.wheel(0, 1500); await p.waitForTimeout(400)
  const r = await p.locator('[data-id="19:1070"]').first().boundingBox()
  const lead = path === '/concept-2/' ? await p.locator('[data-id="124:2656"]').boundingBox() : null
  const y = await p.evaluate(() => scrollY)
  const ok = r && Math.abs(r.y) < 1 && y > 300 && (!lead || lead.y >= 59)
  if (!ok) bad++
  console.log(ok ? 'ok  ' : 'FAIL', path, JSON.stringify({ scrollY: y, topBarY: r?.y, leadY: lead?.y }))
}
console.log(errs.length ? 'FAIL errors ' + errs : 'ok   console clean'); await b.close(); process.exit(bad || errs.length ? 1 : 0)
