/** "Add from catalog" — reworked PiSuite staging picker (Labors / Materials / Countertops):
 *  categories + search on the left, one table of items (name · code · price, cost × multiplier on demand),
 *  "Add" turns into a quantity stepper in place, and the selection on the right shows quantities, line
 *  totals and the subtotal before the single primary action "Add N items to <project>".
 *  Items are the first page of the staging Labors catalog + the mock's own lines (see lib/estimate). */
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { Check, Package, Plus, Search, X } from 'lucide-react'
import { spring } from '../lib/springs'
import { CATALOG, type CatalogItem, type CatalogKind, type Line } from '../lib/estimate'
import { Stepper, Switch } from './Form'

export type { CatalogKind }
export type CatalogTarget = { kind: CatalogKind; project: string; replace?: Line } | null

// catalog prices always carry cents so the column lines up: $3.00 · $5.40 · $7,200.00
const money2 = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const realCode = (c: string) => (c.startsWith('mock-') ? '' : c)

export function CatalogDialog({ target, projects, onClose, onAdd, onReplace }: {
  target: CatalogTarget
  projects: string[]
  onClose: () => void
  onAdd: (kind: CatalogKind, project: string, picks: { item: CatalogItem; qty: number }[]) => void
  onReplace: (kind: CatalogKind, project: string, line: Line, item: CatalogItem) => void
}) {
  const [project, setProject] = useState('')
  const [cat, setCat] = useState('All')
  const [search, setSearch] = useState('')
  const [showCost, setShowCost] = useState(false)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [cleared, setCleared] = useState<Record<string, number> | null>(null)
  useEffect(() => {
    if (!target) return
    setProject(target.project); setCat('All'); setSearch(''); setCart({}); setCleared(null)
  }, [target])
  useEffect(() => {
    if (!target) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key)
  }, [target, onClose])

  const kind = target?.kind ?? 'Labors'
  const { categories, items } = CATALOG[kind]
  const noun = kind.toLowerCase()
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((it) => (cat === 'All' || it.category === cat) && (!q || it.name.toLowerCase().includes(q) || it.code.includes(q)))
  }, [items, cat, search])
  const byCode = (c: string) => items.find((it) => it.code === c)!
  const picks = Object.entries(cart).map(([code, qty]) => ({ item: byCode(code), qty }))
  const count = picks.length
  const subtotal = picks.reduce((a, p) => a + p.qty * p.item.price, 0)
  const setQty = (code: string, qty: number) => setCart((c) => ({ ...c, [code]: qty }))
  const drop = (code: string) => setCart((c) => { const { [code]: _, ...rest } = c; return rest })
  const replacing = target?.replace

  return createPortal(
    <AnimatePresence>
      {target && (
        <motion.div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-label={replacing ? `Replace ${replacing.name}` : `Add ${noun}`} className={`dialog catalog${replacing ? ' replace' : ''}`} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={spring.calm}>
            <div className="dialog-head">
              {replacing
                ? <div className="dialog-title">Replace “{replacing.name}” <span className="cat-title-meta">in {target.project}</span></div>
                : <div className="dialog-title cat-title">Add {noun} to
                    <select className="input select cat-project" aria-label="Project" value={project} onChange={(e) => setProject(e.target.value)}>{projects.map((p) => <option key={p}>{p}</option>)}</select>
                  </div>}
              <button className="icon-plain" aria-label="Close" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="catalog-body">
              {categories.length > 0 && (
                <nav className="cat-nav" aria-label="Categories">
                  {['All', ...categories].map((c) => (
                    <button key={c} className={`cat-nav-item${cat === c ? ' on' : ''}`} aria-current={cat === c ? 'true' : undefined} onClick={() => setCat(c)}>
                      <span>{c}</span>{c === 'All' && <em>{items.length}</em>}
                    </button>
                  ))}
                </nav>
              )}
              <div className="catalog-main">
                <div className="catalog-toolbar">
                  <div className="catalog-search">
                    <Search size={16} />
                    <input className="input" placeholder={`Search ${noun} by name or code`} aria-label={`Search ${noun}`} value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <Switch on={showCost} onChange={setShowCost} label="Show cost" />
                </div>
                {shown.length ? (
                  <div className={`cat-table${showCost ? ' with-cost' : ''}`} role="table" aria-label={`${kind} catalog`}>
                    <div className="cat-row head" role="row">
                      <span role="columnheader">Item</span>
                      {showCost && <span role="columnheader" className="num">Cost</span>}
                      <span role="columnheader" className="num">Price</span>
                      <span role="columnheader" className="act" aria-label="Action" />
                    </div>
                    {shown.map((it) => {
                      const qty = cart[it.code]
                      return (
                        <div key={it.code} className={`cat-row${qty ? ' picked' : ''}`} role="row">
                          <span role="cell" className="cat-item"><b>{it.name}</b>{realCode(it.code) && <em>{it.code}</em>}</span>
                          {showCost && <span role="cell" className="num muted">{it.cost != null ? <>{money2(it.cost)}{it.multiplier && <> · ×{it.multiplier}</>}</> : '—'}</span>}
                          <span role="cell" className="num">{money2(it.price)}{it.unit && <em> / {it.unit}</em>}</span>
                          <span role="cell" className="act">
                            {replacing
                              ? <button className="btn btn-secondary btn-sm" onClick={() => onReplace(kind, target.project, replacing, it)}>Select</button>
                              : qty
                                ? <Stepper value={qty} min={0} label={`Quantity of ${it.name}`} onChange={(n) => (n ? setQty(it.code, n) : drop(it.code))} />
                                : <button className="btn btn-secondary btn-sm" onClick={() => { setQty(it.code, 1); setCleared(null) }}><Plus size={16} />Add</button>}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon"><Search size={22} strokeWidth={1.6} /></span>
                    {search ? <><b>No {noun} match “{search.trim()}”</b><span>Check the spelling or search by item code.</span></>
                      : <><b>No {noun} in {cat} yet</b><span>This category isn’t loaded in the prototype — open All to see the catalog.</span></>}
                  </div>
                )}
              </div>
              {!replacing && (
                <aside className="catalog-side" aria-label="Selected items">
                  <div className="cat-side-head">
                    <b>Selected{count ? ` · ${count}` : ''}</b>
                    {count > 0 && <button className="link-btn" onClick={() => { setCleared(cart); setCart({}) }}>Clear</button>}
                  </div>
                  {count ? (
                    <div className="cat-cart">
                      {picks.map(({ item, qty }) => (
                        <div key={item.code} className="cat-cart-row">
                          <div className="cat-cart-name"><span>{item.name}</span><button className="icon-plain" aria-label={`Remove ${item.name}`} onClick={() => drop(item.code)}><X size={16} /></button></div>
                          <div className="cat-cart-meta">
                            <Stepper value={qty} label={`Quantity of ${item.name}`} unit={item.unit} onChange={(n) => setQty(item.code, n)} />
                            <span className="num">{money2(qty * item.price)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <span className="empty-icon"><Package size={22} strokeWidth={1.6} /></span>
                      {cleared ? <><b>Selection cleared</b><button className="link-btn" onClick={() => { setCart(cleared); setCleared(null) }}>Undo</button></>
                        : <><b>Nothing selected yet</b><span>Add items from the list — you can set quantities here before adding them to {project}.</span></>}
                    </div>
                  )}
                  <div className="catalog-foot">
                    {count > 0 && <div className="cat-subtotal"><span>Subtotal</span><b>{money2(subtotal)}</b></div>}
                    <button className="btn btn-primary" disabled={!count} onClick={() => onAdd(kind, project, picks)}>
                      <Check size={16} />{count ? `Add ${count} item${count === 1 ? '' : 's'} to ${project}` : `Add to ${project}`}
                    </button>
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
