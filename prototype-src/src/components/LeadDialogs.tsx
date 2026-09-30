/** "Pick Assignees" and the SMS/Email conversation modal (neutral take on the purple staging chat). */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp, LayoutTemplate, MessageSquare, RefreshCw, Send, Store, Tag, CalendarDays, X } from 'lucide-react'
import { Btn, Dialog } from './Overlay'
import { Field } from './Form'
import { spring } from '../lib/springs'

const initials = (name: string) => name.split(' ').map((w) => (/\d/.test(w) ? w : w[0])).join('').slice(0, 2).toUpperCase()

/** Listbox with avatar, clear button and chevron — the "Designer" control from the staging Pick Assignees dialog. */
function PersonSelect({ value, options, onChange, placeholder, label }: { value: string | null; options: string[]; onChange: (v: string | null) => void; placeholder: string; label: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', down); return () => document.removeEventListener('mousedown', down)
  }, [open])
  return (
    <div className="person-select" ref={ref}>
      <button type="button" className={`input person-trigger${open ? ' is-open' : ''}`} aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}>
        {value ? <span className="avatar-sm">{initials(value)}</span> : null}
        <span className={value ? 'person-name' : 'person-placeholder'}>{value ?? placeholder}</span>
        {value && <span role="button" tabIndex={0} className="person-clear" aria-label="Clear" onClick={(e) => { e.stopPropagation(); onChange(null) }}><X size={16} /></span>}
        <ChevronDown size={16} className="person-chev" />
      </button>
      {open && (
        <div className="menu person-list" role="listbox">
          {options.map((o) => (
            <button key={o} type="button" role="option" aria-selected={o === value} className="menu-item" onClick={() => { onChange(o); setOpen(false) }}>
              <span className="avatar-sm">{initials(o)}</span><span className="menu-label">{o}</span>{o === value && <span className="menu-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export type Assignees = { designer: string | null; pm: string | null }
export function AssignDialog({ open, value, designers, managers, onClose, onSave }: { open: boolean; value: Assignees; designers: string[]; managers: string[]; onClose: () => void; onSave: (v: Assignees) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => { if (open) setDraft(value) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = draft.designer !== value.designer || draft.pm !== value.pm
  return (
    <Dialog open={open} title="Pick Assignees" onClose={onClose} width={520} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" disabled={!dirty} onClick={() => onSave(draft)}>Save</Btn></>}>
      <Field label="Designer"><PersonSelect label="Designer" value={draft.designer} options={designers} placeholder="Not selected" onChange={(d) => setDraft((x) => ({ ...x, designer: d }))} /></Field>
      <Field label="Project Manager"><PersonSelect label="Project Manager" value={draft.pm} options={managers} placeholder="Not selected" onChange={(d) => setDraft((x) => ({ ...x, pm: d }))} /></Field>
    </Dialog>
  )
}

export type Msg = { out: boolean; ch: 'SMS' | 'Email'; text: string; when: string }
export function MessagesDialog({ open, name, phone, email, store, status, created, messages, onSend, onClose }: {
  open: boolean; name: string; phone: string; email: string; store: string; status: string; created: string; messages: Msg[]; onSend: (m: Msg) => void; onClose: () => void
}) {
  const [ch, setCh] = useState<'SMS' | 'Email'>('SMS')
  const [text, setText] = useState('')
  const [expanded, setExpanded] = useState(false)
  const thread = useRef<HTMLDivElement>(null)
  const max = ch === 'SMS' ? 1600 : 10000
  useEffect(() => { thread.current?.scrollTo({ top: 1e6 }) }, [messages, open, ch])
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key)
  }, [open, onClose])
  const send = () => { const t = text.trim(); if (!t) return; onSend({ out: true, ch, text: t, when: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }); setText('') }
  const list = messages.filter((m) => m.ch === ch)
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-label={`Messages with ${name}`} className="dialog chat" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={spring.calm}>
            <div className="chat-head">
              <div className="chat-id">
                <span className="chat-avatar"><MessageSquare size={18} /></span>
                <div><div className="dialog-title">{name}</div><div className="dialog-sub">{ch === 'SMS' ? phone : email}</div></div>
                <div className="chat-tools">
                  <button className="icon-plain" aria-label="Refresh" onClick={() => undefined}><RefreshCw size={16} /></button>
                  <button className="icon-plain" aria-label="Close" onClick={onClose}><X size={18} /></button>
                </div>
              </div>
              <div className="chat-meta">
                <span><Store size={14} />{store}</span><span><Tag size={14} />{status}</span><span><CalendarDays size={14} /><em>Lead created:</em> {created}</span>
              </div>
              <div className="seg" role="tablist">
                {(['SMS', 'Email'] as const).map((c) => <button key={c} role="tab" aria-selected={ch === c} className={ch === c ? 'on' : ''} onClick={() => setCh(c)}>{c}</button>)}
              </div>
            </div>
            <div className="chat-thread" ref={thread}>
              {list.length ? list.map((m, i) => (
                <div key={i} className={`bubble${m.out ? ' out' : ''}`}>{m.text}<span className="when">{m.out ? 'You' : name} · {m.ch} · {m.when}</span></div>
              )) : <div className="chat-empty"><MessageSquare size={32} strokeWidth={1.5} /><span>No messages yet</span></div>}
            </div>
            <div className="chat-compose">
              <div className="chat-compose-top">
                <button className="link-btn" onClick={() => setExpanded((v) => !v)}>{expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}{expanded ? 'Collapse' : 'Expand'}</button>
                <span>{text.length} / {max}</span>
              </div>
              <div className="chat-compose-row">
                <button className="icon-box" aria-label="Templates"><LayoutTemplate size={18} /></button>
                <textarea className="input textarea" rows={expanded ? 6 : 2} maxLength={max} value={text} placeholder="Type a message… (Enter to send)" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
                <button className="icon-box send" aria-label="Send" disabled={!text.trim()} onClick={send}><Send size={18} /></button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
