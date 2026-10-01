/** Labors / Materials / Countertops, Payment Plan, Signed documents, Messages and Forms tabs.
 *  Structure follows the PiSuite staging tabs; content is the lead's data from the mock; the staging
 *  "Insufficient permissions" errors are replaced by the real data or an empty state. */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Banknote, Bold, ChevronDown, Download, Eye, FileText, Italic, List, ListOrdered, Mail, MessageSquare, MoreHorizontal, PenLine, Plus, RefreshCw, Send, Strikethrough, Trash2, Underline } from 'lucide-react'
import { SUMMARY, itemsLabel, lineTotal, money, type CatalogKind, type Estimate, type Line } from '../lib/estimate'
import { Field, Select, Stepper, Switch, TextInput } from './Form'
import { Menu, type MenuState } from './Overlay'
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
// One list per project (Kitchen → Bathroom → Basement): quantities change in place, ⋯ replaces or removes a
// line, each project adds from the catalog straight into itself. Bathroom's drawn totals stay as a summary row.
export function EstimateTab({ kind, projects, estimate, setEstimate, onCatalog, say }: {
  kind: CatalogKind; projects: string[]; estimate: Estimate; setEstimate: (f: (e: Estimate) => Estimate) => void
  onCatalog: (t: { kind: CatalogKind; project: string; replace?: Line }) => void; say: (t: string, undo?: () => void) => void
}) {
  const [showCost, setShowCost] = useState(false)
  const [showSale, setShowSale] = useState(true)
  const [closed, setClosed] = useState<string[]>([])
  const [menu, setMenu] = useState<MenuState>(null)
  const noun = kind.toLowerCase()
  const groups = projects.map((p) => {
    const ls = estimate[p]?.[kind] ?? []
    const sum = SUMMARY[p]?.[kind]
    return { p, ls, sum, count: ls.length + (sum?.items ?? 0), value: ls.reduce((a, l) => a + lineTotal(l), 0) + (sum?.total ?? 0) }
  })
  const allCount = groups.reduce((a, g) => a + g.count, 0), allValue = groups.reduce((a, g) => a + g.value, 0)
  const setLines = (p: string, f: (ls: Line[]) => Line[]) => setEstimate((e) => ({ ...e, [p]: { ...e[p], [kind]: f(e[p]?.[kind] ?? []) } }))
  const cols = `minmax(0,1fr) 148px${showCost ? ' 110px' : ''}${showSale ? ' 110px 120px' : ''} 28px`
  return (
    <Card title={<span className="est-title">{kind}<span className="est-meta">{itemsLabel(allCount)}{showSale && allCount > 0 && <> · {money(allValue)}</>}</span></span>}
      right={<div className="est-switches"><Switch on={showCost} onChange={setShowCost} label="Show cost" /><Switch on={showSale} onChange={setShowSale} label="Show sale" /></div>}>
      {groups.map(({ p, ls, sum, count, value }) => {
        const isOpen = !closed.includes(p)
        return (
          <div key={p} className="tgroup">
            <div className="tgroup-head est-head">
              <button className="est-toggle" aria-expanded={isOpen} onClick={() => setClosed((c) => (isOpen ? [...c, p] : c.filter((x) => x !== p)))}>
                <ChevronDown size={16} className="files-chev" style={{ transform: isOpen ? 'none' : 'rotate(-90deg)' }} />
                <span className="files-group-name">{p}</span>
                <span className="files-group-count">{count ? itemsLabel(count) : `No ${noun}`}</span>
              </button>
              {showSale && count > 0 && <span className="tgroup-total">{money(value)}</span>}
              {count > 0 && <button className="btn btn-secondary btn-sm" onClick={() => onCatalog({ kind, project: p })}><Plus size={16} />Add from catalog</button>}
            </div>
            {isOpen && (count ? (
              <div className="tlines est-lines" role="table" aria-label={`${p} ${noun}`} style={{ ['--est-cols' as string]: cols }}>
                <div className="tline est-row head" role="row">
                  <span role="columnheader">Item</span><span role="columnheader">Qty</span>
                  {showCost && <span role="columnheader" className="num">Unit cost</span>}
                  {showSale && <><span role="columnheader" className="num">Unit price</span><span role="columnheader" className="num">Total</span></>}
                  <span />
                </div>
                {sum && (
                  <div className="tline est-row summary" role="row">
                    <span role="cell" className="tline-name">Items from the estimate<em>{itemsLabel(sum.items)}</em></span>
                    <span role="cell" />{showCost && <span role="cell" />}
                    {showSale && <><span role="cell" /><span role="cell" className="num strong">{money(sum.total)}</span></>}
                    <span />
                  </div>
                )}
                {ls.map((l) => (
                  <div key={l.id} className="tline est-row" role="row">
                    <span role="cell" className="tline-name">{l.name}{l.code && <em>{l.code}</em>}</span>
                    <span role="cell"><Stepper value={l.qty} unit={l.unit} label={`Quantity of ${l.name}`} onChange={(qty) => setLines(p, (x) => x.map((y) => (y.id === l.id ? { ...y, qty } : y)))} /></span>
                    {showCost && <span role="cell" className="num muted">{l.cost != null ? money(l.cost) : '—'}</span>}
                    {showSale && <><span role="cell" className="num muted">{money(l.price)}</span><span role="cell" className="num strong">{money(lineTotal(l))}</span></>}
                    <button className="icon-plain" data-id={`est-${l.id}`} aria-label={`Actions for ${l.name}`} aria-haspopup="menu" onClick={() => setMenu(menu?.key === l.id ? null : { key: l.id, anchorId: `est-${l.id}`, width: 220, items: [
                      { label: 'Replace from catalog', icon: <RefreshCw size={16} />, onSelect: () => onCatalog({ kind, project: p, replace: l }) },
                      '-',
                      { label: 'Remove', danger: true, icon: <Trash2 size={16} />, onSelect: () => { let prev: Line[] = []; setLines(p, (x) => { prev = x; return x.filter((y) => y.id !== l.id) }); say(`${l.name} removed from ${p}`, () => setLines(p, () => prev)) } },
                    ] })}><MoreHorizontal size={16} /></button>
                  </div>
                ))}
                {showSale && <div className="tline est-row subtotal" role="row"><span role="cell" className="tline-name">Subtotal</span><span />{showCost && <span />}<span /><span role="cell" className="num strong">{money(value)}</span><span /></div>}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon"><FileText size={22} strokeWidth={1.6} /></span>
                <b>No {noun} in {p} yet</b>
                <span>Pick them from the catalog — quantities can be changed here afterwards.</span>
                <button className="btn btn-secondary" onClick={() => onCatalog({ kind, project: p })}><Plus size={16} />Add from catalog</button>
              </div>
            ))}
          </div>
        )
      })}
      <Menu state={menu} onClose={() => setMenu(null)} />
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
          <Field label="Estimated job start date"><TextInput type="date" value={s.start} onChange={(e) => setS({ ...s, start: e.target.value })} /></Field>
          <label className="catalog-check"><input type="checkbox" checked={s.senior} onChange={(e) => setS({ ...s, senior: e.target.checked })} />Buyer is older than 65 years old</label>
          <Field label="Estimated job duration (business days)">
            <div className="range"><TextInput type="number" min={1} aria-label="From" value={s.from} onChange={(e) => setS({ ...s, from: e.target.value })} /><span>–</span><TextInput type="number" min={1} aria-label="To" value={s.to} onChange={(e) => setS({ ...s, to: e.target.value })} /></div>
          </Field>
          <label className="catalog-check wrap"><input type="checkbox" checked={s.permits} onChange={(e) => setS({ ...s, permits: e.target.checked })} />Please confirm if you expect the Company to pull the permits</label>
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
