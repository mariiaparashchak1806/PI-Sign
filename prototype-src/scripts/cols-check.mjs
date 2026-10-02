// Project Details columns: header, project rows and Total share the same column edges, the amount columns are equal
// and the row is filled (no empty space before the ⋯ slot) — with every Show cost / Show sale combination, all concepts.
// usage: node scripts/cols-check.mjs [base]
import { chromium } from 'playwright'
const base = process.argv[2] ?? 'http://localhost:5178'
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); let bad = 0
const errs = []; p.on('pageerror', (e) => errs.push(e.message))
for (const path of ['/concept-1/', '/concept-1/option-2/', '/concept-2/']) {
  for (const [cost, sale] of [[1, 1], [0, 1], [1, 0], [0, 0]]) {
    await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(300)
    if (!cost) await p.locator('.switch-hit', { hasText: 'Show cost' }).first().click()
    if (!sale) await p.locator('.switch-hit', { hasText: 'Show sale' }).first().click()
    await p.waitForTimeout(200)
    const res = await p.evaluate(() => {
      const ids = ['93:8360', '93:8375', '42:10700', '42:10752', 'I226:14358;227:2695']
      return ids.map((id) => { const r = document.querySelector(`[data-id="${CSS.escape(id)}"]`); if (!r) return null
        const rb = r.getBoundingClientRect()
        const cells = [...r.children].filter((c) => getComputedStyle(c).display !== 'none').map((c) => { const b = c.getBoundingClientRect(); return [Math.round(b.left - rb.left), Math.round(b.right - rb.left)] })
        return { id, w: Math.round(rb.width), cells } })
    })
    const rows = res.filter(Boolean), head = rows[0]
    const n = head.cells.length, amounts = head.cells.slice(1, n - 1).map(([l, r]) => r - l)
    const aligned = rows.every((r) => head.cells.every((c, i) => !r.cells[i] || Math.abs(r.cells[i][1] - c[1]) <= 1))
    const equal = Math.max(...amounts) - Math.min(...amounts) <= 1
    const lastRow = rows[1].cells[rows[1].cells.length - 1][1]
    const filled = Math.abs(lastRow - (rows[1].w - 16)) <= 1
    const ok = aligned && equal && filled; if (!ok) bad++
    console.log(ok ? 'ok  ' : 'FAIL', path, `cost ${cost} sale ${sale}`, JSON.stringify({ amounts, aligned, filled, head: head.cells, kitchen: rows[1].cells, total: rows[rows.length - 1].cells }))
  }
}
console.log(errs.length ? 'FAIL ' + errs : 'ok   console clean'); await b.close(); process.exit(bad ? 1 : 0)
