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
- Page height = content height on every tab (Content height auto, 48 px bottom padding; root min-height 100vh). Overview is now 2444 px instead of the frame's fixed 2653 — full-page diff vs Figma no longer comparable 1:1 below the content.

## 2026-09-30 — Concept 2 (Figma 124:1753, "Sidebar layout") + concept switch
- Export via the official Figma MCP in 12 chunks (Bridge offline): extraction/assemble_c2.py rebuilds extraction/concept2-export.json from the transcript; scripts/build_concept2.py writes src/figma/tree2.json.
  - Identical widgets (Agenda, Bathroom row) are copied from concept 1; similar ones (sidebar, tabs, search, breadcrumbs, Project Details header/rows/footer, Activity, Messages + Signed documents summaries, Files header) get concept-1 ids by a name-matched walk → every existing handler works unchanged. 40 new icons merged into icons.json.
- LeadOverview takes `concept`; concept-2-only bindings: lead ⋯ menu, Lead edit → Info, Contact edit, Designer value → Pick Assignees, Payment plan → Payment Plan tab, contact values copy on click, Files summary counts (Laundry room kept as drawn), Kitchen row expands into the concept-1 line items, AI Assistant button → assistant card in a side panel.
- Tabs keep the left lead column (tab content replaces the right column).
- App: presenter switch "Concept 1 / Concept 2" (bottom-left, over the sidebar); `?concept=2` in the URL.
- Checks: controls concept 1 54/54, concept 2 40/40 (+ agenda 27/27, files 19/19, materials 19/19), 0 console errors. No 1:1 pixel diff for concept 2 (only a 0.47× Figma preview was available).
- 2026-09-30: concept 2 is Overview-only — other tabs are drawn but inert (no click, default cursor); links into tabs (View all ×4, Payment plan) are inert there too. Concept 1 keeps all tabs.
- 2026-10-01: Signed documents → Agreement Settings: the two checkboxes are stacked (were side by side, misaligned).
- 2026-10-01: Agreement Settings is a single column: start date → 'Buyer is older than 65' → duration → 'Company to pull the permits' → notes.

## 2026-10-01 — Figma sync of 19:973 (concept 1 only)
- Full Bridge dump → scripts/sync.py (99 added / 83 removed / 64 changed). Concept-2 icons restored into icons.json after the sync.
- New in Figma, now in the prototype: Project Details header (3 projects pill · Preview PDF · Add from wishlist · Add project buttons + Show cost / Show sale switches, replacing the columns popover and Add ▾ menu); Agenda "N open tasks" pill; Signed documents widget (Agreement · Not ready, Complete settings, Estimated job start / Duration / Agreement files); updated Upcoming/Done pills; 16 px Contact↔Lead gap now drawn in Figma (prototype patch dropped for concept 1).
- Re-created nodes (AI Assistant, lead wrapper, PD header) are resolved by name now, not by id.
- Concept 2 unchanged: LeadOverview is a factory — concept 1 = makePage(tree.json, latest sync), concept 2 = makePage(tree-c2base.json, the concept-1 snapshot it was built from) + tree2.json. Switching concepts now resets prototype state.
- Checks: concept 1 controls 57/57, concept 2 26/26 (pixel-identical to before except the moved switch), agenda tab 28/28, 0 console errors; scripts/sync-check.mjs covers the new switches/buttons/widget.

## 2026-10-01 — Files & Photos tab reworked after the UX review (both concepts)
- Folder rows: name + "Required" badge (warning style when empty: "Add at least one before photo"), count as text, up to 4 thumbnails + "+N" (open the viewer), labelled "Add photos"/"Add files" button, drag & drop on the whole row. Image-only folders reject non-images ("1 skipped (images only)"). Grid view = folder tiles with a cover.
- Viewer: title "Project · Folder", "3 of 6"; readable name (technical names — UUID, IMG_1234, DSC…, Screenshot… — become "Before photo 3"; the original file name stays in the details); rename (✎, Enter/Esc); "Uploaded by … · date" (+ size for real uploads); Download / Move to folder / Delete (separated, Undo); prev/next + ←/→/Esc; thumbnail strip only for 2+ photos; "Add more".
- Data from the mock: Kitchen 6 before photos by Anna Kovalenko, Sep 29, 2026, 2:40 PM (Activity); Basement 2; Bathroom none. File names are demo names (incl. the UUID case from staging); Basement uploader shown as Test Designer (not in the mock). Real uploads show the real image.
- Overview summary cards (both concepts) count from the same state. Task "Attach file" adds real file items.
- Concept 2: Files & Photos tab enabled (other tabs still inert); "View all" in its Files card opens it.
- Checks: scripts/files-check.mjs; controls c1 57/57, c2 28/28, files tab c1 20/20 · c2 9/9, 0 console errors.
- 2026-10-01: Contact card (concept 1): Call and SMS icons removed from the phone row; hover-only copy stays. Concept 2's contact block never had them.
- 2026-10-01: Project Details — when Total and/or Sales are hidden, the freed width is shared by the remaining data columns (same delta in header and rows, so they stay aligned). Both concepts (switches in concept 1, columns popover in concept 2). scripts/cols-check.mjs.

## 2026-10-01 — Concept 1 now follows "Concept 1 — Option 2" (Figma 184:3568)
- Bridge dump → extraction/c1-option2-export.json; scripts/build_option2.py → src/figma/tree-c1o2.json. Shared widgets (sidebar, top bar, tabs, Project Details, Agenda, Activity, Signed documents widget, Files, Messages, contact rows) get the 19:973 ids by a name-matched walk (586 nodes) → all existing actions work. 56 new icons merged.
- New bindings: merged lead card (name/initials follow the contact; Ask AI → assistant side panel; Assign designer; ⋯ lead menu; Contact ✎ → Edit contact; Lead ✎ → Info; Designer value → Pick Assignees; "2 payments" → Payment Plan tab; contact rows copy on click). Lead stage stepper is static (as drawn).
- Needs attention: header collapses; links run their action by label — Open task → Edit task (overdue task), Assign designer → Pick Assignees, Upload photos → Files & Photos tab, Open estimate → Materials tab; rows resolve and disappear (designer assigned / Bathroom before photos uploaded / overdue task done or cancelled); "N actions" counts live rows; the card hides when nothing is left.
- Project Details "Row / Total" joins the Show cost / Show sale hide + stretch.
- Previous Concept 1 (19:973) kept at ?concept=1&option=1. Concept 2 unchanged.
- Files & Photos: list/grid toggle removed (designer) — list only.
- Checks: controls option 2 57/57, option 1 55/55, concept 2 28/28, 0 console errors; visual compare vs Figma PNG matches (diff noise = 1 px sub-pixel offsets, sticky sidebar, page height).
- 2026-10-01 (re-check): 184:3568 re-exported — Needs attention removed from the design; left column is now a component (226:16901) with Project Details / Agenda / Activity instances (pairs updated in build_option2.py). Needs-attention logic stays dormant (guarded). Controls 52/52, agenda 27/27, files 19/19, concept 2 28/28, option 1 55/55, 0 console errors; visual compare matches (only hover-only ⋯ differ).
- 2026-10-01 (re-check 2): Needs attention is back (new instance 231:19883 — bindings are by name, work unchanged); Lead stage bg updated. Project Details / Agenda column edits in Figma are mid-way (Project column collapsed to 1–8 px, names hidden, ⋯ overflowing) → kept the previous version of both tables until the designer finishes. scripts/compare_export.py added.

## 2026-10-01 — concepts split into separate links
- No more presenter switch. Concept 1: /prototype/concept-1/ (and /prototype/), Concept 2: /prototype/concept-2/. ?concept=2 still works for old links.
- Build: scripts/concept-pages.mjs copies index.html to concept-1/ and concept-2/ (assets use the absolute base; App picks the concept from the path). scripts/concept-url-check.mjs verifies.

## 2026-10-01 — Concept 1 has two variants
- Option 1 = Figma 19:973 (re-synced: breadcrumbs in the top bar, AI Assistant button → side panel, AI card removed from the right column, shared Project Details / Agenda / Activity components), Option 2 = Figma 184:3568.
- scripts/build_option1.py rebuilds tree.json from extraction/c1o1-export.json with a name-matched walk against the previous tree (ids kept → handlers work).
- Both variants use the last complete Project Details + Agenda (the shared components are mid-edit in Figma: Project column collapsed / task names cut).
- Links: /prototype/concept-1/ (Option 1), /prototype/concept-1/option-1/, /prototype/concept-1/option-2/, /prototype/concept-2/; "Option 1 / Option 2" switch on Concept 1 pages (updates the URL; switching resets prototype state).
- Checks: option 1 52/52, option 2 57/57, concept 2 28/28, agenda/files tabs 27/19, 0 console errors; visual compare matches except the in-progress tables.

## 2026-10-01 — Concept 2 re-synced with Figma 124:1753
- Full Bridge dump (extraction/concept2-export.json); scripts/build_concept2.py rewritten: shared widgets map to the current Concept 1 ids (tree.json) → Concept 2 now has Needs attention, the new Project Details header (Preview PDF / Add from wishlist / Add project, Show cost / Show sale switches, Total row), Agenda pill, Signed documents widget. 10 new icons.
- Page2 base = tree.json (was the older snapshot; tree-c2base.json is now only the AI card source for the side panel).
- Lead card has layoutGrow 1 in an auto-height column → flex: none (otherwise it collapses in the browser).
- Basement shows "Before photos required" in Concept 2's design → Concept 2 seeds Basement's 2 files in Additional Material Photos (FILES0_C2).
- Checks: concept 2 30/30, files tab 9/9, concept 1 option 1 52/52, option 2 57/57, 0 console errors; visual compare matches.

## 2026-10-01 — tables fixed in Figma + synced
- Figma (designer's request): Project Details component 226:15063, Default variant — Project column FILL, Materials/Labors/Total/Sales 60, Countertops 84, gap 12, header Status 178 → every row fits and all rows share the same column widths. Agenda component 226:15876 — Created by 120, Due Date 110, Status 110, gap 16 → Task column 266, full task names fit.
- Prototype: fresh Bridge dumps of 19:973 and 184:3568; build_option1 KEEP emptied (tables as drawn); option 2 and concept 2 rebuilt. Controls: option 1 52/52, option 2 57/57, concept 2 30/30, agenda tab 27/27, 0 console errors.

## 2026-10-01 — Files & Photos: list/grid toggle back, grid view reworked (all concepts/variants)
- Staging grid problems: vertical folder names on green bars, full-height empty blocks ("No file found"), UUID names, bin next to download on every card, no count/Required, no drop hint.
- Grid now: folders as horizontal sections (name + Required badge + count + Add photos), photo cards (4:3 thumbnail → viewer, readable name, "Sep 29 · Anna", ⋯ → Open / Download / Delete with Undo), compact dashed drop zone for empty folders (warning style when Before Photos is missing), drag & drop on the whole folder. scripts/grid-check.mjs.

## 2026-10-01 — Labors / Materials / Countertops + catalog reworked (all concepts/variants); Concept 2 lead column pinned
- Tab: title with summary ("Labors · 6 items · $X"), labelled Show cost / Show sale switches; project select and List/Edit mode removed. Per project (Kitchen → Bathroom → Basement): collapsible header with count, subtotal and secondary "Add from catalog" (opens the catalog for that project); lines with inline "– n +" stepper, unit cost / unit price / total, ⋯ → Replace from catalog / Remove (Undo). Bathroom's drawn totals stay as an "Items from the estimate" row, added lines go below it. Empty project → "No labors in Basement yet" + Add from catalog.
- Catalog: "Add labors to [project]" title, categories from staging (sentence case) + search by name/code, one table (name, code, price; cost × multiplier with Show cost), "Add" → stepper in place, row highlighted; selection with steppers, line totals, subtotal, Clear (Undo), single primary "Add N items to <project>". Replace mode: "Replace “X” in Kitchen" + Select. Data: first page of the staging Labors catalog + the mock's lines (lib/estimate.ts); categories without known items show an honest empty state.
- Estimate state lifted to the page (shared by the tab, the catalog and Overview's "Add/Replace from catalog"); Overview's Project Details numbers stay as drawn.
- Concept 2 Overview: lead column (124:2656) sticky at full viewport height with its own scroll; Main/Content overflow hidden → clip so sticky works.
- Checks: option 1 52/52, option 2 57/57, concept 2 30/30, labors tab 19/19, files (c2) 9/9, 0 console errors; add/replace/remove flows clicked through.

## 2026-10-01 — AI Assistant = side panel from Figma 236:4266 (all concepts/variants)
- New frame "AI chat panel — improved" exported via Bridge → src/figma/ai-panel.json (+12 icons); tree-c2base.json (old AI card source) removed.
- Opens from the top bar "AI Assistant" (Option 1, Concept 2) / "Ask AI" (Option 2): full-height 400 px panel on the right, slides in, X / Esc closes; conversation scrolls, footer (prompts + input) stays at the bottom.
- Drawn answer's actions are live: Assign → Pick Assignees (title follows the assigned designer), Open task → scrolls to the overdue task in Agenda and highlights it, Upload → Add files with Bathroom · Before Photos preselected ("N photos uploaded" follows the files). Copy / thumbs up / down work; prompts and the input add new Q&A turns (answers from mockData; "Which designers are free Oct 3?" lists the assignable designers, calendars aren't connected).
- Checks: scripts/ai-panel-check.mjs 3/3; controls option 1 52/52, option 2 57/57, concept 2 30/30, 0 console errors.

## 2026-10-01 — Countertops catalog, Payment Plan, Messages, Forms reworked (all concepts/variants)
- Countertops catalog: first 6 rows of the staging Countertops catalog (thumbnails cropped from the screenshot → public/catalog/ct-*.jpg); staging's repeated titles split into name / size · finish / SKU; categories Cambria / Silestone; Brand, Vendor, In stock only filters + "N of M" count; Show cost → "$90.00 · ×1.8". Narrower nav/selection so names fit on one line. Row 7 of the screenshot was cut off → not added.
- Payment Plan: 1–5 payments (split evenly on change, last payment takes the rounding), share % and amount $ both editable and synced (replaces the %/$ mode toggles), description / due date / method (staging list: N/A, Check, Cash, Wire Transfer, Credit Card, Financing); total row shows what's left or over + "Split evenly"; Save plan is the only primary (disabled until the shares make 100%), Discard changes as secondary (staging: red Reset). Saved plan updates "Payment plan: N payments" on the lead cards. Staging's last column ("FE…", checkbox) is cut off in the screenshot → left out until confirmed.
- Messages: feed like staging (avatar, author, channel, time, message card, attachment cards with Private lock / size / download) + composer (SMS/Email, Attach with Private switch, Enter to send).
- Forms: row shows "Not sent yet" / "Sent to <email> · <time>", labelled Send to client → Resend (confirm + Undo).
- Checks: controls option 1 52/52, option 2 57/57, concept 2 30/30, payment 18/18, messages 19/19, forms 19/19, countertops 19/19; ai-panel 3/3; 0 console errors.

## 2026-10-02 — Icon button (⋯) stroke
- The exporter takes the "Icon button" component for an icon (name starts with "Icon"); its SVG includes the shadow and is 34 px wide, so in the 32 px box the stroke was clipped. FigmaNode now draws Icon button like the other buttons (fill, 1 px stroke rgba(39,39,42,.15), radius 6, shadows, dots) — header ⋯ on Option 1, Option 2 and Concept 2 now matches Figma 206:5637.

## 2026-10-02 — Labors "Add from catalog" redrawn from the staging original (all concepts/variants)
- Designer's request: "поки перемальовуємо те що в оригіналі" → new src/components/LaborsCatalog.tsx, 1:1 with the staging picker in prototype styling: title "Labors"; categories on the left (ALL first, uppercase, active = brand dark); toolbar: $ (cost) / banknote (sale price) toggles, "Search labors", Sub Category, Tags (no options known → placeholder only); table # · LABOR (name + code) · [COST · MULTIPLIER] · PRICE · ACTIONS with editable floating-label fields (cost × multiplier recalculates price) and PICK; right panel: picked items (thumbnail placeholder, name, cost "3.00 USD", − n +, ×) or "No item found"; RESET / OK.
- PICK again = +1; OK adds the picked labors (with edited values) to the project the dialog was opened for; Replace from catalog → PICK reads "Select" and replaces the line. Materials / Countertops keep the reworked picker (CatalogDialog routes by kind and remembers it for the exit animation).
- Checks: scripts/labors-catalog-check.mjs (option 1, option 2 Labors tab; Concept 2 and Option 1 Overview links; Materials still reworked) — all ok, 0 console errors; controls 52/57/30, labors tab 19.

## 2026-10-02 — Option 2: Contact edit button stroke
- In the mock the Contact edit button (206:5963) has its stroke at 15% opacity, the Lead edit button (206:6015) at 100% → prototype draws 206:5963 with the same stroke rgb(231,229,224) 1px.

## 2026-10-02 — Agenda state logic (designer's review + spec), all concepts/variants
- Tasks are data (TASKS0 from the drawn rows); every row is a clone of a drawn row, sorted Overdue → Due today → Upcoming → On hold → Done; Cancelled hidden behind "Show N cancelled tasks" (shown last). Fixes the vanishing on-hold task and the cancelled task jumping to the top.
- States: Upcoming / Due today / Overdue from the date (today = Sep 30, the mock's date — Activity lists Sep 29 as Yesterday → "Prepare estimate" reads Due today); On hold (was Idle; pause icon, date not red), Done (checkbox, toggles back), Cancelled — set by people.
- Counter "N open tasks · M on hold" (open = Upcoming + Due today + Overdue + On hold).
- ⋯ per state: open → Edit · Attach file · Put on hold · Cancel · Delete; On hold → Edit · Attach file · Resume · Cancel · Delete; Done / Cancelled → Reopen · Delete. Toast + Undo after Done, On hold, Cancel, Delete, Reopen (no confirm dialogs). Delete only for the author (current user = Test Designer) — disabled "Author only" otherwise. Resume with a past date opens Edit with "pick a new date" and "Resume task".
- Table header: "Created by" → "Assignee" (values = the drawn names; no assignee data in the mock), select-all checkbox and the unnamed ⋯ column removed (no bulk actions).
- Edit / Add task: the task's own date, US format MM/DD/YYYY + Time (No time default), Task type and Assignee full width (no truncation), "Created by" in the subtitle.
- Checks: scripts/agenda-check.mjs 66/66 (22 per page × option 1, option 2, concept 2); controls 51/56/29, agenda tab 26; 0 console errors.
