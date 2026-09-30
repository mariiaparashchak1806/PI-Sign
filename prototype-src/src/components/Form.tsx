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
