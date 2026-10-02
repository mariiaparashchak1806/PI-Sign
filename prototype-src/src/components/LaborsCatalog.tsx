/** Labors "Add from catalog" — redrawn 1:1 from the PiSuite staging picker (Oct 1–2 screenshots), in the
 *  prototype's styling: title "Labors" · categories on the left (ALL first) · toolbar with the cost ($) and
 *  sale price toggles, "Search labors", Sub Category and Tags · table # / LABOR / [COST / MULTIPLIER] / PRICE /
 *  ACTIONS with editable values and PICK · picked items on the right (cost, − n +, ×) · RESET / OK. */
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { Banknote, Check, DollarSign, Minus, Package, PackageSearch, Plus, Search, ShoppingCart, X } from 'lucide-react'
import { spring } from '../lib/springs'
import { CATALOG, type CatalogItem, type CatalogKind, type Line } from '../lib/estimate'
import type { CatalogTarget } from './CatalogDialog'

type Edit = { cost?: number; multiplier?: number; price?: number }
const num = (v: string) => { const n = Number(v.replace(',', '.').replace(/[^\d.]/g, '')); return Number.isFinite(n) ? n : 0 }
const usd = (n: number) => `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
const r2 = (n: number) => Math.round(n * 100) / 100

function Field({ label, value, onChange }: { label: string; value: number | undefined; onChange: (n: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <label className="lc-field">
      <span>{label}</span>
      <input inputMode="decimal" aria-label={label} value={draft ?? (value ?? '')} onFocus={(e) => { setDraft(String(value ?? '')); requestAnimationFrame(() => e.target.select()) }}
        onBlur={() => setDraft(null)} onChange={(e) => { setDraft(e.target.value); onChange(num(e.target.value)) }} />
    </label>
  )
}

export function LaborsCatalog({ target, onClose, onAdd, onReplace }: {
  target: CatalogTarget
  onClose: () => void
  onAdd: (kind: CatalogKind, project: string, picks: { item: CatalogItem; qty: number }[]) => void
  onReplace: (kind: CatalogKind, project: string, line: Line, item: CatalogItem) => void
}) {
  const { categories, items } = CATALOG.Labors
  const [cat, setCat] = useState('All')
  const [search, setSearch] = useState('')
  const [showCost, setShowCost] = useState(false)
  const [showPrice, setShowPrice] = useState(true)
  const [edits, setEdits] = useState<Record<string, Edit>>({})
  const [cart, setCart] = useState<{ code: string; qty: number }[]>([])
  useEffect(() => { if (target) { setCat('All'); setSearch(''); setEdits({}); setCart([]) } }, [target])
  useEffect(() => {
    if (!target) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key)
  }, [target, onClose])

  const val = (it: CatalogItem) => ({ cost: edits[it.code]?.cost ?? it.cost, multiplier: edits[it.code]?.multiplier ?? it.multiplier, price: edits[it.code]?.price ?? it.price })
  const setVal = (it: CatalogItem, k: keyof Edit, n: number) => setEdits((e) => {
    const cur = { ...val(it), ...e[it.code], [k]: n }
    // cost × multiplier = price (as in the catalog); editing the price directly keeps it
    if (k !== 'price' && cur.cost != null && cur.multiplier != null) cur.price = r2(cur.cost * cur.multiplier)
    return { ...e, [it.code]: cur }
  })
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((it) => (cat === 'All' || it.category === cat) && (!q || it.name.toLowerCase().includes(q) || it.code.includes(q)))
  }, [items, cat, search])
  const byCode = (c: string) => items.find((i) => i.code === c)!
  const pick = (it: CatalogItem) => {
    if (target?.replace) { const v = val(it); onReplace('Labors', target.project, target.replace, { ...it, ...v }); return }
    setCart((c) => (c.some((x) => x.code === it.code) ? c.map((x) => (x.code === it.code ? { ...x, qty: x.qty + 1 } : x)) : [...c, { code: it.code, qty: 1 }]))
  }
  const setQty = (code: string, qty: number) => setCart((c) => c.map((x) => (x.code === code ? { ...x, qty: Math.max(1, qty) } : x)))
  const ok = () => target && onAdd('Labors', target.project, cart.map(({ code, qty }) => { const it = byCode(code); return { item: { ...it, ...val(it) }, qty } }))
  const cols = `32px minmax(220px,1fr)${showCost ? ' 104px 92px' : ''}${showPrice ? ' 104px' : ''} 96px`

  return createPortal(
    <AnimatePresence>
      {target && (
        <motion.div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-label="Labors" className="dialog catalog lc" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={spring.calm}>
            <div className="dialog-head">
              <div className="dialog-title">Labors</div>
              <button className="icon-plain" aria-label="Close" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="catalog-body">
              <nav className="lc-nav" aria-label="Categories">
                {['All', ...categories].map((c) => (
                  <button key={c} className={`lc-nav-item${cat === c ? ' on' : ''}`} aria-current={cat === c ? 'true' : undefined} onClick={() => setCat(c)}>{c}</button>
                ))}
              </nav>
              <div className="catalog-main">
                <div className="lc-toolbar">
                  <div className="lc-toggles" role="group" aria-label="Columns">
                    <button className={showCost ? 'on' : ''} aria-pressed={showCost} title="Show cost" onClick={() => setShowCost((v) => !v)}><DollarSign size={18} /></button>
                    <button className={showPrice ? 'on' : ''} aria-pressed={showPrice} title="Show sale price" onClick={() => setShowPrice((v) => !v)}><Banknote size={18} /></button>
                  </div>
                  <div className="lc-search"><Search size={16} /><input className="input" placeholder="Search labors" aria-label="Search labors" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                  <select className="input select lc-select" aria-label="Sub Category" defaultValue=""><option value="">Sub Category</option></select>
                  <select className="input select lc-select" aria-label="Tags" defaultValue=""><option value="">Tags</option></select>
                </div>
                {shown.length ? (
                  <div className="lc-table" role="table" aria-label="Labors catalog" style={{ ['--lc-cols' as string]: cols }}>
                    <div className="lc-row head" role="row">
                      <span role="columnheader">#</span><span role="columnheader">Labor</span>
                      {showCost && <><span role="columnheader" className="num">Cost</span><span role="columnheader" className="num">Multiplier</span></>}
                      {showPrice && <span role="columnheader" className="num">Price</span>}
                      <span role="columnheader" className="act">Actions</span>
                    </div>
                    {shown.map((it, i) => {
                      const v = val(it)
                      return (
                        <div key={it.code} className="lc-row" role="row">
                          <span role="cell" className="lc-n">{i + 1}</span>
                          <span role="cell" className="lc-name"><b>{it.name}</b>{!it.code.startsWith('mock-') && <em>{it.code}</em>}</span>
                          {showCost && <><Field label="Cost" value={v.cost} onChange={(n) => setVal(it, 'cost', n)} /><Field label="Multiplier" value={v.multiplier} onChange={(n) => setVal(it, 'multiplier', n)} /></>}
                          {showPrice && <Field label="Price" value={v.price} onChange={(n) => setVal(it, 'price', n)} />}
                          <span role="cell" className="act"><button className="btn btn-primary btn-sm lc-pick" onClick={() => pick(it)}><ShoppingCart size={16} />{target.replace ? 'Select' : 'Pick'}</button></span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon"><PackageSearch size={24} strokeWidth={1.6} /></span>
                    <b>No labors found</b>
                    <span>{search.trim() ? 'Try another name or code.' : 'This category isn’t loaded in the prototype.'}</span>
                  </div>
                )}
              </div>
              <aside className="catalog-side lc-side" aria-label="Picked labors">
                {cart.length ? (
                  <div className="lc-cart">
                    {cart.map(({ code, qty }) => {
                      const it = byCode(code), v = val(it)
                      return (
                        <div key={code} className="lc-cart-row">
                          <span className="lc-thumb" aria-hidden="true" />
                          <div className="lc-cart-main">
                            <b title={it.name}>{it.name}</b>
                            <span>{usd(v.cost ?? v.price)}</span>
                            <div className="lc-qty">
                              <button aria-label={`Decrease ${it.name}`} disabled={qty <= 1} onClick={() => setQty(code, qty - 1)}><Minus size={16} /></button>
                              <span>{qty}</span>
                              <button aria-label={`Increase ${it.name}`} onClick={() => setQty(code, qty + 1)}><Plus size={16} /></button>
                            </div>
                          </div>
                          <button className="icon-plain" aria-label={`Remove ${it.name}`} onClick={() => setCart((c) => c.filter((x) => x.code !== code))}><X size={16} /></button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon"><Package size={24} strokeWidth={1.6} /></span>
                    <b>No item found</b>
                  </div>
                )}
                <div className="catalog-foot">
                  <button className="btn btn-secondary" disabled={!cart.length} onClick={() => setCart([])}>Reset</button>
                  <button className="btn btn-primary" disabled={!cart.length} onClick={ok}><Check size={16} />OK</button>
                </div>
              </aside>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
