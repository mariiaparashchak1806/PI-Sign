// §6 Level 1 for Concept 2 (Figma 124:1753): pixel diff with a ±3px global offset search, worst cells, and DOM rects vs
// Figma node boxes (from src/figma/tree2.json) — deltas ≥1px, worst first. usage: node scripts/c2-audit.mjs [figma.png] [out]
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import fs from 'node:fs'
// usage: node scripts/c2-audit.mjs [figma.png] [out] [tree.json] [url]
const ref = PNG.sync.read(fs.readFileSync(process.argv[2] ?? 'extraction/figma-c2-1002b.png'))
const out = process.argv[3] ?? 'extraction/c2-audit'
const tree = JSON.parse(fs.readFileSync(process.argv[4] ?? 'src/figma/tree2.json'))
const url = process.argv[5] ?? 'http://localhost:5178/concept-2/'
const boxes = {}
;(function walk(n, ox, oy, hid) { const x = ox + n.x, y = oy + n.y; hid = hid || n.hidden; if (!hid) boxes[n.id] = [x, y, n.w, n.h, n.n]; (n.k ?? []).forEach((k) => walk(k, x, y, hid)) })({ ...tree, x: 0, y: 0 }, 0, 0, false)
const b = await chromium.launch({ channel: 'chrome' })
const p = await b.newPage({ viewport: { width: ref.width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300)
const dom = await p.evaluate((ids) => Object.fromEntries(ids.map((id) => { const e = document.querySelector(`[data-id="${CSS.escape(id)}"]`); if (!e) return [id, null]; const r = e.getBoundingClientRect(); return [id, r.width || r.height ? [r.x + scrollX, r.y + scrollY, r.width, r.height] : null] })), Object.keys(boxes))
const buf = await p.screenshot({ fullPage: true })
await b.close()
const img = PNG.sync.read(buf), W = ref.width, H = Math.min(ref.height, img.height)
const crop = (src, dx = 0, dy = 0) => { const o = new PNG({ width: W, height: H }); PNG.bitblt(src, o, Math.max(0, dx), Math.max(0, dy), W - Math.abs(dx), H - Math.abs(dy), Math.max(0, -dx), Math.max(0, -dy)); return o }
const a = crop(img), r0 = crop(ref)
let best = { dx: 0, dy: 0, bad: Infinity }
for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) { const bad = pixelmatch(crop(img, dx, dy).data, r0.data, null, W, H, { threshold: 0.12 }); if (bad < best.bad) best = { dx, dy, bad } }
const diff = new PNG({ width: W, height: H }); const bad0 = pixelmatch(a.data, r0.data, diff.data, W, H, { threshold: 0.12 })
fs.writeFileSync(out + '-render.png', PNG.sync.write(a)); fs.writeFileSync(out + '-diff.png', PNG.sync.write(diff))
const C = 100, cells = []
for (let y = 0; y < H; y += C) for (let x = 0; x < W; x += C) { let n = 0, t = 0; for (let yy = y; yy < Math.min(H, y + C); yy++) for (let xx = x; xx < Math.min(W, x + C); xx++) { t++; const i = (yy * W + xx) * 4; if (diff.data[i] === 255 && diff.data[i + 1] === 0) n++ } if (n) cells.push({ x, y, pct: Math.round((n / t) * 100) }) }
cells.sort((m, n) => n.pct - m.pct)
// rect deltas
const deltas = []
for (const [id, f] of Object.entries(boxes)) { const d = dom[id]; if (!d) continue; const dd = [d[0] - f[0], d[1] - f[1], d[2] - f[2], d[3] - f[3]].map((v) => Math.round(v * 10) / 10); const m = Math.max(...dd.map(Math.abs)); if (m >= 1) deltas.push({ id, name: f[4], d: dd, m }) }
deltas.sort((m, n) => n.m - m.m)
const missing = Object.keys(boxes).filter((id) => !dom[id] && !/^I.*;/.test(id)).length
console.log(JSON.stringify({ mismatch: (bad0 / (W * H) * 100).toFixed(2) + '%', bestOffset: { ...best, pct: (best.bad / (W * H) * 100).toFixed(2) + '%' }, renderH: img.height, refH: ref.height, worst: cells.slice(0, 12), nodes: Object.keys(boxes).length, offBy1plus: deltas.length, missingInDom: missing, errors: errs }))
fs.writeFileSync(out + '-rects.json', JSON.stringify(deltas, null, 1))
