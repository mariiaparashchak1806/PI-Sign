import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { CopyPlus, Download, FileText, Heart, Info, MoveRight, Paperclip, Pause, Pencil, Play, Plus, RefreshCw, Ban, Trash2, Archive, Link2 } from 'lucide-react'
import tree from '../figma/tree.json'
import { FigmaNode, OverridesProvider, indexTree, type FNode, type Handler, type Patch } from '../figma/FigmaNode'
import { Btn, Dialog, Menu, Toast, type MenuItem, type MenuState, type ToastState } from '../components/Overlay'
import { Field, Select, TextArea, TextInput } from '../components/Form'
import { ContactDialog, LeadInfoDialog, type Contact, type LeadInfo } from '../components/EditDialogs'
import { aiAnswers, aiFallback, designers, projectStatuses, projectTypes } from '../lib/mockData'

const root = tree as unknown as FNode
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
const LEAD_WRAP = '109:5225', LEAD_COLLAPSED = '109:3765', LEAD_DETAILS = '109:6980'
const PD_HEAD = '93:8342', PD_COLHEAD = '93:8360', KITCHEN_EXPANDED = '42:10573'
const PROJECT_ROWS = ['93:8375', '42:10700', '42:10752']
const AGENDA = '42:10916', AGENDA_HEAD = '42:10917'
const ACTIVITY_HEAD = '93:4855', ACTIVITY_BODY = '93:5083'
const AI = '19:1415', AI_INPUT = '19:1437'

type ProjectRow = { id: string; name: string; pill?: string; pillLabel?: string; more: string; chevron: string; sales: string }
const projectRows: ProjectRow[] = PROJECT_ROWS.map((id) => {
  const kids = kidsOf(id)
  const pill = kids.find((k) => k.n.startsWith('Pill'))
  return {
    id, name: named(id, 'Name').txt!, pill: pill?.id, pillLabel: pill ? textIn(pill.id).id : undefined,
    more: kids.find((k) => k.n === 'Button')!.id, chevron: find(id, (n) => /^icon\/chev/.test(n.n))!.id, sales: kids[5].id,
  }
})
const lineItems = T.findAll(node(KITCHEN_EXPANDED), (n) => n.n.startsWith('Item /')).map((it) => ({ id: it.id, name: named(it.id, 'Name').txt!, more: kidsOf(it.id).find((k) => k.n === 'Button')!.id }))

type TaskStatus = 'overdue' | 'upcoming' | 'done' | 'idle' | 'cancelled'
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

const leadHeaders = [find(LEAD_COLLAPSED, (n) => n.n === 'Header')!, find(LEAD_DETAILS, (n) => n.n === 'Header')!]
const leadButtons = leadHeaders.map((h) => ({ edit: named(h.id, 'Secondary Button').id, assign: named(h.id, 'Primary Button').id, more: named(h.id, 'Icon button').id }))
const notAssignedTexts = T.findAll(node(LEAD_WRAP), (n) => n.t === 'TEXT' && n.txt === 'Not assigned').map((n) => n.id)
const showDetailsToggle = named(LEAD_COLLAPSED, /^Toggle \/ Show details/).id
const hideDetailsToggle = named(LEAD_DETAILS, /^Toggle \/ Show details/).id
const paymentLinks = T.findAll(node(LEAD_WRAP), (n) => n.n === 'Link / Open').map((n) => n.id)

// Values shown in the cards → initial values of the edit dialogs
const LEAD_INFO0: LeadInfo = { store: 'VKB, Bethesda, MD', source: 'Google', start: 'ASAP', houseType: 'Single House', houseAge: '1-5 years' }
const CONTACT0: Contact = { first: 'Cheryl', last: 'Isaac', phone: '+1 (131) 231-2321', email: 'onur@blackstonedata.ai', address: '4605 Reno Road NW, Washington DC 20008' }
const houseLabel = (i: LeadInfo) => `${i.houseType.charAt(0)}${i.houseType.slice(1).toLowerCase()}, ${i.houseAge.replace(' years', ' yrs').replace(' year', ' yr').replace('-', '–')}`
const textsIn = (fromId: string, txt: string) => T.findAll(node(fromId), (n) => n.t === 'TEXT' && n.txt === txt).map((n) => n.id)
const CONTACT_ROWS = ['85:5281', '85:5353', '85:5385']

// ---------- page ----------
export default function LeadOverview() {
  const [menu, setMenu] = useState<MenuState>(null)
  const [toast, setToastState] = useState<ToastState>(null)
  const [dialog, setDialog] = useState<null | { kind: 'project' | 'wishlist' | 'task' | 'attach' | 'confirm'; data?: Record<string, unknown> }>(null)
  const [showDetails, setShowDetails] = useState(fixture === 'details')
  const [designer, setDesigner] = useState<string | null>(null)
  const [kitchenOpen, setKitchenOpen] = useState(fixture !== 'kitchen-collapsed')
  const [showSales, setShowSales] = useState(true)
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
  const [editing, setEditing] = useState<null | 'lead' | 'contact'>(null)

  const say = useCallback((text: string, undo?: () => void) => setToastState({ id: Date.now(), text, undo }), [])
  const open = (key: string, anchorId: string, items: MenuItem[], width?: number, align?: 'left' | 'right') => setMenu((m) => (m?.key === key ? null : { key, anchorId, items, width, align }))
  const confirm = (data: { title: string; body: string; ok: string; danger?: boolean; run: () => void }) => setDialog({ kind: 'confirm', data })
  const notInPrototype = (what: string) => say(`${what} isn’t part of this prototype`)

  const patches: Record<string, Patch | undefined> = {}
  const handlers: Record<string, Handler | undefined> = {}
  const on = (id: string | undefined, h: Handler) => { if (id) handlers[id] = { ...handlers[id], ...h } }

  // Lead card — "Show details" is the drawn alternate state (hidden frame in the mock)
  patches[LEAD_COLLAPSED] = { hidden: showDetails }
  patches[LEAD_DETAILS] = { hidden: !showDetails }
  on(showDetailsToggle, { onClick: () => setShowDetails(true), title: 'Show details' })
  on(hideDetailsToggle, { onClick: () => setShowDetails(false), title: 'Hide details' })
  if (designer) notAssignedTexts.forEach((id) => (patches[id] = { txt: designer }))
  leadButtons.forEach((b) => {
    on(b.edit, { onClick: () => setEditing('lead'), title: 'Edit lead' })
    on(b.assign, { onClick: () => open('assign', b.assign, [{ title: 'Assign designer' }, ...designers.map((d) => ({ label: d, checked: d === designer, onSelect: () => { const prev = designer; setDesigner(d); say(`${d} assigned as designer`, () => setDesigner(prev)) } }))], 240) })
    on(b.more, { onClick: () => open('lead-more', b.more, [
      { label: 'Copy lead link', icon: <Link2 {...I} />, onSelect: () => { navigator.clipboard?.writeText(location.href); say('Lead link copied') } },
      { label: 'Send to archive', icon: <Archive {...I} />, onSelect: () => confirm({ title: 'Send Cheryl Isaac to archive?', body: 'The lead leaves the active pipeline. You can restore it from Archive.', ok: 'Send to archive', run: () => say('Lead sent to archive (demo)') }) },
      '-',
      { label: 'Delete lead', danger: true, icon: <Trash2 {...I} />, onSelect: () => confirm({ title: 'Delete Cheryl Isaac?', body: 'The lead, its 3 projects, tasks and files are removed for everyone. You can’t undo this.', ok: 'Delete lead', danger: true, run: () => say('Lead deleted (demo)') }) },
    ], 220) })
  })
  paymentLinks.forEach((id) => on(id, { onClick: () => notInPrototype('The Payment Plan tab') }))

  // Lead info values (edited through the "Info" dialog)
  const leadText: [string, string][] = [[LEAD_INFO0.store, leadInfo.store], [LEAD_INFO0.source, leadInfo.source], [LEAD_INFO0.start, leadInfo.start], [houseLabel(LEAD_INFO0), houseLabel(leadInfo)]]
  leadText.forEach(([from, to]) => from !== to && textsIn(LEAD_WRAP, from).forEach((id) => (patches[id] = { txt: to })))

  // Contact card — edit dialog, values, hover-only copy
  on(named('85:3793', 'Secondary Button').id, { onClick: () => setEditing('contact'), title: 'Edit contact' })
  const fullName = `${contact.first} ${contact.last}`.trim()
  patches['85:3794'] = { txt: fullName }
  patches['19:1107'] = { txt: fullName }
  patches[named('85:5281', 'Value').id] = { txt: contact.phone }
  patches[named('85:5353', 'Value').id] = { txt: contact.email }
  patches[named('85:5385', 'Value').id] = { txt: contact.address }
  CONTACT_ROWS.forEach((id) => on(id, { className: 'contact-row' }))
  patches['85:5353'] = { bg: 'transparent' } // grey fill in the mock is the hover state
  const copy = (text: string, label: string) => () => { navigator.clipboard?.writeText(text); say(`${label} copied`) }
  const mailCopy = named('85:5353', 'Icon button / Copy')
  on(mailCopy.id, { onClick: copy(contact.email, 'Email'), title: 'Copy email', className: 'copy-on-hover' })
  const copyBtn = (key: string, text: string, label: string, parentId: string) => (
    <span key={key} className="copy-on-hover clickable ghost" role="button" tabIndex={0} title={`Copy ${label.toLowerCase()}`} onClick={copy(text, label)} style={{ display: 'inline-flex', borderRadius: 6, flexShrink: 0 }}>
      <FigmaNode node={{ ...mailCopy, id: `${mailCopy.id}#${key}` }} parent={node(parentId)} />
    </span>
  )
  on(named('85:5281', 'Actions').id, { after: copyBtn('phone', contact.phone, 'Phone number', named('85:5281', 'Actions').id) })
  on('85:5385', { className: 'contact-row', after: copyBtn('address', contact.address, 'Address', '85:5385') })
  on(named('85:5281', 'Icon button / Call').id, { onClick: () => { say(`Calling ${contact.phone}…`); location.href = `tel:${contact.phone.replace(/[^+\d]/g, '')}` }, title: 'Call' })
  on(named('85:5281', 'Icon button / Copy').id, { onClick: () => notInPrototype('The Messages tab'), title: 'Send SMS' })

  // Top bar search → real input
  const searchText = textIn('19:1071')
  on(searchText.id, { render: () => <input key="search" className="bare-input" style={{ flex: '1 1 0', minWidth: 0, fontSize: 13, lineHeight: '19px' }} placeholder={searchText.txt} aria-label="Search" /> })

  // Project Details — header
  const headActions = named(PD_HEAD, 'Actions')
  const colsBtn = named(headActions.id, 'Icon button / cols').id
  on(colsBtn, { onClick: () => open('cols', colsBtn, [{ title: 'Show in table' }, { label: 'Cost', checked: true, onSelect: () => say('Cost is always shown') }, { label: 'Sales price', checked: showSales, onSelect: () => setShowSales((v) => !v) }], 220), title: 'Columns' })
  on(named(headActions.id, 'Icon button / doc').id, { onClick: () => say('Downloading summary PDF…'), title: 'Download summary PDF' })
  const addBtn = named(headActions.id, /^Button \/ Add/).id
  on(addBtn, { onClick: () => open('add', addBtn, [
    { label: 'New project', icon: <Plus {...I} />, onSelect: () => setDialog({ kind: 'project' }) },
    { label: 'From wishlist', icon: <Heart {...I} />, meta: `${Object.values(wish).filter(Boolean).length} saved`, onSelect: () => setDialog({ kind: 'wishlist' }) },
  ], 220) })
  if (!showSales) { patches[kidsOf(PD_COLHEAD)[5].id] = { hidden: true }; projectRows.forEach((r) => (patches[r.sales] = { hidden: true })) }
  const liveProjects = projectRows.filter((r) => !deletedRows.includes(r.id))
  patches[named(PD_HEAD, 'Sub').id] = { txt: `${liveProjects.length} project${liveProjects.length === 1 ? '' : 's'}` }

  // Project rows
  patches[KITCHEN_EXPANDED] = { hidden: !kitchenOpen || deletedRows.includes('93:8375') }
  patches[projectRows[0].chevron] = { style: { transform: kitchenOpen ? 'none' : 'rotate(-90deg)', transition: 'transform .18s var(--spring-snappy)' } }
  on('93:8375', { onClick: () => setKitchenOpen((v) => !v), title: kitchenOpen ? 'Collapse Kitchen' : 'Expand Kitchen', className: 'row-hover' })
  projectRows.forEach((r) => {
    if (deletedRows.includes(r.id)) { patches[r.id] = { hidden: true }; return }
    const st = projStatus[r.id]
    if (r.pill && st) { const s = projectStatuses.find((p) => p.label === st)!; patches[r.pill] = { bg: s.bg }; patches[r.pillLabel!] = { txt: st, color: s.fg } }
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
    on(it.more, { onClick: () => open(`item-${it.id}`, it.more, [
      { label: 'Edit quantity & price', icon: <Pencil {...I} />, onSelect: () => notInPrototype('Inline quantity editing') },
      { label: 'Replace from catalog', icon: <RefreshCw {...I} />, onSelect: () => notInPrototype('The catalog') },
      { label: 'Duplicate', icon: <CopyPlus {...I} />, onSelect: () => say(`${it.name} duplicated (demo)`) },
      { label: 'Move to project', icon: <MoveRight {...I} />, meta: '›', onSelect: () => open(`move-${it.id}`, it.more, projectRows.filter((p) => p.name !== 'Kitchen').map((p) => ({ label: p.name, onSelect: () => say(`${it.name} moved to ${p.name} (demo)`) })), 200) },
      '-',
      { label: 'Remove item', danger: true, icon: <Trash2 {...I} />, onSelect: () => { patchesState.remove(it.id); say(`${it.name} removed`, () => patchesState.restore(it.id)) } },
    ], 248), title: 'Item actions' })
  })
  T.findAll(node(KITCHEN_EXPANDED), (n) => n.n === 'Link Button').forEach((b) => on(b.id, { onClick: () => notInPrototype('The catalog') }))

  // Agenda
  const [removedItems, setRemovedItems] = useState<string[]>([])
  const patchesState = { remove: (id: string) => setRemovedItems((r) => [...r, id]), restore: (id: string) => setRemovedItems((r) => r.filter((x) => x !== id)) }
  removedItems.forEach((id) => (patches[id] = { hidden: true }))
  const setTaskStatus = (id: string, status: TaskStatus, msg: string) => { const prev = task[id].status; setTask((t) => ({ ...t, [id]: { ...t[id], status } })); say(msg, () => setTask((t) => ({ ...t, [id]: { ...t[id], status: prev } }))) }
  taskRows.forEach((t) => {
    const s = task[t.id]
    if (s.deleted || (hideDone && s.status === 'done')) { patches[t.id] = { hidden: true }; return }
    const done = s.status === 'done', closed = done || s.status === 'cancelled'
    const ps = pillStyle(s.status)
    patches[t.pill] = { bg: ps.bg }
    patches[t.pillLabel] = { txt: statusLabel[s.status], color: ps.fg }
    patches[t.name.id] = { txt: s.name, decoration: closed ? 'line-through' : 'none', color: closed ? segColor(doneName) : segColor(t.name) }
    const title = s.name ?? t.name.txt!
    on(t.checkbox, {
      render: () => (
        <span key={t.checkbox} role="checkbox" aria-checked={done} aria-label={done ? 'Mark as not done' : 'Mark as done'} tabIndex={0} className={`check-hit${s.status === 'cancelled' ? ' is-disabled' : ''}`}
          onClick={() => s.status !== 'cancelled' && setTaskStatus(t.id, done ? (t.initial === 'done' ? 'upcoming' : t.initial) : 'done', done ? `“${title}” reopened` : `“${title}” marked as done`)}
          onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), (e.currentTarget as HTMLElement).click())}>
          <FigmaNode node={{ ...(done ? CHECK_ON : CHECK_OFF), id: `${t.checkbox}#${done ? 'on' : 'off'}` }} parent={node(named(t.id, 'Cell / p').id)} />
        </span>
      ),
    })
    const items: MenuItem[] = closed
      ? [{ label: 'Reopen task', icon: <Play {...I} />, onSelect: () => setTaskStatus(t.id, t.initial === 'done' || t.initial === 'cancelled' ? 'upcoming' : t.initial, `“${title}” reopened`) }]
      : [
          { label: 'Edit task', icon: <Pencil {...I} />, onSelect: () => setDialog({ kind: 'task', data: { id: t.id, title } }) },
          { label: 'Attach file', icon: <Paperclip {...I} />, onSelect: () => setDialog({ kind: 'attach', data: { title } }) },
          '-',
          s.status === 'idle'
            ? { label: 'Resume task', icon: <Play {...I} />, onSelect: () => setTaskStatus(t.id, t.initial === 'done' ? 'upcoming' : t.initial, `“${title}” resumed`) }
            : { label: 'Mark as idle', icon: <Pause {...I} />, onSelect: () => setTaskStatus(t.id, 'idle', `“${title}” marked as idle`) },
          { label: 'Cancel task', icon: <Ban {...I} />, onSelect: () => confirm({ title: `Cancel “${title}”?`, body: 'The task stays in Agenda as Cancelled and stops counting as overdue. You can reopen it later.', ok: 'Cancel task', run: () => setTaskStatus(t.id, 'cancelled', `“${title}” cancelled`) }) },
        ]
    on(t.more, { onClick: () => open(`task-${t.id}`, t.more, [...items, '-', { label: 'Delete task', danger: true, icon: <Trash2 {...I} />, onSelect: () => confirm({ title: `Delete “${title}”?`, body: 'The task and its attachments are removed for everyone. You can’t undo this.', ok: 'Delete task', danger: true, run: () => { setTask((x) => ({ ...x, [t.id]: { ...x[t.id], deleted: true } })); say(`“${title}” deleted`) } }) }], 232), title: 'Task actions' })
  })
  const openTasks = taskRows.filter((t) => !task[t.id].deleted && ['overdue', 'upcoming', 'idle'].includes(task[t.id].status))
  const overdue = openTasks.filter((t) => task[t.id].status === 'overdue').length
  patches[find(AGENDA_HEAD, (n) => n.t === 'TEXT' && /open tasks/.test(n.txt ?? ''))!.id] = { txt: `${openTasks.length} open task${openTasks.length === 1 ? '' : 's'}${overdue ? ` · ${overdue} overdue` : ''}` }
  on(named(AGENDA_HEAD, 'Secondary Button').id, { onClick: () => setDialog({ kind: 'task', data: {} }) })
  on(named(AGENDA_HEAD, 'Link Button').id, { onClick: () => notInPrototype('The Agenda tab') })
  const agendaHeaderMore = kidsOf('42:11145').find((k) => k.n === 'Button')!.id
  on(agendaHeaderMore, { onClick: () => open('agenda-more', agendaHeaderMore, [{ label: hideDone ? 'Show completed tasks' : 'Hide completed tasks', checked: hideDone, onSelect: () => setHideDone((v) => !v) }], 230), title: 'List options' })

  // Activity
  patches[ACTIVITY_BODY] = { hidden: !activityOpen }
  patches[find(ACTIVITY_HEAD, (n) => !!n.icon)!.id] = { style: { transform: activityOpen ? 'none' : 'rotate(180deg)', transition: 'transform .18s var(--spring-snappy)' } }
  on(ACTIVITY_HEAD, { onClick: () => setActivityOpen((v) => !v), title: activityOpen ? 'Collapse activity' : 'Expand activity', className: 'row-hover' })

  // Right column
  const ask = (q: string) => { if (!q.trim()) return; setAi((a) => [...a, { q, a: aiAnswers[q] ?? aiFallback }]) }
  ;['19:1425', '19:1429', '19:1433'].forEach((id) => on(id, { onClick: () => ask(textIn(id).txt!) }))
  const aiPlaceholder = named(AI_INPUT, 'Placeholder')
  on(aiPlaceholder.id, { render: () => <input key="ai-field" className="bare-input" style={{ flex: '1 1 0', minWidth: 0, fontSize: 13, lineHeight: '19px' }} value={aiText} onChange={(e) => setAiText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { ask(aiText); setAiText('') } }} placeholder={aiPlaceholder.txt} aria-label="Ask the AI assistant" /> })
  on(named(AI_INPUT, 'Send').id, { onClick: () => { if (!aiText.trim()) { say('Type a question or pick a suggestion'); return } ask(aiText); setAiText('') }, title: 'Send' })
  on(AI, { after: ai.length ? <div className="ai-thread">{ai.map((m, i) => <div key={i}><div className="ai-q">{m.q}</div><div className="ai-a">{m.a}</div></div>)}</div> : undefined })
  ;[['93:6004', 'The Signed documents tab'], ['93:7192', 'The Files & Photos tab'], ['93:6062', 'The Messages tab']].forEach(([id, w]) => on(id, { onClick: () => notInPrototype(w) }))

  return (
    <OverridesProvider value={{ patches, handlers }}>
      <FigmaNode node={root} />
      <Menu state={menu} onClose={() => setMenu(null)} />
      <Toast toast={toast} onDone={() => setToastState(null)} />
      <LeadInfoDialog open={editing === 'lead'} value={leadInfo} onClose={() => setEditing(null)} onSave={(v) => { const prev = leadInfo; setLeadInfo(v); setEditing(null); say('Lead info saved', () => setLeadInfo(prev)) }} />
      <ContactDialog open={editing === 'contact'} value={contact} onClose={() => setEditing(null)} onSave={(v) => { const prev = contact; setContact(v); setEditing(null); say('Contact saved', () => setContact(prev)) }} />
      <Dialogs dialog={dialog} close={() => setDialog(null)} say={say} onRenameTask={(id, name) => setTask((t) => ({ ...t, [id]: { ...t[id], name } }))} wish={wish} />
    </OverridesProvider>
  )
}

function Dialogs({ dialog, close, say, onRenameTask, wish }: {
  dialog: null | { kind: string; data?: Record<string, unknown> }; close: () => void; say: (t: string, undo?: () => void) => void
  onRenameTask: (id: string, name: string) => void; wish: Record<string, boolean>
}) {
  const d = dialog?.data ?? {}
  const [form, setForm] = useState<Record<string, string>>({})
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
    title = 'Attach files'; subtitle = <>To “{d.title as string}”</>
    body = <>
      <div className="field-row">
        <Field label="Project"><Select value={v('p', 'Kitchen')} onChange={set('p')}>{['Kitchen', 'Bathroom', 'Basement'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Folder"><Select value={v('f', 'Before Photos')} onChange={set('f')}>{['Before Photos', '3D Renderings', '2020 Files', 'Additional Material Photos'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
      </div>
      <label className="dropzone"><FileText size={22} strokeWidth={1.6} /><b>Drag files here or browse</b><span>Photos, PDF, 2020 files · up to 25 MB</span><input type="file" multiple hidden onChange={(e) => setForm((f) => ({ ...f, [`${key}:files`]: String(e.target.files?.length ?? 0) }))} /></label>
      {Number(v('files', '0')) > 0 && <div className="muted">{v('files')} file(s) selected</div>}
    </>
    footer = <><Btn onClick={close}>Cancel</Btn><Btn kind="primary" onClick={() => { close(); say(`Files attached to “${d.title as string}” (demo)`) }}>Upload</Btn></>
  } else if (dialog?.kind === 'confirm') {
    title = d.title as string; width = 440
    body = <p className="muted" style={{ lineHeight: 1.55 }}>{d.body as string}</p>
    footer = <><Btn onClick={close}>{(d.danger ? 'Keep' : 'Go back')}</Btn><Btn kind={d.danger ? 'danger' : 'primary'} onClick={() => { close(); (d.run as () => void)() }}>{d.ok as string}</Btn></>
  }
  return <Dialog open={!!dialog} title={title} subtitle={subtitle} footer={footer} onClose={close} width={width}>{body}</Dialog>
}

