# DESIGN — Figma ↔ code dictionary

## Source
- File `vyOOWtUkyDYhIeVOYL6p0b` (PiSuite), page Workspace, frame `19:973` "Lead Overview — Redesign" (1440×2653)
- Bridge: Figma Desktop Bridge (figma-console-mcp) — tree dump → `extraction/tree.json` → `src/figma/tree.json`; icons → `src/figma/icons.json` (SVG per node id); reference PNG → `extraction/figma-lead-overview.png`

## Survey (2026-09-30)
- 1234 nodes; 0 local variables — 153 nodes bound to **library** variables (collections Spacing, Radius, Themes, Stroke, Font Size) whose names are numeric (Spacing/10, Radius/sm) and colour vars are aliases into the library file → colours were harvested from raw values
- Library components used: Button (Icon only / Ghost Muted / xs), Checkbox (With shadow), outline/dots, outline/circle-check; local: Secondary/Primary Button, Icon button, Link Button, icon/*
- Prototype reactions in the mock: only ON_HOVER variant swaps (⋯ buttons, checkboxes); no navigation
- Drawn hidden states: `93:11163` lead card "Show details" (used as fixture), `93:5962` Payment plan summary card (hidden, not used), `36:8413` old Project details (hidden, not used)

## Updates
- 2026-09-30: Lead card replaced by `109:5225` (collapsed `109:3765`, expanded `109:6980` — was `109:4952`; old `109:3835` hidden). Later re-exported in full via Desktop Bridge; rotated icons: exported SVG already contains the rotation. Pulled with the official Figma MCP in chunks (20 KB limit) and spliced into tree.json; expanded-state button contents reused from the collapsed state (MCP returns no instance children in hidden branches). Icons remapped by (parent, name, size); new `icon/home` exported.

## Colour tokens (semantic)
text-primary #1B1D1A · text-secondary #6B7068 · text-muted #4B4B4B · text-meta #424242 · text-heading #252424 · bg-page #F5F4F1 · surface #FFF · bg-subtle #F2F3F0 · bg-table-header #FAFBF9 · bg-expanded #F7F8F5 · border #E6E8E3 · border-tabs #D8DAD5 · border-sidebar #E4E4E7 · border-control rgba(39,39,42,.15) · brand-dark #48443E · success #4D8B22 / bg #EEF6E8 · status-scheduled-bg #C4E19F · warning #B45309 / bg #FFF4E5 · danger #C2410C / bg #FEECE7 · rail-bg #111113 · rail-active #2A2A2E · rail-text #A1A1AA · ai #6D4AFF / bg #F4F1FF / border #E2DBFF
- Other one-off values → `--c-<hex>` vars (auto-generated, see src/index.css)
- Prototype-only (from the Figma action specs, not in this frame): `--color-idle`, `--color-idle-bg`, `--color-danger-solid`, `--color-button-disabled` (disabled Save, from the staging Info dialog)

## Icons
- All page icons exported from Figma as SVG (89 unique). lucide-react only inside menus/dialogs, which are not drawn in this frame.
