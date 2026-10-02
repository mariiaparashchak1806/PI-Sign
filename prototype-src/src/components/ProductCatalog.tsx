/** Materials / Countertops "Add from catalog" — staging picker reworked on the same principles as Labors
 *  (designer's review, Oct 2): "Add countertops to Kitchen" · Cost / Sale follow the table it was opened from ·
 *  read-only prices with the unit · row click or "+" picks, picked rows are highlighted with − n + · In Stock, Brand,
 *  Vendor and search, active filters as chips · SKU only on hover · "No countertops selected yet" → selection →
 *  "Clear" / "Add 2 countertops · $324". */
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { Package, PackageSearch, RefreshCw, Search, X } from 'lucide-react'
import { spring } from '../lib/springs'
import { CATALOG, type CatalogItem, type CatalogKind, type Line } from '../lib/estimate'
import type { CatalogTarget } from './CatalogDialog'
import { Chips, PickedPanel, RowPick, addPick, perUnit, setPickQty, togglePick, type Pick } from './CatalogParts'

export function ProductCatalog({ target, onClose, onAdd, onReplace }: {
  target: CatalogTarget
  onClose: () => void
  onAdd: (kind: CatalogKind, project: string, picks: { item: CatalogItem; qty: number }[]) => void
  onReplace: (kind: CatalogKind, project: string, line: Line, item: CatalogItem) => void
  say?: (t: string) => void
}) {
  const [kind, setKind] = useState<CatalogKind>('Materials')
  const [inStock, setInStock] = useState(true)
  const [q, setQ] = useState({ brand: '', vendor: '', search: '' })
  const [picks, setPicks] = useState<Pick[]>([])
  useEffect(() => { if (target) { setKind(target.kind); setQ({ brand: '', vendor: '', search: '' }); setPicks([]) } }, [target])
  useEffect(() => {
    if (!target) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key)
  }, [target, onClose])

  const show = { cost: target?.show?.cost ?? false, sale: target?.show?.sale ?? true }
  const showSale = show.sale || !show.cost
  const items = CATALOG[kind].items
  const noun = kind.toLowerCase()
  const has = (v: string | undefined, f: string) => !f.trim() || (v ?? '').toLowerCase().includes(f.trim().toLowerCase())
  const shown = useMemo(() => items.filter((it) => (!inStock || it.inStock !== false) && has(it.brand, q.brand) && has(it.vendor, q.vendor)
    && (!q.search.trim() || [it.title, it.name, it.code].some((x) => has(x, q.search)))), [items, inStock, q])
  const byCode = (c: string) => items.find((i) => i.code === c)!
  const qtyOf = (code: string) => picks.find((p) => p.code === code)?.qty
  const replace = target?.replace
  const choose = (it: CatalogItem) => (replace ? onReplace(kind, target!.project, replace, it) : setPicks((c) => togglePick(c, it.code)))
  const ok = () => target && onAdd(kind, target.project, picks.map(({ code, qty }) => ({ item: byCode(code), qty })))
  const cols = `64px minmax(220px,1.4fr) minmax(140px,1fr)${show.cost ? ' 130px' : ''}${showSale ? ' 130px' : ''} 112px`
  const chips = [
    ...(inStock ? [{ key: 'stock', label: 'In stock', onRemove: () => setInStock(false) }] : []),
    ...(q.brand.trim() ? [{ key: 'brand', label: `Brand: ${q.brand.trim()}`, onRemove: () => setQ({ ...q, brand: '' }) }] : []),
    ...(q.vendor.trim() ? [{ key: 'vendor', label: `Vendor: ${q.vendor.trim()}`, onRemove: () => setQ({ ...q, vendor: '' }) }] : []),
    ...(q.search.trim() ? [{ key: 'q', label: `“${q.search.trim()}”`, onRemove: () => setQ({ ...q, search: '' }) }] : []),
  ]
  const thumb = (it: CatalogItem) => <span className="pc-img cp-thumb" aria-hidden="true">{it.image ? <img src={it.image} alt="" /> : <Package size={18} strokeWidth={1.5} />}</span>

  return createPortal(
    <AnimatePresence>
      {target && (
        <motion.div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-label={replace ? `Replace ${replace.name}` : `Add ${noun} to ${target.project}`} className="dialog catalog lc pc cp" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={spring.calm}>
            <div className="dialog-head">
              <div>
                <div className="dialog-title">{replace ? <>Replace “{replace.name}”</> : <>Add {noun} to {target.project}</>}</div>
                {replace && <div className="dialog-sub">{target.project} · {kind} — pick the item to use instead</div>}
              </div>
              <button className="icon-plain" aria-label="Close" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="catalog-body">
              <div className="catalog-main">
                <div className="lc-toolbar pc-toolbar">
                  <div className="lc-search"><Search size={16} /><input className="input" placeholder={`Search ${noun}`} aria-label={`Search ${noun}`} value={q.search} onChange={(e) => setQ({ ...q, search: e.target.value })} /></div>
                  <input className="input pc-text" placeholder="Brand" aria-label="Brand" value={q.brand} onChange={(e) => setQ({ ...q, brand: e.target.value })} />
                  <input className="input pc-text" placeholder="Vendor" aria-label="Vendor" value={q.vendor} onChange={(e) => setQ({ ...q, vendor: e.target.value })} />
                  <label className="catalog-check"><input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />In stock</label>
                </div>
                <Chips chips={chips} onClearAll={() => { setInStock(false); setQ({ brand: '', vendor: '', search: '' }) }} />
                {shown.length ? (
                  <div className="lc-table" role="table" aria-label={`${kind} catalog`} style={{ ['--lc-cols' as string]: cols }}>
                    <div className="lc-row head" role="row">
                      <span role="columnheader"><span className="sr-only">Image</span></span><span role="columnheader">{kind === 'Countertops' ? 'Countertop' : 'Material'}</span><span role="columnheader">Details</span>
                      {show.cost && <span role="columnheader" className="num">Cost</span>}
                      {showSale && <span role="columnheader" className="num">Sale price</span>}
                      <span role="columnheader" className="act"><span className="sr-only">Add</span></span>
                    </div>
                    {shown.map((it) => {
                      const picked = qtyOf(it.code)
                      return (
                        <div key={it.code} className={`lc-row pc-row cp-row${picked ? ' is-picked' : ''}`} role="row" aria-selected={!!picked} tabIndex={0} title={replace ? `Use ${it.name}` : picked ? 'Click to remove' : 'Click to add'}
                          onClick={() => choose(it)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), choose(it))}>
                          <span role="cell" className="pc-img">{it.image ? <img src={it.image} alt="" loading="lazy" /> : <Package size={20} strokeWidth={1.5} />}</span>
                          <span role="cell" className="lc-name"><b>{it.name}</b>{!it.code.startsWith('mock-') && <em className="cp-code">{it.code}</em>}</span>
                          <span role="cell" className="pc-desc">{it.vendor || it.brand || it.finish ? <>{it.brand && <span>Brand: {it.brand}</span>}{it.vendor && <span>Vendor: {it.vendor}</span>}{it.finish && it.finish !== 'nos' && <span>Finish: {it.finish}</span>}</> : <span>—</span>}</span>
                          {show.cost && <span role="cell" className="num cp-cost">{perUnit(it.cost, it)}</span>}
                          {showSale && <span role="cell" className="num cp-price">{perUnit(it.price, it)}</span>}
                          <span role="cell" className="act">
                            {replace ? <button type="button" className="cp-add" aria-label={`Replace with ${it.name}`} title="Replace with this" onClick={(e) => { e.stopPropagation(); choose(it) }}><RefreshCw size={16} /></button>
                              : <RowPick picked={picked} name={it.name} onAdd={() => setPicks((c) => addPick(c, it.code))} onQty={(n) => setPicks((c) => setPickQty(c, it.code, n))} />}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon"><PackageSearch size={24} strokeWidth={1.6} /></span>
                    <b>No {noun} found</b>
                    <span>Try another brand, vendor or name.</span>
                  </div>
                )}
              </div>
              {!replace && <PickedPanel noun={noun} picks={picks} byCode={byCode} setQty={(code, n) => setPicks((c) => setPickQty(c, code, n))} onClear={() => setPicks([])} onAdd={ok} thumb={thumb} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
