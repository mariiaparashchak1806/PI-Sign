# PiSuite — Lead Overview — Prototype Spec

## Stack
- Vite + React 19 + TypeScript · styling: CSS custom properties (`src/index.css`) · motion: Motion (`motion/react`) · icons: exported from Figma (menus/dialogs: lucide-react)
- Fidelity: **replica** — Figma `19:973` "Lead Overview — Redesign", 1440 px desktop frame
- Rendering: the Figma tree (`src/figma/tree.json`, exported via Desktop Bridge) is rendered by `FigmaNode`; interactivity is attached by node id as patches/handlers in the page
- Deploy: `npm run build` → `../prototype/` → https://mariiaparashchak1806.github.io/PI-Sign/prototype/

## Tokens (summary)
- Text `--color-text-primary` #1B1D1A · secondary #6B7068 · page `--color-bg-page` #F5F4F1 · border #E6E8E3 · brand dark (primary button) #48443E · AI #6D4AFF
- Font: Poppins 400/500/600 (Inter 500 for 16 glyph-only labels) · radii 4/6/8/10 · control shadow `--shadow-control`
- 33 semantic + 38 hex-named colour vars → `src/index.css`; Figma↔CSS mapping → `DESIGN.md`

## Components
- FigmaNode (tree renderer, patches/handlers) → src/figma/FigmaNode.tsx
- Menu · Dialog · Toast · Btn (secondary/primary/danger) → src/components/Overlay.tsx
- Field · TextInput · Select · TextArea → src/components/Form.tsx

## Screens
- Lead Overview `/` → src/pages/LeadOverview.tsx → built, verified (diff 0.62 %)
  - fixtures: `?fixture=details` (drawn "Show details" state), `?fixture=kitchen-collapsed`

## Layout Rules
- Fixed 1440 px page (as the frame); rail 80 + sidebar 240 + content 1116; content padding 20/24, gap 16; grid 732 + 320
- Cards: white, 1 px #E6E8E3, radius 8; table rows 16 px side padding

## Interactions
- Springs: `snappy` (menus, toasts), `calm` (dialogs) → src/lib/springs.ts; reduced-motion respected
- Menus anchor under their trigger, close on outside click / Esc; destructive items last + red + confirmation dialog
- Reversible actions (done, idle, wishlist, status, remove item) → toast with Undo, no dialog
- Project row: click toggles Kitchen line items; status pill = dropdown; ⋯ = project menu (edit, info, PDF, duplicate, wishlist, delete)
- Line item ⋯: edit qty/price, replace, duplicate, move to project, remove
- Tasks: checkbox = done/reopen; ⋯ = edit, attach, idle/resume, cancel, delete; closed tasks → reopen/delete; header ⋯ = hide completed
- Lead card: Show/Hide details, Assign designer (menu → updates "Not assigned"), ⋯ (copy link, archive, delete)
- AI Assistant: suggestions + input answer inline (canned answers in src/lib/mockData.ts)

### Intentionally static (controls audit)
- Rail, sidebar nav, tabs other than Overview (user decision 2026-09-30), breadcrumbs, lead status pill, Bathroom/Basement chevrons (no line items drawn), right-column summary rows, header checkbox in Agenda
- "View all", Payment plan link, Edit lead/contact, catalog, inline qty edit → toast "isn't part of this prototype"
