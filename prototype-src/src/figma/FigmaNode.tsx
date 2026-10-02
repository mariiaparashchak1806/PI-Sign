/**
 * Renders the Figma node tree exported by the Desktop Bridge (src/figma/tree.json)
 * as DOM: auto-layout → flexbox, fixed/fill/hug sizing, strokes, radii, effects,
 * text segments and exported SVG icons. Interactivity is layered on top through
 * `Overrides` keyed by Figma node id — the tree itself stays a faithful replica.
 */
import { createContext, useContext, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import colors from './colors.json'
import icons from './icons.json'

export type FNode = {
  id: string; n: string; t: string; x: number; y: number; w: number; h: number
  hidden?: boolean; abs?: boolean; clip?: boolean; op?: number; rot?: number; icon?: boolean
  al?: { m: 'HORIZONTAL' | 'VERTICAL'; gap: number; p: [number, number, number, number]; pa: string; ca: string; wrap: string; cgap: number }
  sz?: [string, string, number]
  minW?: number; maxW?: number; minH?: number
  fill?: (number[] | { g: number[][]; m: number[][] } | string)[]
  stroke?: { c: number[] | null; w: number | number[]; a: string; dash?: number[] }
  r?: number | number[]
  fx?: { t: string; x: number; y: number; b: number; s: number; c: number[] }[]
  react?: string[]
  comp?: string
  txt?: string
  seg?: { f: string; s: number; c: number[] | null; lh: string; ls?: string; d?: string; tc?: string; st: number; en: number }[]
  ta?: string; tav?: string; ar?: string; trunc?: string
  k?: FNode[]
}

export type Patch = {
  hidden?: boolean
  txt?: string
  color?: string // CSS color for all text segments
  decoration?: 'line-through' | 'none'
  bg?: string
  style?: CSSProperties
}
export type Handler = {
  onClick?: (e: MouseEvent<HTMLElement>) => void
  title?: string
  className?: string
  /** Replace the node entirely (receives the default rendering). */
  render?: (node: FNode, defaultEl: ReactNode) => ReactNode
  /** Append extra children inside the node (e.g. an anchored menu). */
  after?: ReactNode
}
export type Overrides = { patches: Record<string, Patch | undefined>; handlers: Record<string, Handler | undefined> }

const Ctx = createContext<Overrides>({ patches: {}, handlers: {} })
export const OverridesProvider = Ctx.Provider

const COLOR = colors as Record<string, string>
const DOTS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(27,29,26,1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>'
const ICONS = icons as { svg: Record<string, string>; ref: Record<string, string> }
const WEIGHT: Record<string, number> = { Thin: 100, ExtraLight: 200, Light: 300, Regular: 400, Medium: 500, SemiBold: 600, Bold: 700, ExtraBold: 800, Black: 900 }

const px = (v: number) => `${Math.round(v * 100) / 100}px`
const color = (c: number[] | null | undefined) => (c ? COLOR[c.join(',')] ?? `rgba(${c.join(',')})` : undefined)

function paint(fills: FNode['fill']): string | undefined {
  if (!fills || !fills.length) return undefined
  const f = fills[fills.length - 1]
  if (Array.isArray(f)) return color(f)
  if (typeof f === 'object' && f && 'g' in f) {
    const [[a, b]] = f.m
    const angle = Math.round((Math.atan2(b, a) * 180) / Math.PI) + 90
    return `linear-gradient(${angle}deg, ${f.g.map((s) => `${color(s.slice(0, 4))} ${Math.round(s[4] * 100)}%`).join(', ')})`
  }
  return undefined
}

/** Did Figma lay the children out ignoring this frame's stroke? Children of an auto-layout frame start at the padding
 *  edge when the stroke is excluded and at padding + stroke when it's included — read from any side that has a stroke. */
function strokeExcluded(n: FNode) {
  if (!n.stroke?.c || n.stroke.a === 'OUTSIDE') return false
  if (!n.al) return !!n.k?.length // free-positioned children are placed from the outer edge in Figma
  const w = Array.isArray(n.stroke.w) ? n.stroke.w : [n.stroke.w, n.stroke.w, n.stroke.w, n.stroke.w]
  const ks = (n.k ?? []).filter((k) => !k.hidden && !k.abs)
  if (!ks.length) return false
  const [pt, pr, pb, pl] = n.al.p, near = (a: number, b: number) => Math.abs(a - b) < 0.6
  const sides: [number, number, number][] = [
    [w[0], Math.min(...ks.map((k) => k.y)), pt], [w[3], Math.min(...ks.map((k) => k.x)), pl],
    [w[2], n.h - Math.max(...ks.map((k) => k.y + k.h)), pb], [w[1], n.w - Math.max(...ks.map((k) => k.x + k.w)), pr],
  ]
  let excl = 0, incl = 0
  for (const [bw, edge, pad] of sides) { if (!bw) continue; if (near(edge, pad)) excl++; else if (near(edge, pad + bw)) incl++ }
  return excl > 0 && incl === 0
}

function sizing(n: FNode, parent: FNode | null, s: CSSProperties) {
  const pl = parent?.al?.m
  if (parent && (n.abs || !pl)) {
    // (parents with children draw their stroke as an overlay, not a CSS border → Figma's offsets apply as they are)
    const ox = parent.t === 'GROUP' ? parent.x : 0
    const oy = parent.t === 'GROUP' ? parent.y : 0
    Object.assign(s, { position: 'absolute', left: px(n.x - ox), top: px(n.y - oy) })
    if (n.t !== 'TEXT' || n.ar === 'NONE') Object.assign(s, { width: px(n.w), height: px(n.h) })
    else if (n.ar === 'HEIGHT') s.width = px(n.w)
    return
  }
  if (!parent || !n.sz) { s.width = px(n.w); return }
  const [H, V] = n.sz
  if (pl === 'HORIZONTAL') {
    if (H === 'FILL') Object.assign(s, { flex: '1 1 0', minWidth: 0 })
    else { s.flexShrink = 0; if (H === 'FIXED') s.width = px(n.w) }
    if (V === 'FILL') s.alignSelf = 'stretch'
    else if (V === 'FIXED') s.height = px(n.h)
  } else {
    if (V === 'FILL') Object.assign(s, { flex: '1 1 0', minHeight: 0 })
    else { s.flexShrink = 0; if (V === 'FIXED') s.height = px(n.h) }
    if (H === 'FILL') s.alignSelf = 'stretch'
    else if (H === 'FIXED') s.width = px(n.w)
  }
  if (n.minW) s.minWidth = px(n.minW)
  if (n.maxW) s.maxWidth = px(n.maxW)
  if (n.minH) s.minHeight = px(n.minH)
}

function box(n: FNode, s: CSSProperties, patch?: Patch) {
  const bg = patch?.bg ?? (n.t === 'TEXT' ? undefined : paint(n.fill))
  if (bg) s.background = bg
  if (n.stroke?.c) {
    const c = color(n.stroke.c)
    const w = Array.isArray(n.stroke.w) ? n.stroke.w : [n.stroke.w, n.stroke.w, n.stroke.w, n.stroke.w]
    if (n.stroke.a === 'OUTSIDE') s.boxShadow = `0 0 0 ${px(w[0])} ${c}`
    else Object.assign(s, { borderStyle: n.stroke.dash ? 'dashed' : 'solid', borderColor: c, borderWidth: w.map(px).join(' ') })
  }
  // every secondary-style button (Secondary Button, the ⋯ Icon button) has the same 1px #27272A 15% stroke on white
  // (some instances in the mock lost it)
  if (n.comp === 'Secondary Button' || n.comp === 'Icon button') Object.assign(s, { borderStyle: 'solid', borderWidth: '1px', borderColor: 'rgba(39,39,42,0.15)', background: patch?.bg ?? 'rgba(255,255,255,1)' })
  if (Array.isArray(n.r)) s.borderRadius = n.r.map(px).join(' ')
  else if (n.r) s.borderRadius = px(n.r)
  const shadows = (n.fx ?? []).filter((e) => e.t === 'DROP_SHADOW' || e.t === 'INNER_SHADOW')
  if (shadows.length && n.t !== 'TEXT') {
    const v = shadows.map((e) => `${e.t === 'INNER_SHADOW' ? 'inset ' : ''}${px(e.x)} ${px(e.y)} ${px(e.b)} ${px(e.s || 0)} ${color(e.c)}`)
    s.boxShadow = [s.boxShadow, ...v].filter(Boolean).join(', ')
  }
  if (n.op !== undefined) s.opacity = n.op
  if (n.clip) s.overflow = 'hidden'
}

function segStyle(g: NonNullable<FNode['seg']>[number], patch?: Patch): CSSProperties {
  const [family, ...rest] = g.f.split(' ')
  const style = rest.join('')
  const s: CSSProperties = {
    fontFamily: `'${family}', system-ui, sans-serif`,
    fontWeight: WEIGHT[style.replace('Italic', '')] ?? 400,
    fontSize: px(g.s),
    color: patch?.color ?? color(g.c),
    lineHeight: g.lh === 'auto' ? 'normal' : g.lh.endsWith('%') ? String(parseFloat(g.lh) / 100) : px(parseFloat(g.lh)),
  }
  if (style.includes('Italic')) s.fontStyle = 'italic'
  if (g.ls) s.letterSpacing = g.ls.endsWith('%') ? `${parseFloat(g.ls) / 100}em` : px(parseFloat(g.ls))
  const deco = patch?.decoration ?? (g.d === 'STRIKETHROUGH' ? 'line-through' : g.d === 'UNDERLINE' ? 'underline' : undefined)
  if (deco) s.textDecoration = deco
  if (g.tc === 'UPPER') s.textTransform = 'uppercase'
  return s
}

const isGhost = (n: FNode) => {
  const f = n.fill?.[n.fill.length - 1]
  return !f || (Array.isArray(f) && f[3] === 0)
}

export function FigmaNode({ node, parent = null }: { node: FNode; parent?: FNode | null }): ReactNode {
  const { patches, handlers } = useContext(Ctx)
  const patch = patches[node.id]
  const handler = handlers[node.id]
  const hidden = patch?.hidden ?? node.hidden
  if (hidden) return null

  const s: CSSProperties = {}
  const clickable = !!handler?.onClick
  const cls = [clickable ? 'clickable' : '', clickable && isGhost(node) ? 'ghost' : '', node.react?.includes('ON_HOVER') ? 'has-hover' : '', handler?.className ?? ''].filter(Boolean).join(' ') || undefined
  const common = { 'data-id': node.id, 'data-n': node.n, className: cls, title: handler?.title, onClick: handler?.onClick }

  let el: ReactNode
  if (node.t === 'TEXT') {
    sizing(node, parent, s)
    s.whiteSpace = node.ar === 'WIDTH_AND_HEIGHT' ? 'pre' : 'pre-wrap'
    if (node.ar === 'NONE') { s.height = px(node.h); s.overflow = 'hidden' }
    const lh0 = node.seg?.[0]?.lh
    const clampLh = node.ar === 'NONE' && lh0 && !lh0.endsWith('%') && lh0 !== 'auto' && parseFloat(lh0) > node.h
    if (node.trunc === 'ENDING') Object.assign(s, { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
    s.textAlign = ({ LEFT: 'left', CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'justify' } as const)[node.ta as 'LEFT'] ?? 'left'
    const shadow = node.fx?.find((e) => e.t === 'DROP_SHADOW')
    if (shadow) s.textShadow = `${px(shadow.x)} ${px(shadow.y)} ${px(shadow.b)} ${color(shadow.c)}`
    const segs = node.seg ?? []
    const text = patch?.txt ?? node.txt ?? ''
    if (segs.length <= 1 || patch?.txt !== undefined) {
      el = <div {...common} style={{ ...s, ...(segs[0] ? segStyle(segs[0], patch) : {}), ...(clampLh ? { lineHeight: px(node.h), overflow: 'visible' } : {}), ...patch?.style }}>{text}</div>
    } else {
      el = (
        // container carries the first segment's metrics so the line box matches Figma (no body strut)
        <div {...common} style={{ ...s, ...segStyle(segs[0], patch), ...patch?.style }}>
          {segs.map((g, i) => <span key={i} style={segStyle(g, patch)}>{(node.txt ?? '').slice(g.st, g.en)}</span>)}
        </div>
      )
    }
  } else if (node.icon && node.comp === 'Icon button') {
    // the exporter treats "Icon button" as an icon and its SVG (with the shadow) is 2px wider than the button,
    // which clips the stroke — draw it like the other buttons instead: fill, 1px stroke, radius, shadows + dots
    sizing(node, parent, s)
    box(node, s, patch)
    Object.assign(s, { width: s.width ?? px(node.w), height: s.height ?? px(node.h), display: 'grid', placeItems: 'center', flexShrink: 0 })
    el = <div {...common} style={{ ...s, ...patch?.style }} dangerouslySetInnerHTML={{ __html: DOTS }} />
  } else if (node.icon) {
    sizing(node, parent, s)
    if (s.width === undefined && s.flex === undefined) s.width = px(node.w)
    if (s.height === undefined && s.alignSelf !== 'stretch') s.height = px(node.h)
    if (node.op !== undefined) s.opacity = node.op
    // exported SVGs already include the node's rotation — don't rotate twice
    const svg = ICONS.svg[ICONS.ref[node.id.split('#')[0]]] ?? ''
    el = <div {...common} className={['fig-icon', cls].filter(Boolean).join(' ')} style={{ ...s, ...patch?.style }} dangerouslySetInnerHTML={{ __html: svg }} />
  } else if (node.t === 'LINE') {
    sizing(node, parent, s)
    const w = Array.isArray(node.stroke?.w) ? node.stroke!.w[0] : (node.stroke?.w ?? 1)
    const vertical = Math.abs(Math.abs(node.rot ?? 0) - 90) < 1
    Object.assign(s, vertical ? { width: px(w), height: px(node.w) } : { width: px(node.w), height: px(w) }, { background: color(node.stroke?.c) })
    // a Figma line is 0 thick in auto layout (the stroke straddles it) → negative margins keep it out of the flow
    if (parent?.al && !node.abs && node.stroke?.a !== 'INSIDE') Object.assign(s, vertical ? { marginLeft: px(-w / 2), marginRight: px(-w / 2) } : { marginTop: px(-w / 2), marginBottom: px(-w / 2) })
    el = <div {...common} style={{ ...s, ...patch?.style }} />
  } else {
    if (parent) sizing(node, parent, s)
    else Object.assign(s, { width: px(node.w), minHeight: px(node.h) })
    box(node, s, patch)
    const al = node.al
    if (al) {
      Object.assign(s, { display: 'flex', flexDirection: al.m === 'HORIZONTAL' ? 'row' : 'column' })
      if (al.wrap === 'WRAP') { s.flexWrap = 'wrap'; if (al.cgap) s.rowGap = px(al.cgap) }
      if (al.pa === 'SPACE_BETWEEN') s.justifyContent = 'space-between'
      else {
        s.justifyContent = ({ MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end' } as Record<string, string>)[al.pa]
        if (al.gap) al.wrap === 'WRAP' ? (s.columnGap = px(al.gap)) : (s.gap = px(al.gap))
      }
      s.alignItems = ({ MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', BASELINE: 'baseline' } as Record<string, string>)[al.ca]
      if (al.p.some(Boolean)) s.padding = al.p.map(px).join(' ')
      if (node.k?.some((c) => c.abs)) s.position = s.position ?? 'relative'
    } else {
      s.position = s.position ?? 'relative'
      if (s.height === undefined && !s.flex) s.height = px(node.h)
      if (s.width === undefined && !s.flex) s.width = px(node.w)
    }
    if (handler?.after) s.position = s.position ?? 'relative'
    // Figma frames with "strokes excluded from layout" let children sit under the stroke; a CSS border would push them in →
    // those frames draw the stroke as an overlay on top, so the content keeps its Figma position and size
    let overlay: CSSProperties | undefined
    if (s.borderWidth && node.k?.length && strokeExcluded(node)) {
      const { borderStyle, borderColor, borderWidth } = s
      overlay = { position: 'absolute', inset: 0, borderStyle, borderColor: (patch?.style?.borderColor as string) ?? borderColor, borderWidth, borderRadius: 'inherit', pointerEvents: 'none' }
      delete s.borderStyle; delete s.borderColor; delete s.borderWidth
      s.position = s.position ?? 'relative'
    }
    const pstyle = overlay && patch?.style?.borderColor ? (({ borderColor: _bc, ...rest }) => rest)(patch.style) : patch?.style
    el = (
      <div {...common} style={{ ...s, ...pstyle }}>
        {node.k?.map((c) => <FigmaNode key={c.id} node={c} parent={node} />)}
        {handler?.after}
        {overlay && <span aria-hidden="true" className="fig-stroke" style={overlay} />}
      </div>
    )
  }
  return handler?.render ? handler.render(node, el) : el
}

/** Index helpers used by the page to find ids by name/path instead of hard-coding them. */
export function indexTree(root: FNode) {
  const byId = new Map<string, FNode>()
  const parentOf = new Map<string, FNode>()
  const walk = (n: FNode) => { byId.set(n.id, n); n.k?.forEach((c) => { parentOf.set(c.id, n); walk(c) }) }
  walk(root)
  const find = (from: FNode, pred: (n: FNode) => boolean): FNode | undefined => {
    if (pred(from)) return from
    for (const c of from.k ?? []) { const r = find(c, pred); if (r) return r }
  }
  const findAll = (from: FNode, pred: (n: FNode) => boolean, out: FNode[] = []): FNode[] => {
    if (pred(from)) out.push(from)
    from.k?.forEach((c) => findAll(c, pred, out))
    return out
  }
  return { byId, parentOf, find, findAll }
}
