import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { spring } from '../lib/springs'
import { CircleX, Copy, CopyPlus, Sparkles, Download, FileText, Heart, Info, MoveRight, Paperclip, Pause, Pencil, Play, Plus, RefreshCw, RotateCcw, Trash2, Archive, Link2 } from 'lucide-react'
import tree from '../figma/tree.json'
import treeC1o2 from '../figma/tree-c1o2.json'
import aiPanelTree from '../figma/ai-panel.json'
import messagesWidget from '../figma/messages-widget.json'
import tree2 from '../figma/tree2.json'
import { FigmaNode, OverridesProvider, indexTree, type FNode, type Handler, type Patch } from '../figma/FigmaNode'
import { Btn, Dialog, Menu, Toast, type MenuItem, type MenuState, type ToastState } from '../components/Overlay'
import { Field, Select, TextArea, TextInput } from '../components/Form'
import { ContactDialog, LeadInfoDialog, type Contact, type LeadInfo } from '../components/EditDialogs'
import { aiAnswers, aiFallback, designers, projectManagers, projectStatuses, projectTypes } from '../lib/mockData'
import { AssignDialog, MessagesDialog, type Assignees, type Msg } from '../components/LeadDialogs'
import { FILES0, FILES0_C2, FilesTab, countIn, hasRequired, type FilesState, type Folder, type FileItem } from '../components/FilesTab'
import { CatalogDialog, type CatalogKind, type CatalogTarget } from '../components/CatalogDialog'
import { ESTIMATE0, type CatalogItem, type Estimate, type Line } from '../lib/estimate'
import { AgreementsTab, EstimateTab, FormsTab, MessagesTab, PaymentTab, initials, plansLabel, splitEvenly, type PayRow, type TeamMsg } from '../components/OtherTabs'

// Concept 2 (Figma 124:1753): shared widgets carry concept-1 ids (scripts/build_concept2.py), so the same handlers apply.
// ai-panel.json (Figma 236:4266 "AI chat panel — improved") is the AI Assistant side panel shared by every concept.
const root2 = tree2 as unknown as FNode
const T2 = indexTree(root2)
export type Concept = 1 | 2
type TabKey = 'overview' | 'agenda' | 'files' | 'labors' | 'materials' | 'countertops' | 'payment' | 'agreements' | 'messages' | 'forms'
type TaskStatus = 'overdue' | 'upcoming' | 'done' | 'idle' | 'cancelled'
type ProjectRow = { id: string; name: string; pill?: string; pillLabel?: string; more: string; chevron: string; sales: string }

const taskTypes = ['In-home Consultation', 'Measurement', 'Quote Preparation', 'Follow-up']
// ---------- Agenda task model (designer's spec, Oct 2) ----------
// Upcoming / Due today / Overdue come from the date (never set by hand); On hold, Done and Cancelled are set by
// people. Open = Upcoming + Due today + Overdue + On hold. "Today" is the mock's date: Activity lists Sep 29 as
// Yesterday, so Sep 30 is today — that's why "Prepare estimate" (Sep 30) reads Due today.
type TaskState = 'open' | 'hold' | 'done' | 'cancelled'
type TaskView = 'overdue' | 'today' | 'upcoming' | 'hold' | 'done' | 'cancelled'
type Task = { id: string; name: string; createdBy: string; assignee: string; due: string; time?: string; type?: string; desc?: string; state: TaskState }
const TODAY = '2026-09-30'
const CURRENT_USER = 'Test Designer' // the signed-in user (TD avatar in the top bar)
const pad2 = (n: number) => String(n).padStart(2, '0')
const toIso = (txt: string) => { const d = new Date(`${txt} 12:00`); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }
const isPast = (iso: string) => iso < TODAY
const fmtDue = (iso: string) => new Date(`${iso}T12:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const viewOf = (t: Task): TaskView => (t.state === 'done' ? 'done' : t.state === 'cancelled' ? 'cancelled' : t.state === 'hold' ? 'hold' : t.due < TODAY ? 'overdue' : t.due === TODAY ? 'today' : 'upcoming')
const VIEW_LABEL: Record<TaskView, string> = { overdue: 'Overdue', today: 'Due today', upcoming: 'Upcoming', hold: 'On hold', done: 'Done', cancelled: 'Cancelled' }
const VIEW_ORDER: Record<TaskView, number> = { overdue: 0, today: 1, upcoming: 2, hold: 3, done: 4, cancelled: 5 }
const isOpen = (t: Task) => t.state === 'open' || t.state === 'hold'

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
// lead card: Oct 2 frame = component 264:51777 — "Show details" instance 264:51998 + the hidden "Hide details" 109:6980
const LEAD_COLLAPSED = T.byId.has('109:3765') ? '109:3765' : '264:51998', LEAD_DETAILS = '109:6980'
// older snapshot wraps both lead states in 109:5225; the current frame puts them straight into the header row
// Concept 1 · Option 2 (Figma 184:3568) has one merged lead card instead of the two lead states
const LEAD_CARD2 = T.byId.has('206:5636') ? '206:5636' : undefined
const LEAD_WRAP = T.byId.has('109:5225') ? '109:5225' : LEAD_CARD2 ?? '25:4990'
const PD = '42:10511', PD_COLHEAD = '93:8360'
const isMore = (n: FNode) => n.n === 'Button' || n.n === 'Icon button' // row ⋯ ("Icon button" since Oct 2)
// Kitchen expanded: one block (older snapshots) or, since Oct 2, a "Group header / …" frame per kind right under the row
const KITCHEN_GROUPS = T.byId.has('42:10573') ? kidsOf('42:10573') : (node(PD).k ?? []).filter((k) => !k.hidden && (k.k ?? []).some((c) => c.n.startsWith('Group header')))
const PD_HEAD = (node(PD).k ?? [])[0].id
const PD_TOGGLES = T.find(node(PD), (n) => n.n === 'Table toolbar')?.id // current design: Show cost / Show sale switches
const PROJECT_ROWS = ['93:8375', '42:10700', '42:10752']
const AGENDA = '42:10916', AGENDA_HEAD = '42:10917'
const ACTIVITY_HEAD = '93:4855', ACTIVITY_BODY = '93:5083'
// AI Assistant side panel (Figma 236:4266) — opens from the top bar / "Ask AI" on every concept
const TP = indexTree(aiPanelTree as unknown as FNode)
const AIP = TP.byId.get('236:4266')!
const AIP_THREAD = '236:4288', AIP_CONVO = '236:4284'
const node2 = (id: string) => TP.byId.get(id)!
// Messages widget (Figma "Summary / Messages" 296:13036): the team's last internal message, replaces the old
// client-SMS summary (72:8984) on every page. Seed = the message drawn in the component.
const TM = indexTree(messagesWidget as unknown as FNode)
const MSGW = TM.byId.get('310:13676')!
const MW = { name: 'I310:13676;184:7478', at: 'I310:13676;296:13028', text: 'I310:13676;184:7479', initials: 'I310:13676;296:13034', viewAll: 'I310:13676;184:7470', last: 'I310:13676;184:7472' }
const TEAM0: TeamMsg[] = [{ author: TM.byId.get(MW.name)!.txt!, at: TM.byId.get(MW.at)!.txt!, text: TM.byId.get(MW.text)!.txt! }]
const PD_TOTAL_ROW = (node(PD).k ?? []).find((k) => k.n === 'Row / Total' && !k.hidden)?.id
// Signed documents card (summary in the old snapshot, "widget" in the current frame): every link/button opens its tab
const SIGNED_CARD = (node('19:1233').k ?? []).find((c) => !c.hidden && !!T.find(c, (n) => n.t === 'TEXT' && n.txt === 'Signed documents'))!
const SIGNED_LINKS = T.findAll(SIGNED_CARD, (n) => n.n === 'Link Button' || n.n === 'Secondary Button').map((n) => n.id)

const projectRows: ProjectRow[] = PROJECT_ROWS.map((id) => {
  const kids = kidsOf(id)
  const pill = kids.find((k) => k.n.startsWith('Pill')) ?? find(id, (n) => n.n.startsWith('Pill'))
  return {
    id, name: named(id, 'Name').txt!, pill: pill?.id, pillLabel: pill ? textIn(pill.id).id : undefined,
    more: kids.find(isMore)!.id, chevron: find(id, (n) => /^icon\/chev/.test(n.n))!.id, sales: kids[5].id,
  }
})
const lineItems = KITCHEN_GROUPS.flatMap((g) => T.findAll(g, (n) => (n.n.startsWith('Item /') || n.n.startsWith('Line item')) && kidsOf(n.id).some(isMore)))
  .map((it) => ({ id: it.id, name: (T.find(it, (n) => n.n === 'Name') ?? T.find(it, (n) => n.t === 'TEXT'))!.txt!, more: kidsOf(it.id).find(isMore)!.id }))

const taskRows = kidsOf(AGENDA).filter((k) => k.n.startsWith('Row / Task')).map((r) => {
  const pill = find(r.id, (n) => n.n.startsWith('Pill'))!
  const s = textIn(pill.id).txt!.toLowerCase() as TaskStatus
  return { id: r.id, name: named(r.id, 'Name'), checkbox: named(r.id, 'Checkbox').id, pill: pill.id, pillLabel: textIn(pill.id).id, due: named(r.id, 'Due date').id, more: kidsOf(r.id).find(isMore)!.id, initial: s }
})
const CHECK_OFF = node(taskRows.find((t) => t.initial !== 'done')!.checkbox)
const CHECK_ON = node(taskRows.find((t) => t.initial === 'done')!.checkbox)
const pillStyle = (status: TaskStatus) => {
  const src = taskRows.find((t) => t.initial === status)
  if (src) { const p = node(src.pill); return { bg: `rgba(${(p.fill![0] as number[]).join(',')})`, fg: segColor(textIn(p.id)) } }
  return status === 'idle' ? { bg: 'var(--color-idle-bg)', fg: 'var(--color-idle)' } : { bg: 'var(--color-bg-subtle)', fg: 'var(--color-text-secondary)' }
}
const doneName = taskRows.find((t) => t.initial === 'done')!.name

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
// every task is the signed-in user's own (designer, Oct 2: other people don't leave tasks for the user — the mock's
// "Mark Davis" is not used as author / assignee for now)
const TASKS0: Task[] = taskRows.map((t) => { const by = CURRENT_USER; return { id: t.id, name: t.name.txt!, createdBy: by, assignee: by, due: toIso(named(t.id, 'Due date').txt!), state: t.initial === 'done' ? 'done' : 'open' } })
const viewPill = (v: TaskView) => (v === 'overdue' || v === 'upcoming' || v === 'done' ? pillStyle(v) : v === 'today' ? { bg: 'var(--color-warning-bg)', fg: 'var(--color-warning)' } : { bg: 'var(--color-bg-subtle)', fg: 'var(--color-text-secondary)' })
const OVERDUE_COLOR = segColor(node(taskRows.find((r) => r.initial === 'overdue')!.due))
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
  const [messages, setMessages] = useState<Msg[]>([{ out: false, ch: 'SMS', text: 'Thanks, see you tomorrow!', when: '5:02 PM' }]) // client SMS — header Messages dialog
  const [team, setTeam] = useState<TeamMsg[]>(TEAM0) // team's internal messages — widget + Messages tab
  const [kitchenOpen, setKitchenOpen] = useState(fixture !== 'kitchen-collapsed' && concept === 1)
  const [aiOpen, setAiOpen] = useState(false)
  const [needsOpen, setNeedsOpen] = useState(true)
  const [showSales, setShowSales] = useState(true)
  const [showCost, setShowCost] = useState(true)
  const [activityOpen, setActivityOpen] = useState(true)
  const [projStatus, setProjStatus] = useState<Record<string, string>>({})
  const [deletedRows, setDeletedRows] = useState<string[]>([])
  const [wish, setWish] = useState<Record<string, boolean>>({ '93:8375': true })
  const [tasks, setTasks] = useState<Task[]>(TASKS0)
  const [showCancelled, setShowCancelled] = useState(false)
  const [ai, setAi] = useState<{ q: string; a: string }[]>([])
  const [aiText, setAiText] = useState('')
  const [aiVote, setAiVote] = useState<string | null>(null)
  useEffect(() => {
    if (!aiOpen) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('[role="dialog"]') && setAiOpen(false)
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key)
  }, [aiOpen])
  const [leadInfo, setLeadInfo] = useState<LeadInfo>(LEAD_INFO0)
  const [contact, setContact] = useState<Contact>(CONTACT0)
  const [editing, setEditing] = useState<null | 'lead' | 'contact' | 'assign' | 'messages'>(null)
  const [tabState, setTabState] = useState<TabKey>((new URLSearchParams(location.search).get('tab') as TabKey) || 'overview')
  // Concept 2 is presented on Overview only: other tabs are drawn but inert, and links into them are off
  const tabsOn = true // every tab is live in every concept (concept 2 uses the concept 1 tab content, designer Oct 2)
  const tabLive = (k?: TabKey) => !!k
  const tab: TabKey = tabLive(tabState) ? tabState : 'overview'
  const setTab = (t: TabKey) => { setTabState(t); setMenu(null); window.scrollTo({ top: 0 }) }
  const [files, setFiles] = useState<FilesState>(concept === 2 ? FILES0_C2 : FILES0)
  const [catalog, setCatalog] = useState<CatalogTarget>(null)
  const [estimate, setEstimate] = useState<Estimate>(ESTIMATE0)
  const [payPlan, setPayPlan] = useState<PayRow[]>(() => splitEvenly(2)) // the mock shows "2 payments"
  const kindNoun = (k: CatalogKind) => k.toLowerCase()
  const addPicks = (kind: CatalogKind, project: string, picks: { item: CatalogItem; qty: number }[]) => {
    const prev = estimate
    setEstimate((e) => {
      const ls = [...(e[project]?.[kind] ?? [])]
      picks.forEach(({ item, qty }) => {
        const i = ls.findIndex((l) => l.name === item.name)
        if (i >= 0) ls[i] = { ...ls[i], qty: ls[i].qty + qty }
        else ls.push({ id: `${item.code}-${Date.now()}`, name: item.name, qty, unit: item.unit, price: item.price, cost: item.cost, code: item.code.startsWith('mock-') ? undefined : item.code })
      })
      return { ...e, [project]: { ...e[project], [kind]: ls } }
    })
    setCatalog(null)
    say(`${picks.length} ${picks.length === 1 ? 'item' : 'items'} added to ${project} ${kindNoun(kind)}`, () => setEstimate(prev))
  }
  const replaceLine = (kind: CatalogKind, project: string, line: Line, item: CatalogItem) => {
    const prev = estimate
    setEstimate((e) => ({ ...e, [project]: { ...e[project], [kind]: (e[project]?.[kind] ?? []).map((l) => (l.id === line.id ? { ...l, name: item.name, unit: item.unit, price: item.price, cost: item.cost, code: item.code.startsWith('mock-') ? undefined : item.code } : l)) } }))
    setCatalog(null)
    say(`${line.name} replaced with ${item.name}`, () => setEstimate(prev))
  }

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
  // Top bar (breadcrumbs, search, avatar, AI Assistant) stays pinned to the top in every concept; Main clips
  // instead of hiding overflow so it doesn't become the sticky container
  const MAIN = RT.parentOf.get('19:1070')
  if (MAIN) patches[MAIN.id] = { ...patches[MAIN.id], style: { ...patches[MAIN.id]?.style, overflow: 'clip' } }
  patches['19:1070'] = { ...patches['19:1070'], style: { ...patches['19:1070']?.style, position: 'sticky', top: 0, zIndex: 30 } }
  // Page ends where the content ends (the Figma frame has fixed heights); overflow: clip keeps sticky working
  patches[root.id] = { style: { minHeight: '100vh', overflow: 'clip', width: '100%', minWidth: 1024 } }
  // the frame is drawn at 1440: below that Main / Content give up width instead of the page scrolling sideways
  if (MAIN) patches[MAIN.id] = { ...patches[MAIN.id], style: { ...patches[MAIN.id]?.style, flex: '1 1 0', minWidth: 0, width: 'auto' } }
  patches[CONTENT] = { ...patches[CONTENT], style: { ...patches[CONTENT]?.style, width: 'auto', alignSelf: 'stretch' } }
  patches[CONTENT] = { ...patches[CONTENT], style: { ...patches[CONTENT]?.style, height: 'auto', padding: RT.byId.get(CONTENT)!.al!.p.map((v, i) => `${i === 2 ? 48 : v}px`).join(' ') } }
  // Lead card — "Show details" is the drawn alternate state (hidden frame in the mock)
  if (LEGACY_LEAD) { patches[LEAD_COLLAPSED] = { hidden: showDetails }; patches[LEAD_DETAILS] = { hidden: !showDetails } }
  // "Hide details" variant is drawn at a fixed 712 px; it fills the row like the "Show details" instance next to Contact
  if (LEAD_COLLAPSED === '264:51998') {
    patches[LEAD_DETAILS] = { ...patches[LEAD_DETAILS], style: { flex: '1 1 0', minWidth: 0, width: 'auto' } }
    // the two variants differ in Figma (card padding 12 vs 16, facts row fixed at 678 px, second row 190 px columns) →
    // the open card follows the closed one so nothing moves when the details open
    const D = (id: string) => `I109:6980;${id}`
    patches[D('93:9967')] = { style: { padding: 16 } }
    ;['93:9978', '93:10362'].forEach((id) => (patches[D(id)] = { style: { width: '100%' } }))
    ;['93:10176', '180:3548'].forEach((id) => (patches[D(id)] = { style: { flex: '1 1 0', minWidth: 0, width: 'auto' } }))
    patches[D('180:3549')] = { style: { width: '100%' } }
  }
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
      // "switch + label" pairs; the switch is "Switch" (Oct 1) or "Track" (Oct 2). Concept 2's variant keeps its own
      // switch ids inside the shared pair ids → the switch is looked up in the rendered tree (RT)
      const isSw = (n: FNode) => n.n === 'Switch' || n.n === 'Track'
      const pairs = T.findAll(node(PD_TOGGLES), (n) => !!n.k?.some(isSw))
      ;[[showCost, setShowCost, 'Show cost'], [showSales, setShowSales, 'Show sale']].forEach(([on_, set, label], i) => {
        const pair = pairs[i]; if (!pair) return
        const sw = (RT.byId.get(pair.id) ?? pair).k?.find(isSw); if (!sw) return
        const isOn = on_ as boolean
        patches[sw.id] = { bg: isOn ? 'var(--color-brand-dark)' : 'var(--color-switch-off)', // on = #48443E everywhere (concept 2's variant draws it green)
         style: { justifyContent: isOn ? 'flex-end' : 'flex-start', transition: 'background .15s' } }
        const toggle = () => (set as (f: (v: boolean) => boolean) => void)((v) => !v)
        // the whole "switch + label" pair is the hit area
        on(pair.id, { onClick: toggle, title: label as string, className: 'switch-hit' })
        handlers[pair.id] = { ...handlers[pair.id], render: (_n, el) => <span key={pair.id} role="switch" aria-checked={isOn} aria-label={label as string} style={{ display: 'contents' }}>{el}</span> }
      })
    }
  }
  // Columns = Figma 226:15063 (Project Details, Oct 2): Project 120 · Status 130 · Materials 65 · Labors 60 ·
  // Countertops 87 · Total 60 · Sales 60 · row ⋯ 32, gap 12. Header, project rows and Total share these edges (rows
  // without a status cell get a spacer). Show cost hides Total (index 4), Show sale hides Sales (index 5) — the other
  // amount columns grow into the freed space (flex-basis = the Figma width, so at the drawn size nothing moves).
  const dataRows = PD_TOTAL_ROW ? [...PROJECT_ROWS, PD_TOTAL_ROW] : PROJECT_ROWS
  patches[PD] = { ...patches[PD], style: { ...patches[PD]?.style, width: '100%', alignSelf: 'stretch' } }
  const rkids = (id: string) => (RT.byId.get(id)?.k ?? []).filter((k) => !k.hidden)
  const GAP = 12, PROJ_W = 120, STATUS_W = 130, MORE_W = 32, AMT_W = [65, 60, 87, 60, 60]
  const fixed = (w: number) => ({ width: w, minWidth: w, flex: 'none' as const })
  ;[PD_COLHEAD, ...dataRows].forEach((r) => {
    const ks = rkids(r); if (!ks.length) return
    const isTotal = r === PD_TOTAL_ROW, hasStatus = ks.length >= 7, hasMore = ks.length >= 8
    patches[r] = { ...patches[r], style: { ...patches[r]?.style, gap: GAP, ...(!hasMore ? { paddingRight: 16 + MORE_W + GAP } : {}) } }
    ks.forEach((c, i) => {
      const hide = (i === 4 && !showCost) || (i === 5 && !showSales)
      const style = i === 0 ? { ...fixed(PROJ_W), order: 0, ...(!hasStatus ? { marginRight: STATUS_W + GAP } : {}) }
        : i <= 5 ? { flex: `1 1 ${AMT_W[i - 1]}px`, minWidth: 0, width: 'auto', order: 2, ...(r === PD_COLHEAD ? { overflow: 'visible', whiteSpace: 'nowrap' as const } : {}) }
        : i === 6 ? { ...fixed(STATUS_W), order: 1 } : { ...fixed(MORE_W), order: 3 }
      patches[c.id] = { ...patches[c.id], ...(hide ? { hidden: true } : {}), style: { ...patches[c.id]?.style, ...style } }
    })
    if (isTotal && hasStatus) ks.slice(6).forEach((c) => (patches[c.id] = { ...patches[c.id], style: { ...patches[c.id]?.style, visibility: 'hidden' } }))
  })
  const liveProjects = projectRows.filter((r) => !deletedRows.includes(r.id))
  patches[find(PD_HEAD, (n) => n.t === 'TEXT' && /projects?$/.test(n.txt ?? ''))!.id] = { txt: `${liveProjects.length} project${liveProjects.length === 1 ? '' : 's'}` }

  // Project rows
  ;[...(T.byId.has('42:10573') ? [node('42:10573')] : []), ...KITCHEN_GROUPS].forEach((g) => (patches[g.id] = { hidden: !kitchenOpen || deletedRows.includes('93:8375') }))
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
      { label: 'Replace from catalog', icon: <RefreshCw {...I} />, onSelect: () => { const kind = groupOf(it.id); setCatalog({ kind, project: 'Kitchen', replace: estimate.Kitchen?.[kind]?.find((l) => l.name === it.name), show: { cost: showCost, sale: showSales } }) } },
      { label: 'Duplicate', icon: <CopyPlus {...I} />, onSelect: () => say(`${it.name} duplicated (demo)`) },
      { label: 'Move to project', icon: <MoveRight {...I} />, meta: '›', onSelect: () => open(`move-${it.id}`, it.more, projectRows.filter((p) => p.name !== 'Kitchen').map((p) => ({ label: p.name, onSelect: () => say(`${it.name} moved to ${p.name} (demo)`) })), 200) },
      '-',
      { label: 'Remove item', danger: true, icon: <Trash2 {...I} />, onSelect: () => { patchesState.remove(it.id); say(`${it.name} removed`, () => patchesState.restore(it.id)) } },
    ], 248), title: 'Item actions' })
  })
  // "Add from catalog" per group (Materials · Labors · Countertops, in drawn order)
  const CATALOG_GROUPS: CatalogKind[] = ['Materials', 'Labors', 'Countertops']
  KITCHEN_GROUPS.forEach((g, i) => T.findAll(g, (n) => n.n === 'Link Button').forEach((b) => on(b.id, { onClick: () => setCatalog({ kind: CATALOG_GROUPS[i], project: 'Kitchen', show: { cost: showCost, sale: showSales } }), title: `Add ${CATALOG_GROUPS[i].toLowerCase()} from catalog` })))
  const groupOf = (id: string) => CATALOG_GROUPS[KITCHEN_GROUPS.findIndex((g) => !!T.find(g, (n) => n.id === id))] ?? 'Materials'

  // Agenda
  const [removedItems, setRemovedItems] = useState<string[]>([])
  const patchesState = { remove: (id: string) => setRemovedItems((r) => [...r, id]), restore: (id: string) => setRemovedItems((r) => r.filter((x) => x !== id)) }
  removedItems.forEach((id) => (patches[id] = { hidden: true }))
  // Agenda — tasks are data; each row is a clone of a drawn row, sorted overdue → due today → upcoming → on hold
  // → done; cancelled tasks sit behind "Show cancelled". Every action shows a toast with Undo.
  const setTask = (id: string, patch: Partial<Task>) => setTasks((x) => x.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  const act = (t: Task, patch: Partial<Task>, msg: string) => { setTask(t.id, patch); say(msg, () => setTasks((x) => x.map((y) => (y.id === t.id ? t : y)))) }
  const removeTask = (t: Task) => { const i = tasks.findIndex((x) => x.id === t.id); setTasks((x) => x.filter((y) => y.id !== t.id)); say(`“${t.name}” deleted`, () => setTasks((x) => [...x.slice(0, i), t, ...x.slice(i)])) }
  // Resume: a due date that has already passed asks for a new one straight away
  const resume = (t: Task) => { if (isPast(t.due)) { setTask(t.id, { state: 'open' }); setDialog({ kind: 'task', data: { task: { ...t, state: 'open' }, resume: true } }) } else act(t, { state: 'open' }, `“${t.name}” resumed`) }
  const canDelete = (t: Task) => t.createdBy === CURRENT_USER // the author (or a manager); everyone else cancels to keep the history
  const taskMenu = (t: Task): MenuItem[] => {
    const v = viewOf(t)
    const del: MenuItem = { label: 'Delete task', danger: true, icon: <Trash2 {...I} />, disabled: !canDelete(t), meta: canDelete(t) ? undefined : 'Author only', hint: canDelete(t) ? undefined : 'Only the author or a manager can delete this task — cancel it instead', onSelect: () => removeTask(t) }
    if (v === 'done' || v === 'cancelled') return [{ label: 'Reopen task', icon: <RotateCcw {...I} />, onSelect: () => act(t, { state: 'open' }, `“${t.name}” reopened`) }, '-', del]
    return [
      { label: 'Edit task', icon: <Pencil {...I} />, onSelect: () => setDialog({ kind: 'task', data: { task: t } }) },
      { label: 'Attach file', icon: <Paperclip {...I} />, onSelect: () => setDialog({ kind: 'attach', data: { title: t.name } }) },
      '-',
      v === 'hold' ? { label: 'Resume', icon: <Play {...I} />, onSelect: () => resume(t) } : { label: 'Put on hold', icon: <Pause {...I} />, onSelect: () => act(t, { state: 'hold' }, `“${t.name}” put on hold`) },
      { label: 'Cancel task', icon: <CircleX {...I} />, onSelect: () => act(t, { state: 'cancelled' }, `“${t.name}” cancelled`) },
      '-',
      del,
    ]
  }
  // header: no select-all (there are no bulk actions), "Created by" → "Assignee", the unnamed ⋯ column stays empty
  taskRows.forEach((r) => (patches[r.id] = { hidden: true }))
  patches[named('42:11146', 'Checkbox').id] = { style: { visibility: 'hidden' } }
  patches[named('42:11148', 'Header').id] = { txt: 'Assignee' }
  const agendaHeaderMore = kidsOf('42:11145').find(isMore)?.id
  if (agendaHeaderMore) patches[agendaHeaderMore] = { style: { visibility: 'hidden' } }
  const openTasks = tasks.filter(isOpen), overdueN = tasks.filter((t) => viewOf(t) === 'overdue').length, holdN = tasks.filter((t) => t.state === 'hold').length
  const agendaCount = find(AGENDA_HEAD, (n) => n.t === 'TEXT' && /open tasks/.test(n.txt ?? ''))!
  patches[agendaCount.id] = { txt: `${openTasks.length} open task${openTasks.length === 1 ? '' : 's'}${overdueN && agendaCount.txt!.includes('overdue') ? ` · ${overdueN} overdue` : ''}${holdN ? ` · ${holdN} on hold` : ''}` }
  on(named(AGENDA_HEAD, 'Secondary Button').id, { onClick: () => setDialog({ kind: 'task', data: {} }) })
  const agendaViewAll = named(AGENDA_HEAD, 'Link Button').id
  if (tab === 'agenda') patches[agendaViewAll] = { hidden: true }
  else if (tabsOn) on(agendaViewAll, { onClick: () => setTab('agenda'), title: 'Open the Agenda tab' })
  // Agenda tab: the same card at full width — the Task column takes the extra space
  const growCell = (id: string) => { const n = node(id), par = T.parentOf.get(id)!; return { style: { width: `calc(100% - ${par.w - par.al!.p[1] - par.al!.p[3] - n.w}px)` } } }
  if (tab === 'agenda') patches['42:11146'] = { ...patches['42:11146'], ...growCell('42:11146') }
  const sortedTasks = [...tasks].sort((a, b) => VIEW_ORDER[viewOf(a)] - VIEW_ORDER[viewOf(b)] || a.due.localeCompare(b.due))
  const cancelledN = tasks.filter((t) => t.state === 'cancelled').length
  const taskRow = (t: Task) => {
    const c = cloneAs(TASK_TPL, t.id), at = (name: string) => T.find(c, (n) => n.n === name)!.id
    const v = viewOf(t), ps = viewPill(v), closed = v === 'done' || v === 'cancelled', done = v === 'done'
    const pill = T.find(c, (n) => n.n.startsWith('Pill'))!, pillText = T.find(pill, (n) => n.t === 'TEXT')!.id, more = (c.k ?? []).find(isMore)!.id, cb = at('Checkbox')
    patches[at('Name')] = { txt: t.name, decoration: closed ? 'line-through' : 'none', color: closed ? segColor(doneName) : undefined }
    patches[at('Created by')] = { txt: t.assignee }
    patches[at('Due date')] = { txt: fmtDue(t.due), color: v === 'overdue' ? OVERDUE_COLOR : closed ? segColor(doneName) : undefined }
    patches[pill.id] = { bg: ps.bg, style: v === 'upcoming' ? undefined : { borderColor: ps.bg } } // the template is the Upcoming pill — only it keeps its outline
    patches[pillText] = { txt: VIEW_LABEL[v], color: ps.fg }
    if (v === 'hold') on(pillText, { render: (_n, el) => <span key={pillText} className="pill-ico"><Pause size={12} strokeWidth={2.4} />{el}</span> })
    if (tab === 'agenda') patches[at('Cell / p')] = growCell(named(TASK_TPL.id, 'Cell / p').id)
    on(c.id, { className: `hover-row${t.state === 'cancelled' ? ' task-cancelled' : ''}` }); on(more, { className: moreCls(more) })
    on(cb, { render: () => (
      <span key={cb} role="checkbox" aria-checked={done} aria-disabled={t.state === 'cancelled'} aria-label={done ? 'Mark as not done' : 'Mark as done'} tabIndex={0} className={`check-hit${t.state === 'cancelled' ? ' is-disabled' : ''}`}
        title={t.state === 'cancelled' ? 'Reopen the task to work on it again' : undefined}
        onClick={() => { if (t.state === 'cancelled') return; act(t, { state: done ? 'open' : 'done' }, done ? `“${t.name}” reopened` : `“${t.name}” marked as done`) }}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), (e.currentTarget as HTMLElement).click())}>
        <FigmaNode node={{ ...(done ? CHECK_ON : CHECK_OFF), id: `${cb}#${done ? 'on' : 'off'}` }} parent={node(named(TASK_TPL.id, 'Cell / p').id)} />
      </span>) })
    on(more, { onClick: () => open(`task-${t.id}`, more, taskMenu(t), 240), title: 'Task actions' })
    return <FigmaNode key={c.id} node={c} parent={node(AGENDA)} />
  }
  on(AGENDA, { after: <>
    {sortedTasks.filter((t) => showCancelled || t.state !== 'cancelled').map(taskRow)}
    {!tasks.length && <div className="agenda-empty">No tasks yet — add the first one with “Add task”.</div>}
    {cancelledN > 0 && <button type="button" className="agenda-toggle" onClick={() => setShowCancelled((v) => !v)}>{showCancelled ? 'Hide cancelled tasks' : `Show ${cancelledN} cancelled task${cancelledN === 1 ? '' : 's'}`}</button>}
  </> })

  // Activity
  patches[ACTIVITY_BODY] = { hidden: !activityOpen }
  patches[find(ACTIVITY_HEAD, (n) => !!n.icon)!.id] = { style: { transform: activityOpen ? 'none' : 'rotate(180deg)', transition: 'transform .18s var(--spring-snappy)' } }
  on(ACTIVITY_HEAD, { onClick: () => setActivityOpen((v) => !v), title: activityOpen ? 'Collapse activity' : 'Expand activity', className: 'row-hover' })

  // Right column
  // Messages widget → the team's latest message
  const lastMsg = team[team.length - 1]
  on('72:8984', { render: () => <FigmaNode key="msgw" node={MSGW} parent={RT.parentOf.get('72:8984') ?? null} /> })
  if (lastMsg) { patches[MW.name] = { txt: lastMsg.author }; patches[MW.at] = { txt: lastMsg.at }; patches[MW.text] = { txt: lastMsg.text || (lastMsg.files?.length ? `${lastMsg.files.length} file${lastMsg.files.length === 1 ? '' : 's'}` : '') }; patches[MW.initials] = { txt: initials(lastMsg.author) } }
  else patches[MW.last] = { hidden: true }
  // Concept 2 draws its own Messages frame (Figma 334:11136, date on the right of the name) → same data, its ids
  const MW2 = { name: '334:11147', at: '334:11148', text: '334:11149', initials: '334:11145', viewAll: '334:11139', last: '334:11141' }
  if (concept === 2 && T2.byId.has(MW2.name)) {
    if (lastMsg) { patches[MW2.name] = { txt: lastMsg.author }; patches[MW2.at] = { txt: lastMsg.at }; patches[MW2.text] = { txt: lastMsg.text || (lastMsg.files?.length ? `${lastMsg.files.length} file${lastMsg.files.length === 1 ? '' : 's'}` : '') }; patches[MW2.initials] = { txt: initials(lastMsg.author) } }
    else patches[MW2.last] = { hidden: true }
    if (tab !== 'messages') on(MW2.viewAll, { onClick: () => setTab('messages'), title: 'Open the Messages tab' })
  }
  if (tabsOn && tab !== 'messages') on(MW.viewAll, { onClick: () => setTab('messages'), title: 'Open the Messages tab' })
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
        {/* concept 2: the tabs sit inside the right column → keep them above the tab content */}
        {concept === 2 && RT.byId.get(TABS) && <FigmaNode key="tabs" node={RT.byId.get(TABS)!} parent={RT.byId.get(GRID) ?? null} />}
        {tab === 'agenda' ? <FigmaNode node={node(AGENDA)} parent={node(LEFT_COL)} />
          : tab === 'files' ? <FilesTab projects={liveProjects.map((p) => p.name)} files={files} setFiles={setFiles} say={say} />
          : tab === 'labors' || tab === 'materials' || tab === 'countertops' ? <EstimateTab key={tab} kind={(tab.charAt(0).toUpperCase() + tab.slice(1)) as CatalogKind} projects={liveProjects.map((p) => p.name)} estimate={estimate} setEstimate={setEstimate} onCatalog={setCatalog} say={say} />
          : tab === 'payment' ? <PaymentTab total={13128} saved={payPlan} onSave={setPayPlan} say={say} />
          : tab === 'agreements' ? <AgreementsTab say={say} confirm={confirm} />
          : tab === 'messages' ? <MessagesTab me={CURRENT_USER} messages={team} onSend={(m) => { setTeam((x) => [...x, m]); say('Message sent to the team') }} say={say} />
          : <FormsTab email={contact.email} say={say} confirm={confirm} />}
      </div>
    ) })
  }

  const topAI = T.find(node('19:1070'), (n) => n.n === 'Primary Button' && !!T.find(n, (m) => m.t === 'TEXT' && m.txt === 'AI Assistant'))
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
  // Needs attention lives in the rendered tree (Option 2's frame or Concept 2's), not in the shared widget tree
  const NA = RT.find(R, (n) => n.n === 'Section - Needs attention' && !n.hidden)
  if (NA) {
    // Needs attention: header collapses the list; each row's link runs its action; resolved rows disappear
    const rows = (NA.k ?? []).filter((k) => k.n.startsWith('Row / Task') && !k.hidden)
    const label = (r: FNode) => RT.find(r, (n) => n.n === 'Link Button')
    const linkText = (r: FNode) => (label(r) ? RT.find(label(r)!, (n) => n.t === 'TEXT')?.txt?.trim() : '') ?? ''
    const overdueRow = taskRows.find((t) => t.initial === 'overdue'), overdueTask = overdueRow && tasks.find((t) => t.id === overdueRow.id)
    const resolved = (r: FNode) => {
      const l = linkText(r)
      if (l === 'Assign designer') return !!designer
      if (l === 'Upload photos') return hasRequired(files, 'Bathroom')
      if (l === 'Open task') return !overdueTask || viewOf(overdueTask) !== 'overdue'
      return false
    }
    const live = rows.filter((r) => !resolved(r))
    rows.forEach((r) => {
      if (resolved(r)) { patches[r.id] = { hidden: true }; return }
      on(r.id, { className: 'hover-row' })
      const l = linkText(r), btn = label(r)?.id
      const act: Record<string, () => void> = {
        'Open task': () => overdueTask && setDialog({ kind: 'task', data: { task: overdueTask } }),
        'Assign designer': () => setEditing('assign'),
        'Upload photos': () => (tabsOn ? setTab('files') : notInPrototype('The Files & Photos tab')),
        'Open estimate': () => (tabsOn ? setTab('materials') : notInPrototype('The estimate')),
      }
      if (btn && act[l]) on(btn, { onClick: act[l], title: l })
    })
    const head = (NA.k ?? [])[0], countText = RT.find(head, (n) => n.t === 'TEXT' && /actions?$/.test(n.txt ?? ''))
    if (countText) patches[countText.id] = { txt: `${live.length} action${live.length === 1 ? '' : 's'}` }
    // chevron on the left of the title and turning like Activity's (designer, Oct 2)
    const chev = RT.find(head, (n) => !!n.icon && /chev/.test(n.n)), bar = chev && RT.parentOf.get(chev.id)
    if (bar) patches[bar.id] = { style: { justifyContent: 'flex-start', gap: 8 } }
    if (chev) patches[chev.id] = { style: { order: -1, transform: needsOpen ? 'rotate(180deg)' : 'none', transition: 'transform .18s var(--spring-snappy)' } }
    on(head.id, { onClick: () => setNeedsOpen((v) => !v), title: needsOpen ? 'Collapse' : 'Expand', className: 'row-hover' })
    ;(NA.k ?? []).slice(1).forEach((k) => { if (!needsOpen) patches[k.id] = { hidden: true } })
    if (!live.length) patches[NA.id] = { hidden: true }
  }

  // ---------- concept 2: lead column + AI Assistant button (ids from Figma 124:1753) ----------
  if (concept === 2) {
    const n2 = (id: string) => T2.byId.get(id)!
    const LEAD2 = '124:2658'
    // the lead card grows (layoutGrow 1) inside an auto-height column → keep its own height in the browser
    patches[LEAD2] = { style: { flex: 'none' } }
    // Overview: the lead column is pinned under the sticky top bar (60 px + 20 px gap); only the right column scrolls
    // (Main and Content clip in Figma → `overflow: clip` instead of hidden so they don't become scroll containers)
    if (tab === 'overview') ['124:2617', '19:1099'].forEach((id) => (patches[id] = { ...patches[id], style: { ...patches[id]?.style, overflow: 'clip' } }))
    if (tab === 'overview') patches['124:2656'] = { style: { position: 'sticky', top: 80, alignSelf: 'flex-start', height: 'calc(100vh - 100px)', overflowY: 'auto', overscrollBehavior: 'contain', scrollbarWidth: 'thin', borderRadius: 12 } }
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
    // Payment plan = a text button like the Designer value (no dropdown look): no border, no chevron
    patches['124:2704'] = { style: { borderColor: 'transparent', padding: '0 4px 0 8px', minHeight: 30, justifyContent: 'flex-start' } }
    patches['124:2706'] = { hidden: true }
    patches['124:2705'] = { ...patches['124:2705'], style: { fontSize: 13, lineHeight: '20px', fontWeight: 400, color: 'rgba(17,17,21,1)' } }
    if (tab !== 'payment') on('124:2704', { onClick: () => setTab('payment'), title: 'Open the Payment Plan tab', className: 'value-hover' })
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
    // (concept 2's Project Details variant has no line items drawn → the Kitchen groups of concept 1 · option 1)
    on('93:8375', { render: (_n, el) => <>{el}{kitchenOpen && !deletedRows.includes('93:8375') && KITCHEN_GROUPS.map((g) => <FigmaNode key={g.id} node={g} parent={n2('42:10511')} />)}</> })
    // tabs overflow the right column: the last visible tab fades out (gradient label in the mock)
    // all tabs are live → the bar scrolls sideways (no scrollbar); the end padding lets the last tab clear the fade
    patches[TABS] = { ...patches[TABS], style: { ...patches[TABS]?.style, overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none', paddingRight: 64, maskImage: 'linear-gradient(to right, #000 calc(100% - 64px), transparent)', WebkitMaskImage: 'linear-gradient(to right, #000 calc(100% - 64px), transparent)' } }
    if (T2.byId.has('I226:15366;319:9022')) patches['I226:15366;319:9022'] = { style: { transform: kitchenOpen ? 'rotate(90deg)' : 'none', transition: 'transform .18s var(--spring-snappy)' } }
    // AI Assistant lives in the top bar here → opens the same assistant card in a side panel
    on('124:3631', { onClick: () => setAiOpen((v) => !v), title: 'AI Assistant' })
  }

  // Payment plan text on the lead card(s) follows the saved plan
  ;['109:3925', '109:3830', 'I109:6980;109:3283', 'I264:51998;264:51750', '231:20343', '124:2705'].forEach((id) => (patches[id] = { ...patches[id], txt: payPlan.length ? plansLabel(payPlan.length) : 'Not set' }))

  // ---------- AI Assistant side panel (Figma 236:4266) ----------
  const ask = (q: string) => { if (!q.trim()) return; setAi((a) => [...a, { q, a: aiAnswers[q] ?? aiFallback }]); setTimeout(() => { const c = document.querySelector(`[data-id="${AIP_CONVO}"]`); c?.scrollTo({ top: c.scrollHeight, behavior: 'smooth' }) }, 60) }
  patches['236:4266'] = { style: { width: '100%', height: '100%', minHeight: 0, boxShadow: 'none' } }
  patches[AIP_CONVO] = { style: { overflowY: 'auto', minHeight: 0 } }
  patches['236:4273'] = { txt: fullName }
  on('236:4282', { onClick: () => setAiOpen(false), title: 'Close AI Assistant', className: 'icon-hover' })
  // blockers in the drawn answer → the real actions; their state follows the lead
  if (designer) { patches['236:4297'] = { txt: `${designer} assigned` }; patches['I240:4403;72:6318'] = { txt: 'Change' } }
  on('240:4403', { onClick: () => setEditing('assign'), title: designer ? 'Change assignees' : 'Assign designer' })
  const overdueTask = taskRows.find((t) => t.initial === 'overdue')
  on('240:4416', { onClick: () => { setTab('overview'); requestAnimationFrame(() => { const el = overdueTask ? document.querySelector(`[data-id="${CSS.escape(`${TASK_TPL.id}#${overdueTask.id}`)}"]`) : null; el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.classList.add('flash'); setTimeout(() => el?.classList.remove('flash'), 1600) }) }, title: 'Show the task in Agenda' })
  const bathBefore = files.Bathroom?.['Before Photos']?.length ?? 0
  patches['236:4312'] = { txt: `${bathBefore} photo${bathBefore === 1 ? '' : 's'} uploaded` }
  on('240:4429', { onClick: () => setDialog({ kind: 'attach', data: { p: 'Bathroom', f: 'Before Photos' } }), title: 'Upload Bathroom before photos' })
  on('237:20577', { onClick: () => { navigator.clipboard?.writeText(TP.findAll(node2(AIP_THREAD), (n) => n.t === 'TEXT' && n.id !== '236:4292').map((n) => n.txt).join('\n')); say('Answer copied') }, title: 'Copy answer', className: 'icon-hover' })
  ;[['237:20586', 'up'], ['237:20589', 'down']].forEach(([id, v]) => on(id, { onClick: () => { setAiVote((x) => (x === v ? null : v)); if (aiVote !== v) say('Thanks for the feedback') }, title: v === 'up' ? 'Helpful' : 'Not helpful', className: `icon-hover${aiVote === v ? ' voted' : ''}` }))
  ;['236:4362', '236:4366'].forEach((id) => on(id, { onClick: () => ask(TP.find(node2(id), (n) => n.t === 'TEXT')!.txt!), className: 'chip-hover' }))
  on('236:4371', { render: () => <input key="ai-field" className="bare-input" style={{ flex: '1 1 0', minWidth: 0, fontSize: 14, lineHeight: '21px' }} value={aiText} onChange={(e) => setAiText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { ask(aiText); setAiText('') } }} placeholder={`Ask about ${fullName}…`} aria-label="Ask the AI assistant" autoFocus /> })
  on('236:4372', { onClick: () => { if (!aiText.trim()) { say('Type a question or pick a suggestion'); return } ask(aiText); setAiText('') }, title: 'Send' })
  on(AIP_THREAD, { after: ai.length ? <div className="aip-thread">{ai.map((m, i) => (
    <div key={i} className="aip-turn">
      <div className="aip-q"><span>{m.q}</span></div>
      <div className="aip-label"><Sparkles size={14} />AI Assistant</div>
      <p className="aip-a">{m.a}</p>
      <div className="aip-tools">
        <button className="icon-plain" aria-label="Copy answer" onClick={() => { navigator.clipboard?.writeText(m.a); say('Answer copied') }}><Copy size={16} /></button>
        <span>Just now</span>
      </div>
    </div>
  ))}</div> : undefined })

  return (
    <OverridesProvider value={{ patches, handlers }}>
      <FigmaNode node={R} />
      <AnimatePresence>
        {aiOpen && (
          <motion.aside key="ai" className="ai-panel" aria-label="AI Assistant" initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} transition={spring.calm}>
            <FigmaNode node={AIP} />
          </motion.aside>
        )}
      </AnimatePresence>
      <Menu state={menu?.key === 'cols' && colsMenuItems ? { ...menu, items: colsMenuItems() } : menu} onClose={() => setMenu(null)} />
      <CatalogDialog target={catalog} projects={liveProjects.map((p) => p.name)} onClose={() => setCatalog(null)} onAdd={addPicks} onReplace={replaceLine} say={say} />
      <Toast toast={toast} onDone={() => setToastState(null)} />
      <LeadInfoDialog open={editing === 'lead'} value={leadInfo} onClose={() => setEditing(null)} onSave={(v) => { const prev = leadInfo; setLeadInfo(v); setEditing(null); say('Lead info saved', () => setLeadInfo(prev)) }} />
      <ContactDialog open={editing === 'contact'} value={contact} onClose={() => setEditing(null)} onSave={(v) => { const prev = contact; setContact(v); setEditing(null); say('Contact saved', () => setContact(prev)) }} />
      <AssignDialog open={editing === 'assign'} value={assignees} designers={designers} managers={projectManagers} onClose={() => setEditing(null)} onSave={(v) => { const prev = assignees; setAssignees(v); setEditing(null); say(v.designer ? `${v.designer} assigned as designer` : 'Assignees updated', () => setAssignees(prev)) }} />
      <MessagesDialog open={editing === 'messages'} name={fullName} phone={contact.phone} email={contact.email} store={leadInfo.store} status="Pending Leads" created="Sep 29, 2026, 2:17 PM" messages={messages} onSend={(m) => setMessages((x) => [...x, m])} onClose={() => setEditing(null)} />
      <Dialogs dialog={dialog} close={() => setDialog(null)} say={say} wish={wish} assignees={[...new Set([CURRENT_USER, ...designers, ...projectManagers, ...tasks.map((t) => t.assignee)])]}
        onSaveTask={(t, msg) => { const prev = tasks.find((x) => x.id === t.id); setTasks((x) => x.map((y) => (y.id === t.id ? t : y))); say(msg ?? 'Task updated', prev && (() => setTasks((x) => x.map((y) => (y.id === t.id ? prev : y))))) }}
        onAddTask={(t) => { const id = `new${Date.now()}`; setTasks((x) => [...x, { ...t, id, createdBy: CURRENT_USER, state: 'open' }]); say(`“${t.name}” added`, () => setTasks((x) => x.filter((y) => y.id !== id))) }}
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

// US date entry (MM/DD/YYYY) + time — the product is for the US, so the browser's locale date picker isn't used
const isoToUs = (iso: string) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}` }
const usToIso = (us: string) => { const m = us.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (!m) return null; const [, mo, d, y] = m.map(Number); const dt = new Date(y, mo - 1, d); return dt.getMonth() === mo - 1 && dt.getDate() === d ? `${y}-${pad2(mo)}-${pad2(d)}` : null }
const TIMES = Array.from({ length: 23 }, (_, i) => { const h = 7 + Math.floor(i / 2), mm = i % 2 ? '30' : '00'; return `${((h + 11) % 12) + 1}:${mm} ${h < 12 ? 'AM' : 'PM'}` })

function Dialogs({ dialog, close, say, wish, assignees, onSaveTask, onAddTask, onUpload }: {
  dialog: null | { kind: string; data?: Record<string, unknown> }; close: () => void; say: (t: string, undo?: () => void) => void
  wish: Record<string, boolean>; assignees: string[]
  onSaveTask: (t: Task, msg?: string) => void; onAddTask: (t: Omit<Task, 'id' | 'createdBy' | 'state'>) => void; onUpload: (project: string, folder: string, files: File[]) => void
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
  } else if (dialog?.kind === 'task') {
    // Add task / Edit task — the staging original's three fields only: Task (select), Due Date, Description
    // (dates in US format MM/DD/YYYY + time). The assignee stays as it is (the current user for a new task).
    const t = d.task as Task | undefined
    const date = v('date', t ? isoToUs(t.due) : ''), iso = usToIso(date)
    const name = v('title', t?.name ?? '')
    const options = t && !taskTypes.includes(t.name) ? [t.name, ...taskTypes] : taskTypes
    title = t ? 'Edit task' : 'Add task'
    subtitle = d.resume ? <span className="warn-text">The due date ({fmtDue(t!.due)}) has passed — pick a new one to resume.</span> : undefined
    width = 520
    body = <>
      <Field label="Task" required><Select value={name} onChange={set('title')} autoFocus={!d.resume}><option value="">Select task…</option>{options.map((x) => <option key={x}>{x}</option>)}</Select></Field>
      <Field label="Due Date" required hint={date && !iso ? 'Use MM/DD/YYYY, e.g. 10/03/2026' : undefined}>
        <div className="field-row tight">
          <TextInput value={date} onChange={set('date')} placeholder="MM/DD/YYYY" inputMode="numeric" aria-label="Due date" autoFocus={!!d.resume} />
          <Select value={v('time', t?.time ?? '')} onChange={set('time')} aria-label="Time"><option value="">No time</option>{TIMES.map((x) => <option key={x}>{x}</option>)}</Select>
        </div>
      </Field>
      <Field label="Description"><TextArea value={v('desc', t?.desc ?? '')} onChange={set('desc')} placeholder="Description" /></Field>
    </>
    const ready = !!name.trim() && !!iso && !(d.resume && iso! < TODAY)
    const data = { name: name.trim(), type: taskTypes.includes(name) ? name : t?.type, assignee: t?.assignee ?? assignees[0], due: iso ?? '', time: v('time', t?.time ?? '') || undefined, desc: v('desc', t?.desc ?? '') || undefined }
    footer = <><Btn onClick={close}>Cancel</Btn><Btn kind="primary" disabled={!ready} onClick={() => { close(); if (t) onSaveTask({ ...t, ...data }, d.resume ? `“${data.name}” resumed · due ${fmtDue(data.due)}` : undefined); else onAddTask(data) }}>{t ? (d.resume ? 'Resume task' : 'Save changes') : 'Add task'}</Btn></>
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

