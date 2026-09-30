/** Labors / Materials / Countertops, Payment Plan, Signed documents, Messages and Forms tabs.
 *  Structure follows the PiSuite staging tabs; content is the lead's data from the mock; the staging
 *  "Insufficient permissions" errors are replaced by the real data or an empty state. */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Banknote, Bold, ChevronDown, DollarSign, Download, Eye, FileText, Italic, List, ListOrdered, Mail, MessageSquare, PenLine, Pencil, Plus, Send, Strikethrough, Trash2, Underline } from 'lucide-react'
import { ESTIMATE, itemsLabel, money, type Line } from '../lib/estimate'
import type { CatalogKind } from './CatalogDialog'
import { Field, Select, TextInput } from './Form'
import type { Msg } from './LeadDialogs'

function Card({ title, left, right, children, narrow }: { title: ReactNode; left?: ReactNode; right?: ReactNode; children: ReactNode; narrow?: boolean }) {
  return (
    <section className={`tcard${narrow ? ' narrow' : ''}`}>
      <header className={`tcard-head${left ? ' centered' : ''}`}>
        {left && <div className="tcard-side">{left}</div>}
        <h2>{title}</h2>
        <div className="tcard-side end">{right}</div>
      </header>
      {children}
    </section>
  )
}

function Empty({ icon, title, text }: { icon: ReactNode; title: string; text?: string }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><b>{title}</b>{text && <span>{text}</span>}</div>
}

// ---------- Labors / Materials / Countertops ----------
export function EstimateTab({ kind, projects, onCatalog, say }: { kind: CatalogKind; projects: string[]; onCatalog: (k: CatalogKind) => void; say: (t: string, undo?: () => void) => void }) {
  const [unit, setUnit] = useState(true)
  const [total, setTotal] = useState(true)
  const [mode, setMode] = useState<'list' | 'edit'>('list')
  const [project, setProject] = useState(projects[0] ?? 'Kitchen')
  const [open, setOpen] = useState<string[]>(['Kitchen'])
  const [lines, setLines] = useState<Record<string, Line[]>>(() => Object.fromEntries(ESTIMATE.filter((p) => p.lines).map((p) => [p.project, p.lines![kind]])))
  const noun = kind.toLowerCase()
  return (
    <Card title={kind}
      left={<div className="seg seg-icons" role="group" aria-label="Columns">
        <button aria-pressed={unit} className={unit ? 'on' : ''} title="Show unit price" onClick={() => setUnit((v) => !v)}><DollarSign size={16} /></button>
        <button aria-pressed={total} className={total ? 'on' : ''} title="Show line total" onClick={() => setTotal((v) => !v)}><Banknote size={16} /></button>
      </div>}
      right={<div className="seg seg-labels" role="radiogroup" aria-label="Mode">
        <button role="radio" aria-checked={mode === 'list'} className={mode === 'list' ? 'on' : ''} onClick={() => setMode('list')}><List size={16} />List</button>
        <button role="radio" aria-checked={mode === 'edit'} className={mode === 'edit' ? 'on' : ''} onClick={() => setMode('edit')}><Pencil size={16} />Edit</button>
      </div>}>
      <div className="tcard-toolbar">
        <Field label="Project"><Select value={project} onChange={(e) => setProject(e.target.value)} aria-label="Project">{projects.map((p) => <option key={p}>{p}</option>)}</Select></Field>
        <button className="btn btn-primary btn-lg" onClick={() => onCatalog(kind)}><Plus size={16} />Add from catalog</button>
      </div>
      {ESTIMATE.filter((p) => projects.includes(p.project)).map((p) => {
        const ls = lines[p.project]
        const sum = p.summary?.[kind]
        const count = ls ? ls.length : sum?.items ?? 0
        const value = ls ? ls.reduce((a, l) => a + l.qty * l.price, 0) : sum?.total ?? 0
        const itemised = !!ls
        const isOpen = open.includes(p.project) && itemised
        return (
          <div key={p.project} className="tgroup">
            <button className={`tgroup-head${itemised ? '' : ' static'}`} aria-expanded={itemised ? isOpen : undefined} tabIndex={itemised ? 0 : -1}
              onClick={() => itemised && setOpen((o) => (isOpen ? o.filter((x) => x !== p.project) : [...o, p.project]))}>
              {itemised ? <ChevronDown size={16} className="files-chev" style={{ transform: isOpen ? 'none' : 'rotate(-90deg)' }} /> : <span className="tgroup-chev-space" />}
              <span className="files-group-name">{p.project}</span>
              <span className="files-group-count">{count ? itemsLabel(count) : `No ${noun}`}</span>
              {count > 0 && <span className="tgroup-total">{money(value)}</span>}
            </button>
            {isOpen && (ls.length ? (
              <div className="tlines" role="table" aria-label={`${p.project} ${noun}`}>
                {ls.map((l, i) => (
                  <div key={l.name} className="tline" role="row">
                    <span className="tline-name" role="cell">{l.name}</span>
                    {mode === 'edit'
                      ? <span className="tline-qty" role="cell"><input className="input qty" type="number" min={1} aria-label={`Quantity of ${l.name}`} value={l.qty} onChange={(e) => { const qty = Math.max(1, Number(e.target.value) || 1); setLines((x) => ({ ...x, [p.project]: x[p.project].map((y, j) => (j === i ? { ...y, qty } : y)) })) }} />{l.unit && <em>{l.unit}</em>}</span>
                      : unit && <span className="tline-unit" role="cell">{l.qty}{l.unit ? ` ${l.unit}` : ''} × {money(l.price)}</span>}
                    {mode === 'edit' && unit && <span className="tline-unit" role="cell">× {money(l.price)}</span>}
                    {total && <span className="tline-total" role="cell">{money(l.qty * l.price)}</span>}
                    {mode === 'edit' && <button className="icon-plain danger" aria-label={`Remove ${l.name}`} title="Remove" onClick={() => { const prev = ls; setLines((x) => ({ ...x, [p.project]: x[p.project].filter((_, j) => j !== i) })); say(`${l.name} removed`, () => setLines((x) => ({ ...x, [p.project]: prev }))) }}><Trash2 size={16} /></button>}
                  </div>
                ))}
                <div className="tline subtotal" role="row"><span className="tline-name" role="cell">Subtotal</span><span className="tline-total" role="cell">{money(value)}</span>{mode === 'edit' && <span className="tline-pad" />}</div>
              </div>
            ) : <Empty icon={<FileText size={22} strokeWidth={1.6} />} title={`No ${noun} yet`} text={`Add ${noun} from the catalog.`} />)}
          </div>
        )
      })}
    </Card>
  )
}

// ---------- Payment Plan ----------
export function PaymentTab() {
  const [plan, setPlan] = useState('2 payments')
  return (
    <Card title="Payment Plan">
      <div className="tcard-toolbar">
        <Field label="Payment plan"><Select value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Payment plan"><option value="">Select plan…</option><option>2 payments</option></Select></Field>
      </div>
      <Empty icon={<Banknote size={22} strokeWidth={1.6} />} title="No payment schedule yet" text={plan ? 'Due dates and amounts for each payment will appear here.' : 'Pick a plan to split the $13,128 total into payments.'} />
    </Card>
  )
}

// ---------- Signed documents ----------
export function AgreementsTab({ say, confirm }: { say: (t: string) => void; confirm: (d: { title: string; body: string; ok: string; run: () => void }) => void }) {
  const init = { start: '2026-10-03', from: '30', to: '35', senior: false, permits: false }
  const [s, setS] = useState(init)
  const [saved, setSaved] = useState(init)
  const [notesDirty, setNotesDirty] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [filesOpen, setFilesOpen] = useState(true)
  const notes = useRef<HTMLDivElement>(null)
  const dirty = JSON.stringify(s) !== JSON.stringify(saved) || notesDirty
  const fmt = (cmd: string) => { notes.current?.focus(); document.execCommand(cmd); setNotesDirty(true) }
  const tools: [string, ReactNode, string][] = [['bold', <Bold size={16} />, 'Bold'], ['italic', <Italic size={16} />, 'Italic'], ['underline', <Underline size={16} />, 'Underline'], ['strikeThrough', <Strikethrough size={16} />, 'Strikethrough'], ['insertUnorderedList', <List size={16} />, 'Bulleted list'], ['insertOrderedList', <ListOrdered size={16} />, 'Numbered list']]
  return (
    <Card title="Signed documents" right={<span className="muted">via PiSign</span>} narrow>
      <div className="sig-row">
        <span className="sig-icon"><FileText size={18} strokeWidth={1.7} /></span>
        <div className="sig-main"><b>Agreement</b><span>Sent by Anna Kovalenko via PiSign · 10 min ago</span></div>
        <span className="pill warning">Awaiting signature</span>
      </div>
      <button className="tgroup-head" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((v) => !v)}>
        <ChevronDown size={16} className="files-chev" style={{ transform: settingsOpen ? 'none' : 'rotate(-90deg)' }} /><span className="files-group-name">Agreement Settings</span>
      </button>
      {settingsOpen && (
        <div className="tcard-body">
          <div className="field-row">
            <Field label="Estimated job start date"><TextInput type="date" value={s.start} onChange={(e) => setS({ ...s, start: e.target.value })} /></Field>
            <Field label="Estimated job duration (business days)">
              <div className="range"><TextInput type="number" min={1} aria-label="From" value={s.from} onChange={(e) => setS({ ...s, from: e.target.value })} /><span>–</span><TextInput type="number" min={1} aria-label="To" value={s.to} onChange={(e) => setS({ ...s, to: e.target.value })} /></div>
            </Field>
          </div>
          <div className="field-row">
            <label className="catalog-check"><input type="checkbox" checked={s.senior} onChange={(e) => setS({ ...s, senior: e.target.checked })} />Buyer is older than 65 years old</label>
            <label className="catalog-check wrap"><input type="checkbox" checked={s.permits} onChange={(e) => setS({ ...s, permits: e.target.checked })} />Please confirm if you expect the Company to pull the permits</label>
          </div>
          <Field label="Necessary notes">
            <div className="rte">
              <div className="rte-tools" role="toolbar" aria-label="Formatting">{tools.map(([c, icon, label]) => <button key={c} type="button" className="icon-plain" title={label} aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={() => fmt(c)}>{icon}</button>)}</div>
              <div ref={notes} className="rte-area" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Necessary notes" onInput={() => setNotesDirty(true)} />
            </div>
          </Field>
          <div className="tcard-actions">
            <button className="btn" onClick={() => say('Opening Agreement.pdf preview…')}><Eye size={16} />View agreement</button>
            <button className="btn" onClick={() => confirm({ title: 'Send the agreement with PiSign?', body: 'Cheryl Isaac gets an email with a link to review and sign. The current request is replaced.', ok: 'Send with PiSign', run: () => say('Agreement sent to Cheryl Isaac for signature') })}><PenLine size={16} />Send with PiSign</button>
            <span style={{ flex: 1 }} />
            <button className="btn btn-primary" disabled={!dirty} onClick={() => { setSaved(s); setNotesDirty(false); say('Agreement settings saved') }}>Save changes</button>
          </div>
        </div>
      )}
      <button className="tgroup-head" aria-expanded={filesOpen} onClick={() => setFilesOpen((v) => !v)}>
        <ChevronDown size={16} className="files-chev" style={{ transform: filesOpen ? 'none' : 'rotate(-90deg)' }} /><span className="files-group-name">Agreement Files</span><span className="files-group-count">1 file</span>
      </button>
      {filesOpen && (
        <div className="files-list">
          <div className="files-folder">
            <FileText size={16} className="files-folder-icon" />
            <span className="files-folder-name">Agreement.pdf</span>
            <span className="pill warning">Awaiting signature</span>
            <button className="icon-plain" aria-label="Download Agreement.pdf" title="Download" onClick={() => say('Downloading Agreement.pdf…')}><Download size={16} /></button>
          </div>
        </div>
      )}
    </Card>
  )
}

// ---------- Messages ----------
export function MessagesTab({ name, messages, onSend }: { name: string; messages: Msg[]; onSend: (m: Msg) => void }) {
  const [text, setText] = useState('')
  const thread = useRef<HTMLDivElement>(null)
  useEffect(() => { thread.current?.scrollTo({ top: 1e6 }) }, [messages])
  const send = () => { const t = text.trim(); if (!t) return; onSend({ out: true, ch: 'SMS', text: t, when: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }); setText('') }
  return (
    <Card title={`Messages (${messages.length})`}>
      <div className="chat-thread tab-thread" ref={thread}>
        {messages.length ? messages.map((m, i) => <div key={i} className={`bubble${m.out ? ' out' : ''}`}>{m.text}<span className="when">{m.out ? 'You' : name} · {m.ch} · {m.when}</span></div>)
          : <Empty icon={<MessageSquare size={22} strokeWidth={1.6} />} title="No messages yet" />}
      </div>
      <div className="tab-compose">
        <input className="input" placeholder="Type your message here" aria-label="Message" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button className="btn btn-primary btn-lg" disabled={!text.trim()} onClick={send}><Send size={16} />Send</button>
      </div>
    </Card>
  )
}

// ---------- Forms ----------
export function FormsTab({ email, say, confirm }: { email: string; say: (t: string) => void; confirm: (d: { title: string; body: string; ok: string; run: () => void }) => void }) {
  return (
    <Card title="Forms" narrow>
      <div className="files-list">
        <div className="files-folder">
          <FileText size={16} className="files-folder-icon" />
          <span className="files-folder-name">Credit Card Form</span>
          <button className="icon-box sm" aria-label="Email Credit Card Form" title="Send by email" onClick={() => confirm({ title: 'Email the Credit Card Form?', body: `Cheryl Isaac gets the form at ${email}.`, ok: 'Send form', run: () => say(`Credit Card Form sent to ${email}`) })}><Mail size={16} /></button>
        </div>
      </div>
    </Card>
  )
}
