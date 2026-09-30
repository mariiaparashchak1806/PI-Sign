// Diff one node (by data-id) of a fixture against its own Figma export.
// usage: node scripts/diff-node.mjs <url> <data-id> <figma.png> <out-prefix>
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import fs from 'node:fs'
const [url, id, refPath, out] = process.argv.slice(2)
const ref = PNG.sync.read(fs.readFileSync(refPath))
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 1200 }, reducedMotion: 'reduce' })
await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300)
const buf = await p.locator(`[data-id="${id}"]`).first().screenshot(); await b.close()
const img = PNG.sync.read(buf); const W = Math.min(img.width, ref.width), H = Math.min(img.height, ref.height)
const crop = (s) => { const o = new PNG({ width: W, height: H }); PNG.bitblt(s, o, 0, 0, W, H, 0, 0); return o }
const a = crop(img), r = crop(ref), d = new PNG({ width: W, height: H })
const bad = pixelmatch(a.data, r.data, d.data, W, H, { threshold: 0.12 })
fs.writeFileSync(`${out}-render.png`, PNG.sync.write(a)); fs.writeFileSync(`${out}-diff.png`, PNG.sync.write(d))
console.log(JSON.stringify({ render: [img.width, img.height], figma: [ref.width, ref.height], mismatch: (100 * bad / (W * H)).toFixed(2) + '%' }))
