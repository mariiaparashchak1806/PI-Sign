/** "Add from catalog" — layout of the PiSuite staging Materials / Labors / Countertops pickers:
 *  toolbar (price toggles, add, filter, In Stock, Brand, Vendor, search) · results · selected items with Reset / OK.
 *  The catalog isn't connected in the prototype, so results show an empty state (instead of staging's permission error). */
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { Banknote, Check, DollarSign, Filter, Package, PackageSearch, Plus, Search, X } from 'lucide-react'
import { spring } from '../lib/springs'

export type CatalogKind = 'Materials' | 'Labors' | 'Countertops'

export function CatalogDialog({ kind, onClose }: { kind: CatalogKind | null; onClose: () => void }) {
  const [cost, setCost] = useState(true)
  const [sale, setSale] = useState(true)
  const [inStock, setInStock] = useState(true)
  const [q, setQ] = useState({ brand: '', vendor: '', search: '' })
  useEffect(() => { if (kind) setQ({ brand: '', vendor: '', search: '' }) }, [kind])
  useEffect(() => {
    if (!kind) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key)
  }, [kind, onClose])
  const noun = kind?.toLowerCase() ?? ''
  const searching = !!(q.brand || q.vendor || q.search)
  return createPortal(
    <AnimatePresence>
      {kind && (
        <motion.div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-label={kind} className="dialog catalog" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={spring.calm}>
            <div className="dialog-head">
              <div className="dialog-title">{kind}</div>
              <button className="icon-plain" aria-label="Close" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="catalog-body">
              <div className="catalog-main">
                {kind !== 'Labors' && (
                  <div className="catalog-toolbar">
                    <div className="catalog-tools">
                      <button className={`tool-btn${cost ? ' on' : ''}`} aria-pressed={cost} title="Show cost" onClick={() => setCost((v) => !v)}><DollarSign size={16} /></button>
                      <button className={`tool-btn${sale ? ' on' : ''}`} aria-pressed={sale} title="Show sale price" onClick={() => setSale((v) => !v)}><Banknote size={16} /></button>
                      <button className="tool-btn" disabled title="Add custom item"><Plus size={16} /></button>
                    </div>
                    <button className="tool-btn outline" title="Filters" aria-label="Filters"><Filter size={16} /></button>
                    <label className="catalog-check"><input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />In Stock</label>
                    <input className="input" placeholder="Brand" aria-label="Brand" value={q.brand} onChange={(e) => setQ({ ...q, brand: e.target.value })} />
                    <input className="input" placeholder="Vendor" aria-label="Vendor" value={q.vendor} onChange={(e) => setQ({ ...q, vendor: e.target.value })} />
                    <div className="catalog-search">
                      <Search size={16} />
                      <input className="input" placeholder="Search from +200,000 materials…" aria-label="Search the catalog" value={q.search} onChange={(e) => setQ({ ...q, search: e.target.value })} />
                    </div>
                  </div>
                )}
                <div className="empty-state">
                  <span className="empty-icon"><PackageSearch size={24} strokeWidth={1.6} /></span>
                  <b>{searching ? `No ${noun} match your search` : `No ${noun} found`}</b>
                  <span>{searching ? 'Try another brand, vendor or name.' : `${kind} from your catalog will appear here.`}</span>
                </div>
              </div>
              <aside className="catalog-side" aria-label="Selected items">
                <div className="empty-state">
                  <span className="empty-icon"><Package size={24} strokeWidth={1.6} /></span>
                  <b>No item selected</b>
                  <span>Items you pick are listed here before you add them.</span>
                </div>
                <div className="catalog-foot">
                  <button className="btn btn-secondary" disabled>Reset</button>
                  <button className="btn btn-primary" disabled><Check size={16} />OK</button>
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
