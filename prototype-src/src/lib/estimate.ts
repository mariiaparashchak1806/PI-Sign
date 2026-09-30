// Estimate lines exactly as drawn in the mock (Project Details → Kitchen expanded, Bathroom/Basement rows).
// Bathroom only has category totals in the mock, so its lines are not itemised.
import type { CatalogKind } from '../components/CatalogDialog'

export type Line = { name: string; qty: number; unit?: string; price: number }
export type ProjectEstimate = { project: string; lines?: Record<CatalogKind, Line[]>; summary?: Partial<Record<CatalogKind, { items: number; total: number }>> }

export const ESTIMATE: ProjectEstimate[] = [
  {
    project: 'Kitchen',
    lines: {
      Materials: [
        { name: 'Shaker base cabinet 36"', qty: 8, price: 420 },
        { name: 'Cabinet pulls, brushed nickel', qty: 24, price: 12 },
      ],
      Labors: [
        { name: 'Demolition & haul-away', qty: 1, price: 1200 },
        { name: 'Cabinet installation', qty: 8, price: 150 },
      ],
      Countertops: [{ name: 'Quartz countertop, 3 cm', qty: 42, unit: 'sq ft', price: 65 }],
    },
  },
  { project: 'Bathroom', summary: { Materials: { items: 3, total: 1850 }, Labors: { items: 2, total: 1600 }, Countertops: { items: 1, total: 900 } } },
  { project: 'Basement' },
]

export const money = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
export const itemsLabel = (n: number) => `${n} item${n === 1 ? '' : 's'}`
