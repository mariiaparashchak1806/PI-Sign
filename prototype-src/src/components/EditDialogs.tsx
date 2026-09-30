/** "Info" (edit lead) and "Edit contact" modals — layout from the PiSuite staging dialogs the designer shared:
 *  stacked label + control, 8 px radius, Close (secondary) + Save (disabled until something changes). */
import { useEffect, useState } from 'react'
import { Btn, Dialog } from './Overlay'
import { Field, Select, TextInput } from './Form'
import { leadOptions } from '../lib/mockData'

export type LeadInfo = { store: string; source: string; start: string; houseType: string; houseAge: string }
export type Contact = { first: string; last: string; phone: string; email: string; address: string }

function useDraft<T>(open: boolean, value: T) {
  const [draft, setDraft] = useState(value)
  useEffect(() => { if (open) setDraft(value) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(draft) !== JSON.stringify(value)
  const set = <K extends keyof T>(k: K) => (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [k]: e.target.value }))
  return { draft, dirty, set }
}

export function LeadInfoDialog({ open, value, onClose, onSave }: { open: boolean; value: LeadInfo; onClose: () => void; onSave: (v: LeadInfo) => void }) {
  const { draft, dirty, set } = useDraft(open, value)
  const opts = (list: string[]) => list.map((o) => <option key={o}>{o}</option>)
  return (
    <Dialog open={open} title="Info" onClose={onClose} width={520} footer={<><Btn onClick={onClose}>Close</Btn><Btn kind="primary" disabled={!dirty} onClick={() => onSave(draft)}>Save</Btn></>}>
      <Field label="Lead store"><Select value={draft.store} onChange={set('store')}>{opts(leadOptions.stores)}</Select></Field>
      <Field label="How did you hear about us?"><Select value={draft.source} onChange={set('source')}>{opts(leadOptions.sources)}</Select></Field>
      <Field label="How soon do you think to start project?"><Select value={draft.start} onChange={set('start')}>{opts(leadOptions.starts)}</Select></Field>
      <div className="field-row">
        <Field label="What is the type of house?"><Select value={draft.houseType} onChange={set('houseType')}>{opts(leadOptions.houseTypes)}</Select></Field>
        <Field label="What is the age of house?"><Select value={draft.houseAge} onChange={set('houseAge')}>{opts(leadOptions.houseAges)}</Select></Field>
      </div>
    </Dialog>
  )
}

export function ContactDialog({ open, value, onClose, onSave }: { open: boolean; value: Contact; onClose: () => void; onSave: (v: Contact) => void }) {
  const { draft, dirty, set } = useDraft(open, value)
  const valid = draft.first.trim() && draft.phone.trim()
  return (
    <Dialog open={open} title="Edit contact" onClose={onClose} width={520} footer={<><Btn onClick={onClose}>Close</Btn><Btn kind="primary" disabled={!dirty || !valid} onClick={() => onSave(draft)}>Save</Btn></>}>
      <div className="field-row">
        <Field label="First name"><TextInput value={draft.first} onChange={set('first')} /></Field>
        <Field label="Last name"><TextInput value={draft.last} onChange={set('last')} /></Field>
      </div>
      <Field label="Phone"><TextInput type="tel" value={draft.phone} onChange={set('phone')} /></Field>
      <Field label="Email"><TextInput type="email" value={draft.email} onChange={set('email')} /></Field>
      <Field label="Address"><TextInput value={draft.address} onChange={set('address')} /></Field>
    </Dialog>
  )
}
