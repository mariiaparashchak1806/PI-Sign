// Project Details columns (Figma 226:15063): header, project rows and Total share the same column edges; with both
// switches on the edges are the Figma ones (16·148·290·367·439·538·610·682); with a column hidden the amounts fill the row.
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
        const cells = [...r.children].filter((c) => getComputedStyle(c).display !== 'none' && !c.classList.contains('fig-stroke')).map((c) => { const b = c.getBoundingClientRect(); return [Math.round(b.left - rb.left), Math.round(b.right - rb.left)] }).filter(([l, r]) => r > l).sort((m, n) => m[0] - n[0])
        return { id, w: Math.round(rb.width), cells } })
    })
    const rows = res.filter(Boolean), head = rows[0]
    const n = head.cells.length, amounts = head.cells.slice(2, n).map(([l, r]) => r - l)
    // every cell edge of every row sits on a header column edge (the ⋯ slot after the last column is the exception)
    const lastHead = head.cells[head.cells.length - 1][1]
    const aligned = rows.every((r) => r.cells.every((c) => c[0] > lastHead || head.cells.some((h) => Math.abs(h[1] - c[1]) <= 1)))
    const offEdge = rows.flatMap((r) => r.cells.filter((c) => !(c[0] > lastHead || head.cells.some((h) => Math.abs(h[1] - c[1]) <= 1))).map((c) => r.id + ':' + c.join('-')))
    const FIG = [16, 148, 290, 367, 439, 538, 610]
    const equal = !(cost && sale) || head.cells.every((c, i) => Math.abs(c[0] - FIG[i]) <= 1)
    const lastRow = rows[1].cells[rows[1].cells.length - 1][1]
    const filled = Math.abs(lastRow - (rows[1].w - 16)) <= 1
    const ok = aligned && equal && filled; if (!ok) bad++
    console.log(ok ? 'ok  ' : 'FAIL', path, `cost ${cost} sale ${sale}`, JSON.stringify({ offEdge, amounts, aligned, filled, head: head.cells, kitchen: rows[1].cells, total: rows[rows.length - 1].cells }))
  }
}
console.log(errs.length ? 'FAIL ' + errs : 'ok   console clean'); await b.close(); process.exit(bad ? 1 : 0)
