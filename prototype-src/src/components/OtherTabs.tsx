/** Labors / Materials / Countertops, Payment Plan, Signed documents, Messages and Forms tabs.
 *  Structure follows the PiSuite staging tabs; content is the lead's data from the mock; the staging
 *  "Insufficient permissions" errors are replaced by the real data or an empty state. */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Banknote, Bold, ChevronDown, Download, Eye, FileText, Italic, List, ListOrdered, Lock, Mail, MessageSquare, MoreHorizontal, Paperclip, PenLine, Pencil, Plus, RefreshCw, Send, Strikethrough, Trash2, Underline, X } from 'lucide-react'
import { SUMMARY, itemsLabel, lineTotal, money, type CatalogKind, type Estimate, type Line } from '../lib/estimate'
import { Field, Select, Switch, TextInput } from './Form'
import { Menu, type MenuState } from './Overlay'
import type { MsgFile } from './LeadDialogs'

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
// One list per project (Kitchen → Bathroom → Basement). Rows are read-only; ⋯ → Edit opens that one row as an inline
// form (Title, Qty + unit, Unit price, optional Description) with a live total and subtotal, Save / Cancel, Enter / Esc.
// Opening another row with unsaved changes asks "Save changes to …?" first. Save and Remove show a toast with Undo.
type Draft = { name: string; qty: string; price: string; desc: string; descOpen: boolean }
const toDraft = (l: Line): Draft => ({ name: l.name, qty: String(l.qty), price: String(l.price), desc: l.desc ?? '', descOpen: !!l.desc })
const numOf = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))
const unitOf = (l: Line) => l.unit ?? 'pcs'

export function EstimateTab({ kind, projects, estimate, setEstimate, onCatalog, say }: {
  kind: CatalogKind; projects: string[]; estimate: Estimate; setEstimate: (f: (e: Estimate) => Estimate) => void
  onCatalog: (t: { kind: CatalogKind; project: string; replace?: Line }) => void; say: (t: string, undo?: () => void) => void
}) {
  const [showCost, setShowCost] = useState(false)
  const [showSale, setShowSale] = useState(true)
  const [closed, setClosed] = useState<string[]>([])
  const [menu, setMenu] = useState<MenuState>(null)
  const [editing, setEditing] = useState<{ p: string; id: string; draft: Draft } | null>(null)
  const [pending, setPending] = useState<{ p: string; id: string } | null>(null) // Edit clicked on another row while this one is dirty
  const noun = kind.toLowerCase()
  const lineOf = (p: string, id: string) => (estimate[p]?.[kind] ?? []).find((l) => l.id === id)
  const setLines = (p: string, f: (ls: Line[]) => Line[]) => setEstimate((e) => ({ ...e, [p]: { ...e[p], [kind]: f(e[p]?.[kind] ?? []) } }))
  // the row being edited counts with its draft values, so totals update live
  const live = (p: string, l: Line): Line => {
    if (editing?.p !== p || editing.id !== l.id) return l
    const q = numOf(editing.draft.qty), pr = numOf(editing.draft.price)
    return { ...l, qty: q > 0 ? q : 0, price: pr >= 0 ? pr : l.price }
  }
  const groups = projects.map((p) => {
    const ls = estimate[p]?.[kind] ?? []
    const sum = SUMMARY[p]?.[kind]
    return { p, ls, sum, count: ls.length + (sum?.items ?? 0), value: ls.reduce((a, l) => a + lineTotal(live(p, l)), 0) + (sum?.total ?? 0) }
  })
  const allCount = groups.reduce((a, g) => a + g.count, 0), allValue = groups.reduce((a, g) => a + g.value, 0)
  const errorsOf = (d: Draft) => ({ name: d.name.trim() ? '' : 'Title can’t be empty', qty: numOf(d.qty) > 0 ? '' : 'Qty must be greater than 0', price: numOf(d.price) >= 0 ? '' : 'Enter a price' })
  const dirty = (e: NonNullable<typeof editing>) => { const l = lineOf(e.p, e.id), d = e.draft; return !!l && (d.name.trim() !== l.name || numOf(d.qty) !== l.qty || numOf(d.price) !== l.price || d.desc.trim() !== (l.desc ?? '')) }
  const startEdit = (p: string, l: Line) => {
    if (editing && (editing.p !== p || editing.id !== l.id) && dirty(editing)) { setPending({ p, id: l.id }); return }
    setPending(null); setEditing({ p, id: l.id, draft: toDraft(l) })
  }
  const save = (then?: { p: string; id: string } | null) => {
    if (!editing) return
    const e = errorsOf(editing.draft); if (e.name || e.qty || e.price) return
    const prev = lineOf(editing.p, editing.id)!, { p, id, draft } = editing
    const next: Line = { ...prev, name: draft.name.trim(), qty: numOf(draft.qty), price: numOf(draft.price), desc: draft.desc.trim() || undefined }
    setLines(p, (x) => x.map((y) => (y.id === id ? next : y)))
    say(`${next.name} updated`, () => setLines(p, (x) => x.map((y) => (y.id === id ? prev : y))))
    open(then)
  }
  const open = (then?: { p: string; id: string } | null) => { setPending(null); const l = then && lineOf(then.p, then.id); setEditing(then && l ? { p: then.p, id: then.id, draft: toDraft(l) } : null) }
  const setDraft = (patch: Partial<Draft>) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e))
  const cols = `minmax(0,1fr) 148px${showCost ? ' 110px' : ''}${showSale ? ' 120px 120px' : ''} 28px`
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
                {ls.map((l) => {
                  if (editing?.p === p && editing.id === l.id) {
                    const d = editing.draft, err = errorsOf(d), bad = !!(err.name || err.qty || err.price), lv = live(p, l)
                    return (
                      <div key={l.id} className="est-edit" role="row" aria-label={`Editing ${l.name}`}
                        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); open(null) } else if (e.key === 'Enter' && !(e.target as HTMLElement).matches('textarea') && !bad) { e.preventDefault(); save() } }}>
                        <div className="tline est-row">
                          <span role="cell" className="est-field">
                            <input className={`input${err.name ? ' invalid' : ''}`} aria-label="Title" autoFocus value={d.name} onChange={(e) => setDraft({ name: e.target.value })} />
                            {err.name && <em className="field-error">{err.name}</em>}
                          </span>
                          <span role="cell" className="est-field">
                            <span className="affix"><input className={`input${err.qty ? ' invalid' : ''}`} aria-label="Qty" inputMode="decimal" value={d.qty} onChange={(e) => setDraft({ qty: e.target.value })} onFocus={(e) => e.target.select()} /><em>{unitOf(l)}</em></span>
                            {err.qty && <em className="field-error">{err.qty}</em>}
                          </span>
                          {showCost && <span role="cell" className="num muted">{l.cost != null ? money(l.cost) : '—'}</span>}
                          {showSale && <>
                            <span role="cell" className="est-field">
                              <span className="affix pre"><em>$</em><input className={`input${err.price ? ' invalid' : ''}`} aria-label="Unit price" inputMode="decimal" value={d.price} onChange={(e) => setDraft({ price: e.target.value })} onFocus={(e) => e.target.select()} /></span>
                              {err.price && <em className="field-error">{err.price}</em>}
                            </span>
                            <span role="cell" className="num strong">{money(lineTotal(lv))}</span>
                          </>}
                          <span />
                        </div>
                        <div className="est-edit-foot">
                          {d.descOpen
                            ? <textarea className="input est-desc" aria-label="Description" placeholder="Description (optional)" rows={2} autoFocus={!d.desc} value={d.desc} onChange={(e) => setDraft({ desc: e.target.value })} />
                            : <button type="button" className="link-btn est-add-desc" onClick={() => setDraft({ descOpen: true })}><Plus size={14} />Add description</button>}
                          <span className="est-edit-actions">
                            {pending ? <>
                              <span className="est-prompt">Save changes to {l.name}?</span>
                              <button type="button" className="link-btn est-cancel" onClick={() => open(pending)}>Discard</button>
                              <button type="button" className="btn btn-primary btn-sm" disabled={bad} onClick={() => save(pending)}>Save</button>
                            </> : <>
                              <button type="button" className="link-btn est-cancel" onClick={() => open(null)}>Cancel</button>
                              <button type="button" className="btn btn-primary btn-sm" disabled={bad} onClick={() => save()}>Save</button>
                            </>}
                          </span>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={l.id} className="tline est-row" role="row">
                      <span role="cell" className="tline-name">{l.name}{l.code && <em>{l.code}</em>}{l.desc && <em>{l.desc}</em>}</span>
                      <span role="cell" className="est-qty">{l.qty} {unitOf(l)}</span>
                      {showCost && <span role="cell" className="num muted">{l.cost != null ? money(l.cost) : '—'}</span>}
                      {showSale && <><span role="cell" className="num muted">{money(l.price)}</span><span role="cell" className="num strong">{money(lineTotal(l))}</span></>}
                      <button className="icon-plain" data-id={`est-${l.id}`} aria-label={`Actions for ${l.name}`} aria-haspopup="menu" onClick={() => setMenu(menu?.key === l.id ? null : { key: l.id, anchorId: `est-${l.id}`, width: 220, items: [
                        { label: 'Edit', icon: <Pencil size={16} />, onSelect: () => startEdit(p, l) },
                        { label: 'Replace from catalog', icon: <RefreshCw size={16} />, onSelect: () => onCatalog({ kind, project: p, replace: l }) },
                        '-',
                        { label: 'Remove', danger: true, icon: <Trash2 size={16} />, onSelect: () => { let prev: Line[] = []; setLines(p, (x) => { prev = x; return x.filter((y) => y.id !== l.id) }); say(`${l.name} removed`, () => setLines(p, () => prev)) } },
                      ] })}><MoreHorizontal size={16} /></button>
                    </div>
                  )
                })}
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
// Staging: plan select (1–5 payments), %/$ input-mode toggles, rows # · Percentage · Amount · Description · Date ·
// Method, red Reset + Save. Here: share and amount are both editable and stay in sync (no mode toggle), the
// total row shows what's left to schedule, the plan splits evenly when the count changes, Save is the one primary.
export type PayRow = { share: number; desc: string; due: string; method: string }
export const PAY_METHODS = ['N/A', 'Check', 'Cash', 'Wire Transfer', 'Credit Card', 'Financing']
const round2 = (n: number) => Math.round(n * 100) / 100
export const splitEvenly = (n: number, prev: PayRow[] = []): PayRow[] => Array.from({ length: n }, (_, i) => {
  const base = Math.floor(10000 / n) / 100, p = prev[i] as PayRow | undefined
  return { desc: p?.desc ?? '', due: p?.due ?? '', method: p?.method ?? 'Check', share: i === n - 1 ? round2(100 - base * (n - 1)) : base }
})
export const plansLabel = (n: number) => `${n} payment${n === 1 ? '' : 's'}`

// number field that keeps what's typed while focused and shows the formatted value otherwise
function NumInput({ value, format, onChange, label }: { value: number; format: (n: number) => string; onChange: (n: number) => void; label: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  return <input className="input" inputMode="decimal" aria-label={label} value={draft ?? format(value)}
    onFocus={(e) => { setDraft(String(value)); requestAnimationFrame(() => e.target.select()) }} onBlur={() => setDraft(null)}
    onChange={(e) => { setDraft(e.target.value); onChange(Math.max(0, Number(e.target.value.replace(/[^\d.]/g, '')) || 0)) }} />
}

export function PaymentTab({ total, saved, onSave, say }: { total: number; saved: PayRow[]; onSave: (rows: PayRow[]) => void; say: (t: string, undo?: () => void) => void }) {
  const [rows, setRows] = useState(saved)
  useEffect(() => setRows(saved), [saved])
  const sum = round2(rows.reduce((a, r) => a + r.share, 0))
  const left = round2(100 - sum)
  const dirty = JSON.stringify(rows) !== JSON.stringify(saved)
  const amount = (share: number) => round2((total * share) / 100)
  const set = (i: number, patch: Partial<PayRow>) => setRows((x) => x.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <Card title={<span className="est-title">Payment Plan<span className="est-meta">{rows.length ? `${plansLabel(rows.length)} · ${money(total)}` : 'Not set'}</span></span>}
      right={<div className="tcard-actions">
        {dirty && <button className="btn btn-secondary" onClick={() => setRows(saved)}>Discard changes</button>}
        <button className="btn btn-primary" disabled={!dirty || left !== 0 || !rows.length} onClick={() => { const prev = saved; onSave(rows); say(`Payment plan saved · ${plansLabel(rows.length)}`, () => onSave(prev)) }}>Save plan</button>
      </div>}>
      <div className="tcard-toolbar pay-toolbar">
        <Field label="Plan">
          <Select aria-label="Payment plan" value={rows.length || ''} onChange={(e) => setRows(splitEvenly(Number(e.target.value), rows))}>
            {!rows.length && <option value="">Select plan…</option>}
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{plansLabel(n)}</option>)}
          </Select>
        </Field>
        <div className="pay-total"><span>Lead total</span><b>{money(total)}</b></div>
      </div>
      {rows.length ? (
        <div className="pay-table" role="table" aria-label="Payments">
          <div className="pay-row head" role="row">
            <span role="columnheader">#</span><span role="columnheader">Share</span><span role="columnheader">Amount</span>
            <span role="columnheader">Description</span><span role="columnheader">Due date</span><span role="columnheader">Method</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="pay-row" role="row">
              <span role="cell" className="pay-n">{i + 1}</span>
              <label role="cell" className="affix"><NumInput label={`Share of payment ${i + 1}`} value={r.share} format={(n) => String(n)} onChange={(n) => set(i, { share: Math.min(100, n) })} /><em>%</em></label>
              <label role="cell" className="affix pre"><em>$</em><NumInput label={`Amount of payment ${i + 1}`} value={amount(r.share)} format={(n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} onChange={(n) => set(i, { share: Math.round(Math.min(total, n) / total * 1e6) / 1e4 })} /></label>
              <input role="cell" className="input" aria-label={`Description of payment ${i + 1}`} placeholder="e.g. Deposit, due on signing" value={r.desc} onChange={(e) => set(i, { desc: e.target.value })} />
              <input role="cell" className="input" type="date" aria-label={`Due date of payment ${i + 1}`} value={r.due} onChange={(e) => set(i, { due: e.target.value })} />
              <select role="cell" className="input select" aria-label={`Method of payment ${i + 1}`} value={r.method} onChange={(e) => set(i, { method: e.target.value })}>{PAY_METHODS.map((m) => <option key={m}>{m}</option>)}</select>
            </div>
          ))}
          <div className={`pay-row foot${left !== 0 ? ' warn' : ''}`} role="row">
            <span role="cell" /><span role="cell" className="num">{sum}%</span><span role="cell" className="num">{money(amount(sum))}</span>
            <span role="cell" className="pay-status">
              {left === 0 ? 'The whole total is scheduled'
                : <>{left > 0 ? `${money(amount(left))} (${left}%) not scheduled yet` : `Over the total by ${money(amount(-left))} (${-left}%)`}
                  <button className="link-btn" onClick={() => setRows(splitEvenly(rows.length, rows))}>Split evenly</button></>}
            </span>
          </div>
        </div>
      ) : <Empty icon={<Banknote size={22} strokeWidth={1.6} />} title="No payment plan yet" text={`Pick how many payments split the ${money(total)} total.`} />}
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
// Messages = the team's internal thread on this lead (employees, not the client — client SMS/email live in the
// header's Messages dialog). Staging: "Messages (9)" feed — avatar, author, full date, message card with
// attachments (thumbnail, name, lock = private, size, download). Composer: text, Attach, "Private" for files.
export type TeamMsg = { author: string; at: string; text: string; files?: MsgFile[] }
const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 102.4) / 10)} KB`)
export const initials = (s: string) => s.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
export const teamStamp = (d = new Date()) => `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
export function MessagesTab({ me, messages, onSend, say }: { me: string; messages: TeamMsg[]; onSend: (m: TeamMsg) => void; say: (t: string) => void }) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<MsgFile[]>([])
  const [priv, setPriv] = useState(false)
  const feed = useRef<HTMLDivElement>(null)
  const pick = useRef<HTMLInputElement>(null)
  useEffect(() => { feed.current?.scrollTo({ top: 1e6, behavior: 'smooth' }) }, [messages])
  const send = () => {
    const t = text.trim(); if (!t && !files.length) return
    onSend({ author: me, at: teamStamp(), text: t, files: files.map((f) => ({ ...f, private: priv })) })
    setText(''); setFiles([]); setPriv(false)
  }
  return (
    <Card title={<span className="est-title">Messages<span className="est-meta">{messages.length}</span></span>}>
      <div className="msg-feed" ref={feed}>
        {messages.length ? messages.map((m, i) => (
          <article key={i} className={`msg${m.author === me ? ' out' : ''}`}>
            <span className="msg-avatar" aria-hidden="true">{initials(m.author)}</span>
            <div className="msg-main">
              <header><b>{m.author === me ? `${m.author} (you)` : m.author}</b><time>{m.at}</time></header>
              <div className="msg-card">
                {m.text && <p>{m.text}</p>}
                {!!m.files?.length && <div className="msg-files">{m.files.map((f, j) => (
                  <div key={j} className="msg-file">
                    <div className="msg-file-thumb">{f.src ? <img src={f.src} alt="" /> : <FileText size={22} strokeWidth={1.6} />}</div>
                    <div className="msg-file-meta">
                      <span className="msg-file-name" title={f.name}>{f.name}</span>
                      {f.private && <span className="msg-private" title="Private — only you and managers see this file"><Lock size={14} />Private</span>}
                      <span className="msg-size">{kb(f.size)}</span>
                      <a className="icon-plain" aria-label={`Download ${f.name}`} title="Download" href={f.src} download={f.name} onClick={(e) => { if (!f.src) { e.preventDefault(); say(`${f.name} downloaded`) } }}><Download size={16} /></a>
                    </div>
                  </div>
                ))}</div>}
              </div>
            </div>
          </article>
        )) : <Empty icon={<MessageSquare size={22} strokeWidth={1.6} />} title="No messages yet" text="Notes and files for the team working on this lead appear here." />}
      </div>
      <div className="msg-compose">
        {files.length > 0 && <div className="msg-chips">
          {files.map((f, i) => <span key={i} className="msg-chip"><Paperclip size={14} />{f.name}<em>{kb(f.size)}</em><button className="icon-plain" aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}><X size={14} /></button></span>)}
          <Switch on={priv} onChange={setPriv} label="Private files" />
        </div>}
        <textarea className="input msg-text" rows={2} placeholder="Write a message to the team…" aria-label="Message" value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
        <div className="msg-actions">
          <button className="btn btn-secondary" onClick={() => pick.current?.click()}><Paperclip size={16} />Attach</button>
          <input ref={pick} type="file" multiple hidden onChange={(e) => { const l = [...(e.target.files ?? [])].map((f) => ({ name: f.name, size: f.size, src: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined })); setFiles((x) => [...x, ...l]); e.target.value = '' }} />
          <span className="msg-hint">Visible to your team only · Enter to send, Shift+Enter for a new line</span>
          <button className="btn btn-primary" disabled={!text.trim() && !files.length} onClick={send}><Send size={16} />Send</button>
        </div>
      </div>
    </Card>
  )
}

// ---------- Forms ----------
// Staging: one row "Credit Card Form" + an unlabeled mail icon. Here the row says whether and when it was sent,
// and the action is a labelled button (Send to client → Resend) with the confirmation naming the address.
export function FormsTab({ email, say, confirm }: { email: string; say: (t: string, undo?: () => void) => void; confirm: (d: { title: string; body: string; ok: string; run: () => void }) => void }) {
  const [sent, setSent] = useState<string | null>(null)
  const send = () => confirm({ title: `${sent ? 'Resend' : 'Email'} the Credit Card Form?`, body: `Cheryl Isaac gets a link to the form at ${email}.`, ok: sent ? 'Resend form' : 'Send form', run: () => { const prev = sent; setSent(new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })); say(`Credit Card Form sent to ${email}`, () => setSent(prev)) } })
  return (
    <Card title={<span className="est-title">Forms<span className="est-meta">1</span></span>} narrow>
      <div className="form-row">
        <span className="form-icon"><FileText size={18} strokeWidth={1.6} /></span>
        <div className="form-info">
          <b>Credit Card Form</b>
          <span className={sent ? 'ok' : ''}>{sent ? `Sent to ${email} · ${sent}` : 'Not sent yet'}</span>
        </div>
        <button className="btn btn-secondary" onClick={send}><Mail size={16} />{sent ? 'Resend' : 'Send to client'}</button>
      </div>
    </Card>
  )
}
