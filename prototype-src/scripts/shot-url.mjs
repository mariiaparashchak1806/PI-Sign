// Viewport screenshot of a URL (+ element at a point): node scripts/shot-url.mjs <url> <out.png> [x y]
import { chromium } from 'playwright'
const [url, out, x, y] = process.argv.slice(2)
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto(url); await p.waitForTimeout(600); await p.screenshot({ path: out })
if (x) console.log(await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e && (e.closest('[data-id]')?.getAttribute('data-n') + ' / ' + e.closest('[data-id]')?.getAttribute('data-id')) }, [Number(x), Number(y)]))
await b.close()
