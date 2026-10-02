// Turns extraction/snap/*.json into use_figma payloads (extraction/snap/fig/<n>-<state>.js): setup (section, hidden
// builder source, icon components) + one call per frame that runs the stored builder with its data.
import fs from 'node:fs'
const ORDER = ['tab-agenda', 'tab-files', 'tab-files-grid', 'tab-labors', 'tab-labors-edit', 'tab-materials', 'tab-countertops', 'tab-payment', 'tab-payment-unscheduled', 'tab-agreements', 'tab-messages', 'tab-forms',
  'add-task', 'edit-task', 'task-menu', 'attach-file', 'task-done-toast', 'edit-lead', 'assign-designer', 'edit-contact', 'lead-menu', 'project-menu', 'status-menu', 'item-menu', 'add-project', 'add-from-wishlist', 'delete-project',
  'catalog-labors', 'catalog-materials', 'catalog-countertops', 'catalog-replace', 'files-photo-viewer', 'ai-panel']
const TITLE = { 'tab-agenda': 'Tab · Agenda', 'tab-files': 'Tab · Files & Photos (list)', 'tab-files-grid': 'Tab · Files & Photos (grid)', 'tab-labors': 'Tab · Labors', 'tab-labors-edit': 'Tab · Labors — row edit', 'tab-materials': 'Tab · Materials', 'tab-countertops': 'Tab · Countertops', 'tab-payment': 'Tab · Payment Plan', 'tab-payment-unscheduled': 'Tab · Payment Plan — not fully scheduled', 'tab-agreements': 'Tab · Signed documents', 'tab-messages': 'Tab · Messages', 'tab-forms': 'Tab · Forms',
  'add-task': 'Modal · Add task', 'edit-task': 'Modal · Edit task', 'task-menu': 'Menu · Task actions', 'attach-file': 'Modal · Attach files', 'task-done-toast': 'Toast · Task done + Undo', 'edit-lead': 'Modal · Edit lead (Info)', 'assign-designer': 'Modal · Pick assignees', 'edit-contact': 'Modal · Edit contact', 'lead-menu': 'Menu · Lead actions', 'project-menu': 'Menu · Project actions', 'status-menu': 'Menu · Project status', 'item-menu': 'Menu · Line item actions', 'add-project': 'Modal · Add project', 'add-from-wishlist': 'Modal · Add from wishlist', 'delete-project': 'Modal · Delete project',
  'catalog-labors': 'Modal · Add labors (2 selected)', 'catalog-materials': 'Modal · Add materials', 'catalog-countertops': 'Modal · Add countertops (1 selected)', 'catalog-replace': 'Modal · Replace from catalog', 'files-photo-viewer': 'Modal · Photo viewer', 'ai-panel': 'Panel · AI Assistant' }
const TAB = { 'tab-agenda': 'Agenda', 'tab-files': 'Files & Photos', 'tab-files-grid': 'Files & Photos', 'tab-labors': 'Labors', 'tab-labors-edit': 'Labors', 'tab-materials': 'Materials', 'tab-countertops': 'Countertops', 'tab-payment': 'Payment Plan', 'tab-payment-unscheduled': 'Payment Plan', 'tab-agreements': 'Signed documents', 'tab-messages': 'Messages', 'tab-forms': 'Forms', 'catalog-replace': 'Labors', 'files-photo-viewer': 'Files & Photos' }
const round = (n) => { if (Array.isArray(n)) return n.map(round); if (n && typeof n === 'object') { const o = {}; for (const [k, v] of Object.entries(n)) { if (v === undefined || v === null) continue; o[k] = typeof v === 'number' ? Math.round(v * 2) / 2 : round(v) } return o } return n }
fs.mkdirSync('extraction/snap/fig', { recursive: true })
let tabCol = 0, ovCol = 0
ORDER.forEach((s, i) => {
  const snap = JSON.parse(fs.readFileSync(`extraction/snap/${s}.json`))
  const page = snap.mode === 'page'
  const P = { name: s, title: TITLE[s], base: snap.base === 'overview' ? 'overview' : 'frame', baseTitle: snap.base === 'overview' ? undefined : TITLE[snap.base], mode: snap.mode, h: Math.round(snap.h), tab: TAB[s] ?? 'Overview',
    col: page ? tabCol++ : ovCol % 11, row: page ? 0 : 2900 + Math.floor(ovCol++ / 11) * 1040, parts: round(snap.parts.filter((p) => p.tree)) }
  const code = `const P = ${JSON.stringify(P)}\nconst sec = await figma.getNodeByIdAsync('__SECTION__')\nconst src = sec.findChild((n) => n.name === '_builder').characters\nconst AF = Object.getPrototypeOf(async function () {}).constructor\nreturn await new AF('P', src)(P)`
  fs.writeFileSync(`extraction/snap/fig/${String(i + 1).padStart(2, '0')}-${s}.js`, code)
  console.log(String(i + 1).padStart(2, '0'), s.padEnd(26), Math.round(code.length / 1024) + 'KB')
})
const svgs = JSON.parse(fs.readFileSync('extraction/snap/_svgs.json'))
const builder = fs.readFileSync('scripts/figma-build.js', 'utf8')
const setup = `// setup: section below "Concept 1 + Tabs", hidden builder source, icon components
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
let sec = figma.currentPage.findOne((n) => n.type === 'SECTION' && n.name === 'Concept 1 · Option 1 — Tabs & modals (prototype, Oct 2)')
if (!sec) { sec = figma.createSection(); sec.name = 'Concept 1 · Option 1 — Tabs & modals (prototype, Oct 2)'; sec.x = 15007; sec.y = 17100 }
sec.resizeWithoutConstraints(17200, 5200)
const SV = ${JSON.stringify(svgs)}
let lib = sec.findChild((n) => n.name === 'Prototype icons'); if (!lib) { lib = figma.createFrame(); lib.name = 'Prototype icons'; sec.appendChild(lib) }
lib.x = 100; lib.y = 5000; lib.fills = []; lib.layoutMode = 'HORIZONTAL'; lib.itemSpacing = 8; lib.layoutWrap = 'WRAP'; lib.resize(1600, 40); lib.primaryAxisSizingMode = 'FIXED'; lib.counterAxisSizingMode = 'AUTO'
const have = new Set(lib.children.map((c) => c.name)); let made = 0
for (const [h, s] of Object.entries(SV)) { if (have.has('ic/' + h)) continue; try { const n = figma.createNodeFromSvg(s); const c = figma.createComponentFromNode(n); c.name = 'ic/' + h; lib.appendChild(c); made++ } catch (e) {} }
let b = sec.findChild((n) => n.name === '_builder'); if (!b) { b = figma.createText(); b.name = '_builder'; sec.appendChild(b) }
b.characters = ${JSON.stringify(builder)}.replace('__SECTION__', sec.id); b.visible = false; b.x = 100; b.y = 5100
return JSON.stringify({ section: sec.id, icons: lib.children.length, made })`
fs.writeFileSync('extraction/snap/fig/00-setup.js', setup)
console.log('setup', Math.round(setup.length / 1024) + 'KB')
