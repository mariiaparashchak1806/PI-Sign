import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export const Field = ({ label, required, optional, hint, children }: { label: string; required?: boolean; optional?: boolean; hint?: string; children: ReactNode }) => (
  <label className="field">
    <span className="field-label">{label}{required && <span className="req">*</span>}{optional && <span className="opt">Optional</span>}</span>
    {children}
    {hint && <span className="field-hint">{hint}</span>}
  </label>
)
export const TextInput = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className="input" />
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className="input select" />
export const TextArea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className="input textarea" rows={3} />

// "– n +" quantity stepper (estimate lines, catalog rows and the catalog cart)
export const Stepper = ({ value, onChange, min = 1, label, unit }: { value: number; onChange: (n: number) => void; min?: number; label: string; unit?: string }) => (
  <span className="stepper" role="group" aria-label={label}>
    <button type="button" aria-label={`Decrease ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
    <input inputMode="numeric" aria-label={label} value={value} onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, '')); onChange(Math.max(min, n || min)) }} onFocus={(e) => e.target.select()} />
    {unit && <em>{unit}</em>}
    <button type="button" aria-label={`Increase ${label.toLowerCase()}`} onClick={() => onChange(value + 1)}>+</button>
  </span>
)

// labelled on/off switch (Show cost / Show sale — the same control as Project Details in the mock)
export const Switch = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button type="button" role="switch" aria-checked={on} className={`tswitch${on ? ' on' : ''}`} onClick={() => onChange(!on)}>
    <span className="tswitch-track"><span className="tswitch-knob" /></span>{label}
  </button>
)
