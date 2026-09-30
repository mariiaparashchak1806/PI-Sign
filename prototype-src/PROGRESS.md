# Progress

## Completed Screens
| Screen | Route | Date | Verified vs Figma? | Notes |
|---|---|---|---|---|
| Lead Overview (19:973) | `/` | 2026-09-30 | Yes — Level 1: pixel diff 0.59 % (remainder: text anti-aliasing), DOM rects within 1 px; built output re-verified | 45/45 controls act; 0 console errors; fixture `details` |
| ↳ Lead card v2 + edit dialogs + contact hover | `/` | 2026-09-30 | Yes — full tree re-exported via Desktop Bridge (653 visible nodes identical); expanded card `109:6980` diffed on its own: 1.96 % (text AA) | expanded state replaced 109:4952 → 109:6980 |

| ↳ Hover-only row ⋯ + re-sync (breadcrumbs, status pill colour) | `/` | 2026-09-30 | Yes — `scripts/sync.py` diff: +6/−5 nodes (breadcrumbs), 3 changed | |
| ↳ Pick Assignees, Messages dialog, columns filter, 16 px select padding | `/` | 2026-09-30 | Qualitative (dialogs not drawn in this frame; filter states from designer's "Buttons + Filters / Option 2") | Messages: neutral palette instead of staging purple (designer request) |

## Next Up
- Client review of the clickable prototype
- Tabs (Agenda, Files & Photos, …) once designed

## Known Issues
- Row ⋯ are drawn permanently in the mock; prototype reveals them on hover (designer request 2026-09-30) — part of the remaining pixel diff
- Mail row: the mock draws its hover fill permanently; prototype shows it on hover only (designer request)
- Page is fixed-width 1440 px (replica of the desktop frame) — horizontal scroll below that
- Totals don't recalculate when a line item/project is removed or a status changes (mock numbers are static)
- Mock content questions → see Deviations in the hand-off message / DESIGN.md

## 2026-09-30 — re-check against Figma 19:973
- Only change found: Project Details "Total" row (42:10684) redesigned into a summary footer (Materials / Labor / Countertops with icons, spacer, Total $13,128 at 18px). Spliced into tree.json, 3 icons added.
- Columns filter no longer hides cells in the footer (it has no columns now).
- Diff vs new reference 0.75% (baseline: hover-only ⋯), controls 45/45 acting.

## 2026-09-30 — Tabs: Agenda, Files & Photos; Add Task; task menu
- Tabs render as clones of the drawn active/idle tab; Overview, Agenda, Files & Photos are live, the rest show a "not in this prototype" toast. `?tab=agenda|files` opens a tab directly.
- Agenda tab = the same Agenda card at full width (Task column takes the extra width, other columns keep their Figma widths). "View all" on Overview opens it.
- Add Task modal per staging: Task (select), Due Date (today 08:00), Description; Cancel + Add (disabled until a task is picked). Added tasks appear as real rows (clone of a drawn row), count in "N open tasks · N overdue".
- Task ⋯ menu = designer's spec only: Edit task, Attach file | Mark as idle, Cancel task | Delete. Removed my own Reopen/Resume items.
- Files & Photos tab: staging structure (project groups → Before Photos*, 3D Renderings, 2020 Files, Additional Material Photos; list/grid) in the redesign card style. Counts from the mock: Kitchen 6 before photos, Bathroom 0 (Before photos required), Basement 2. "+" opens Add files; uploads update the tab and the Overview summary card.
- Checks: Overview diff 0.75% (unchanged), controls Overview 54/54, Agenda 28/28, Files 20/20, 0 console errors. scripts/tabs-check.mjs covers the tab flows.

## 2026-09-30 — polish
- Contact ↔ Lead cards: 16 px gap (mock has 0 with 16 px spare on the right) — patch on 25:4990.
- "Add" menu: removed the "1 saved" meta on "From wishlist".

## 2026-09-30 — Add from catalog
- "Add from catalog" (Materials / Labors / Countertops group headers) and item "Replace from catalog" open a catalog picker with the staging layout: toolbar ($ cost / sale toggles, + custom item disabled, filter, In Stock, Brand, Vendor, "Search from +200,000 materials…"; no toolbar for Labors), results, selected-items panel with Reset / OK (disabled until something is picked).
- Instead of staging's "Insufficient permissions", both panes show empty states ("No materials found" / "No item selected").
- scripts/catalog-check.mjs screenshots the three pickers.

## 2026-09-30 — remaining tabs
- Labors / Materials / Countertops: staging structure (price toggles, title, List/Edit; Project select + Add from catalog; groups per project). Kitchen lines from the mock; Bathroom shows only its drawn totals (3 items $1,850 etc.), not itemised; Basement empty. Edit mode = quantity inputs + remove (with Undo); subtotals recompute.
- Payment Plan: plan select pre-set to "2 payments" (from the lead card) + empty state for the schedule (amounts/dates aren't in the mock).
- Signed documents: Agreement · Awaiting signature (from mock/Activity), Agreement Settings (start Oct 3, 2026, 30–35 business days, two checkboxes, notes editor), View agreement / Send with PiSign / Save changes (disabled until changed), Agreement Files (1) → Agreement.pdf.
- Messages: thread shared with the SMS modal (Cheryl's "Thanks, see you tomorrow!"), composer.
- Forms: Credit Card Form with email action (confirm → toast).
- Overview links now open tabs: "2 payments" → Payment Plan, Signed documents / Messages "View all" → their tabs.
- All staging "Insufficient permissions" errors replaced by data or empty states. Controls: every tab 100% acting, 0 console errors; Overview diff 0.62%.

## 2026-09-30 — columns badge + sticky menu
- Columns filter icon shows the count badge (2) by default whenever a column is on (dot replaced by badge).
- Left menu (rail + Operations sidebar) is sticky on every tab; root uses overflow: clip so sticky works.
