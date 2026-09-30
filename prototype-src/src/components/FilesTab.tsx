/** Files & Photos tab — structure from the PiSuite staging tab (project groups → fixed folders, list/grid view),
 *  drawn in the redesign's card style. Counts come from the mock ("Kitchen 6 files", "Bathroom · Before photos required",
 *  "Basement 2 files"; Activity: "uploaded 6 before photos to Kitchen"). */
import { useState } from 'react'
import { AlertTriangle, ChevronDown, Folder, LayoutGrid, List, Paperclip, Plus } from 'lucide-react'

export const FOLDERS = ['Before Photos', '3D Renderings', '2020 Files', 'Additional Material Photos'] as const
export const REQUIRED = 'Before Photos'
export type FileCounts = Record<string, Record<string, number>>
export const FILES0: FileCounts = {
  Kitchen: { 'Before Photos': 6 },
  Bathroom: {},
  Basement: { 'Before Photos': 2 },
}

const plural = (n: number) => `${n} file${n === 1 ? '' : 's'}`

export function FilesTab({ projects, counts, onAdd }: { projects: string[]; counts: FileCounts; onAdd: (project: string, folder: string) => void }) {
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [closed, setClosed] = useState<string[]>([])
  return (
    <section className="files-card" aria-label="Files & Photos">
      <header className="files-head">
        <h2>Files &amp; Photos</h2>
        <div className="seg seg-icons" role="radiogroup" aria-label="View">
          <button role="radio" aria-checked={view === 'list'} aria-label="List view" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><List size={16} /></button>
          <button role="radio" aria-checked={view === 'grid'} aria-label="Grid view" className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')}><LayoutGrid size={16} /></button>
        </div>
      </header>
      {projects.map((p) => {
        const c = counts[p] ?? {}
        const total = FOLDERS.reduce((s, f) => s + (c[f] ?? 0), 0)
        const open = !closed.includes(p)
        return (
          <div key={p} className="files-group">
            <button className="files-group-head" aria-expanded={open} onClick={() => setClosed((x) => (open ? [...x, p] : x.filter((y) => y !== p)))}>
              <ChevronDown size={16} className="files-chev" style={{ transform: open ? 'none' : 'rotate(-90deg)' }} />
              <span className="files-group-name">{p}</span>
              <span className="files-group-count">{plural(total)}</span>
              {!c[REQUIRED] && <span className="files-required-pill"><AlertTriangle size={14} />Before photos required</span>}
            </button>
            {open && (
              <div className={view === 'grid' ? 'files-grid' : 'files-list'}>
                {FOLDERS.map((f) => {
                  const n = c[f] ?? 0
                  const missing = f === REQUIRED && n === 0
                  return (
                    <div key={f} className={`files-folder${missing ? ' is-missing' : ''}`}>
                      {view === 'grid' && <Folder size={20} strokeWidth={1.6} className="files-folder-icon" />}
                      <span className="files-folder-name">
                        {f}{f === REQUIRED && <span className="files-req" aria-label="required">*</span>}
                        {missing && <AlertTriangle size={14} className="files-warn" aria-label="No before photos yet" />}
                      </span>
                      <span className="files-folder-actions">
                        <span className={`files-count${n ? ' has' : ''}`} title={plural(n)}><Paperclip size={14} />{n}</span>
                        <button className="icon-box" aria-label={`Add files to ${p} · ${f}`} title="Add files" onClick={() => onAdd(p, f)}><Plus size={16} /></button>
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
