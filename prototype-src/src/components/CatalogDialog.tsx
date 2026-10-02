/** "Add from catalog" — Labors, Materials and Countertops share one picker drawn after Figma 264:49341 (CatalogPicker). */
import type { CatalogItem, CatalogKind, Line } from '../lib/estimate'
import { CatalogPicker } from './CatalogPicker'

export type { CatalogKind }
// show = the Show cost / Show sale switches of the table the picker was opened from (the picker starts with them)
export type CatalogTarget = { kind: CatalogKind; project: string; replace?: Line; show?: { cost: boolean; sale: boolean } } | null

export function CatalogDialog(props: {
  target: CatalogTarget
  projects?: string[]
  onClose: () => void
  onAdd: (kind: CatalogKind, project: string, picks: { item: CatalogItem; qty: number }[]) => void
  onReplace: (kind: CatalogKind, project: string, line: Line, item: CatalogItem) => void
  say?: (t: string) => void
}) {
  return <CatalogPicker target={props.target} onClose={props.onClose} onAdd={props.onAdd} onReplace={props.onReplace} />
}
