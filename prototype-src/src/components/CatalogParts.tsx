/** Shared pieces of the "Add from catalog" pickers (designer's review, Oct 2): the row action ("+" → − n + once
 *  picked), active-filter chips, the picked-items panel with its empty state and the "Clear" / "Add N … · $X" footer. */
import type { ReactNode } from 'react'
import { Check, Minus, Package, Plus, X } from 'lucide-react'
import { money, type CatalogItem } from '../lib/estimate'

export type Pick = { code: string; qty: number }
export const unitOf = (it: CatalogItem) => it.unit ?? 'pcs' // no unit in the catalog → pcs, as in the estimate tabs
export const perUnit = (n: number | undefined, it: CatalogItem) => (n == null ? '—' : `${money(n)} / ${unitOf(it)}`)
const plural = (n: number, w: string) => `${n} ${n === 1 ? w.replace(/s$/, '') : w}`

export function Qty({ qty, name, onChange }: { qty: number; name: string; onChange: (n: number) => void }) {
  return (
    <span className="cp-qty" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label={qty <= 1 ? `Remove ${name}` : `Decrease ${name}`} onClick={() => onChange(qty - 1)}><Minus size={14} /></button>
      <span aria-live="polite">{qty}</span>
      <button type="button" aria-label={`Increase ${name}`} onClick={() => onChange(qty + 1)}><Plus size={14} /></button>
    </span>
  )
}

/** Row action: "+" until the item is picked, then the quantity stepper (− at 1 removes it) */
export function RowPick({ picked, name, onAdd, onQty }: { picked?: number; name: string; onAdd: () => void; onQty: (n: number) => void }) {
  return picked ? <Qty qty={picked} name={name} onChange={onQty} /> : (
    <button type="button" className="cp-add" aria-label={`Add ${name}`} title="Add" onClick={(e) => { e.stopPropagation(); onAdd() }}><Plus size={16} /></button>
  )
}

export function Chips({ chips, onClearAll }: { chips: { key: string; label: ReactNode; onRemove: () => void }[]; onClearAll: () => void }) {
  if (!chips.length) return null
  return (
    <div className="cp-chips" aria-label="Active filters">
      {chips.map((c) => (
        <span key={c.key} className="cp-chip">{c.label}<button type="button" aria-label={`Remove filter ${typeof c.label === 'string' ? c.label : c.key}`} onClick={c.onRemove}><X size={12} /></button></span>
      ))}
      {chips.length > 1 && <button type="button" className="cp-clear" onClick={onClearAll}>Clear all</button>}
    </div>
  )
}

export function PickedPanel({ noun, picks, byCode, setQty, onClear, onAdd, thumb }: {
  noun: string // "labors" / "materials" / "countertops"
  picks: Pick[]; byCode: (c: string) => CatalogItem
  setQty: (code: string, n: number) => void; onClear: () => void; onAdd: () => void
  thumb?: (it: CatalogItem) => ReactNode
}) {
  const total = picks.reduce((a, p) => a + byCode(p.code).price * p.qty, 0)
  return (
    <aside className="catalog-side cp-side" aria-label={`Selected ${noun}`}>
      <div className="cp-side-head">Selected{picks.length > 0 && <span className="est-meta">{picks.length}</span>}</div>
      {picks.length ? (
        <div className="cp-cart">
          {picks.map(({ code, qty }) => {
            const it = byCode(code)
            return (
              <div key={code} className="cp-cart-row">
                {thumb?.(it)}
                <div className="cp-cart-main">
                  <b title={it.title ?? it.name}>{it.name}</b>
                  <span>{perUnit(it.price, it)}</span>
                  <div className="cp-cart-line"><Qty qty={qty} name={it.name} onChange={(n) => setQty(code, n)} /><b>{money(it.price * qty)}</b></div>
                </div>
                <button className="icon-plain" aria-label={`Remove ${it.name}`} onClick={() => setQty(code, 0)}><X size={16} /></button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon"><Package size={24} strokeWidth={1.6} /></span>
          <b>No {noun} selected yet</b>
          <span>Pick items from the list</span>
        </div>
      )}
      <div className="catalog-foot">
        <button className="btn btn-secondary" disabled={!picks.length} onClick={onClear}>Clear</button>
        <button className="btn btn-primary" disabled={!picks.length} onClick={onAdd}><Check size={16} />{picks.length ? `Add ${plural(picks.length, noun)} · ${money(total)}` : `Add ${noun}`}</button>
      </div>
    </aside>
  )
}

/** pick / qty bookkeeping shared by both pickers */
export const addPick = (c: Pick[], code: string) => (c.some((x) => x.code === code) ? c : [...c, { code, qty: 1 }])
export const setPickQty = (c: Pick[], code: string, n: number) => (n <= 0 ? c.filter((x) => x.code !== code) : c.map((x) => (x.code === code ? { ...x, qty: n } : x)))
export const togglePick = (c: Pick[], code: string) => (c.some((x) => x.code === code) ? c.filter((x) => x.code !== code) : [...c, { code, qty: 1 }])
