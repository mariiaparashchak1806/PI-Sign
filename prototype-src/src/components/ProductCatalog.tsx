/** Materials / Countertops "Add from catalog" — redrawn 1:1 from the PiSuite staging picker (Oct 1 Countertops
 *  screenshot; Materials uses the same layout), in the prototype's styling: title = kind · toolbar with the cost ($)
 *  and sale price toggles, + (custom item), filters, In Stock, Brand, Vendor, "Search from +200,000 materials…" ·
 *  table IMAGE / TITLE (PICK + product page) / DESCRIPTION (vendor, brand, finish) / CATEGORY / PRICE (cost,
 *  multiplier, sale) · picked items on the right (− n +, ×) · RESET / OK. Same principle as the Labors picker. */
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { Banknote, Check, DollarSign, ExternalLink, Filter, Minus, Package, PackageSearch, Plus, Search, ShoppingCart, X } from 'lucide-react'
import { spring } from '../lib/springs'
import { CATALOG, type CatalogItem, type CatalogKind, type Line } from '../lib/estimate'
import type { CatalogTarget } from './CatalogDialog'

const usd = (n: number) => `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`

export function ProductCatalog({ target, onClose, onAdd, onReplace, say }: {
  target: CatalogTarget
  onClose: () => void
  onAdd: (kind: CatalogKind, project: string, picks: { item: CatalogItem; qty: number }[]) => void
  onReplace: (kind: CatalogKind, project: string, line: Line, item: CatalogItem) => void
  say?: (t: string) => void
}) {
  const [kind, setKind] = useState<CatalogKind>('Materials')
  const [showCost, setShowCost] = useState(true)
  const [showPrice, setShowPrice] = useState(true)
  const [inStock, setInStock] = useState(true)
  const [q, setQ] = useState({ brand: '', vendor: '', search: '' })
  const [cart, setCart] = useState<{ code: string; qty: number }[]>([])
  useEffect(() => { if (target) { setKind(target.kind); setQ({ brand: '', vendor: '', search: '' }); setCart([]) } }, [target])
  useEffect(() => {
    if (!target) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key)
  }, [target, onClose])

  const items = CATALOG[kind].items
  const noun = kind.toLowerCase()
  const has = (v: string | undefined, f: string) => !f.trim() || (v ?? '').toLowerCase().includes(f.trim().toLowerCase())
  const shown = useMemo(() => items.filter((it) => (!inStock || it.inStock !== false) && has(it.brand, q.brand) && has(it.vendor, q.vendor)
    && (!q.search.trim() || [it.title, it.name, it.code].some((x) => has(x, q.search)))), [items, inStock, q])
  const byCode = (c: string) => items.find((i) => i.code === c)!
  const pick = (it: CatalogItem) => {
    if (target?.replace) { onReplace(kind, target.project, target.replace, it); return }
    setCart((c) => (c.some((x) => x.code === it.code) ? c.map((x) => (x.code === it.code ? { ...x, qty: x.qty + 1 } : x)) : [...c, { code: it.code, qty: 1 }]))
  }
  const setQty = (code: string, qty: number) => setCart((c) => c.map((x) => (x.code === code ? { ...x, qty: Math.max(1, qty) } : x)))
  const ok = () => target && onAdd(kind, target.project, cart.map(({ code, qty }) => ({ item: byCode(code), qty })))
  const priceCol = showCost || showPrice
  const cols = `76px minmax(240px,1.6fr) minmax(150px,1fr) 140px${priceCol ? ' 170px' : ''}`

  return createPortal(
    <AnimatePresence>
      {target && (
        <motion.div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-label={kind} className="dialog catalog lc pc" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={spring.calm}>
            <div className="dialog-head">
              <div className="dialog-title">{kind}</div>
              <button className="icon-plain" aria-label="Close" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="catalog-body">
              <div className="catalog-main">
                <div className="lc-toolbar pc-toolbar">
                  <div className="lc-toggles" role="group" aria-label="Columns">
                    <button className={showCost ? 'on' : ''} aria-pressed={showCost} title="Show cost" onClick={() => setShowCost((v) => !v)}><DollarSign size={18} /></button>
                    <button className={showPrice ? 'on' : ''} aria-pressed={showPrice} title="Show sale price" onClick={() => setShowPrice((v) => !v)}><Banknote size={18} /></button>
                    <button title="Add custom item" onClick={() => say?.('Custom items aren’t part of this prototype')}><Plus size={18} /></button>
                  </div>
                  <button className="tool-btn outline" title="Filters" aria-label="Filters" onClick={() => say?.('More filters aren’t part of this prototype')}><Filter size={16} /></button>
                  <label className="catalog-check"><input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />In Stock</label>
                  <input className="input pc-text" placeholder="Brand" aria-label="Brand" value={q.brand} onChange={(e) => setQ({ ...q, brand: e.target.value })} />
                  <input className="input pc-text" placeholder="Vendor" aria-label="Vendor" value={q.vendor} onChange={(e) => setQ({ ...q, vendor: e.target.value })} />
                  <div className="lc-search"><Search size={16} /><input className="input" placeholder="Search from +200,000 materials…" aria-label={`Search ${noun}`} value={q.search} onChange={(e) => setQ({ ...q, search: e.target.value })} /></div>
                </div>
                {shown.length ? (
                  <div className="lc-table" role="table" aria-label={`${kind} catalog`} style={{ ['--lc-cols' as string]: cols }}>
                    <div className="lc-row head" role="row">
                      <span role="columnheader">Image</span><span role="columnheader">Title</span><span role="columnheader">Description</span><span role="columnheader">Category</span>
                      {priceCol && <span role="columnheader" className="num">Price</span>}
                    </div>
                    {shown.map((it) => (
                      <div key={it.code} className="lc-row pc-row" role="row">
                        <span role="cell" className="pc-img">{it.image ? <img src={it.image} alt="" loading="lazy" /> : <Package size={20} strokeWidth={1.5} />}</span>
                        <span role="cell" className="pc-title">
                          <span className="pc-actions">
                            <button className="btn btn-primary btn-sm lc-pick" onClick={() => pick(it)}><ShoppingCart size={16} />{target.replace ? 'Select' : 'Pick'}</button>
                            <button className="btn btn-primary btn-sm pc-link" aria-label="Open product page" title="Open product page" onClick={() => say?.('The product page isn’t part of this prototype')}><ExternalLink size={16} /></button>
                          </span>
                          <b>{it.title ?? it.name}</b>
                        </span>
                        <span role="cell" className="pc-desc">{it.vendor || it.brand || it.finish ? <>{it.vendor && <span>Vendor: {it.vendor}</span>}{it.brand && <span>Brand: {it.brand}</span>}{it.finish && <span>Finish: {it.finish}</span>}</> : <span>—</span>}</span>
                        <span role="cell" className="pc-cat"><b>{kind}</b>{it.category && <span>{it.category}</span>}</span>
                        {priceCol && <span role="cell" className="pc-price">
                          {showCost && <><span>Cost: {it.cost != null ? usd(it.cost) : '—'}</span><span>Multiplier: {it.multiplier != null ? it.multiplier.toFixed(2) : '—'}</span></>}
                          {showPrice && <b>Sale: {usd(it.price)}{it.unit ? ` / ${it.unit}` : ''}</b>}
                        </span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon"><PackageSearch size={24} strokeWidth={1.6} /></span>
                    <b>No {noun} found</b>
                    <span>Try another brand, vendor or name.</span>
                  </div>
                )}
              </div>
              <aside className="catalog-side lc-side" aria-label={`Picked ${noun}`}>
                {cart.length ? (
                  <div className="lc-cart">
                    {cart.map(({ code, qty }) => {
                      const it = byCode(code)
                      return (
                        <div key={code} className="lc-cart-row">
                          <span className="lc-thumb" aria-hidden="true">{it.image && <img src={it.image} alt="" />}</span>
                          <div className="lc-cart-main">
                            <b title={it.title ?? it.name}>{it.title ?? it.name}</b>
                            <span>{usd(it.cost ?? it.price)}</span>
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
