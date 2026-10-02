// Figma side of the prototype → Figma transfer (stored once in the section as the hidden text "_builder", run as
// `new AsyncFunction('P', src)(payload)`). P = { name, title, base, mode, h, tab, col, row, parts: [{ sel, tree }] }.
// Builds one frame in the section: a copy of the Overview frame (19:973) or of an already built tab frame, the drawn
// tab content replaced by the snapshot (page states) or the snapshot overlay on top (view states: dialogs, menus…).
const SECTION = '__SECTION__'
const sec = await figma.getNodeByIdAsync(SECTION)
const lib = sec.findChild((n) => n.name === 'Prototype icons')
const icons = {}; if (lib) for (const c of lib.children) icons[c.name.slice(3)] = c
const STYLE = { Poppins: { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' }, Inter: { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold' } }
const fontOf = (f, w) => { const fam = STYLE[f] ? f : 'Poppins'; const ws = Object.keys(STYLE[fam]).map(Number); const k = ws.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a)); return { family: fam, style: STYLE[fam][k] } }
const need = new Map()
const collect = (n) => { if (!n) return; if (n.t === 'x') { const f = fontOf(n.f, n.fw); need.set(f.family + f.style, f) } (n.k || []).forEach(collect) }
P.parts.forEach((p) => collect(p.tree)); need.set('PoppinsSemiBold', { family: 'Poppins', style: 'SemiBold' }); need.set('PoppinsRegular', { family: 'Poppins', style: 'Regular' })
await Promise.all([...need.values()].map((f) => figma.loadFontAsync(f)))
const col = (c) => ({ r: c[0] / 255, g: c[1] / 255, b: c[2] / 255 })
const paint = (c) => ({ type: 'SOLID', color: col(c), opacity: c[3] ?? 1 })
const CHEV = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6L8 10L12 6" stroke="#6B7068" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const CHECK = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 8.5L7 11L12 5" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
let count = 0
function build(n, parent) {
  count++
  if (n.t === 's') {
    const c = icons[n.v]; if (!c) return
    const i = c.createInstance(); parent.appendChild(i); i.x = n.x; i.y = n.y; if (Math.abs(i.width - n.w) > 0.5 || Math.abs(i.height - n.h) > 0.5) i.resize(Math.max(1, n.w), Math.max(1, n.h)); if (n.op) i.opacity = n.op; return i
  }
  if (n.t === 'x') {
    const t = figma.createText(); parent.appendChild(t)
    t.fontName = fontOf(n.f, n.fw); t.fontSize = n.fs
    t.characters = n.tt === 'uppercase' ? n.s.toUpperCase() : n.s
    if (n.lh) t.lineHeight = { value: n.lh, unit: 'PIXELS' }
    if (n.ls) t.letterSpacing = { value: n.ls, unit: 'PIXELS' }
    t.fills = [paint(n.c)]
    if (n.d && /line-through/.test(n.d)) t.textDecoration = 'STRIKETHROUGH'; else if (n.d && /underline/.test(n.d)) t.textDecoration = 'UNDERLINE'
    if (n.ml) { t.textAutoResize = 'HEIGHT'; t.resize(Math.max(1, n.w + 1), Math.max(1, n.h)) }
    else if (n.el) { t.textAutoResize = 'NONE'; t.resize(Math.max(1, n.w + (n.al === 'R' ? 0 : 1)), Math.max(1, n.h)); t.textTruncation = 'ENDING'; if (n.al === 'R') t.textAlignHorizontal = 'RIGHT' }
    else t.textAutoResize = 'WIDTH_AND_HEIGHT'
    t.textAlignVertical = 'CENTER'
    if (n.al === 'C') t.textAlignHorizontal = 'CENTER'
    t.x = n.x; t.y = n.y + (n.el ? 0 : (n.h - t.height) / 2)
    t.name = n.s.slice(0, 40)
    return t
  }
  const f = figma.createFrame(); parent.appendChild(f)
  f.name = n.n || 'Frame'; f.x = n.x; f.y = n.y; f.resize(Math.max(0.01, n.w), Math.max(0.01, n.h))
  f.fills = n.bg ? [paint(n.bg)] : []
  if (n.bc) {
    f.strokes = [paint(n.bc)]; f.strokeAlign = 'INSIDE'
    if (Array.isArray(n.bw)) { f.strokeTopWeight = n.bw[0]; f.strokeRightWeight = n.bw[1]; f.strokeBottomWeight = n.bw[2]; f.strokeLeftWeight = n.bw[3] } else f.strokeWeight = n.bw
  }
  if (Array.isArray(n.r)) { f.topLeftRadius = n.r[0]; f.topRightRadius = n.r[1]; f.bottomRightRadius = n.r[2]; f.bottomLeftRadius = n.r[3] } else if (n.r) f.cornerRadius = n.r
  if (n.sh) f.effects = n.sh.map((s) => ({ type: s.i ? 'INNER_SHADOW' : 'DROP_SHADOW', color: { ...col(s.c), a: s.c[3] }, offset: { x: s.x, y: s.y }, radius: s.b, spread: s.s, visible: true, blendMode: 'NORMAL' }))
  if (n.op) f.opacity = n.op
  f.clipsContent = !!n.cl
  if (n.img) f.name = 'Image'
  for (const k of n.k || []) build(k, f)
  if (n.chev) { const c = figma.createNodeFromSvg(CHEV); f.appendChild(c); c.name = 'chevron'; c.x = n.w - 28; c.y = (n.h - 16) / 2 }
  if (n.cb) { const c = figma.createNodeFromSvg(CHECK); f.appendChild(c); c.name = 'check'; c.resize(n.w, n.h); c.x = 0; c.y = 0 }
  return f
}
// base frame
const src = P.base === 'overview' ? await figma.getNodeByIdAsync('19:973') : sec.findChild((n) => n.name === P.baseTitle)
const fr = src.clone(); sec.appendChild(fr)
fr.name = P.title; fr.x = 100 + P.col * 1540; fr.y = 140 + P.row
// active tab
const TAB_ON = { stroke: [72, 68, 62, 1] }
const tabs = fr.findOne((n) => n.name === 'Tabs' && n.type === 'FRAME')
if (tabs && P.tab) for (const t of tabs.children) {
  const label = t.findOne((n) => n.type === 'TEXT'); if (!label) continue
  const on = label.characters.trim() === P.tab
  await figma.loadFontAsync(label.fontName)
  label.fontName = on ? { family: 'Poppins', style: 'SemiBold' } : { family: 'Poppins', style: 'Regular' }
  label.fills = [paint(on ? [72, 68, 62, 1] : [75, 75, 75, 1])]
  t.strokes = on ? [paint(TAB_ON.stroke)] : []; if (on) { t.strokeAlign = 'INSIDE'; t.strokeTopWeight = 0; t.strokeRightWeight = 0; t.strokeLeftWeight = 0; t.strokeBottomWeight = 2 }
}
if (P.mode === 'page') {
  const grid = fr.findOne((n) => n.name === 'Grid'); if (grid) grid.visible = false
  const holder = figma.createFrame(); holder.name = 'Tab content (prototype)'; holder.fills = []; fr.appendChild(holder); holder.layoutPositioning = 'ABSOLUTE'
  holder.x = 0; holder.y = 0; holder.resize(1440, P.h); holder.clipsContent = false
  for (const p of P.parts) if (p.tree) build(p.tree, holder)
  fr.resize(1440, Math.max(P.h + 48, 900))
} else {
  // dialogs cover the 1440×900 window; a menu / toast opened further down the page makes the frame taller
  const bottom = Math.max(...P.parts.filter((p) => p.tree).map((p) => p.tree.y + p.tree.h))
  const H = bottom > 900 ? Math.ceil(bottom + 80) : 900
  fr.resize(1440, H); fr.clipsContent = true
  const holder = figma.createFrame(); holder.name = 'Overlay (prototype)'; holder.fills = []; fr.appendChild(holder); holder.layoutPositioning = 'ABSOLUTE'
  holder.x = 0; holder.y = 0; holder.resize(1440, H)
  for (const p of P.parts) if (p.tree) build(p.tree, holder)
}
return JSON.stringify({ id: fr.id, name: fr.name, nodes: count })
