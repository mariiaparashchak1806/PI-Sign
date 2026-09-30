// Compare DOM rects of every [data-id] element against Figma node boxes (absolute).
import { chromium } from 'playwright'
import fs from 'node:fs'
const tree = JSON.parse(fs.readFileSync('src/figma/tree.json', 'utf8'))
const fig = new Map()
const walk = (n, ox, oy, parent) => {
  const ax = (parent && parent.t === 'GROUP') ? ox + n.x - parent.x : ox + n.x
  const ay = (parent && parent.t === 'GROUP') ? oy + n.y - parent.y : oy + n.y
  const x = parent ? ax : 0, y = parent ? ay : 0
  if (!n.hidden) fig.set(n.id, { x, y, w: n.w, h: n.h, n: n.n, t: n.t })
  const bx = parent && parent.t === 'GROUP' ? ox : x, by = parent && parent.t === 'GROUP' ? oy : y
  n.k?.forEach((c) => walk(c, n.t === 'GROUP' ? bx : x, n.t === 'GROUP' ? by : y, n))
}
walk(tree, 0, 0, null)
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(process.argv[2] ?? 'http://localhost:5178/', { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
const dom = await page.evaluate(() => { const r0 = document.querySelector('[data-id]').getBoundingClientRect(); return [...document.querySelectorAll('[data-id]')].map((e) => { const r = e.getBoundingClientRect(); return [e.dataset.id, r.x - r0.x, r.y - r0.y, r.width, r.height] }) })
await browser.close()
const rows = []
for (const [id, x, y, w, h] of dom) { const f = fig.get(id); if (!f) continue; const d = Math.max(Math.abs(x - f.x), Math.abs(y - f.y), Math.abs(w - f.w), Math.abs(h - f.h)); if (d >= 1) rows.push({ id, n: f.n, t: f.t, dx: +(x - f.x).toFixed(1), dy: +(y - f.y).toFixed(1), dw: +(w - f.w).toFixed(1), dh: +(h - f.h).toFixed(1), fy: f.y }) }
rows.sort((a, b) => a.fy - b.fy)
// report: first offenders where size differs (dw/dh) — they cause the downstream shifts
const size = rows.filter((r) => process.argv[4] === 'h' ? Math.abs(r.dh) >= 1 : (Math.abs(r.dw) >= 1 || Math.abs(r.dh) >= 1))
console.log('total off-by-≥1:', rows.length, 'size mismatches:', size.length)
size.slice(0, Number(process.argv[3] ?? 40)).forEach((r) => console.log(JSON.stringify(r)))
