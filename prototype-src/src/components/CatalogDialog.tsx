/** "Add from catalog" — staging pickers reworked after the designer's review (Oct 2, see CatalogParts):
 *  Labors → LaborsCatalog (categories + search), Materials / Countertops → ProductCatalog (image, brand / vendor).
 *  The last kind is remembered so the closing animation plays in the same dialog. */
import { useRef } from 'react'
import type { CatalogItem, CatalogKind, Line } from '../lib/estimate'
import { LaborsCatalog } from './LaborsCatalog'
import { ProductCatalog } from './ProductCatalog'

export type { CatalogKind }
// show = the Cost / Sale columns of the table the picker was opened from (the picker has no toggle of its own)
export type CatalogTarget = { kind: CatalogKind; project: string; replace?: Line; show?: { cost: boolean; sale: boolean } } | null

export function CatalogDialog(props: {
  target: CatalogTarget
  projects?: string[]
  onClose: () => void
  onAdd: (kind: CatalogKind, project: string, picks: { item: CatalogItem; qty: number }[]) => void
  onReplace: (kind: CatalogKind, project: string, line: Line, item: CatalogItem) => void
  say?: (t: string) => void
}) {
  const last = useRef<CatalogKind>('Labors')
  if (props.target) last.current = props.target.kind
  const labors = last.current === 'Labors'
  return <>
    <LaborsCatalog {...props} target={labors ? props.target : null} />
    <ProductCatalog {...props} target={labors ? null : props.target} />
  </>
}
