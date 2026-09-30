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
