/** Labors "Add from catalog" — staging picker reworked after the designer's review (Oct 2):
 *  title says where the labors go ("Add labors to Kitchen") · Cost / Sale columns follow the table it was opened
 *  from (no own toggle) · prices are read-only text with the unit ($5.40 / pcs) · a row click or "+" picks an item,
 *  the picked row is highlighted and gets − n + · categories in sentence case with counts, Sub Category depends on
 *  the category, active filters as removable chips, search runs across all categories · no "#" column, internal codes
 *  only on hover · the right panel is the selection: "No labors selected yet" → list with qty and totals →
 *  "Clear" / "Add 3 labors · $4,320". */
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { PackageSearch, RefreshCw, Search, X } from 'lucide-react'
import { spring } from '../lib/springs'
import { CATALOG, type CatalogItem, type CatalogKind, type Line } from '../lib/estimate'
import type { CatalogTarget } from './CatalogDialog'
import { Chips, PickedPanel, RowPick, addPick, perUnit, setPickQty, togglePick, type Pick } from './CatalogParts'

export function LaborsCatalog({ target, onClose, onAdd, onReplace }: {
  target: CatalogTarget
  onClose: () => void
  onAdd: (kind: CatalogKind, project: string, picks: { item: CatalogItem; qty: number }[]) => void
  onReplace: (kind: CatalogKind, project: string, line: Line, item: CatalogItem) => void
}) {
  const { categories, items } = CATALOG.Labors
  const [cat, setCat] = useState('All')
  const [search, setSearch] = useState('')
  const [picks, setPicks] = useState<Pick[]>([])
  useEffect(() => { if (target) { setCat('All'); setSearch(''); setPicks([]) } }, [target])
  useEffect(() => {
    if (!target) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key)
  }, [target, onClose])

  const show = { cost: target?.show?.cost ?? false, sale: target?.show?.sale ?? true }
  const showSale = show.sale || !show.cost // one price column at least
  const counts = useMemo(() => Object.fromEntries(categories.map((c) => [c, items.filter((i) => i.category === c).length])), [categories, items])
  const q = search.trim().toLowerCase()
  // search runs across all categories; otherwise the chosen category filters the list
  const shown = useMemo(() => items.filter((it) => (q ? it.name.toLowerCase().includes(q) || it.code.includes(q) : cat === 'All' || it.category === cat)), [items, cat, q])
  const byCode = (c: string) => items.find((i) => i.code === c)!
  const qtyOf = (code: string) => picks.find((p) => p.code === code)?.qty
  const replace = target?.replace
  const choose = (it: CatalogItem) => (replace ? onReplace('Labors', target!.project, replace, it) : setPicks((c) => togglePick(c, it.code)))
  const ok = () => target && onAdd('Labors', target.project, picks.map(({ code, qty }) => ({ item: byCode(code), qty })))
  const cols = `minmax(240px,1fr)${show.cost ? ' 130px' : ''}${showSale ? ' 130px' : ''} 112px`
  const chips = [
    ...(cat !== 'All' && !q ? [{ key: 'cat', label: cat, onRemove: () => setCat('All') }] : []),
    ...(q ? [{ key: 'q', label: `“${search.trim()}” in all categories`, onRemove: () => setSearch('') }] : []),
  ]

  return createPortal(
    <AnimatePresence>
      {target && (
        <motion.div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-label={replace ? `Replace ${replace.name}` : `Add labors to ${target.project}`} className="dialog catalog lc cp" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={spring.calm}>
            <div className="dialog-head">
              <div>
                <div className="dialog-title">{replace ? <>Replace “{replace.name}”</> : <>Add labors to {target.project}</>}</div>
                {replace && <div className="dialog-sub">{target.project} · Labors — pick the labor to use instead</div>}
              </div>
              <button className="icon-plain" aria-label="Close" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="catalog-body">
              <nav className="lc-nav cp-nav" aria-label="Categories">
                {['All', ...categories].map((c) => {
                  const n = c === 'All' ? items.length : counts[c]
                  const on = !q && cat === c
                  return (
                    <button key={c} className={`lc-nav-item${on ? ' on' : ''}`} aria-current={on ? 'true' : undefined} onClick={() => { setCat(c); setSearch('') }}>
                      <span>{c === 'All' ? 'All labors' : c}</span>{n > 0 && <span className="cp-count">{n}</span>}
                    </button>
                  )
                })}
              </nav>
              <div className="catalog-main">
                <div className="lc-toolbar">
                  <div className="lc-search"><Search size={16} /><input className="input" placeholder="Search all labors" aria-label="Search all labors" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                  <select className="input select lc-select" aria-label="Sub Category" disabled={cat === 'All' || !!q} title={cat === 'All' || q ? 'Choose a category first' : undefined} defaultValue="">
                    <option value="">{cat === 'All' || q ? 'Sub Category' : 'All sub categories'}</option>
                  </select>
                  <select className="input select lc-select" aria-label="Tags" defaultValue=""><option value="">All tags</option></select>
                </div>
                <Chips chips={chips} onClearAll={() => { setCat('All'); setSearch('') }} />
                {shown.length ? (
                  <div className="lc-table" role="table" aria-label="Labors catalog" style={{ ['--lc-cols' as string]: cols }}>
                    <div className="lc-row head" role="row">
                      <span role="columnheader">Labor</span>
                      {show.cost && <span role="columnheader" className="num">Cost</span>}
                      {showSale && <span role="columnheader" className="num">Sale price</span>}
                      <span role="columnheader" className="act"><span className="sr-only">Add</span></span>
                    </div>
                    {shown.map((it) => {
                      const picked = qtyOf(it.code)
                      return (
                        <div key={it.code} className={`lc-row cp-row${picked ? ' is-picked' : ''}`} role="row" aria-selected={!!picked} tabIndex={0} title={replace ? `Use ${it.name}` : picked ? 'Click to remove' : 'Click to add'}
                          onClick={() => choose(it)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), choose(it))}>
                          <span role="cell" className="lc-name"><b>{it.name}</b>{!it.code.startsWith('mock-') && <em className="cp-code">{it.code}</em>}{q && it.category && <em className="cp-cat">{it.category}</em>}</span>
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
                    <b>No labors found</b>
                    <span>{q ? 'Try another name or code.' : 'This category isn’t loaded in the prototype.'}</span>
                  </div>
                )}
              </div>
              {!replace && <PickedPanel noun="labors" picks={picks} byCode={byCode} setQty={(code, n) => setPicks((c) => setPickQty(c, code, n))} onClear={() => setPicks([])} onAdd={ok} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
