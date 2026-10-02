/** "Add from catalog" — one picker for Labors, Materials and Countertops, drawn after Figma 264:49341
 *  ("Dialog / Add from catalog"): "Add <kind> to <project>" · categories on the left (All + count) · search, Show cost /
 *  Show price switches · filter row (brands / vendors / in stock for products, sub category / tags for labors) + "N of M" ·
 *  rows with name + meta (specs · SKU), Cost and Multiplier (Show cost), Price (Show price), "+ Add" → − n + and a
 *  highlighted row · right: "Selected · N" + Clear, items with − n + and totals, Subtotal, "Add N items to Kitchen".
 *  The switches start from the table the picker was opened from. Replace mode: "Replace" per row, no selection panel. */
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { Check, Minus, Package, PackageSearch, Plus, RefreshCw, Search, X } from 'lucide-react'
import { spring } from '../lib/springs'
import { CATALOG, type CatalogItem, type CatalogKind, type Line } from '../lib/estimate'
import { Switch } from './Form'
import type { CatalogTarget } from './CatalogDialog'

type Pick = { code: string; qty: number }
const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const priceOf = (it: CatalogItem) => `${usd(it.price)}${it.unit ? ` / ${it.unit}` : ''}`
const metaOf = (it: CatalogItem) => [...(it.specs ?? []), ...(it.code.startsWith('mock-') ? [] : [it.code])].join(' · ')
const items = (n: number) => `${n} item${n === 1 ? '' : 's'}`

function Stepper({ qty, name, onChange }: { qty: number; name: string; onChange: (n: number) => void }) {
  return (
    <span className="cpk-step" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label={qty <= 1 ? `Remove ${name}` : `Decrease ${name}`} onClick={() => onChange(qty - 1)}><Minus size={16} /></button>
      <span>{qty}</span>
      <button type="button" aria-label={`Increase ${name}`} onClick={() => onChange(qty + 1)}><Plus size={16} /></button>
    </span>
  )
}

export function CatalogPicker({ target, onClose, onAdd, onReplace }: {
  target: CatalogTarget
  onClose: () => void
  onAdd: (kind: CatalogKind, project: string, picks: { item: CatalogItem; qty: number }[]) => void
  onReplace: (kind: CatalogKind, project: string, line: Line, item: CatalogItem) => void
}) {
  const [kind, setKind] = useState<CatalogKind>('Labors')
  const [cat, setCat] = useState('All')
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('')
  const [vendor, setVendor] = useState('')
  const [inStock, setInStock] = useState(true)
  const [showCost, setShowCost] = useState(false)
  const [showPrice, setShowPrice] = useState(true)
  const [picks, setPicks] = useState<Pick[]>([])
  useEffect(() => {
    if (!target) return
    setKind(target.kind); setCat('All'); setSearch(''); setBrand(''); setVendor(''); setInStock(true); setPicks([])
    setShowCost(target.show?.cost ?? false); setShowPrice(target.show?.sale ?? true)
  }, [target])
  useEffect(() => {
    if (!target) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key)
  }, [target, onClose])

  const { categories, items: all } = CATALOG[kind]
  const labors = kind === 'Labors'
  const noun = kind.toLowerCase()
  const inCat = useMemo(() => all.filter((it) => cat === 'All' || it.category === cat), [all, cat])
  const opts = (k: 'brand' | 'vendor') => [...new Set(all.map((i) => i[k]).filter(Boolean) as string[])]
  const q = search.trim().toLowerCase()
  const shown = inCat.filter((it) => (!q || [it.name, it.title, it.code].some((x) => (x ?? '').toLowerCase().includes(q)))
    && (labors || ((!inStock || it.inStock !== false) && (!brand || it.brand === brand) && (!vendor || it.vendor === vendor))))
  const byCode = (c: string) => all.find((i) => i.code === c)!
  const qtyOf = (code: string) => picks.find((p) => p.code === code)?.qty
  const setQty = (code: string, n: number) => setPicks((c) => (n <= 0 ? c.filter((x) => x.code !== code) : c.map((x) => (x.code === code ? { ...x, qty: n } : x))))
  const add = (code: string) => setPicks((c) => (c.some((x) => x.code === code) ? c : [...c, { code, qty: 1 }]))
  const replace = target?.replace
  const choose = (it: CatalogItem) => (replace ? onReplace(kind, target!.project, replace, it) : add(it.code))
  const subtotal = picks.reduce((a, p) => a + byCode(p.code).price * p.qty, 0)
  const ok = () => target && onAdd(kind, target.project, picks.map(({ code, qty }) => ({ item: byCode(code), qty })))
  const thumbs = !labors
  const cols = [thumbs && '56px', 'minmax(160px,1fr)', showCost && '90px 80px', showPrice && '120px', '112px'].filter(Boolean).join(' ')

  return createPortal(
    <AnimatePresence>
      {target && (
        <motion.div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-label={replace ? `Replace ${replace.name}` : `Add ${noun} to ${target.project}`} className="dialog catalog cpk" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={spring.calm}>
            <div className="dialog-head cpk-head">
              <div className="dialog-title">{replace ? <>Replace “{replace.name}” in {target.project}</> : <>Add {noun} to {target.project}</>}</div>
              <button className="icon-plain" aria-label="Close" onClick={onClose}><X size={16} /></button>
            </div>
            <div className="catalog-body">
              <nav className="cpk-nav" aria-label="Categories">
                {['All', ...categories].map((c) => (
                  <button key={c} className={`cpk-cat${cat === c ? ' on' : ''}`} aria-current={cat === c ? 'true' : undefined} onClick={() => setCat(c)}>
                    <span>{c}</span>{c === 'All' && <span className="cpk-n">{all.length}</span>}
                  </button>
                ))}
              </nav>
              <div className="catalog-main">
                <div className="cpk-toolbar">
                  <div className="cpk-search"><Search size={16} /><input className="input" placeholder={labors ? 'Search labors by name or code' : `Search ${noun} by name or SKU`} aria-label={`Search ${noun}`} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                  <div className="cpk-switches">
                    <Switch on={showCost} onChange={setShowCost} label="Show cost" />
                    <Switch on={showPrice} onChange={setShowPrice} label="Show price" />
                  </div>
                </div>
                <div className="cpk-filters">
                  {labors ? <>
                    <select className="input select cpk-select wide" aria-label="Sub category" defaultValue="" disabled={cat === 'All'} title={cat === 'All' ? 'Choose a category first' : undefined}><option value="">All sub categories</option></select>
                    <select className="input select cpk-select" aria-label="Tags" defaultValue=""><option value="">All tags</option></select>
                  </> : <>
                    <select className="input select cpk-select" aria-label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)}><option value="">All brands</option>{opts('brand').map((o) => <option key={o}>{o}</option>)}</select>
                    <select className="input select cpk-select" aria-label="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)}><option value="">All vendors</option>{opts('vendor').map((o) => <option key={o}>{o}</option>)}</select>
                    <label className="catalog-check"><input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />In stock only</label>
                  </>}
                  <span className="cpk-count">{shown.length} of {inCat.length}</span>
                </div>
                {shown.length ? (
                  <div className="cpk-table" role="table" aria-label={`${kind} catalog`} style={{ ['--cpk-cols' as string]: cols }}>
                    <div className="cpk-row head" role="row">
                      {thumbs && <span role="columnheader" />}
                      <span role="columnheader">Item</span>
                      {showCost && <><span role="columnheader" className="num">Cost</span><span role="columnheader" className="num">Multiplier</span></>}
                      {showPrice && <span role="columnheader" className="num">Price</span>}
                      <span role="columnheader" />
                    </div>
                    {shown.map((it) => {
                      const picked = qtyOf(it.code), meta = metaOf(it)
                      return (
                        <div key={it.code} className={`cpk-row${picked ? ' is-picked' : ''}`} role="row" aria-selected={!!picked} onClick={() => !picked && choose(it)}>
                          {thumbs && <span role="cell" className="cpk-thumb">{it.image ? <img src={it.image} alt="" loading="lazy" /> : <Package size={16} strokeWidth={1.6} />}</span>}
                          <span role="cell" className="cpk-item"><b>{it.name}</b>{meta && <span>{meta}</span>}</span>
                          {showCost && <><span role="cell" className="num muted">{it.cost != null ? usd(it.cost) : '—'}</span><span role="cell" className="num muted">{it.multiplier != null ? `×${it.multiplier}` : '—'}</span></>}
                          {showPrice && <span role="cell" className="num">{priceOf(it)}</span>}
                          <span role="cell" className="cpk-act">
                            {replace ? <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); choose(it) }}><RefreshCw size={16} />Replace</button>
                              : picked ? <Stepper qty={picked} name={it.name} onChange={(n) => setQty(it.code, n)} />
                              : <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); add(it.code) }}><Plus size={16} />Add</button>}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon"><PackageSearch size={24} strokeWidth={1.6} /></span>
                    <b>No {noun} found</b>
                    <span>{q || brand || vendor ? 'Try another name, SKU or filter.' : 'This category isn’t loaded in the prototype.'}</span>
                  </div>
                )}
              </div>
              {!replace && (
                <aside className="catalog-side cpk-side" aria-label={`Selected ${noun}`}>
                  <div className="cpk-side-head"><b>Selected · {picks.length}</b>{picks.length > 0 && <button type="button" className="cpk-clear" onClick={() => setPicks([])}>Clear</button>}</div>
                  {picks.length ? (
                    <div className="cpk-cart">
                      {picks.map(({ code, qty }) => {
                        const it = byCode(code)
                        return (
                          <div key={code} className="cpk-cart-row">
                            <div className="cpk-cart-name"><span title={it.title ?? it.name}>{it.name}</span><button className="icon-plain" aria-label={`Remove ${it.name}`} onClick={() => setQty(code, 0)}><X size={16} /></button></div>
                            <div className="cpk-cart-meta"><Stepper qty={qty} name={it.name} onChange={(n) => setQty(code, n)} /><b>{usd(it.price * qty)}</b></div>
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
                  <div className="cpk-foot">
                    <div className="cpk-subtotal"><span>Subtotal</span><b>{usd(subtotal)}</b></div>
                    <button className="btn btn-primary" disabled={!picks.length} onClick={ok}><Check size={16} />{picks.length ? `Add ${items(picks.length)} to ${target.project}` : `Add to ${target.project}`}</button>
                  </div>
                </aside>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
