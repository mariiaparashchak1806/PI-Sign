// Visual verification (§6 Level 1): render the page at the Figma frame size, pixel-diff
// against the Figma export, report mismatch % and the worst 100px cells.
// usage: node scripts/diff.mjs [url] [figma.png] [out-prefix] [?fixture]
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import fs from 'node:fs'

const url = process.argv[2] ?? 'http://localhost:5178/'
const ref = PNG.sync.read(fs.readFileSync(process.argv[3] ?? 'extraction/figma-lead-overview.png'))
const out = process.argv[4] ?? 'extraction/diff'
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: ref.width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(300)
const buf = await page.screenshot({ fullPage: true, clip: { x: 0, y: 0, width: ref.width, height: ref.height } })
await browser.close()
const img = PNG.sync.read(buf)
const W = ref.width, H = Math.min(ref.height, img.height)
const crop = (p) => { const o = new PNG({ width: W, height: H }); PNG.bitblt(p, o, 0, 0, W, H, 0, 0); return o }
const a = crop(img), b = crop(ref), diff = new PNG({ width: W, height: H })
const bad = pixelmatch(a.data, b.data, diff.data, W, H, { threshold: 0.12 })
fs.writeFileSync(`${out}-render.png`, PNG.sync.write(a))
fs.writeFileSync(`${out}-diff.png`, PNG.sync.write(diff))
const C = 100, cells = []
for (let y = 0; y < H; y += C) for (let x = 0; x < W; x += C) {
  let n = 0, t = 0
  for (let yy = y; yy < Math.min(y + C, H); yy++) for (let xx = x; xx < Math.min(x + C, W); xx++) { t++; const i = (yy * W + xx) * 4; if (diff.data[i] === 255 && diff.data[i + 1] < 100) n++ }
  cells.push({ x, y, pct: +(100 * n / t).toFixed(1) })
}
cells.sort((p, q) => q.pct - p.pct)
console.log(JSON.stringify({ mismatch: +(100 * bad / (W * H)).toFixed(2) + '%', renderHeight: img.height, refHeight: ref.height, worst: cells.slice(0, 12), errors }, null, 0))
