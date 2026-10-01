// Estimate lines exactly as drawn in the mock (Project Details → Kitchen expanded, Bathroom/Basement rows).
// Bathroom only has category totals in the mock, so its drawn lines are not itemised (summary) — lines added
// from the catalog are listed on top of that summary.
export type CatalogKind = 'Materials' | 'Labors' | 'Countertops'
export const KINDS: CatalogKind[] = ['Materials', 'Labors', 'Countertops']

export type Line = { id: string; name: string; qty: number; unit?: string; price: number; cost?: number; code?: string }
export type Estimate = Record<string, Partial<Record<CatalogKind, Line[]>>>
export type Summary = Record<string, Partial<Record<CatalogKind, { items: number; total: number }>>>

export const ESTIMATE0: Estimate = {
  Kitchen: {
    Materials: [
      { id: 'k-m1', name: 'Shaker base cabinet 36"', qty: 8, price: 420 },
      { id: 'k-m2', name: 'Cabinet pulls, brushed nickel', qty: 24, price: 12 },
    ],
    Labors: [
      { id: 'k-l1', name: 'Demolition & haul-away', qty: 1, price: 1200 },
      { id: 'k-l2', name: 'Cabinet installation', qty: 8, price: 150 },
    ],
    Countertops: [{ id: 'k-c1', name: 'Quartz countertop, 3 cm', qty: 42, unit: 'sq ft', price: 65 }],
  },
  Bathroom: {},
  Basement: {},
}
export const SUMMARY: Summary = { Bathroom: { Materials: { items: 3, total: 1850 }, Labors: { items: 2, total: 1600 }, Countertops: { items: 1, total: 900 } } }

// ---------- catalog ----------
export type CatalogItem = {
  code: string; name: string; category: string; cost?: number; multiplier?: number; price: number; unit?: string
  image?: string; vendor?: string; brand?: string; specs?: string[]; inStock?: boolean
}
const img = (f: string) => `${import.meta.env.BASE_URL}catalog/${f}`
// Labors: categories and the first items as shown in the PiSuite staging catalog (Oct 1 screenshots);
// "Demolition & haul-away" and "Cabinet installation" are the mock's Kitchen labors.
export const CATALOG: Record<CatalogKind, { categories: string[]; items: CatalogItem[] }> = {
  Labors: {
    categories: ['Project type', 'Pre-construction & demolition', 'Removal & haul away trash', 'Haul away the following appliances', 'Appliances installation', 'Carpentry work', 'Addition work', 'Floor & backsplash installation', 'Plumbing & all related items', 'Vent & ductwork', 'Electrical work', 'Paint work', 'Glass door', 'Permit', 'Management'],
    items: [
      { code: '5970.6057.6082', name: 'Shipping Cost for Pergola (1X per container)', category: '', cost: 4000, multiplier: 1.8, price: 7200 },
      { code: '5970.6055.6078', name: 'Fly Screen siding installation', category: '', cost: 3, multiplier: 1.8, price: 5.4 },
      { code: '5970.6054.6077', name: 'Blind Shade for siding installation', category: '', cost: 3, multiplier: 1.8, price: 5.4 },
      { code: '5970.6053.6076', name: 'Bi Fold Glass for siding installation (with pergola installation only)', category: '', cost: 3, multiplier: 1.8, price: 5.4 },
      { code: '5970.6052.6075', name: 'Lift and Folding for siding installation', category: '', cost: 3, multiplier: 1.8, price: 5.4 },
      { code: '5970.6051.6074', name: 'Lift/Sliding for siding installation', category: '', cost: 3, multiplier: 1.8, price: 5.4 },
      { code: '5970.6050.6073', name: 'Gulliotin for siding glass installation', category: '', cost: 3, multiplier: 1.8, price: 5.4 },
      { code: '5970.6049.6072', name: 'Roof Blind Shade installation', category: '', cost: 3, multiplier: 1.8, price: 5.4 },
      { code: '5970.6048.6069', name: 'Retractable Glass Roof installation up to 500 sq. ft', category: '', cost: 12, multiplier: 1.8, price: 21.6 },
      { code: '5970.6047.6066', name: 'Glass roof (Sunroom) installation up to 500 sq. ft', category: '', cost: 10, multiplier: 1.8, price: 18 },
      { code: 'mock-l1', name: 'Demolition & haul-away', category: 'Removal & haul away trash', price: 1200 },
      { code: 'mock-l2', name: 'Cabinet installation', category: 'Carpentry work', price: 150 },
    ],
  },
  // Materials / Countertops: only what the mock shows (Kitchen expanded)
  Materials: { categories: [], items: [
    { code: 'mock-m1', name: 'Shaker base cabinet 36"', category: '', price: 420 },
    { code: 'mock-m2', name: 'Cabinet pulls, brushed nickel', category: '', price: 12 },
  ] },
  // Countertops: the first rows of the PiSuite staging catalog (Oct 1 screenshot; thumbnails cropped from it, "In Stock" was on)
  // — staging titles repeat SKU and brand ("SKU… – Cambria – SKU… – Cambria – Ridgegate – 131X65 – Polished Only"),
  // so they're split into name / size · finish / SKU. Category column = "Countertops · <brand>".
  Countertops: { categories: ['Cambria', 'Silestone'], items: [
    { code: 'SKU1727986026007', name: 'Cambria Ridgegate', category: 'Cambria', vendor: 'Cambria', brand: 'Cambria', specs: ['131×65', 'Polished only'], cost: 90, multiplier: 1.8, price: 162, image: img('ct-1.jpg'), inStock: true },
    { code: 'SKU1727986026336', name: 'Cambria Dovestone', category: 'Cambria', vendor: 'Cambria', brand: 'Cambria', specs: ['131×65', 'Polished only'], cost: 90, multiplier: 1.8, price: 162, image: img('ct-2.jpg'), inStock: true },
    { code: 'SKU1727986025879B', name: 'Cambria Rose Bay', category: 'Cambria', vendor: 'Cambria', brand: 'Cambria', specs: ['131×65'], cost: 90, multiplier: 1.8, price: 162, image: img('ct-3.jpg'), inStock: true },
    { code: 'SKU1727986026178', name: 'Cambria Weybourne', category: 'Cambria', vendor: 'Cambria', brand: 'Cambria', specs: ['131×65'], cost: 90, multiplier: 1.8, price: 162, image: img('ct-4.jpg'), inStock: true },
    { code: 'SKU1727986026068C', name: 'Silestone Miami White 17', category: 'Silestone', vendor: 'Silestone', brand: 'Silestone', specs: [], cost: 50, multiplier: 1.8, price: 90, image: img('ct-5.jpg'), inStock: true },
    { code: 'SKU1727986026231', name: 'Cambria Notting Hill', category: 'Cambria', vendor: 'Cambria', brand: 'Cambria', specs: ['131×65'], cost: 98, multiplier: 1.8, price: 176.4, image: img('ct-6.jpg'), inStock: true },
    { code: 'mock-c1', name: 'Quartz countertop, 3 cm', category: '', price: 65, unit: 'sq ft' },
  ] },
}

// one price format everywhere: $1,200 / $5.40 / $7,200
export const money = (n: number) => `$${n.toLocaleString('en-US', Number.isInteger(n) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const itemsLabel = (n: number) => `${n} item${n === 1 ? '' : 's'}`
export const lineTotal = (l: Line) => l.qty * l.price
