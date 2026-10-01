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
- LeadInfoDialog ("Info") · ContactDialog ("Edit contact") — prefilled from the cards, Save disabled until dirty → src/components/EditDialogs.tsx
- AssignDialog ("Pick Assignees": PersonSelect with avatar/clear/chevron) · MessagesDialog (SMS/Email thread, neutral palette) → src/components/LeadDialogs.tsx

## Screens
- Lead Overview `/` → src/pages/LeadOverview.tsx → built, verified (diff 0.62 %)
  - fixtures: `?fixture=details` (drawn expanded Lead card 109:4952), `?fixture=kitchen-collapsed`
  - Lead card = Figma `109:5225` (collapsed `109:3765` / expanded `109:6980`, updated 2026-09-30)

## Layout Rules
- Fixed 1440 px page (as the frame); rail 80 + sidebar 240 + content 1116; content padding 20/24, gap 16; grid 732 + 320
- Cards: white, 1 px #E6E8E3, radius 8; table rows 16 px side padding

## Interactions
- Springs: `snappy` (menus, toasts), `calm` (dialogs) → src/lib/springs.ts; reduced-motion respected
- Menus anchor under their trigger, close on outside click / Esc; destructive items last + red + confirmation dialog
- Row ⋯ (project, line item, task) appear only on row hover (`.hover-row` / `.more-on-hover`), stay visible while their menu is open, show on keyboard focus, always visible on touch (`hover: none`). Card-level ⋯ (Lead header) and Agenda header ⋯ stay visible
- Reversible actions (done, idle, wishlist, status, remove item) → toast with Undo, no dialog
- Project row: click toggles Kitchen line items; status pill = dropdown; ⋯ = project menu (edit, info, PDF, duplicate, wishlist, delete)
- Line item ⋯: edit qty/price, replace, duplicate, move to project, remove
- Project Details filter icon: popover "Show cost" (Total) / "Show sale" (Sales) + "Show all columns"; count badge while open, green dot when any column is on, no dot when none
- Selects/inputs: 16 px side padding, custom chevron at 16 px from the right
- Tasks: checkbox = done/reopen; ⋯ = edit, attach, idle/resume, cancel, delete; closed tasks → reopen/delete; header ⋯ = hide completed
- Lead card: Show/Hide details (footer toggle), Edit → "Info" dialog (store, source, start, house type/age → updates the card), Assign designer → "Pick Assignees" dialog (designer + project manager → updates "Not assigned"), ⋯ (copy link, archive, delete)
- Contact card: Edit → "Edit contact" dialog (name, phone, email, address → updates card + breadcrumb); rows get grey fill + copy button only on hover; call → tel:, SMS icon (and Messages "View all") → Messages dialog
- AI Assistant: suggestions + input answer inline (canned answers in src/lib/mockData.ts)

### Intentionally static (controls audit)
- Rail, sidebar nav, tabs other than Overview (user decision 2026-09-30), breadcrumbs, lead status pill, Bathroom/Basement chevrons (no line items drawn), right-column summary rows, header checkbox in Agenda
- "View all" (Agenda, Signed documents, Files), Payment plan link, catalog, inline qty edit → toast "isn't part of this prototype"

### Tabs
- Overview · Agenda · Files & Photos are clickable; other tabs are inactive (toast).
- Agenda: full-width Agenda card, Add Task modal (Task / Due Date / Description), task ⋯ menu: Edit task, Attach file, Mark as idle, Cancel task, Delete task.
- Files & Photos: per-project folders, list/grid toggle, required Before Photos warning, "+" → Add files (counts update here and in the Overview summary).
- Deviation: the designer's task menu says "Delete project" — shown as "Delete task" (it deletes the task).
- Assumption: Basement's "2 files" from the Overview summary are placed in Before Photos (the mock doesn't say which folder).
- Deviation: 16 px gap between the Contact and Lead cards (0 in the mock), per designer.
- Add from catalog: picker shell with empty states (catalog not connected); staging's permission error deliberately not shown.
- All tabs are built (see PROGRESS.md 2026-09-30). Not itemised in the mock → not invented: Bathroom lines, payment amounts/dates.
- Deviation: page ends where content ends (Figma frame has a fixed 2653 px height with empty space); left menu is sticky.

## Concepts
- Switch at bottom-left (or `?concept=2`). Same state and actions in both; concept 2 = Figma 124:1753 (lead/price/contact column on the left, AI Assistant in the top bar → side panel).
- Concept 2 deviations: Designer has no Assign button in the design — clicking the value opens Pick Assignees; Kitchen starts collapsed (as drawn) and expands into concept 1's line items.
- Concept 2: only Overview is interactive in the tab bar (per designer); card links into tabs are inert.
- Concept 1 follows the latest Figma 19:973 (Oct 1 sync); concept 2 keeps its own snapshot (tree-c2base.json). Switching concepts resets state.
- Files & Photos: live in both concepts (concept 2: Overview + Files only). Seed file names/uploader for Basement are demo data.
- Concept 1 = Figma 184:3568 (Option 2); old 19:973 at ?option=1. Needs attention links follow their labels (design text/label mismatch flagged to designer).

## Links
- Concept 1: https://mariiaparashchak1806.github.io/PI-Sign/prototype/concept-1/
- Concept 2: https://mariiaparashchak1806.github.io/PI-Sign/prototype/concept-2/
- The concept switch was removed (separate links per concept).
