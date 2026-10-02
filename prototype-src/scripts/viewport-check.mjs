// §6 multi-viewport: native 1440×900, reduced height 1440×630, narrower 1200×900 — no horizontal page scroll,
// top bar pinned, lead column inside the viewport (concept 2), tab bar visible. usage: node scripts/viewport-check.mjs [base]
import { chromium } from 'playwright'
const base = process.argv[2] ?? 'http://localhost:5178'
const b = await chromium.launch({ channel: 'chrome' }); let bad = 0
const S = process.argv[3]
for (const [w, h] of [[1440, 900], [1440, 630], [1200, 900]]) for (const path of ['/concept-1/', '/concept-1/option-2/', '/concept-2/']) {
  const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(300)
  await p.mouse.wheel(0, 900); await p.waitForTimeout(300)
  const r = await p.evaluate(() => ({ hScroll: document.documentElement.scrollWidth - innerWidth, top: document.querySelector('[data-id="19:1070"]')?.getBoundingClientRect().y, lead: document.querySelector('[data-id="124:2656"]')?.getBoundingClientRect().bottom, tabs: !!document.querySelector('[data-id="19:1210"]')?.getBoundingClientRect().width }))
  const ok = r.hScroll <= 0 && Math.abs(r.top) < 1 && (r.lead == null || r.lead <= h + 1) && r.tabs && !errs.length; if (!ok) bad++
  console.log(ok ? 'ok  ' : 'FAIL', `${w}×${h}`, path, JSON.stringify(r), errs.join(' | '))
  if (S && path === '/concept-2/') await p.screenshot({ path: `${S}/vp-${w}x${h}.png` })
  await p.close()
}
await b.close(); process.exit(bad ? 1 : 0)
