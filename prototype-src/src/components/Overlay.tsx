/** Anchored menu, modal dialog and toast — styled after the PiSuite action specs in Figma
 *  ("Project Details — Actions", "Agenda — Task actions"). */
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { spring } from '../lib/springs'

export type MenuItem =
  | '-'
  | { title: string }
  | { label: string; icon?: ReactNode; meta?: string; danger?: boolean; checked?: boolean; dot?: string; onSelect: () => void; checkbox?: boolean; keepOpen?: boolean; link?: boolean }

export type MenuState = { key: string; anchorId: string; items: MenuItem[]; width?: number; align?: 'left' | 'right' } | null

function anchorRect(id: string) {
  const el = document.querySelector(`[data-id="${CSS.escape(id)}"]`)
  const r = el?.getBoundingClientRect()
  return r ? { left: r.left + window.scrollX, right: r.right + window.scrollX, top: r.top + window.scrollY, bottom: r.bottom + window.scrollY } : null
}

export function Menu({ state, onClose }: { state: MenuState; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!state) return
    const down = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (ref.current?.contains(t) || t.closest(`[data-id="${CSS.escape(state.anchorId)}"]`)) return
      onClose()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key) }
  }, [state, onClose])
  const r = state ? anchorRect(state.anchorId) : null
  const w = state?.width ?? 240
  return createPortal(
    <AnimatePresence>
      {state && r && (
        <motion.div
          key={state.key}
          ref={ref}
          role="menu"
          className="menu"
          style={{ top: r.bottom + 6, left: state.align === 'left' ? r.left : r.right - w, width: w }}
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.1 } }}
          transition={spring.snappy}
        >
          {state.items.map((it, i) =>
            it === '-' ? <div key={i} className="menu-divider" /> :
            'title' in it ? <div key={i} className="menu-title">{it.title}</div> :
            <button key={i} role={it.checkbox ? 'menuitemcheckbox' : 'menuitem'} aria-checked={it.checkbox ? !!it.checked : undefined}
              className={`menu-item${it.danger ? ' danger' : ''}${it.link ? ' link' : ''}`} onClick={() => { if (!it.keepOpen) onClose(); it.onSelect() }}>
              {it.checkbox ? <span className={`menu-checkbox${it.checked ? ' on' : ''}`}>{it.checked && '✓'}</span> : it.dot ? <span className="menu-dot" style={{ background: it.dot }} /> : it.icon}
              <span className="menu-label">{it.label}</span>
              {it.meta && <span className="menu-meta">{it.meta}</span>}
              {it.checked && !it.checkbox && <span className="menu-check">✓</span>}
            </button>,
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Dialog({ open, title, subtitle, children, footer, onClose, width = 480 }: {
  open: boolean; title: ReactNode; subtitle?: ReactNode; children?: ReactNode; footer: ReactNode; onClose: () => void; width?: number
}) {
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [open, onClose])
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" className="dialog" style={{ width }} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={spring.calm}>
            <div className="dialog-head">
              <div><div className="dialog-title">{title}</div>{subtitle && <div className="dialog-sub">{subtitle}</div>}</div>
              <button className="icon-plain" aria-label="Close" onClick={onClose}><X size={18} /></button>
            </div>
            {children && <div className="dialog-body">{children}</div>}
            <div className="dialog-foot">{footer}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export type ToastState = { id: number; text: string; undo?: () => void } | null

export function Toast({ toast, onDone }: { toast: ToastState; onDone: () => void }) {
  useEffect(() => { if (!toast) return; const t = setTimeout(onDone, 3200); return () => clearTimeout(t) }, [toast, onDone])
  return createPortal(
    <AnimatePresence>
      {toast && (
        <motion.div key={toast.id} className="toast" role="status" initial={{ opacity: 0, y: 16, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 16, x: '-50%' }} transition={spring.snappy}>
          <span className="toast-check">✓</span>
          <span>{toast.text}</span>
          {toast.undo && <button className="toast-undo" onClick={() => { toast.undo!(); onDone() }}>Undo</button>}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export const Btn = ({ kind = 'secondary', children, ...p }: { kind?: 'secondary' | 'primary' | 'danger' } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={`btn btn-${kind}`}>{children}</button>
)
