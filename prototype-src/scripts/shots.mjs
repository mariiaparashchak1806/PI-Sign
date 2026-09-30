// Screenshots of interaction states for review.
import { chromium } from 'playwright'
const url = 'http://localhost:5178/'
const b = await chromium.launch({ channel: 'chrome' })
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } })
const shot = async (name, steps, clip) => {
  const p = await ctx.newPage(); await p.goto(url + (steps.q ?? ''), { waitUntil: 'networkidle' }); await p.waitForSelector('[data-id]')
  for (const s of steps.clicks ?? []) { const el = p.locator(`[data-id="${s}"]`).first(); await el.scrollIntoViewIfNeeded(); await el.click(); await p.waitForTimeout(400) }
  if (steps.scrollTo !== undefined) await p.evaluate((y) => window.scrollTo(0, y), steps.scrollTo)
  await p.waitForTimeout(300)
  await p.screenshot({ path: `extraction/shot-${name}.png`, clip }); await p.close()
}
await shot('details', { q: '?fixture=details' }, { x: 324, y: 60, width: 1116, height: 560 })
await shot('status-menu', { clicks: ['93:8395'], scrollTo: 300 }, { x: 324, y: 0, width: 1116, height: 700 })
await shot('row-menu', { clicks: ['93:8399'], scrollTo: 300 }, { x: 324, y: 0, width: 1116, height: 700 })
await shot('task-menu', { clicks: ['65:5945'], scrollTo: 1150 }, { x: 324, y: 0, width: 1116, height: 700 })
await shot('dialog', { clicks: ['93:8355'] }, { x: 0, y: 0, width: 1440, height: 1000 })
await b.close()
