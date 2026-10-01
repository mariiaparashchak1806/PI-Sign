/** Files & Photos tab — staging structure (project groups → fixed folders, list/grid), reworked after the UX review:
 *  thumbnails instead of a bare counter, labelled "Add photos" + drag & drop, explicit "Required" folder, and a viewer
 *  with context, readable names (technical file names fall back to "Before photo 3"), rename, move, separated delete + Undo,
 *  prev/next + keyboard. Seed data = the mock ("Kitchen 6 files", "Bathroom · Before photos required", "Basement 2 files";
 *  Activity: "Anna Kovalenko uploaded 6 before photos to Kitchen remodel · Sep 29, 2:40 PM"). Real uploads show the real image. */
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Download, FileText, FolderInput, Image as ImageIcon, Pencil, Trash2, Upload, X } from 'lucide-react'
import { spring } from '../lib/springs'

export const FOLDERS = ['Before Photos', '3D Renderings', '2020 Files', 'Additional Material Photos'] as const
export type Folder = (typeof FOLDERS)[number]
export const REQUIRED: Folder = 'Before Photos'
const SINGULAR: Record<Folder, string> = { 'Before Photos': 'Before photo', '3D Renderings': '3D rendering', '2020 Files': '2020 file', 'Additional Material Photos': 'Material photo' }
const IMAGES_ONLY: Folder[] = ['Before Photos', '3D Renderings', 'Additional Material Photos']

export type FileItem = { id: string; original: string; label?: string; by: string; at: string; src?: string; size?: number; tone?: number }
export type FilesState = Record<string, Partial<Record<Folder, FileItem[]>>>

// tones of the photo placeholders drawn in the mock's Activity thumbnails
const TONES = ['rgba(227,224,216,1)', 'rgba(217,212,200,1)', 'rgba(232,228,220,1)', 'rgba(221,216,205,1)']
const seed = (project: string, n: number, by: string, at: string, names: string[]): FileItem[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${project}-${i}`, original: names[i % names.length], by, at, tone: i % TONES.length }))
export const FILES0: FilesState = {
  Kitchen: { 'Before Photos': seed('kitchen', 6, 'Anna Kovalenko', 'Sep 29, 2026, 2:40 PM', ['IMG_4821.jpg', 'IMG_4822.jpg', 'c861c1d7-8834-47ba-9e47-437f7b381c3f.png', 'kitchen-left-wall.jpg', 'IMG_4825.jpg', 'IMG_4826.jpg']) },
  Bathroom: {},
  Basement: { 'Before Photos': seed('basement', 2, 'Test Designer', 'Sep 29, 2026', ['IMG_5102.jpg', 'basement-stairs.jpg']) },
}
export const countIn = (s: FilesState, project: string) => Object.values(s[project] ?? {}).reduce((a, l) => a + (l?.length ?? 0), 0)
export const hasRequired = (s: FilesState, project: string) => (s[project]?.[REQUIRED]?.length ?? 0) > 0
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
const noun = (f: Folder) => (f === '2020 Files' ? 'file' : 'photo')

// camera/phone/messenger/UUID names say nothing to people → show a generated label, keep the original in the details
const TECHNICAL = /^(img|dsc|dcim|pxl|mvimg|photo|image|screenshot|whatsapp image|signal|telegram)[\s_-]?[\d-]|^[0-9a-f]{8}-[0-9a-f]{4}-|^[0-9a-f]{16,}|^\d{6,}/i
const stripExt = (n: string) => n.replace(/\.[a-z0-9]{2,5}$/i, '')
export const displayName = (it: FileItem, folder: Folder, index: number) =>
  it.label ?? (TECHNICAL.test(it.original) ? `${SINGULAR[folder]} ${index + 1}` : stripExt(it.original).replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase()))
const fmtSize = (b?: number) => (b == null ? '' : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`)
const now = () => new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

function Thumb({ it, size = 44, onClick, label }: { it: FileItem; size?: number; onClick?: () => void; label: string }) {
  const body = it.src ? <img src={it.src} alt="" /> : <ImageIcon size={size > 60 ? 22 : 16} strokeWidth={1.5} />
  return (
    <button type="button" className="ph-thumb" style={{ width: size, height: size, background: it.src ? undefined : TONES[it.tone ?? 0] }} onClick={onClick} aria-label={`Open ${label}`} title={label}>
      {body}
    </button>
  )
}

type Viewer = { project: string; folder: Folder; index: number } | null

export function FilesTab({ projects, files, setFiles, say }: {
  projects: string[]; files: FilesState; setFiles: (f: (s: FilesState) => FilesState) => void; say: (t: string, undo?: () => void) => void
}) {
  const view = 'list' as 'list' | 'grid' // list/grid toggle removed (designer, Oct 1) — list only
  const [closed, setClosed] = useState<string[]>([])
  const [viewer, setViewer] = useState<Viewer>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const target = useRef<{ project: string; folder: Folder } | null>(null)

  const add = (project: string, folder: Folder, list: File[]) => {
    const ok = IMAGES_ONLY.includes(folder) ? list.filter((f) => f.type.startsWith('image/')) : list
    const skipped = list.length - ok.length
    if (ok.length) {
      const items: FileItem[] = ok.map((f, i) => ({ id: `u${Date.now()}-${i}`, original: f.name, by: 'You', at: now(), size: f.size, src: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined }))
      setFiles((s) => ({ ...s, [project]: { ...s[project], [folder]: [...(s[project]?.[folder] ?? []), ...items] } }))
      const ids = new Set(items.map((x) => x.id))
      say(`${plural(ok.length, noun(folder))} added to ${project} · ${folder}${skipped ? ` · ${skipped} skipped (images only)` : ''}`,
        () => setFiles((s) => ({ ...s, [project]: { ...s[project], [folder]: (s[project]?.[folder] ?? []).filter((x) => !ids.has(x.id)) } })))
    } else if (skipped) say(`${folder} accepts images only — nothing was added`)
  }
  const pick = (project: string, folder: Folder) => { target.current = { project, folder }; if (input.current) { input.current.accept = IMAGES_ONLY.includes(folder) ? 'image/*' : ''; input.current.value = ''; input.current.click() } }
  const drop = (project: string, folder: Folder) => (e: DragEvent) => { e.preventDefault(); setDragOver(null); add(project, folder, [...e.dataTransfer.files]) }
  const dragProps = (project: string, folder: Folder) => {
    const key = `${project}/${folder}`
    return { onDragOver: (e: DragEvent) => { e.preventDefault(); setDragOver(key) }, onDragLeave: () => setDragOver((k) => (k === key ? null : k)), onDrop: drop(project, folder), 'data-drop': dragOver === key ? 'on' : undefined }
  }

  return (
    <section className="files-card" aria-label="Files & Photos">
      <input ref={input} type="file" multiple hidden onChange={(e) => target.current && add(target.current.project, target.current.folder, [...(e.target.files ?? [])])} />
      <header className="files-head">
        <h2>Files &amp; Photos</h2>
      </header>
      {projects.map((p) => {
        const total = countIn(files, p)
        const open = !closed.includes(p)
        return (
          <div key={p} className="files-group">
            <button className="files-group-head" aria-expanded={open} onClick={() => setClosed((x) => (open ? [...x, p] : x.filter((y) => y !== p)))}>
              <ChevronDown size={16} className="files-chev" style={{ transform: open ? 'none' : 'rotate(-90deg)' }} />
              <span className="files-group-name">{p}</span>
              <span className="files-group-count">{total ? plural(total, 'file') : 'No files yet'}</span>
              {!hasRequired(files, p) && <span className="files-required-pill"><AlertTriangle size={14} />Before photos required</span>}
            </button>
            {open && (
              <div className={view === 'grid' ? 'files-grid' : 'files-list'}>
                {FOLDERS.map((f) => {
                  const list = files[p]?.[f] ?? []
                  const missing = f === REQUIRED && list.length === 0
                  const openAt = (i: number) => setViewer({ project: p, folder: f, index: i })
                  const thumbs = list.slice(0, view === 'grid' ? 1 : 4)
                  return (
                    <div key={f} className={`files-folder${missing ? ' is-missing' : ''}`} {...dragProps(p, f)}>
                      {view === 'grid' && (list.length
                        ? <Thumb it={list[0]} size={96} onClick={() => openAt(0)} label={displayName(list[0], f, 0)} />
                        : <span className="ph-empty" aria-hidden><ImageIcon size={22} strokeWidth={1.5} /></span>)}
                      <span className="files-folder-name">
                        <span className="files-folder-title">{f}{f === REQUIRED && <span className="files-req-badge">Required</span>}</span>
                        <span className={`files-folder-meta${missing ? ' warn' : ''}`}>
                          {missing ? <><AlertTriangle size={14} />Add at least one before photo</> : list.length ? plural(list.length, noun(f)) : `No ${noun(f)}s yet · drag files here`}
                        </span>
                      </span>
                      {view === 'list' && list.length > 0 && (
                        <span className="ph-strip">
                          {thumbs.map((it, i) => <Thumb key={it.id} it={it} onClick={() => openAt(i)} label={displayName(it, f, i)} />)}
                          {list.length > 4 && <button type="button" className="ph-more" onClick={() => openAt(4)} aria-label={`Show all ${list.length}`}>+{list.length - 4}</button>}
                        </span>
                      )}
                      <button className="btn btn-sm" onClick={() => pick(p, f)}><Upload size={14} />{f === '2020 Files' ? 'Add files' : 'Add photos'}</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      <PhotoViewer viewer={viewer} files={files} setViewer={setViewer} setFiles={setFiles} say={say} projects={projects} onAdd={pick} />
    </section>
  )
}

function PhotoViewer({ viewer, files, setViewer, setFiles, say, projects, onAdd }: {
  viewer: Viewer; files: FilesState; setViewer: (v: Viewer) => void; setFiles: (f: (s: FilesState) => FilesState) => void
  say: (t: string, undo?: () => void) => void; projects: string[]; onAdd: (p: string, f: Folder) => void
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const list = viewer ? files[viewer.project]?.[viewer.folder] ?? [] : []
  const i = viewer ? Math.min(viewer.index, list.length - 1) : 0
  const it = list[i]
  const close = () => { setViewer(null); setEditing(null); setMoveOpen(false) }
  const go = (d: number) => viewer && list.length > 1 && setViewer({ ...viewer, index: (i + d + list.length) % list.length })
  useEffect(() => {
    if (!viewer) return
    const key = (e: KeyboardEvent) => {
      if (editing !== null) return
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key)
  })
  useEffect(() => { if (viewer && !it) close() }) // last photo removed
  const update = (fn: (l: FileItem[]) => FileItem[], project = viewer!.project, folder = viewer!.folder) =>
    setFiles((s) => ({ ...s, [project]: { ...s[project], [folder]: fn(s[project]?.[folder] ?? []) } }))
  const name = it && viewer ? displayName(it, viewer.folder, i) : ''
  const remove = () => {
    if (!viewer || !it) return
    const { project, folder } = viewer, at = i, item = it
    update((l) => l.filter((x) => x.id !== item.id))
    setViewer(list.length > 1 ? { ...viewer, index: Math.max(0, at - (at === list.length - 1 ? 1 : 0)) } : null)
    say(`${name} deleted`, () => update((l) => [...l.slice(0, at), item, ...l.slice(at)], project, folder))
  }
  const moveTo = (project: string, folder: Folder) => {
    if (!viewer || !it) return
    const from = { project: viewer.project, folder: viewer.folder }, item = it
    setFiles((s) => {
      const a = { ...s, [from.project]: { ...s[from.project], [from.folder]: (s[from.project]?.[from.folder] ?? []).filter((x) => x.id !== item.id) } }
      return { ...a, [project]: { ...a[project], [folder]: [...(a[project]?.[folder] ?? []), item] } }
    })
    setMoveOpen(false)
    setViewer(list.length > 1 ? { ...viewer, index: Math.max(0, i - (i === list.length - 1 ? 1 : 0)) } : null)
    say(`Moved to ${project} · ${folder}`, () => setFiles((s) => {
      const a = { ...s, [project]: { ...s[project], [folder]: (s[project]?.[folder] ?? []).filter((x) => x.id !== item.id) } }
      return { ...a, [from.project]: { ...a[from.project], [from.folder]: [...(a[from.project]?.[from.folder] ?? []), item] } }
    }))
  }
  const download = () => {
    if (!it) return
    if (it.src) { const a = document.createElement('a'); a.href = it.src; a.download = it.original; a.click() }
    say(`Downloading ${it.original}…`)
  }
  return createPortal(
    <AnimatePresence>
      {viewer && it && (
        <motion.div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && close()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-label={`${viewer.project} · ${viewer.folder}`} className="dialog pv" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={spring.calm}>
            <div className="dialog-head">
              <div>
                <div className="dialog-title">{viewer.project} · {viewer.folder}</div>
                <div className="dialog-sub">{i + 1} of {list.length}</div>
              </div>
              <div className="pv-head-actions">
                <button className="btn btn-sm" onClick={() => onAdd(viewer.project, viewer.folder)}><Upload size={14} />Add more</button>
                <button className="icon-plain" aria-label="Close" onClick={close}><X size={18} /></button>
              </div>
            </div>
            <div className="pv-stage">
              {it.src ? <img src={it.src} alt={name} /> : (
                <div className="pv-ph" style={{ background: TONES[it.tone ?? 0] }}><ImageIcon size={40} strokeWidth={1.3} /><span>Photo preview</span></div>
              )}
              {list.length > 1 && <>
                <button className="pv-nav prev" aria-label="Previous photo" title="Previous (←)" onClick={() => go(-1)}><ChevronLeft size={20} /></button>
                <button className="pv-nav next" aria-label="Next photo" title="Next (→)" onClick={() => go(1)}><ChevronRight size={20} /></button>
              </>}
            </div>
            <div className="pv-info">
              <div className="pv-name">
                {editing !== null ? (
                  <input className="input pv-rename" autoFocus value={editing} aria-label="Photo name" onChange={(e) => setEditing(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { const v = editing.trim(); const id = it.id; update((l) => l.map((x) => (x.id === id ? { ...x, label: v || undefined } : x))); setEditing(null); say('Name saved') }
                      if (e.key === 'Escape') { e.stopPropagation(); setEditing(null) }
                    }}
                    onBlur={() => setEditing(null)} />
                ) : (
                  <>
                    <b>{name}</b>
                    <button className="icon-plain" aria-label="Rename" title="Rename" onClick={() => setEditing(name)}><Pencil size={15} /></button>
                  </>
                )}
              </div>
              <div className="pv-meta">
                <span title={it.original}><FileText size={14} />{it.original}</span>
                <span>Uploaded by {it.by} · {it.at}</span>
                {it.size != null && <span>{fmtSize(it.size)}</span>}
              </div>
              <div className="pv-actions">
                <button className="btn" onClick={download}><Download size={16} />Download</button>
                <span className="pv-move">
                  <button className="btn" aria-haspopup="menu" aria-expanded={moveOpen} onClick={() => setMoveOpen((v) => !v)}><FolderInput size={16} />Move to folder</button>
                  {moveOpen && (
                    <div className="menu pv-move-menu" role="menu">
                      {projects.map((p) => (
                        <div key={p}>
                          <div className="menu-title">{p}</div>
                          {FOLDERS.filter((f) => !(p === viewer.project && f === viewer.folder)).map((f) => (
                            <button key={f} role="menuitem" className="menu-item" onClick={() => moveTo(p, f)}><span className="menu-label">{f}</span></button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </span>
                <span style={{ flex: 1 }} />
                <button className="btn btn-danger-ghost" onClick={remove}><Trash2 size={16} />Delete</button>
              </div>
            </div>
            {list.length > 1 && (
              <div className="pv-strip" role="listbox" aria-label="Photos">
                {list.map((x, k) => (
                  <span key={x.id} role="option" aria-selected={k === i} className={k === i ? 'on' : ''}>
                    <Thumb it={x} size={56} onClick={() => setViewer({ ...viewer, index: k })} label={displayName(x, viewer.folder, k)} />
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
