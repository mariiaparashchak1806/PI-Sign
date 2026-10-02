// Prototype → Figma: open a state of the prototype (Concept 1 · Option 1) and serialize what is painted in its parts
// (the tab content, a dialog with its scrim, a menu, a toast, the AI panel) into a compact tree that the Figma builder
// recreates on top of a copy of the Overview frame (19:973): frames with fills / borders / radii / shadows, text with
// its font, icons as shared SVG components. Elements that paint nothing are flattened into their painted ancestor.
// usage: node scripts/dom-snapshot.mjs <state,state…|all> [base]  → extraction/snap/<state>.json + extraction/snap/_svgs.json
import { chromium } from 'playwright'
import fs from 'node:fs'

const base = process.argv[3] ?? 'http://localhost:5178/concept-1/'
const t = (p, title) => p.locator(`[title="${title}"]`).first().click()
const menuItem = (p, label) => p.locator('.menu .menu-item', { hasText: label }).first().click()
const CONTENT = '.tab-content', SCRIM = '.scrim', MENU = '.menu', TOAST = '.toast', AI = '.ai-panel'
// state: [query, actions, parts, base frame ('overview' or a tab state), frame mode ('page' = full height, 'view' = 1440×900)]
export const STATES = {
  'tab-agenda': ['?tab=agenda', null, [CONTENT], 'overview', 'page'],
  'tab-files': ['?tab=files', null, [CONTENT], 'overview', 'page'],
  'tab-files-grid': ['?tab=files', (p) => p.getByLabel('Grid view').first().click(), [CONTENT], 'overview', 'page'],
  'tab-labors': ['?tab=labors', null, [CONTENT], 'overview', 'page'],
  'tab-labors-edit': ['?tab=labors', async (p) => { await p.locator('[aria-label^="Actions for Demolition"]').first().click(); await menuItem(p, 'Edit') }, [CONTENT], 'overview', 'page'],
  'tab-materials': ['?tab=materials', null, [CONTENT], 'overview', 'page'],
  'tab-countertops': ['?tab=countertops', null, [CONTENT], 'overview', 'page'],
  'tab-payment': ['?tab=payment', null, [CONTENT], 'overview', 'page'],
  'tab-payment-unscheduled': ['?tab=payment', async (p) => { await p.locator('.pay-row input').first().fill('40'); await p.keyboard.press('Tab') }, [CONTENT], 'overview', 'page'],
  'tab-agreements': ['?tab=agreements', null, [CONTENT], 'overview', 'page'],
  'tab-messages': ['?tab=messages', null, [CONTENT], 'overview', 'page'],
  'tab-forms': ['?tab=forms', null, [CONTENT], 'overview', 'page'],
  'files-photo-viewer': ['?tab=files', (p) => p.locator('.ph-strip button, .fg-thumb, .thumb').first().click(), [SCRIM], 'tab-files', 'view'],
  'add-task': ['', (p) => p.getByText('Add task', { exact: true }).first().click(), [SCRIM], 'overview', 'view'],
  'edit-task': ['', async (p) => { await t(p, 'Task actions'); await menuItem(p, 'Edit task') }, [SCRIM], 'overview', 'view'],
  'task-menu': ['', (p) => t(p, 'Task actions'), [MENU], 'overview', 'view'],
  'attach-file': ['', async (p) => { await t(p, 'Task actions'); await menuItem(p, 'Attach file') }, [SCRIM], 'overview', 'view'],
  'task-done-toast': ['', (p) => p.locator('.check-hit').first().click(), [TOAST], 'overview', 'view'],
  'catalog-labors': ['', async (p) => { await p.getByText('Add from catalog', { exact: true }).nth(1).click(); await p.waitForTimeout(400); await p.locator('.cpk-row', { hasText: 'Fly Screen' }).getByRole('button', { name: 'Add' }).click(); await p.locator('.cpk-row', { hasText: 'Blind Shade for' }).getByRole('button', { name: 'Add' }).click() }, [SCRIM], 'overview', 'view'],
  'catalog-materials': ['', (p) => p.getByText('Add from catalog', { exact: true }).nth(0).click(), [SCRIM], 'overview', 'view'],
  'catalog-countertops': ['', async (p) => { await p.getByText('Add from catalog', { exact: true }).nth(2).click(); await p.waitForTimeout(400); await p.locator('.cpk-row', { hasText: 'Rose Bay' }).getByRole('button', { name: 'Add' }).click() }, [SCRIM], 'overview', 'view'],
  'catalog-replace': ['?tab=labors', async (p) => { await p.locator('[aria-label^="Actions for Demolition"]').first().click(); await menuItem(p, 'Replace from catalog') }, [SCRIM], 'tab-labors', 'view'],
  'edit-lead': ['', (p) => t(p, 'Edit lead'), [SCRIM], 'overview', 'view'],
  'assign-designer': ['', (p) => t(p, 'Assign designer'), [SCRIM], 'overview', 'view'],
  'edit-contact': ['', (p) => t(p, 'Edit contact'), [SCRIM], 'overview', 'view'],
  'lead-menu': ['', (p) => p.locator('[data-id="I264:51998;264:51696"]').first().click(), [MENU], 'overview', 'view'],
  'project-menu': ['', (p) => p.locator('[title="Project actions"]').first().click(), [MENU], 'overview', 'view'],
  'status-menu': ['', (p) => p.locator('[title="Change status"]').first().click(), [MENU], 'overview', 'view'],
  'item-menu': ['', (p) => p.locator('[title="Item actions"]').first().click(), [MENU], 'overview', 'view'],
  'add-project': ['', (p) => t(p, 'Add project'), [SCRIM], 'overview', 'view'],
  'add-from-wishlist': ['', (p) => t(p, 'Add from wishlist'), [SCRIM], 'overview', 'view'],
  'delete-project': ['', async (p) => { await p.locator('[title="Project actions"]').first().click(); await menuItem(p, 'Delete project') }, [SCRIM], 'overview', 'view'],
  'ai-panel': ['', (p) => t(p, 'AI Assistant'), [AI], 'overview', 'view'],
}

const b = await chromium.launch({ channel: 'chrome' })
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
const names = process.argv[2] === 'all' ? Object.keys(STATES) : process.argv[2].split(',')
fs.mkdirSync('extraction/snap', { recursive: true })
const svgFile = 'extraction/snap/_svgs.json'
const allSvgs = fs.existsSync(svgFile) ? JSON.parse(fs.readFileSync(svgFile)) : {}
for (const name of names) {
  const [q, act, parts, baseFrame, mode] = STATES[name]
  await p.goto(base + q, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300)
  if (act) { await act(p); await p.waitForTimeout(700) }
  if (!parts.some((x) => x === MENU || x === TOAST)) await p.evaluate(() => scrollTo(0, 0)) // menus / toasts keep their page position
  if (parts[0] !== TOAST) await p.mouse.move(2, 898)
  const snap = await p.evaluate(({ parts, mode }) => {
    const rgba = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); const a = v[3] ?? 1; return a === 0 ? null : [v[0], v[1], v[2], Math.round(a * 100) / 100] }
    const r1 = (v) => Math.round(v * 10) / 10
    const H = document.documentElement.scrollHeight // anything on the page counts (menus can open below the fold)
    const svgs = {}
    const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) }
    const vis = (cs) => cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.01
    const off = (r) => r.width < 0.5 || r.height < 0.5 || r.right < 0 || r.left > 1440
    const font = (cs) => cs.fontFamily.split(',')[0].replace(/["']/g, '').trim()
    function paints(el, cs) {
      if (rgba(cs.backgroundColor) || cs.backgroundImage.startsWith('linear')) return true
      if (['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs[`border${s}Width`]) > 0 && rgba(cs[`border${s}Color`]) && cs[`border${s}Style`] !== 'none')) return true
      if (cs.boxShadow && cs.boxShadow !== 'none') return true
      if ((cs.overflow === 'hidden' || cs.overflow === 'clip' || cs.overflow === 'auto') && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) return true
      return false
    }
    const shadows = (v) => (!v || v === 'none' ? undefined : v.split(/,(?![^(]*\))/).map((s) => { const c = rgba(s); const n = s.replace(/rgba?\([^)]*\)/, '').trim().split(/\s+/).filter((x) => /px$|^0$/.test(x)).map(parseFloat); return c && { c, i: /inset/.test(s) ? 1 : undefined, x: n[0] || 0, y: n[1] || 0, b: n[2] || 0, s: n[3] || 0 } }).filter(Boolean))
    function textItem(s, cs, L, T, w, h, extra) {
      const lh = cs.lineHeight === 'normal' ? undefined : r1(parseFloat(cs.lineHeight))
      const o = { t: 'x', x: r1(L), y: r1(T), w: r1(w), h: r1(h), s, f: font(cs), fw: Number(cs.fontWeight), fs: parseFloat(cs.fontSize), c: rgba(cs.color) ?? [0, 0, 0, 1] }
      if (lh) o.lh = lh
      const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing); if (ls) o.ls = r1(ls)
      if (cs.textDecorationLine !== 'none') o.d = cs.textDecorationLine
      if (cs.textTransform !== 'none') o.tt = cs.textTransform
      return Object.assign(o, extra)
    }
    function textNode(tn, cs, ox, oy) {
      const txt = tn.textContent.replace(/\s+/g, ' ').trim(); if (!txt) return null
      const range = document.createRange(); range.selectNodeContents(tn); const rs = [...range.getClientRects()].filter((r) => r.width > 0.5); if (!rs.length) return null
      const L = Math.min(...rs.map((r) => r.left)), T = Math.min(...rs.map((r) => r.top)), Rr = Math.max(...rs.map((r) => r.right)), B = Math.max(...rs.map((r) => r.bottom))
      const lines = new Set(rs.map((r) => Math.round(r.top))).size
      return textItem(txt, cs, L - ox, T - oy, Rr - L, B - T, lines > 1 ? { ml: 1 } : (cs.textOverflow === 'ellipsis' ? { el: 1 } : undefined))
    }
    function walk(el, ox, oy, out, depth) {
      const cs = getComputedStyle(el); if (!vis(cs)) return
      const r = el.getBoundingClientRect()
      if (el.tagName.toLowerCase() === 'svg') {
        if (off(r)) return
        const clone = el.cloneNode(true); clone.setAttribute('width', r.width); clone.setAttribute('height', r.height); clone.removeAttribute('class')
        const s = clone.outerHTML.replace(/currentColor/g, cs.color); const h = hash(s); svgs[h] = s
        const o = { t: 's', x: r1(r.left - ox), y: r1(r.top - oy), w: r1(r.width), h: r1(r.height), v: h }; if (Number(cs.opacity) < 1) o.op = Number(cs.opacity)
        out.push(o); return
      }
      const tag = el.tagName, isField = /^(INPUT|SELECT|TEXTAREA)$/.test(tag)
      const painted = depth === 0 || paints(el, cs) || isField || tag === 'IMG'
      let kids = out, nx = ox, ny = oy
      if (painted && !off(r)) {
        const bw = ['Top', 'Right', 'Bottom', 'Left'].map((s) => (cs[`border${s}Style`] !== 'none' && rgba(cs[`border${s}Color`]) ? parseFloat(cs[`border${s}Width`]) : 0))
        const bc = rgba(cs.borderTopColor) ?? rgba(cs.borderBottomColor) ?? rgba(cs.borderLeftColor) ?? rgba(cs.borderRightColor)
        const label = el.dataset?.n || el.getAttribute('aria-label') || (typeof el.className === 'string' && el.className.split(' ')[0]) || tag.toLowerCase()
        const node = { t: 'f', x: r1(r.left - ox), y: r1(r.top - oy), w: r1(r.width), h: r1(r.height), n: label.slice(0, 40) }
        const bg = rgba(cs.backgroundColor); if (bg) node.bg = bg
        if (bw.some(Boolean) && bc) { node.bw = bw.every((v) => v === bw[0]) ? bw[0] : bw; node.bc = bc }
        const rad = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map((s) => parseFloat(cs[`border${s}Radius`]) || 0); if (rad.some(Boolean)) node.r = rad.every((v) => v === rad[0]) ? Math.min(rad[0], r.height / 2, r.width / 2) : rad
        const sh = shadows(cs.boxShadow); if (sh?.length) node.sh = sh
        if (Number(cs.opacity) < 1) node.op = Number(cs.opacity)
        if (cs.overflow !== 'visible' && depth > 0) node.cl = 1
        if (tag === 'IMG') { node.img = 1; node.bg = node.bg ?? [227, 224, 216, 1] }
        if (isField) {
          if (el.type === 'checkbox' || el.type === 'radio') { node.cb = el.checked ? 1 : 0; node.bg = el.checked ? [72, 68, 62, 1] : node.bg ?? [255, 255, 255, 1]; node.r = node.r ?? 4 }
          else {
            const val = tag === 'SELECT' ? el.options[el.selectedIndex]?.text : el.value
            const s = val || el.placeholder || ''
            if (s) {
              const pl = parseFloat(cs.paddingLeft) + (bw[3] || 0), pr = parseFloat(cs.paddingRight) + (bw[1] || 0), lh = parseFloat(cs.fontSize) * 1.4
              const pcs = !val ? getComputedStyle(el, '::placeholder') : cs
              node.k = [textItem(s, { ...cs, color: pcs.color, fontFamily: cs.fontFamily, fontWeight: cs.fontWeight, fontSize: cs.fontSize, lineHeight: 'normal', letterSpacing: cs.letterSpacing, textDecorationLine: 'none', textTransform: 'none' }, pl, tag === 'TEXTAREA' ? parseFloat(cs.paddingTop) : (r.height - lh) / 2, Math.max(8, r.width - pl - pr), lh, { el: 1, al: cs.textAlign === 'right' ? 'R' : undefined })]
            }
            if (tag === 'SELECT') node.chev = 1
          }
        }
        out.push(node); kids = node.k = node.k ?? []; nx = r.left; ny = r.top
      }
      if (isField || tag === 'IMG') return
      for (const c of el.childNodes) {
        if (c.nodeType === 3) { const tn = textNode(c, cs, nx, ny); if (tn) kids.push(tn) }
        else if (c.nodeType === 1) walk(c, nx, ny, kids, depth + 1)
      }
    }
    const out = []
    for (const sel of parts) {
      const els = [...document.querySelectorAll(sel)].filter((e) => getComputedStyle(e).display !== 'none'); if (!els.length) { out.push({ sel, missing: 1 }); continue }
      const el = els[els.length - 1], r = el.getBoundingClientRect()
      const k = []; walk(el, r.left, r.top, k, 0)
      const tree = k[0]; if (tree) { tree.x = r1(r.left); tree.y = r1(r.top + scrollY) } // page coordinates
      out.push({ sel, tree })
    }
    return { h: H, parts: out, svgs }
  }, { parts, mode })
  Object.assign(allSvgs, snap.svgs); delete snap.svgs
  snap.base = baseFrame; snap.mode = mode; snap.name = name
  fs.writeFileSync(`extraction/snap/${name}.json`, JSON.stringify(snap))
  const count = (n) => (n ? 1 + (n.k ?? []).reduce((a, k) => a + count(k), 0) : 0)
  console.log(name.padEnd(26), 'nodes', String(snap.parts.reduce((a, x) => a + count(x.tree), 0)).padStart(4), 'KB', Math.round(JSON.stringify(snap).length / 1024), snap.parts.some((x) => x.missing) ? 'MISSING ' + snap.parts.filter((x) => x.missing).map((x) => x.sel) : '')
}
fs.writeFileSync(svgFile, JSON.stringify(allSvgs))
console.log('svgs total', Object.keys(allSvgs).length, 'KB', Math.round(JSON.stringify(allSvgs).length / 1024))
await b.close()
