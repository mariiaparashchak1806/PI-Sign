import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { X, CircleX, CopyPlus, Download, FileText, Heart, Info, MoveRight, Paperclip, Pencil, Plus, RefreshCw, SquareCheck, Trash2, Archive, Link2 } from 'lucide-react'
import tree from '../figma/tree.json'
import treeC1o2 from '../figma/tree-c1o2.json'
import treeC2base from '../figma/tree-c2base.json'
import tree2 from '../figma/tree2.json'
import { FigmaNode, OverridesProvider, indexTree, type FNode, type Handler, type Patch } from '../figma/FigmaNode'
import { Btn, Dialog, Menu, Toast, type MenuItem, type MenuState, type ToastState } from '../components/Overlay'
import { Field, Select, TextArea, TextInput } from '../components/Form'
import { ContactDialog, LeadInfoDialog, type Contact, type LeadInfo } from '../components/EditDialogs'
import { aiAnswers, aiFallback, designers, projectManagers, projectStatuses, projectTypes } from '../lib/mockData'
import { AssignDialog, MessagesDialog, type Assignees, type Msg } from '../components/LeadDialogs'
import { FILES0, FILES0_C2, FilesTab, countIn, hasRequired, type FilesState, type Folder, type FileItem } from '../components/FilesTab'
import { CatalogDialog, type CatalogKind } from '../components/CatalogDialog'
import { AgreementsTab, EstimateTab, FormsTab, MessagesTab, PaymentTab } from '../components/OtherTabs'

// Concept 2 (Figma 124:1753): shared widgets carry concept-1 ids (scripts/build_concept2.py), so the same handlers apply.
// tree-c2base.json (the older 19:973 snapshot) is only the source of the AI Assistant card for the side panel.
const root2 = tree2 as unknown as FNode
const T2 = indexTree(root2)
export type Concept = 1 | 2
type TabKey = 'overview' | 'agenda' | 'files' | 'labors' | 'materials' | 'countertops' | 'payment' | 'agreements' | 'messages' | 'forms'
type TaskStatus = 'overdue' | 'upcoming' | 'done' | 'idle' | 'cancelled'
type ProjectRow = { id: string; name: string; pill?: string; pillLabel?: string; more: string; chevron: string; sales: string }
type NewTask = { id: string; name: string; due: string; status: TaskStatus; deleted?: boolean }

const taskTypes = ['In-home Consultation', 'Measurement', 'Quote Preparation', 'Follow-up']

function makePage(base: unknown) {
const root = base as FNode
const T = indexTree(root)
const node = (id: string) => T.byId.get(id)!
const find = (fromId: string, pred: (n: FNode) => boolean) => T.find(node(fromId), pred)
const named = (fromId: string, name: string | RegExp) => find(fromId, (n) => (typeof name === 'string' ? n.n === name : name.test(n.n)))!
const textIn = (fromId: string) => find(fromId, (n) => n.t === 'TEXT')!
const kidsOf = (id: string) => (node(id).k ?? []).filter((k) => !k.hidden)
const segColor = (n: FNode) => `rgba(${n.seg![0].c!.join(',')})`
const stop = (fn: () => void) => (e: { stopPropagation: () => void }) => { e.stopPropagation(); fn() }
const I = { size: 16, strokeWidth: 1.8 } as const
const fixture = new URLSearchParams(location.search).get('fixture')

// ---------- ids resolved from the Figma tree ----------
const LEAD_COLLAPSED = '109:3765', LEAD_DETAILS = '109:6980'
// older snapshot wraps both lead states in 109:5225; the current frame puts them straight into the header row
// Concept 1 · Option 2 (Figma 184:3568) has one merged lead card instead of the two lead states
const LEAD_CARD2 = T.byId.has('206:5636') ? '206:5636' : undefined
const LEAD_WRAP = T.byId.has('109:5225') ? '109:5225' : LEAD_CARD2 ?? '25:4990'
const PD = '42:10511', PD_COLHEAD = '93:8360', KITCHEN_EXPANDED = '42:10573'
const PD_HEAD = (node(PD).k ?? [])[0].id
const PD_TOGGLES = T.find(node(PD), (n) => n.n === 'Table toolbar')?.id // current design: Show cost / Show sale switches
const PROJECT_ROWS = ['93:8375', '42:10700', '42:10752']
const AGENDA = '42:10916', AGENDA_HEAD = '42:10917'
const ACTIVITY_HEAD = '93:4855', ACTIVITY_BODY = '93:5083'
// AI Assistant card: on the page, or (Option 2: "Ask AI" button) taken from the 19:973 frame for the side panel
const isAI = (n: FNode) => n.n === 'AI Assistant' && n.t !== 'TEXT'
// the AI card is no longer drawn on the Concept 1 pages → the side panel uses the card from the 19:973 snapshot
const TA = T.find(root, isAI) ? T : indexTree(treeC2base as unknown as FNode)
const AI = TA.find(TA.byId.get(TA === T ? root.id : '19:973')!, isAI)!.id
const aiNode = TA.byId.get(AI)!
const AI_INPUT = TA.find(aiNode, (n) => n.n === 'Input')!.id
const AI_SUGGESTIONS = TA.findAll(aiNode, (n) => n.n.startsWith('Suggestion /')).map((n) => n.id)
const AI_INLINE = TA === T
const PD_TOTAL_ROW = (node(PD).k ?? []).find((k) => k.n === 'Row / Total' && !k.hidden)?.id
const NEEDS = T.find(root, (n) => n.n === 'Section - Needs attention')
// Signed documents card (summary in the old snapshot, "widget" in the current frame): every link/button opens its tab
const SIGNED_CARD = (node('19:1233').k ?? []).find((c) => !c.hidden && !!T.find(c, (n) => n.t === 'TEXT' && n.txt === 'Signed documents'))!
const SIGNED_LINKS = T.findAll(SIGNED_CARD, (n) => n.n === 'Link Button' || n.n === 'Secondary Button').map((n) => n.id)

const projectRows: ProjectRow[] = PROJECT_ROWS.map((id) => {
  const kids = kidsOf(id)
  const pill = kids.find((k) => k.n.startsWith('Pill'))
  return {
    id, name: named(id, 'Name').txt!, pill: pill?.id, pillLabel: pill ? textIn(pill.id).id : undefined,
    more: kids.find((k) => k.n === 'Button')!.id, chevron: find(id, (n) => /^icon\/chev/.test(n.n))!.id, sales: kids[5].id,
  }
})
const lineItems = T.findAll(node(KITCHEN_EXPANDED), (n) => n.n.startsWith('Item /')).map((it) => ({ id: it.id, name: named(it.id, 'Name').txt!, more: kidsOf(it.id).find((k) => k.n === 'Button')!.id }))

const taskRows = kidsOf(AGENDA).filter((k) => k.n.startsWith('Row / Task')).map((r) => {
  const pill = find(r.id, (n) => n.n.startsWith('Pill'))!
  const s = textIn(pill.id).txt!.toLowerCase() as TaskStatus
  return { id: r.id, name: named(r.id, 'Name'), checkbox: named(r.id, 'Checkbox').id, pill: pill.id, pillLabel: textIn(pill.id).id, due: named(r.id, 'Due date').id, more: kidsOf(r.id).find((k) => k.n === 'Button')!.id, initial: s }
})
const CHECK_OFF = node(taskRows.find((t) => t.initial !== 'done')!.checkbox)
const CHECK_ON = node(taskRows.find((t) => t.initial === 'done')!.checkbox)
const pillStyle = (status: TaskStatus) => {
  const src = taskRows.find((t) => t.initial === status)
  if (src) { const p = node(src.pill); return { bg: `rgba(${(p.fill![0] as number[]).join(',')})`, fg: segColor(textIn(p.id)) } }
  return status === 'idle' ? { bg: 'var(--color-idle-bg)', fg: 'var(--color-idle)' } : { bg: 'var(--color-bg-subtle)', fg: 'var(--color-text-secondary)' }
}
const doneName = taskRows.find((t) => t.initial === 'done')!.name
const statusLabel: Record<TaskStatus, string> = { overdue: 'Overdue', upcoming: 'Upcoming', done: 'Done', idle: 'Idle', cancelled: 'Cancelled' }

const LEGACY_LEAD = T.byId.has(LEAD_COLLAPSED)
const leadHeaders = LEGACY_LEAD ? [find(LEAD_COLLAPSED, (n) => n.n === 'Header')!, find(LEAD_DETAILS, (n) => n.n === 'Header')!] : []
const leadButtons = leadHeaders.map((h) => ({ edit: named(h.id, 'Secondary Button').id, assign: named(h.id, 'Primary Button').id, more: named(h.id, 'Icon button').id }))
const notAssignedTexts = T.findAll(node(LEAD_WRAP), (n) => n.t === 'TEXT' && n.txt === 'Not assigned').map((n) => n.id)
const showDetailsToggle = LEGACY_LEAD ? named(LEAD_COLLAPSED, /^Toggle \/ Show details/).id : undefined
const hideDetailsToggle = LEGACY_LEAD ? named(LEAD_DETAILS, /^Toggle \/ Show details/).id : undefined
const paymentLinks = T.findAll(node(LEAD_WRAP), (n) => n.n === 'Link / Open').map((n) => n.id)

// Values shown in the cards → initial values of the edit dialogs
const LEAD_INFO0: LeadInfo = { store: 'VKB, Bethesda, MD', source: 'Google', start: 'ASAP', houseType: 'Single House', houseAge: '1-5 years' }
const CONTACT0: Contact = { first: 'Cheryl', last: 'Isaac', phone: '+1 (131) 231-2321', email: 'onur@blackstonedata.ai', address: '4605 Reno Road NW, Washington DC 20008' }
const houseLabel = (i: LeadInfo) => `${i.houseType.charAt(0)}${i.houseType.slice(1).toLowerCase()}, ${i.houseAge.replace(' years', ' yrs').replace(' year', ' yr').replace('-', '–')}`
const textsIn = (fromId: string, txt: string) => T.findAll(node(fromId), (n) => n.t === 'TEXT' && n.txt === txt).map((n) => n.id)
const CONTACT_ROWS = ['85:5281', '85:5353', '85:5385']

// Tabs — all built (Overview is the Figma frame; the others follow the staging tabs with the lead's data).
// Every tab renders as a clone of the drawn active / idle tab so the state can move between them.
const cloneAs = (n: FNode, sfx: string): FNode => ({ ...n, id: `${n.id}#${sfx}`, k: n.k?.map((c) => cloneAs(c, sfx)) })
const TABS = '19:1210', GRID = '19:1231', CONTENT = '19:1099', LEFT_COL = '19:1232'
const TAB_KEYS: Record<string, TabKey> = { Overview: 'overview', Agenda: 'agenda', 'Files & Photos': 'files', Labors: 'labors', Materials: 'materials', Countertops: 'countertops', 'Payment Plan': 'payment', 'Signed documents': 'agreements', Messages: 'messages', Forms: 'forms' }
const makeTabs = (TT: typeof T) => (TT.byId.get(TABS)!.k ?? []).filter((k) => !k.hidden).map((t) => {
  const label = TT.find(t, (n) => n.t === 'TEXT')!.txt!.trim()
  const on = cloneAs(TT.byId.get('19:1211')!, `on-${t.id}`), off = cloneAs(TT.byId.get('19:1215')!, `off-${t.id}`)
  return { id: t.id, label, key: TAB_KEYS[label] as TabKey | undefined, on, off, onLabel: TT.find(on, (n) => n.t === 'TEXT')!.id, offLabel: TT.find(off, (n) => n.t === 'TEXT')!.id }
})
const TABS_BY_CONCEPT = { 1: makeTabs(T), 2: makeTabs(T2) }
const TASK_TPL = node(taskRows.find((t) => t.initial === 'upcoming')!.id)
const isPast = (v: string) => new Date(v).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)
const fmtDue = (v: string) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const FILE_SUMMARY: [string, string][] = [['Kitchen', '93:7332'], ['Bathroom', '93:7378'], ['Basement', find('93:7343', (n) => n.t === 'TEXT' && /files?$/.test(n.txt ?? ''))!.id]]

// ---------- page ----------
return function LeadOverviewPage({ concept = 1 }: { concept?: Concept }) {
  const R = concept === 2 ? root2 : root, RT = concept === 2 ? T2 : T, tabs = TABS_BY_CONCEPT[concept]
  const [menu, setMenu] = useState<MenuState>(null)
  const [toast, setToastState] = useState<ToastState>(null)
  const [dialog, setDialog] = useState<null | { kind: 'project' | 'wishlist' | 'task' | 'attach' | 'confirm'; data?: Record<string, unknown> }>(null)
  const [showDetails, setShowDetails] = useState(fixture === 'details')
  const [assignees, setAssignees] = useState<Assignees>({ designer: null, pm: null })
  const designer = assignees.designer
  const [messages, setMessages] = useState<Msg[]>([{ out: false, ch: 'SMS', text: 'Thanks, see you tomorrow!', when: '5:02 PM' }])
  const [kitchenOpen, setKitchenOpen] = useState(fixture !== 'kitchen-collapsed' && concept === 1)
  const [aiOpen, setAiOpen] = useState(false)
  const [needsOpen, setNeedsOpen] = useState(true)
  const [showSales, setShowSales] = useState(true)
  const [showCost, setShowCost] = useState(true)
  const [activityOpen, setActivityOpen] = useState(true)
  const [projStatus, setProjStatus] = useState<Record<string, string>>({})
  const [deletedRows, setDeletedRows] = useState<string[]>([])
  const [wish, setWish] = useState<Record<string, boolean>>({ '93:8375': true })
  const [task, setTask] = useState<Record<string, { status: TaskStatus; name?: string; deleted?: boolean }>>(
    Object.fromEntries(taskRows.map((t) => [t.id, { status: t.initial }])))
  const [hideDone, setHideDone] = useState(false)
  const [ai, setAi] = useState<{ q: string; a: string }[]>([])
  const [aiText, setAiText] = useState('')
  const [leadInfo, setLeadInfo] = useState<LeadInfo>(LEAD_INFO0)
  const [contact, setContact] = useState<Contact>(CONTACT0)
  const [editing, setEditing] = useState<null | 'lead' | 'contact' | 'assign' | 'messages'>(null)
  const [tabState, setTabState] = useState<TabKey>((new URLSearchParams(location.search).get('tab') as TabKey) || 'overview')
  // Concept 2 is presented on Overview only: other tabs are drawn but inert, and links into them are off
  const tabsOn = concept === 1
  const tabLive = (k?: TabKey) => !!k && (tabsOn || k === 'overview' || k === 'files') // concept 2: Overview + Files & Photos only
  const tab: TabKey = tabLive(tabState) ? tabState : 'overview'
  const setTab = (t: TabKey) => { setTabState(t); setMenu(null); window.scrollTo({ top: 0 }) }
  const [newTasks, setNewTasks] = useState<NewTask[]>([])
  const [files, setFiles] = useState<FilesState>(concept === 2 ? FILES0_C2 : FILES0)
  const [catalog, setCatalog] = useState<CatalogKind | null>(null)

  const say = useCallback((text: string, undo?: () => void) => setToastState({ id: Date.now(), text, undo }), [])
  const open = (key: string, anchorId: string, items: MenuItem[], width?: number, align?: 'left' | 'right') => setMenu((m) => (m?.key === key ? null : { key, anchorId, items, width, align }))
  const confirm = (data: { title: string; body: string; ok: string; danger?: boolean; run: () => void }) => setDialog({ kind: 'confirm', data })
  const notInPrototype = (what: string) => say(`${what} isn’t part of this prototype`)

  const patches: Record<string, Patch | undefined> = {}
  let colsMenuItems: (() => MenuItem[]) | null = null
  const handlers: Record<string, Handler | undefined> = {}
  const on = (id: string | undefined, h: Handler) => {
    if (!id) return
    const prev = handlers[id]
    handlers[id] = { ...prev, ...h, className: [prev?.className, h.className].filter(Boolean).join(' ') || undefined }
  }
  // ⋯ row actions are revealed on row hover (kept visible while their menu is open)
  const moreCls = (id: string) => `more-on-hover${menu?.anchorId === id ? ' is-open' : ''}`

  // Contact + Lead cards: 16 px gap like the rest of the page (0 in the mock); the Lead card gives up the 16 px
  if (LEAD_WRAP === '109:5225') { patches['25:4990'] = { style: { gap: 16 } }; patches[LEAD_WRAP] = { style: { flex: '1 1 0', minWidth: 0 } } } // the current frame already has the gap
  // Left menu is always pinned to the viewport
  patches['19:974'] = { style: { position: 'sticky', top: 0, height: '100vh', alignSelf: 'flex-start' } }
  // Page ends where the content ends (the Figma frame has fixed heights); overflow: clip keeps sticky working
  patches[root.id] = { style: { minHeight: '100vh', overflow: 'clip' } }
  patches[CONTENT] = { style: { height: 'auto', padding: RT.byId.get(CONTENT)!.al!.p.map((v, i) => `${i === 2 ? 48 : v}px`).join(' ') } }
  // Lead card — "Show details" is the drawn alternate state (hidden frame in the mock)
  if (LEGACY_LEAD) { patches[LEAD_COLLAPSED] = { hidden: showDetails }; patches[LEAD_DETAILS] = { hidden: !showDetails } }
  on(showDetailsToggle, { onClick: () => setShowDetails(true), title: 'Show details' })
  on(hideDetailsToggle, { onClick: () => setShowDetails(false), title: 'Hide details' })
  if (designer) notAssignedTexts.forEach((id) => (patches[id] = { txt: designer }))
  const leadMore = (): MenuItem[] => [
    { label: 'Copy lead link', icon: <Link2 {...I} />, onSelect: () => { navigator.clipboard?.writeText(location.href); say('Lead link copied') } },
    { label: 'Send to archive', icon: <Archive {...I} />, onSelect: () => confirm({ title: 'Send Cheryl Isaac to archive?', body: 'The lead leaves the active pipeline. You can restore it from Archive.', ok: 'Send to archive', run: () => say('Lead sent to archive (demo)') }) },
    '-',
    { label: 'Delete lead', danger: true, icon: <Trash2 {...I} />, onSelect: () => confirm({ title: 'Delete Cheryl Isaac?', body: 'The lead, its 3 projects, tasks and files are removed for everyone. You can’t undo this.', ok: 'Delete lead', danger: true, run: () => say('Lead deleted (demo)') }) },
  ]
  leadButtons.forEach((b) => {
    on(b.edit, { onClick: () => setEditing('lead'), title: 'Edit lead' })
    on(b.assign, { onClick: () => setEditing('assign'), title: 'Assign designer' })
    on(b.more, { onClick: () => open('lead-more', b.more, [
      { label: 'Copy lead link', icon: <Link2 {...I} />, onSelect: () => { navigator.clipboard?.writeText(location.href); say('Lead link copied') } },
      { label: 'Send to archive', icon: <Archive {...I} />, onSelect: () => confirm({ title: 'Send Cheryl Isaac to archive?', body: 'The lead leaves the active pipeline. You can restore it from Archive.', ok: 'Send to archive', run: () => say('Lead sent to archive (demo)') }) },
      '-',
      { label: 'Delete lead', danger: true, icon: <Trash2 {...I} />, onSelect: () => confirm({ title: 'Delete Cheryl Isaac?', body: 'The lead, its 3 projects, tasks and files are removed for everyone. You can’t undo this.', ok: 'Delete lead', danger: true, run: () => say('Lead deleted (demo)') }) },
    ], 220) })
  })
  if (tabsOn && tab !== 'payment') paymentLinks.forEach((id) => on(id, { onClick: () => setTab('payment'), title: 'Open the Payment Plan tab' }))

  // Lead info values (edited through the "Info" dialog)
  const leadText: [string, string][] = [[LEAD_INFO0.store, leadInfo.store], [LEAD_INFO0.source, leadInfo.source], [LEAD_INFO0.start, leadInfo.start], [houseLabel(LEAD_INFO0), houseLabel(leadInfo)]]
  leadText.forEach(([from, to]) => from !== to && textsIn(LEAD_WRAP, from).forEach((id) => (patches[id] = { txt: to })))

  // Contact card — edit dialog, values, hover-only copy
  if (T.byId.has('85:3793')) on(named('85:3793', 'Secondary Button').id, { onClick: () => setEditing('contact'), title: 'Edit contact' })
  const fullName = `${contact.first} ${contact.last}`.trim()
  patches['85:3794'] = { txt: fullName }
  textsIn('19:1100', 'Cheryl Isaac').forEach((id) => (patches[id] = { txt: fullName }))
  patches[named('85:5281', 'Value').id] = { txt: contact.phone }
  patches[named('85:5353', 'Value').id] = { txt: contact.email }
  patches[named('85:5385', 'Value').id] = { txt: contact.address }
  CONTACT_ROWS.forEach((id) => on(id, { className: 'contact-row' }))
  patches['85:5353'] = { bg: 'transparent' } // grey fill in the mock is the hover state
  const copy = (text: string, label: string) => () => { navigator.clipboard?.writeText(text); say(`${label} copied`) }
  const mailCopy = find('85:5353', (n) => n.n === 'Icon button / Copy')
  if (mailCopy) {
    on(mailCopy.id, { onClick: copy(contact.email, 'Email'), title: 'Copy email', className: 'copy-on-hover' })
    const copyBtn = (key: string, text: string, label: string, parentId: string) => (
      <span key={key} className="copy-on-hover clickable ghost" role="button" tabIndex={0} title={`Copy ${label.toLowerCase()}`} onClick={copy(text, label)} style={{ display: 'inline-flex', borderRadius: 6, flexShrink: 0 }}>
        <FigmaNode node={{ ...mailCopy, id: `${mailCopy.id}#${key}` }} parent={node(parentId)} />
      </span>
    )
    on(named('85:5281', 'Actions').id, { after: copyBtn('phone', contact.phone, 'Phone number', named('85:5281', 'Actions').id) })
    on('85:5385', { className: 'contact-row', after: copyBtn('address', contact.address, 'Address', '85:5385') })
    // Call and SMS icons removed from the phone row (designer, Oct 1); the hover-only copy button stays
    patches[named('85:5281', 'Icon button / Call').id] = { hidden: true }
    patches[named('85:5281', 'Icon button / Copy').id] = { hidden: true }
  } else {
    // Option 2: plain rows without icon buttons → the row copies its value
    ;([['85:5281', contact.phone, 'Phone number'], ['85:5353', contact.email, 'Email'], ['85:5385', contact.address, 'Address']] as const).forEach(([id, v, l]) => on(id, { onClick: copy(v, l), title: `Copy ${l.toLowerCase()}`, className: 'value-hover' }))
  }

  // Top bar search → real input
  const searchText = textIn('19:1071')
  on(searchText.id, { render: () => <input key="search" className="bare-input" style={{ flex: '1 1 0', minWidth: 0, fontSize: 13, lineHeight: '19px' }} placeholder={searchText.txt} aria-label="Search" /> })

  // Project Details — header
  const headActions = named(PD_HEAD, 'Actions')
  const colsNode = find(headActions.id, (n) => n.n === 'Icon button / cols')
  if (colsNode) {
    // older snapshot (concept 2): columns popover + doc icon + "Add ▾" menu
    const colsBtn = colsNode.id
    const colsOpen = menu?.key === 'cols'
    const colsCount = Number(showCost) + Number(showSales)
    const colsItems = (): MenuItem[] => [
      { label: 'Show cost', checkbox: true, checked: showCost, keepOpen: true, onSelect: () => setShowCost((v) => !v) },
      { label: 'Show sale', checkbox: true, checked: showSales, keepOpen: true, onSelect: () => setShowSales((v) => !v) },
      '-',
      { label: 'Show all columns', link: true, keepOpen: true, onSelect: () => { setShowCost(true); setShowSales(true) } },
    ]
    colsMenuItems = colsItems
    on(colsBtn, {
      onClick: () => open('cols', colsBtn, colsItems(), 268), title: 'Columns',
      className: [colsOpen ? 'cols-open' : '', 'no-dot'].filter(Boolean).join(' '),
      render: (_n, el) => <span key="cols" style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>{el}{colsCount > 0 && <span className="count-badge">{colsCount}</span>}</span>,
    })
    on(named(headActions.id, 'Icon button / doc').id, { onClick: () => say('Downloading summary PDF…'), title: 'Download summary PDF' })
    const addBtn = named(headActions.id, /^Button \/ Add/).id
    on(addBtn, { onClick: () => open('add', addBtn, [
      { label: 'New project', icon: <Plus {...I} />, onSelect: () => setDialog({ kind: 'project' }) },
      { label: 'From wishlist', icon: <Heart {...I} />, onSelect: () => setDialog({ kind: 'wishlist' }) },
    ], 220) })
  } else {
    // current design: Preview PDF · Add from wishlist · Add project buttons + Show cost / Show sale switches
    const btn = (label: string) => T.find(node(headActions.id), (n) => n.n === 'Secondary Button' && !!T.find(n, (m) => m.t === 'TEXT' && m.txt === label))?.id
    on(btn('Preview PDF'), { onClick: () => say('Downloading summary PDF…'), title: 'Preview PDF' })
    on(btn('Add from wishlist'), { onClick: () => setDialog({ kind: 'wishlist' }), title: 'Add from wishlist' })
    on(btn('Add project'), { onClick: () => setDialog({ kind: 'project' }), title: 'Add project' })
    if (PD_TOGGLES) {
      const switches = T.findAll(node(PD_TOGGLES), (n) => n.n === 'Switch')
      ;[[showCost, setShowCost, 'Show cost'], [showSales, setShowSales, 'Show sale']].forEach(([on_, set, label], i) => {
        const sw = switches[i]; if (!sw) return
        const isOn = on_ as boolean
        patches[sw.id] = { bg: isOn ? undefined : 'var(--color-switch-off)', style: { justifyContent: isOn ? 'flex-end' : 'flex-start', transition: 'background .15s' } }
        const toggle = () => (set as (f: (v: boolean) => boolean) => void)((v) => !v)
        // the whole "switch + label" pair is the hit area
        const pair = T.find(node(PD_TOGGLES), (n) => !!n.k?.some((k) => k.id === sw.id))!
        on(pair.id, { onClick: toggle, title: label as string, className: 'switch-hit' })
        handlers[pair.id] = { ...handlers[pair.id], render: (_n, el) => <span key={pair.id} role="switch" aria-checked={isOn} aria-label={label as string} style={{ display: 'contents' }}>{el}</span> }
      })
    }
  }
  // Columns filter: Total ("cost") = index 4, Sales = index 5 in the header and project rows (the summary footer has no columns)
  const dataRows = PD_TOTAL_ROW ? [...PROJECT_ROWS, PD_TOTAL_ROW] : PROJECT_ROWS
  const colCells = (i: number) => [kidsOf(PD_COLHEAD)[i].id, ...dataRows.map((r) => kidsOf(r)[i]?.id).filter(Boolean) as string[]]
  if (!showCost) colCells(4).forEach((id) => (patches[id] = { hidden: true }))
  if (!showSales) colCells(5).forEach((id) => (patches[id] = { hidden: true }))
  // the width freed by hidden columns is shared by the remaining data columns (same delta in header and rows → stays aligned)
  const hiddenCols = [!showCost && 4, !showSales && 5].filter((i): i is number => i !== false)
  if (hiddenCols.length) {
    const header = kidsOf(PD_COLHEAD), gap = node(PD_COLHEAD).al?.gap ?? 0
    const visible = [0, 1, 2, 3, 4, 5].filter((i) => !hiddenCols.includes(i))
    const delta = hiddenCols.reduce((a, i) => a + header[i].w + gap, 0) / visible.length
    visible.forEach((i) => [header[i], ...dataRows.map((r) => kidsOf(r)[i])].forEach((c) => {
      if (!c) return
      patches[c.id] = { ...patches[c.id], style: { ...patches[c.id]?.style, width: c.w + delta, flexShrink: 0 } }
    }))
  }
  const liveProjects = projectRows.filter((r) => !deletedRows.includes(r.id))
  patches[find(PD_HEAD, (n) => n.t === 'TEXT' && /projects?$/.test(n.txt ?? ''))!.id] = { txt: `${liveProjects.length} project${liveProjects.length === 1 ? '' : 's'}` }

  // Project rows
  patches[KITCHEN_EXPANDED] = { hidden: !kitchenOpen || deletedRows.includes('93:8375') }
  patches[projectRows[0].chevron] = { style: { transform: kitchenOpen ? 'none' : 'rotate(-90deg)', transition: 'transform .18s var(--spring-snappy)' } }
  on('93:8375', { onClick: () => setKitchenOpen((v) => !v), title: kitchenOpen ? 'Collapse Kitchen' : 'Expand Kitchen', className: 'row-hover' })
  projectRows.forEach((r) => {
    if (deletedRows.includes(r.id)) { patches[r.id] = { hidden: true }; return }
    on(r.id, { className: 'hover-row' }); on(r.more, { className: moreCls(r.more) })
    const st = projStatus[r.id]
    if (r.pill && st) { const s = st === 'Scheduled Leads' ? { bg: `rgba(${(node(r.pill).fill![0] as number[]).join(',')})`, fg: segColor(textIn(r.pill)) } : projectStatuses.find((p) => p.label === st)!; patches[r.pill] = { bg: s.bg }; patches[r.pillLabel!] = { txt: st, color: s.fg } }
    if (r.pill) on(r.pill, { onClick: stop(() => open(`status-${r.id}`, r.pill!, [{ title: `${r.name} status` }, ...projectStatuses.map((s) => ({ label: s.label, dot: s.dot, checked: (st ?? 'Scheduled Leads') === s.label, onSelect: () => { const prev = st; setProjStatus((p) => ({ ...p, [r.id]: s.label })); say(`${r.name} → ${s.label}`, () => setProjStatus((p) => ({ ...p, [r.id]: prev! }))) } }))], 232, 'left')), title: 'Change status' })
    on(r.more, { onClick: stop(() => open(`proj-${r.id}`, r.more, [
      { label: 'Edit project', icon: <Pencil {...I} />, onSelect: () => setDialog({ kind: 'project', data: { edit: r.name } }) },
      { label: 'Project info', icon: <Info {...I} />, onSelect: () => say(`${r.name} · created Sep 24, 2026 by Test Designer`) },
      '-',
      { label: 'Download PDF', icon: <Download {...I} />, onSelect: () => say(`Downloading ${r.name} PDF…`) },
      { label: 'Duplicate project', icon: <CopyPlus {...I} />, onSelect: () => say(`${r.name} duplicated (demo)`) },
      { label: wish[r.id] ? 'Remove from wishlist' : 'Save to wishlist', icon: <Heart {...I} />, onSelect: () => { const was = !!wish[r.id]; setWish((w) => ({ ...w, [r.id]: !was })); say(was ? `${r.name} removed from wishlist` : `${r.name} saved to wishlist`, () => setWish((w) => ({ ...w, [r.id]: was }))) } },
      '-',
      { label: 'Delete project', danger: true, icon: <Trash2 {...I} />, onSelect: () => confirm({ title: `Delete the ${r.name} project?`, body: 'Its materials, labors and countertops are removed from the estimate and the PDF. You can’t undo this.', ok: 'Delete project', danger: true, run: () => { setDeletedRows((d) => [...d, r.id]); say(`${r.name} deleted`) } }) },
    ], 232)), title: 'Project actions' })
  })
  lineItems.forEach((it) => {
    on(it.id, { className: 'hover-row' }); on(it.more, { className: moreCls(it.more) })
    on(it.more, { onClick: () => open(`item-${it.id}`, it.more, [
      { label: 'Edit quantity & price', icon: <Pencil {...I} />, onSelect: () => notInPrototype('Inline quantity editing') },
      { label: 'Replace from catalog', icon: <RefreshCw {...I} />, onSelect: () => setCatalog(groupOf(it.id)) },
      { label: 'Duplicate', icon: <CopyPlus {...I} />, onSelect: () => say(`${it.name} duplicated (demo)`) },
      { label: 'Move to project', icon: <MoveRight {...I} />, meta: '›', onSelect: () => open(`move-${it.id}`, it.more, projectRows.filter((p) => p.name !== 'Kitchen').map((p) => ({ label: p.name, onSelect: () => say(`${it.name} moved to ${p.name} (demo)`) })), 200) },
      '-',
      { label: 'Remove item', danger: true, icon: <Trash2 {...I} />, onSelect: () => { patchesState.remove(it.id); say(`${it.name} removed`, () => patchesState.restore(it.id)) } },
    ], 248), title: 'Item actions' })
  })
  // "Add from catalog" per group (Materials · Labors · Countertops, in drawn order)
  const CATALOG_GROUPS: CatalogKind[] = ['Materials', 'Labors', 'Countertops']
  kidsOf(KITCHEN_EXPANDED).forEach((g, i) => T.findAll(g, (n) => n.n === 'Link Button').forEach((b) => on(b.id, { onClick: () => setCatalog(CATALOG_GROUPS[i]), title: `Add ${CATALOG_GROUPS[i].toLowerCase()} from catalog` })))
  const groupOf = (id: string) => CATALOG_GROUPS[kidsOf(KITCHEN_EXPANDED).findIndex((g) => !!T.find(g, (n) => n.id === id))] ?? 'Materials'

  // Agenda
  const [removedItems, setRemovedItems] = useState<string[]>([])
  const patchesState = { remove: (id: string) => setRemovedItems((r) => [...r, id]), restore: (id: string) => setRemovedItems((r) => r.filter((x) => x !== id)) }
  removedItems.forEach((id) => (patches[id] = { hidden: true }))
  const setTaskStatus = (id: string, status: TaskStatus, msg: string) => { const prev = task[id].status; setTask((t) => ({ ...t, [id]: { ...t[id], status } })); say(msg, () => setTask((t) => ({ ...t, [id]: { ...t[id], status: prev } }))) }
  // Task ⋯ menu — exactly the designer's "Agenda — Task actions" spec
  const taskMenu = (id: string, title: string, setStatus: (s: TaskStatus, msg: string) => void, remove: () => void): MenuItem[] => [
    { label: 'Edit task', icon: <Pencil {...I} />, onSelect: () => setDialog({ kind: 'task', data: { id, title } }) },
    { label: 'Attach file', icon: <Paperclip {...I} />, onSelect: () => setDialog({ kind: 'attach', data: { title } }) },
    '-',
    { label: 'Mark as idle', icon: <SquareCheck {...I} />, onSelect: () => setStatus('idle', `“${title}” marked as idle`) },
    { label: 'Cancel task', icon: <CircleX {...I} />, onSelect: () => confirm({ title: `Cancel “${title}”?`, body: 'The task stays in Agenda as Cancelled and stops counting as overdue.', ok: 'Cancel task', run: () => setStatus('cancelled', `“${title}” cancelled`) }) },
    '-',
    { label: 'Delete task', danger: true, icon: <Trash2 {...I} />, onSelect: () => confirm({ title: `Delete “${title}”?`, body: 'The task and its attachments are removed for everyone. You can’t undo this.', ok: 'Delete task', danger: true, run: () => { remove(); say(`“${title}” deleted`) } }) },
  ]
  taskRows.forEach((t) => {
    const s = task[t.id]
    if (s.deleted || (hideDone && s.status === 'done')) { patches[t.id] = { hidden: true }; return }
    const done = s.status === 'done', closed = done || s.status === 'cancelled'
    const ps = pillStyle(s.status)
    patches[t.pill] = { bg: ps.bg }
    patches[t.pillLabel] = { txt: statusLabel[s.status], color: ps.fg }
    patches[t.name.id] = { txt: s.name, decoration: closed ? 'line-through' : 'none', color: closed ? segColor(doneName) : segColor(t.name) }
    const title = s.name ?? t.name.txt!
    on(t.id, { className: 'hover-row' }); on(t.more, { className: moreCls(t.more) })
    on(t.checkbox, {
      render: () => (
        <span key={t.checkbox} role="checkbox" aria-checked={done} aria-label={done ? 'Mark as not done' : 'Mark as done'} tabIndex={0} className={`check-hit${s.status === 'cancelled' ? ' is-disabled' : ''}`}
          onClick={() => s.status !== 'cancelled' && setTaskStatus(t.id, done ? (t.initial === 'done' ? 'upcoming' : t.initial) : 'done', done ? `“${title}” reopened` : `“${title}” marked as done`)}
          onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), (e.currentTarget as HTMLElement).click())}>
          <FigmaNode node={{ ...(done ? CHECK_ON : CHECK_OFF), id: `${t.checkbox}#${done ? 'on' : 'off'}` }} parent={node(named(t.id, 'Cell / p').id)} />
        </span>
      ),
    })
    on(t.more, { onClick: () => open(`task-${t.id}`, t.more, taskMenu(t.id, title, (st, msg) => setTaskStatus(t.id, st, msg), () => setTask((x) => ({ ...x, [t.id]: { ...x[t.id], deleted: true } }))), 232), title: 'Task actions' })
  })
  const openStatuses = [...taskRows.filter((t) => !task[t.id].deleted).map((t) => task[t.id].status), ...newTasks.filter((t) => !t.deleted).map((t) => t.status)].filter((s) => ['overdue', 'upcoming', 'idle'].includes(s))
  const openTasks = openStatuses
  const overdue = openStatuses.filter((s) => s === 'overdue').length
  const agendaCount = find(AGENDA_HEAD, (n) => n.t === 'TEXT' && /open tasks/.test(n.txt ?? ''))!
  patches[agendaCount.id] = { txt: `${openTasks.length} open task${openTasks.length === 1 ? '' : 's'}${overdue && agendaCount.txt!.includes('overdue') ? ` · ${overdue} overdue` : ''}` }
  on(named(AGENDA_HEAD, 'Secondary Button').id, { onClick: () => setDialog({ kind: 'task', data: {} }) })
  const agendaViewAll = named(AGENDA_HEAD, 'Link Button').id
  if (tab === 'agenda') patches[agendaViewAll] = { hidden: true }
  else if (tabsOn) on(agendaViewAll, { onClick: () => setTab('agenda'), title: 'Open the Agenda tab' })
  // Agenda tab: the same card at full width — the Task column takes the extra space
  const growCell = (id: string) => { const n = node(id), par = T.parentOf.get(id)!; return { style: { width: `calc(100% - ${par.w - par.al!.p[1] - par.al!.p[3] - n.w}px)` } } }
  if (tab === 'agenda') ['42:11146', ...taskRows.map((t) => named(t.id, 'Cell / p').id)].forEach((id) => (patches[id] = { ...patches[id], ...growCell(id) }))
  // Tasks added through "Add Task" — clones of a drawn row
  const liveNew = newTasks.filter((t) => !t.deleted && !(hideDone && t.status === 'done'))
  on(AGENDA, { after: liveNew.map((t) => {
    const c = cloneAs(TASK_TPL, t.id), at = (name: string) => T.find(c, (n) => n.n === name)!.id
    const ps = pillStyle(t.status), done = t.status === 'done'
    const pill = T.find(c, (n) => n.n.startsWith('Pill'))!, more = (c.k ?? []).find((k) => k.n === 'Button')!.id, cb = at('Checkbox')
    patches[at('Name')] = { txt: t.name, decoration: done ? 'line-through' : 'none', color: done ? segColor(doneName) : undefined }
    patches[at('Created by')] = { txt: 'Test Designer' }
    patches[at('Due date')] = { txt: fmtDue(t.due), color: t.status === 'overdue' ? segColor(node(taskRows.find((r) => r.initial === 'overdue')!.due)) : undefined }
    patches[pill.id] = { bg: ps.bg }
    patches[T.find(pill, (n) => n.t === 'TEXT')!.id] = { txt: statusLabel[t.status], color: ps.fg }
    if (tab === 'agenda') patches[at('Cell / p')] = growCell(named(TASK_TPL.id, 'Cell / p').id)
    const setSt = (status: TaskStatus) => setNewTasks((x) => x.map((y) => (y.id === t.id ? { ...y, status } : y)))
    const reopen: TaskStatus = isPast(t.due) ? 'overdue' : 'upcoming'
    on(c.id, { className: 'hover-row' }); on(more, { className: moreCls(more) })
    on(cb, { render: () => (
      <span key={cb} role="checkbox" aria-checked={done} aria-label={done ? 'Mark as not done' : 'Mark as done'} tabIndex={0} className="check-hit"
        onClick={() => { setSt(done ? reopen : 'done'); say(done ? `“${t.name}” reopened` : `“${t.name}” marked as done`) }}>
        <FigmaNode node={{ ...(done ? CHECK_ON : CHECK_OFF), id: `${cb}#${done ? 'on' : 'off'}` }} parent={node(named(TASK_TPL.id, 'Cell / p').id)} />
      </span>) })
    on(more, { onClick: () => open(`task-${t.id}`, more, taskMenu(t.id, t.name, (st, msg) => { setSt(st); say(msg) }, () => setNewTasks((x) => x.map((y) => (y.id === t.id ? { ...y, deleted: true } : y)))), 232), title: 'Task actions' })
    return <FigmaNode key={c.id} node={c} parent={node(AGENDA)} />
  }) })
  const agendaHeaderMore = kidsOf('42:11145').find((k) => k.n === 'Button')!.id
  on(agendaHeaderMore, { onClick: () => open('agenda-more', agendaHeaderMore, [{ label: hideDone ? 'Show completed tasks' : 'Hide completed tasks', checked: hideDone, onSelect: () => setHideDone((v) => !v) }], 230), title: 'List options' })

  // Activity
  patches[ACTIVITY_BODY] = { hidden: !activityOpen }
  patches[find(ACTIVITY_HEAD, (n) => !!n.icon)!.id] = { style: { transform: activityOpen ? 'none' : 'rotate(180deg)', transition: 'transform .18s var(--spring-snappy)' } }
  on(ACTIVITY_HEAD, { onClick: () => setActivityOpen((v) => !v), title: activityOpen ? 'Collapse activity' : 'Expand activity', className: 'row-hover' })

  // Right column
  const ask = (q: string) => { if (!q.trim()) return; setAi((a) => [...a, { q, a: aiAnswers[q] ?? aiFallback }]) }
  AI_SUGGESTIONS.forEach((id) => on(id, { onClick: () => ask(TA.find(TA.byId.get(id)!, (n) => n.t === 'TEXT')!.txt!) }))
  const aiPlaceholder = TA.find(TA.byId.get(AI_INPUT)!, (n) => n.n === 'Placeholder')!
  on(aiPlaceholder.id, { render: () => <input key="ai-field" className="bare-input" style={{ flex: '1 1 0', minWidth: 0, fontSize: 13, lineHeight: '19px' }} value={aiText} onChange={(e) => setAiText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { ask(aiText); setAiText('') } }} placeholder={aiPlaceholder.txt} aria-label="Ask the AI assistant" /> })
  on(TA.find(TA.byId.get(AI_INPUT)!, (n) => n.n === 'Send')!.id, { onClick: () => { if (!aiText.trim()) { say('Type a question or pick a suggestion'); return } ask(aiText); setAiText('') }, title: 'Send' })
  on(AI, { after: ai.length ? <div className="ai-thread">{ai.map((m, i) => <div key={i}><div className="ai-q">{m.q}</div><div className="ai-a">{m.a}</div></div>)}</div> : undefined })
  if (tabsOn) on('93:6062', { onClick: () => setTab('messages'), title: 'Open the Messages tab' })
  if (tabsOn) SIGNED_LINKS.forEach((id) => on(id, { onClick: () => setTab('agreements'), title: 'Open the Signed documents tab' }))
  if (tab !== 'files') on('93:7192', { onClick: () => setTab('files'), title: 'Open the Files & Photos tab' })
  FILE_SUMMARY.forEach(([p, id]) => { const n = countIn(files, p); patches[id] = { txt: `${n} file${n === 1 ? '' : 's'}` } })
  if (hasRequired(files, 'Bathroom')) patches['93:7471'] = { hidden: true }

  // Tabs
  tabs.forEach((t) => {
    const active = (t.key ?? '') === tab, c = active ? t.on : t.off
    patches[active ? t.onLabel : t.offLabel] = { txt: t.label }
    if (!active && !tabLive(t.key)) on(c.id, { className: 'tab-inactive' })
    else if (!active) on(c.id, { onClick: () => (t.key ? setTab(t.key) : notInPrototype(`The ${t.label} tab`)), title: t.key ? undefined : `${t.label} — not in this prototype`, className: t.key ? undefined : 'tab-inactive' })
    on(t.id, { render: () => <FigmaNode node={c} parent={RT.byId.get(TABS)!} /> })
  })
  if (tab !== 'overview') {
    on(GRID, { render: () => (
      <div className={`tab-content${concept === 2 ? " in-row" : ""}`}>
        {tab === 'agenda' ? <FigmaNode node={node(AGENDA)} parent={node(LEFT_COL)} />
          : tab === 'files' ? <FilesTab projects={liveProjects.map((p) => p.name)} files={files} setFiles={setFiles} say={say} />
          : tab === 'labors' || tab === 'materials' || tab === 'countertops' ? <EstimateTab key={tab} kind={(tab.charAt(0).toUpperCase() + tab.slice(1)) as CatalogKind} projects={liveProjects.map((p) => p.name)} onCatalog={setCatalog} say={say} />
          : tab === 'payment' ? <PaymentTab />
          : tab === 'agreements' ? <AgreementsTab say={say} confirm={confirm} />
          : tab === 'messages' ? <MessagesTab name={fullName} messages={messages} onSend={(m) => setMessages((x) => [...x, m])} />
          : <FormsTab email={contact.email} say={say} confirm={confirm} />}
      </div>
    ) })
  }

  const topAI = !AI_INLINE ? T.find(node('19:1070'), (n) => n.n === 'Primary Button' && !!T.find(n, (m) => m.t === 'TEXT' && m.txt === 'AI Assistant')) : undefined
  if (topAI) on(topAI.id, { onClick: () => setAiOpen((v) => !v), title: 'AI Assistant' })

  // ---------- Concept 1 · Option 2 (Figma 184:3568): merged lead card, stage, Needs attention, Ask AI ----------
  if (LEAD_CARD2) {
    textsIn(LEAD_CARD2, 'Cheryl Isaac').forEach((id) => (patches[id] = { txt: fullName }))
    const initialsText = find('206:5729', (n) => n.t === 'TEXT')
    if (initialsText) patches[initialsText.id] = { txt: `${contact.first[0] ?? ''}${contact.last[0] ?? ''}`.toUpperCase() }
    on('206:6024', { onClick: () => setAiOpen((v) => !v), title: 'Ask AI' })
    on('206:6025', { onClick: () => setEditing('assign'), title: 'Assign designer' })
    on('206:6026', { onClick: () => open('lead-more', '206:6026', leadMore(), 220), title: 'Lead actions' })
    on('206:5963', { onClick: () => setEditing('contact'), title: 'Edit contact' })
    on('206:6015', { onClick: () => setEditing('lead'), title: 'Edit lead' })
    on('206:6136', { onClick: () => setEditing('assign'), title: designer ? 'Change assignees' : 'Assign designer', className: 'value-hover' })
  }
  if (NEEDS) {
    // Needs attention: header collapses the list; each row's link runs its action; resolved rows disappear
    const rows = (NEEDS.k ?? []).filter((k) => k.n.startsWith('Row / Task') && !k.hidden)
    const label = (r: FNode) => T.find(r, (n) => n.n === 'Link Button')
    const linkText = (r: FNode) => (label(r) ? T.find(label(r)!, (n) => n.t === 'TEXT')?.txt?.trim() : '') ?? ''
    const overdueTask = taskRows.find((t) => t.initial === 'overdue')
    const resolved = (r: FNode) => {
      const l = linkText(r)
      if (l === 'Assign designer') return !!designer
      if (l === 'Upload photos') return hasRequired(files, 'Bathroom')
      if (l === 'Open task') return !!overdueTask && ['done', 'cancelled'].includes(task[overdueTask.id].status)
      return false
    }
    const live = rows.filter((r) => !resolved(r))
    rows.forEach((r) => {
      if (resolved(r)) { patches[r.id] = { hidden: true }; return }
      on(r.id, { className: 'hover-row' })
      const l = linkText(r), btn = label(r)?.id
      const act: Record<string, () => void> = {
        'Open task': () => overdueTask && setDialog({ kind: 'task', data: { id: overdueTask.id, title: task[overdueTask.id].name ?? overdueTask.name.txt } }),
        'Assign designer': () => setEditing('assign'),
        'Upload photos': () => (tabsOn ? setTab('files') : notInPrototype('The Files & Photos tab')),
        'Open estimate': () => (tabsOn ? setTab('materials') : notInPrototype('The estimate')),
      }
      if (btn && act[l]) on(btn, { onClick: act[l], title: l })
    })
    const head = (NEEDS.k ?? [])[0], countText = T.find(head, (n) => n.t === 'TEXT' && /actions?$/.test(n.txt ?? ''))
    if (countText) patches[countText.id] = { txt: `${live.length} action${live.length === 1 ? '' : 's'}` }
    const chev = T.find(head, (n) => !!n.icon && /chev/.test(n.n))
    if (chev) patches[chev.id] = { style: { transform: needsOpen ? 'none' : 'rotate(180deg)', transition: 'transform .18s var(--spring-snappy)' } }
    on(head.id, { onClick: () => setNeedsOpen((v) => !v), title: needsOpen ? 'Collapse' : 'Expand', className: 'row-hover' })
    ;(NEEDS.k ?? []).slice(1).forEach((k) => { if (!needsOpen) patches[k.id] = { hidden: true } })
    if (!live.length) patches[NEEDS.id] = { hidden: true }
  }

  // ---------- concept 2: lead column + AI Assistant button (ids from Figma 124:1753) ----------
  if (concept === 2) {
    const n2 = (id: string) => T2.byId.get(id)!
    const LEAD2 = '124:2658'
    // the lead card grows (layoutGrow 1) inside an auto-height column → keep its own height in the browser
    patches[LEAD2] = { style: { flex: 'none' } }
    patches['124:2673'] = { txt: fullName }
    on('124:2680', { onClick: () => open('lead-more', '124:2680', [
      { label: 'Copy lead link', icon: <Link2 {...I} />, onSelect: () => { navigator.clipboard?.writeText(location.href); say('Lead link copied') } },
      { label: 'Send to archive', icon: <Archive {...I} />, onSelect: () => confirm({ title: `Send ${fullName} to archive?`, body: 'The lead leaves the active pipeline. You can restore it from Archive.', ok: 'Send to archive', run: () => say('Lead sent to archive (demo)') }) },
      '-',
      { label: 'Delete lead', danger: true, icon: <Trash2 {...I} />, onSelect: () => confirm({ title: `Delete ${fullName}?`, body: 'The lead, its 3 projects, tasks and files are removed for everyone. You can’t undo this.', ok: 'Delete lead', danger: true, run: () => say('Lead deleted (demo)') }) },
    ], 220), title: 'Lead actions' })
    on('124:2714', { onClick: () => setEditing('lead'), title: 'Edit lead' })
    on('124:2795', { onClick: () => setEditing('contact'), title: 'Edit contact' })
    // Designer: no Assign button in this layout — the "Not assigned" value opens Pick Assignees
    on('124:2748', { onClick: () => setEditing('assign'), title: designer ? 'Change assignees' : 'Assign designer', className: 'value-hover' })
    if (designer) patches['124:2755'] = { txt: designer, color: 'var(--color-text-primary)' }
    if (tabsOn && tab !== 'payment') on('124:2704', { onClick: () => setTab('payment'), title: 'Open the Payment Plan tab' })
    patches['124:2805'] = { txt: contact.phone }; patches['124:2818'] = { txt: contact.email }; patches['124:2829'] = { txt: contact.address }
    ;[['124:2797', contact.phone, 'Phone number'], ['124:2810', contact.email, 'Email'], ['124:2819', contact.address, 'Address']].forEach(([id, v, l]) => on(id, { onClick: copy(v, l), title: `Copy ${l.toLowerCase()}`, className: 'value-hover' }))
    const lead2: [string, string][] = [['124:2741', leadInfo.store], ['124:2769', leadInfo.source], ['124:2780', leadInfo.start], ['124:2789', houseLabel(leadInfo)]]
    lead2.forEach(([id, v]) => n2(id).txt !== v && (patches[id] = { txt: v }))
    void LEAD2
    // Files and photos summary (4 rows in this concept, incl. Laundry room as drawn)
    ;[['Kitchen', '124:3722'], ['Bathroom', '124:3736'], ['Basement', '109:10739']].forEach(([p, id]) => { const k = countIn(files, p); patches[id] = { txt: `${k} file${k === 1 ? '' : 's'}` } })
    if (hasRequired(files, 'Bathroom')) patches['124:3730'] = { hidden: true }
    if (hasRequired(files, 'Basement')) patches['109:10756'] = { hidden: true }
    // Kitchen row expands into the drawn line items (the same block as concept 1)
    on('93:8375', { render: (_n, el) => <>{el}{kitchenOpen && !deletedRows.includes('93:8375') && <FigmaNode key="kx" node={node(KITCHEN_EXPANDED)} parent={n2('42:10511')} />}</> })
    // AI Assistant lives in the top bar here → opens the same assistant card in a side panel
    on('124:3631', { onClick: () => setAiOpen((v) => !v), title: 'AI Assistant' })
  }

  return (
    <OverridesProvider value={{ patches, handlers }}>
      <FigmaNode node={R} />
      {(concept === 2 || !AI_INLINE) && aiOpen && (
        <aside className="ai-drawer" aria-label="AI Assistant">
          <button className="icon-plain ai-drawer-close" aria-label="Close AI Assistant" onClick={() => setAiOpen(false)}><X size={18} /></button>
          <FigmaNode node={aiNode} parent={TA.byId.get('19:1233')!} />
        </aside>
      )}
      <Menu state={menu?.key === 'cols' && colsMenuItems ? { ...menu, items: colsMenuItems() } : menu} onClose={() => setMenu(null)} />
      <CatalogDialog kind={catalog} onClose={() => setCatalog(null)} />
      <Toast toast={toast} onDone={() => setToastState(null)} />
      <LeadInfoDialog open={editing === 'lead'} value={leadInfo} onClose={() => setEditing(null)} onSave={(v) => { const prev = leadInfo; setLeadInfo(v); setEditing(null); say('Lead info saved', () => setLeadInfo(prev)) }} />
      <ContactDialog open={editing === 'contact'} value={contact} onClose={() => setEditing(null)} onSave={(v) => { const prev = contact; setContact(v); setEditing(null); say('Contact saved', () => setContact(prev)) }} />
      <AssignDialog open={editing === 'assign'} value={assignees} designers={designers} managers={projectManagers} onClose={() => setEditing(null)} onSave={(v) => { const prev = assignees; setAssignees(v); setEditing(null); say(v.designer ? `${v.designer} assigned as designer` : 'Assignees updated', () => setAssignees(prev)) }} />
      <MessagesDialog open={editing === 'messages'} name={fullName} phone={contact.phone} email={contact.email} store={leadInfo.store} status="Pending Leads" created="Sep 29, 2026, 2:17 PM" messages={messages} onSend={(m) => setMessages((x) => [...x, m])} onClose={() => setEditing(null)} />
      <Dialogs dialog={dialog} close={() => setDialog(null)} say={say} onRenameTask={(id, name) => (id.startsWith('new') ? setNewTasks((x) => x.map((y) => (y.id === id ? { ...y, name } : y))) : setTask((t) => ({ ...t, [id]: { ...t[id], name } })))} wish={wish}
        onAddTask={(name, due) => { const id = `new${Date.now()}`; setNewTasks((x) => [...x, { id, name, due, status: isPast(due) ? 'overdue' : 'upcoming' }]); say(`“${name}” added`, () => setNewTasks((x) => x.filter((y) => y.id !== id))) }}
        onUpload={(p, f, list) => {
          const folder = f as Folder
          const items: FileItem[] = list.map((file, i) => ({ id: `a${Date.now()}-${i}`, original: file.name, by: 'You', at: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }), size: file.size, src: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined }))
          const ids = new Set(items.map((x) => x.id))
          setFiles((x) => ({ ...x, [p]: { ...x[p], [folder]: [...(x[p]?.[folder] ?? []), ...items] } }))
          say(`${items.length} file${items.length === 1 ? '' : 's'} added to ${p} · ${f}`, () => setFiles((x) => ({ ...x, [p]: { ...x[p], [folder]: (x[p]?.[folder] ?? []).filter((y) => !ids.has(y.id)) } })))
        }} />
    </OverridesProvider>
  )
}

}

// Concept 1 = Option 2 (Figma 184:3568); the previous Concept 1 frame (19:973) stays reachable at ?concept=1&option=1
// Concept 1 has two variants: Option 1 = Figma 19:973, Option 2 = Figma 184:3568
const Page1o1 = makePage(tree)
const Page1o2 = makePage(treeC1o2)
const Page2 = makePage(tree) // Concept 2 shares the current Concept 1 widgets (scripts/build_concept2.py)
export default function LeadOverview({ concept = 1, option = 1 }: { concept?: Concept; option?: 1 | 2 }) {
  return concept === 2 ? <Page2 concept={2} /> : option === 2 ? <Page1o2 concept={1} /> : <Page1o1 concept={1} />
}

function Dialogs({ dialog, close, say, onRenameTask, wish, onAddTask, onUpload }: {
  dialog: null | { kind: string; data?: Record<string, unknown> }; close: () => void; say: (t: string, undo?: () => void) => void
  onRenameTask: (id: string, name: string) => void; wish: Record<string, boolean>
  onAddTask: (name: string, due: string) => void; onUpload: (project: string, folder: string, files: File[]) => void
}) {
  const d = dialog?.data ?? {}
  const [form, setForm] = useState<Record<string, string>>({})
  const picked = useRef<File[]>([])
  const key = useMemo(() => JSON.stringify(dialog), [dialog])
  const v = (k: string, dflt = '') => form[`${key}:${k}`] ?? dflt
  const set = (k: string) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [`${key}:${k}`]: e.target.value }))
  let body: ReactNode = null, title: ReactNode = '', subtitle: ReactNode, footer: ReactNode = null, width = 480

  if (dialog?.kind === 'project') {
    const edit = d.edit as string | undefined
    title = edit ? `Edit ${edit}` : 'Add project'; subtitle = edit ? undefined : 'A new row appears in Project Details.'
    body = <>
      <Field label="Project type" required><Select value={v('type', edit ?? '')} onChange={set('type')}><option value="" disabled>Select type…</option>{projectTypes.map((t) => <option key={t}>{t}</option>)}</Select></Field>
      <Field label="Title" optional hint="Shown next to the type when a lead has two projects of the same type."><TextInput value={v('title')} onChange={set('title')} placeholder="e.g. Guest bathroom" /></Field>
      <Field label="Status"><Select value={v('status', 'Initial Lead')} onChange={set('status')}>{projectStatuses.map((s) => <option key={s.label}>{s.label}</option>)}</Select></Field>
    </>
    footer = <><Btn onClick={close}>Cancel</Btn><Btn kind="primary" disabled={!v('type', edit ?? '')} onClick={() => { close(); say(edit ? `${edit} updated (demo)` : `${v('title') || v('type')} project added (demo)`) }}>{edit ? 'Save changes' : 'Add project'}</Btn></>
  } else if (dialog?.kind === 'wishlist') {
    title = 'Add from wishlist'; subtitle = 'Saved project templates. Adding copies all items into this lead.'; width = 560
    const saved = [{ n: 'Kitchen', d: 'White shaker kitchen', c: '5 items' }, { n: 'Bathroom', d: 'No description', c: 'Empty' }].filter((_, i) => i === 1 || wish['93:8375'])
    body = <div className="wish-list">{saved.map((s) => <div key={s.n} className="wish-row"><b>{s.n}</b><span className={s.d === 'No description' ? 'muted' : ''}>{s.d}</span><span className="chip">{s.c}</span><Btn onClick={() => { close(); say(`${s.n} added from wishlist (demo)`) }}>Add</Btn></div>)}</div>
    footer = <Btn onClick={close}>Close</Btn>
  } else if (dialog?.kind === 'task' && !d.id) {
    // "Add Task" — fields as in the PiSuite staging dialog: Task, Due Date, Description
    const today = new Date(); const pad = (n: number) => String(n).padStart(2, '0')
    const due0 = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}T08:00`
    title = 'Add Task'
    body = <>
      <Field label="Task"><Select value={v('task')} onChange={set('task')}><option value="" disabled>Select task…</option>{taskTypes.map((t) => <option key={t}>{t}</option>)}</Select></Field>
      <Field label="Due Date"><TextInput type="datetime-local" value={v('due', due0)} onChange={set('due')} /></Field>
      <Field label="Description"><TextArea value={v('desc')} onChange={set('desc')} placeholder="Description" /></Field>
    </>
    footer = <><Btn onClick={close}>Cancel</Btn><Btn kind="primary" disabled={!v('task') || !v('due', due0)} onClick={() => { close(); onAddTask(v('task'), v('due', due0)) }}>Add</Btn></>
  } else if (dialog?.kind === 'task') {
    const editing = d.id as string | undefined
    title = editing ? 'Edit task' : 'Add task'
    body = <>
      <Field label="Title"><TextInput value={v('title', (d.title as string) ?? '')} onChange={set('title')} placeholder="e.g. Confirm cabinet colour" /></Field>
      <div className="field-row">
        <Field label="Task type"><Select value={v('type', 'In-home Consultation')} onChange={set('type')}>{['In-home Consultation', 'Quote Preparation', 'Follow-up', 'Measurement'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Assignee"><Select value={v('who', 'Test Designer')} onChange={set('who')}>{designers.map((t) => <option key={t}>{t}</option>)}</Select></Field>
      </div>
      <Field label="Due date"><TextInput type="datetime-local" value={v('due', '2026-10-02T10:00')} onChange={set('due')} /></Field>
      <Field label="Description" optional><TextArea value={v('desc')} onChange={set('desc')} placeholder="What needs to happen?" /></Field>
    </>
    footer = <><Btn onClick={close}>Cancel</Btn><Btn kind="primary" disabled={!v('title', (d.title as string) ?? '').trim()} onClick={() => { const t = v('title', (d.title as string) ?? '').trim(); close(); if (editing) { onRenameTask(editing, t); say('Task updated') } else say(`“${t}” added (demo)`) }}>{editing ? 'Save changes' : 'Add task'}</Btn></>
  } else if (dialog?.kind === 'attach') {
    title = d.p ? 'Add files' : 'Attach files'; subtitle = d.p ? undefined : <>To “{d.title as string}”</>
    body = <>
      <div className="field-row">
        <Field label="Project"><Select value={v('p', (d.p as string) ?? 'Kitchen')} onChange={set('p')}>{['Kitchen', 'Bathroom', 'Basement'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Folder"><Select value={v('f', (d.f as string) ?? 'Before Photos')} onChange={set('f')}>{['Before Photos', '3D Renderings', '2020 Files', 'Additional Material Photos'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
      </div>
      <label className="dropzone"><FileText size={22} strokeWidth={1.6} /><b>Drag files here or browse</b><span>Photos, PDF, 2020 files · up to 25 MB</span><input type="file" multiple hidden onChange={(e) => { picked.current = [...(e.target.files ?? [])]; setForm((f) => ({ ...f, [`${key}:files`]: String(picked.current.length) })) }} /></label>
      {Number(v('files', '0')) > 0 && <div className="muted">{v('files')} file(s) selected</div>}
    </>
    const n = Number(v('files', '0'))
    footer = <><Btn onClick={close}>Cancel</Btn><Btn kind="primary" disabled={!n} onClick={() => { close(); onUpload(v('p', (d.p as string) ?? 'Kitchen'), v('f', (d.f as string) ?? 'Before Photos'), picked.current) }}>Upload</Btn></>
  } else if (dialog?.kind === 'confirm') {
    title = d.title as string; width = 440
    body = <p className="muted" style={{ lineHeight: 1.55 }}>{d.body as string}</p>
    footer = <><Btn onClick={close}>{(d.danger ? 'Keep' : 'Go back')}</Btn><Btn kind={d.danger ? 'danger' : 'primary'} onClick={() => { close(); (d.run as () => void)() }}>{d.ok as string}</Btn></>
  }
  return <Dialog open={!!dialog} title={title} subtitle={subtitle} footer={footer} onClose={close} width={width}>{body}</Dialog>
}

