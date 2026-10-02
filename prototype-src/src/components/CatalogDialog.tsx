/** "Add from catalog" — both pickers are redrawn from the PiSuite staging originals:
 *  Labors → LaborsCatalog (categories, editable cost / multiplier / price, PICK), Materials / Countertops →
 *  ProductCatalog (image, title, vendor / brand / finish, category, cost / multiplier / sale, PICK).
 *  The last kind is remembered so the closing animation plays in the same dialog. */
import { useRef } from 'react'
import type { CatalogItem, CatalogKind, Line } from '../lib/estimate'
import { LaborsCatalog } from './LaborsCatalog'
import { ProductCatalog } from './ProductCatalog'

export type { CatalogKind }
export type CatalogTarget = { kind: CatalogKind; project: string; replace?: Line } | null

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
