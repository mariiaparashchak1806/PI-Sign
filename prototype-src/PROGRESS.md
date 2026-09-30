# Progress

## Completed Screens
| Screen | Route | Date | Verified vs Figma? | Notes |
|---|---|---|---|---|
| Lead Overview (19:973) | `/` | 2026-09-30 | Yes — Level 1: pixel diff 0.59 % (remainder: text anti-aliasing), DOM rects within 1 px; built output re-verified | 45/45 controls act; 0 console errors; fixture `details` |
| ↳ Lead card v2 + edit dialogs + contact hover | `/` | 2026-09-30 | Yes — re-diffed against new export | Lead card re-extracted via official Figma MCP (Bridge was disconnected) |

## Next Up
- Client review of the clickable prototype
- Tabs (Agenda, Files & Photos, …) once designed

## Known Issues
- Mail row: the mock draws its hover fill permanently; prototype shows it on hover only (designer request)
- Page is fixed-width 1440 px (replica of the desktop frame) — horizontal scroll below that
- Totals don't recalculate when a line item/project is removed or a status changes (mock numbers are static)
- Mock content questions → see Deviations in the hand-off message / DESIGN.md
