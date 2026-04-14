# Program → Spec — Workflow Steps

Referenced by `SKILL.md`. Follow these 6 steps (Step 0 through Step 5) whenever the skill runs.

**Step 0 — Socratic interview** (see `Socratic_Scope_Narrowing` section in `SKILL.md`)
Never skip unless the user supplies `object=...  depth=L2  format=md  lang=ko` style fully-qualified arguments.

**Step 1 — Inventory** (auto, parallel MCP calls)
- `SearchObject` — confirm object + sub-type
- Metadata: `GetObjectInfo` — package, author, created/changed, transport
- Source:
  - Report/Program: `GetProgFullCode` + `GetIncludesList` → iterate `GetInclude`
  - Class: `ReadClass` (all sections) + `GetLocalDefinitions` / `GetLocalMacros` / `GetLocalTestClass` / `GetLocalTypes`
  - Function Module: `ReadFunctionModule` + function group includes
  - CDS: `ReadView` + `GetMetadataExtension`
  - RAP: `Read BehaviorDefinition` + `Read BehaviorImplementation` + `Read ServiceDefinition` + `Read ServiceBinding`
- Screens / GUI Status / Text Elements (if report / module pool): `GetScreensList`, `GetGuiStatusList`, `GetTextElement`
- Structural: `GetAbapAST`, `GetAbapSemanticAnalysis`
- Impact (only if L3/L4 + user opted in): `GetWhereUsed`, `GetEnhancements`, `GetEnhancementSpot`

**Step 2 — Classify** (auto)
- Object archetype: ALV report / batch job / BDC / FM wrapper / CDS view / RAP BO / enhancement impl / utility class
- Drives which spec template is applied in Step 3.

**Step 3 — Delegate to sap-analyst + sap-writer**
- **sap-analyst** extracts: business purpose, inputs (selection screen / importing params), outputs (ALV cols / exporting params / OData entity), data sources (tables + CDS + BAPIs), main logic narrative, error cases, authorization checks (`AUTHORITY-CHECK` statements).
- **sap-writer** renders into the chosen format (MD or Excel) at the chosen depth + language.
- **sap-critic** gate (only if L4): verifies every claim cross-references a line range.

**Step 3.5 — Draw screens (MANDATORY when screens exist)**

Every Selection-Screen and every output Screen (Dynpro) / ALV must be rendered as a **visual wireframe**, not just described in prose. Use this tiered approach:

1. **ASCII wireframe** — **Markdown output only**. Works inside fenced code blocks where character widths are guaranteed uniform. **Never** put ASCII box-drawing characters (`┌─┐│└┘├┤┬┴┼`) into Excel cells — Excel column widths don't match character widths, so vertical lines misalign and the mock breaks visually. For Excel use real cell borders instead (see the Excel render pipeline in Step 4).
   - Reconstruct layout from `GetScreen` / `ReadScreen` (`HEADER` + `FLOW_LOGIC` + field positions `LINE` / `COLUMN` / `LENGTH` / `HEIGHT`) for Dynpros.
   - Reconstruct Selection-Screen from `PARAMETERS` / `SELECT-OPTIONS` / `SELECTION-SCREEN BLOCK` statements in the source.
   - Reconstruct ALV output from the field catalog (columns + widths + headings).
   - Show label + input box + F4-help marker `[▼]` + mandatory `*`.
2. **Real Excel cell geometry** — **Excel output**. Built inside `screensSheet()` in the per-spec rich driver (Step 4) using fixed column widths + merged block-title rows + left/right-only borders on the frame interior + grey-fill input widgets + ALV grid with all-borders data cells. See the template header in `scripts/spec/rich-xlsx-template.mjs` for the full styles catalog.
3. **Mermaid diagram** (MD output only, when flow matters):
   - `flowchart TD` for screen-to-screen navigation (CALL SCREEN / LEAVE TO / SET SCREEN).
   - `classDiagram` for GUI Status menubar/toolbar/function-key mapping.
   - In Excel, the same flow is drawn as style-21 bordered-box cells connected by plain-text arrows.
4. **Classical Dynpro** → include header line (short description, next-screen, cursor-pos) + flow-logic pseudo-code (`PBO` / `PAI` modules).
5. **GUI Status** → render menubar / application toolbar / function keys as a short table (FKEY → FCODE → text) plus (in MD) an ASCII toolbar bar.

Artifacts produced in this step are placed in the `Screens` section (MD) or `Screens` sheet (Excel). **If no screens exist** (pure class, FM, CDS, RAP without UI), skip this step silently.

**Step 4 — Render**
- **Markdown**: single `.md` with H2 sections per spec dimension, tables for selection-screen / tables / methods / exits.
- **Excel (MANDATORY workflow — standalone rich driver, throwaway)**:

  > **Why a throwaway driver?** The minimal `scripts/spec/build-xlsx.mjs` writer only emits plain text cells — it cannot draw Dynpro frames with real borders, merged cells, or fixed column widths. Without those, Selection-Screen wireframes rendered as ASCII art inside Excel cells break visually (column widths ≠ character widths, vertical lines misalign). So for every Excel spec we generate a **per-spec standalone driver** at a temp path, run it once, then delete it. The driver carries its own rich writer (styles.xml / borders / merges / col widths) plus the spec-specific content inline — nothing to import, nothing to configure, nothing shared between specs.

  Pipeline for each Excel-output spec:

  1. **Copy the template** `scripts/spec/rich-xlsx-template.mjs` to a per-spec driver path:
     - Default: `.sc4sap/specs/_drivers/{OBJECT}-{YYYYMMDD}.mjs`
     - If the user specified an absolute output directory (e.g. `C:\Users\...\Desktop\test`), put the driver next to the target xlsx — it makes cleanup obvious and avoids cluttering the project.
  2. **Fill the two TODO blocks** inside the copy, using the content produced by sap-analyst + sap-writer in Step 3:
     - `SHEETS_DATA` — array of `{ name, rows: [[header...], [row...], ...] }` for text sheets (Overview, Selection Screen table, Data Model, Logic, Outputs, Authorization, Exceptions, plus L3+ sheets — Enhancements / Where-Used / Includes & Artifacts / Risk & PII).
     - `screensSheet()` — build Selection-Screen + ALV using the styles catalog documented in the template header. **Never** place ASCII box-drawing characters (`┌─┐│└┘├┤┬┴┼`) inside data cells — they misalign across variable column widths. Use:
       - Fixed-width columns tuned to ALV column content (`cols: [{min, max, width}, ...]`).
       - Merged block-title rows with style 17 (bold + grey fill + top+left+right border).
       - Interior frame rows with style 9 on column A (left border only) and style 10 on column R (right border only).
       - Closing frame rows with style 15 (bottom+left) / 12 (bottom only) / 16 (bottom+right).
       - Input fields as merged cells with style 6 (grey fill + all borders + center).
       - ALV headers with style 4 (bold + grey + all borders + center).
       - ALV data cells with style 5 (all borders + center); use style 20 (soft yellow) for cells that deserve highlight (e.g. "In Transit" status).
       - Screen-flow diagram as style-21 boxes linked by plain-text arrows (" — F8 Execute → ").
     - `OUT_PATH` — absolute path the user asked for (or the default `.sc4sap/specs/{object}-{YYYYMMDD}-{lang}.xlsx`).
  3. **Run the driver**:
     ```bash
     node <driver>.mjs
     ```
     The driver writes the xlsx and auto-opens it in the OS default handler (Excel / LibreOffice) — the built-in `openInDefault()` spawns `cmd.exe /c start "" <path>` on Windows, `open` on macOS, `xdg-open` on Linux, detached + `unref()`'d so Claude Code doesn't block.
  4. **Verify the artifact** — `ls` the output path; confirm file size > 0 and that the file is a valid zip (`unzip -l` should list `[Content_Types].xml`, `xl/styles.xml`, `xl/worksheets/sheet*.xml`).
  5. **Delete the driver** — the xlsx is the deliverable; the driver is scaffolding. Remove it with the Bash tool so the output directory stays clean.
     ```bash
     rm <driver>.mjs
     ```
     If verification in step 4 fails, keep the driver for debugging and tell the user the path.

  **Zero external npm dependencies** — the template uses only `node:zlib` + `node:fs` + `node:child_process` + `node:os`. This exists because some SAP customer networks block `registry.npmjs.org`, so the plugin must work fully offline after `git clone`.

  Sheets (same set regardless of writer):
  1. `Overview` — metadata, purpose, archetype
  2. `Selection Screen` — parameters / select-options with datatype, required, default
  3. `Data Model` — tables / CDS / structures accessed (R/W)
  4. `Logic` — numbered step list with line refs
  5. `Outputs` — ALV field catalog / exporting params / OData fields
  6. `Authorization` — S_TCODE, S_TABU_DIS, custom objects
  7. `Exceptions` — message/class + trigger condition
  8. `Enhancements` — BAdI / User Exit / BTE impacts (L3+)
  9. `Where-Used` — callers (L3+ if opted in)
  10. `Includes & Artifacts` — Screen / GUI Status / Text Element (L3+)
  11. `Risk & PII` — blocklist-relevant tables touched (L4)
  12. `Screens` — **wireframe images** (ASCII + SVG for Selection-Screen, Dynpros, ALV layout, GUI Status), one screen per row with an embedded picture column

**Step 5 — Review loop**
- Show a table of contents + first section inline.
- Ask: "OK to finalize, or trim/expand a section?"
- On confirm → write file → print absolute path.
