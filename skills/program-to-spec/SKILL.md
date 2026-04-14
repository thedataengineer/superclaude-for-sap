---
name: sc4sap:program-to-spec
description: Reverse-engineer an ABAP program into a Functional/Technical Specification artifact (Markdown or Excel). Socratic scope narrowing from "everything" to "only what the user needs".
level: 2
---

# SC4SAP Program → Specification

Reads an existing ABAP program (Report / Module Pool / FM Group / Class / CDS / RAP) via MCP, runs structural + semantic + where-used analysis, then produces a Specification artifact in **Markdown** (`.md`) or **Excel** (`.xlsx`) format. Scope is **negotiated Socratically** — start wide, narrow on each turn, stop when the user's target granularity is confirmed.

<Purpose>
Turn legacy or unfamiliar ABAP objects into a reviewable Functional/Technical Spec for handover, documentation audit, AMS transition, refactoring preparation, or compliance artifacts. Unlike `analyze-code` (quality-focused), this skill is **documentation-focused**: it describes what the program DOES, not what's wrong with it.
</Purpose>

<Use_When>
- User says "program to spec", "reverse engineer", "make a spec", "document this program", "기능명세서", "기술명세서", "specification 뽑아줘"
- Knowledge transfer / handover of legacy ABAP to another team
- Preparing a refactoring or rewrite (need to capture as-is behavior)
- Compliance / audit requires a written spec for custom code
- Building a WRICEF inventory with detailed per-object specs
</Use_When>

<Do_Not_Use_When>
- User wants a **code quality review** → `/sc4sap:analyze-code`
- User wants to **create a new** program from a spec → `/sc4sap:program`
- User wants to **fix** the program → `/sc4sap:ralph`
- Object does not exist yet
</Do_Not_Use_When>

<Socratic_Scope_Narrowing>
The interview is a **funnel**: every turn reduces the remaining decision space. Do not ask all questions at once. Score remaining ambiguity 0–10 after each answer; stop when **≤3**.

**Round 1 — Target object (1 question)**
- "Which object? (program / FM group / class / CDS / RAP BO name)"
- Verify via `SearchObject`. If ambiguous, list candidates.

**Round 2 — Audience + format (1 question, 2 choices each)**
- Audience: **Functional** (business readers — SD/FI/MM users) vs **Technical** (developers) vs **Both**
- Format: **Markdown** (review-friendly, git-friendly) vs **Excel** (project-PMO-friendly, reviewable cell-by-cell)
- Default if user says "알아서" / "you choose" → Both + Markdown.

**Round 3 — Depth (pick one)**
| Depth | Contains |
|-------|----------|
| **L1 — Overview** | Purpose, inputs, outputs, 1-paragraph flow |
| **L2 — Standard Spec** (default) | L1 + selection screen, data model, main logic steps, authorizations, outputs, exceptions |
| **L3 — Deep Technical** | L2 + every subroutine/method signature, SQL inventory, BAdI/exit list, where-used, performance notes |
| **L4 — Audit-grade** | L3 + line-level cross-references, risk register, data-privacy mapping (PII tables touched), transport history |

**Round 4 — Scope trimming (only if L3/L4)**
Ask ONE narrowing question per turn until ambiguity ≤3:
- "Include internal FORMs/methods or public surface only?"
- "Include unit tests inventory?"
- "Include generated artifacts (Screens / GUI Status / Text Elements)?"
- "Include `GetWhereUsed` callers? (expensive for popular objects)"
- "Cover all includes or just main?"

**Round 5 — Output location**
- Default: `.sc4sap/specs/{object_name}-{YYYYMMDD}-{lang}.{md|xlsx}`
- Language: ko / en / ja (infer from user's current language; confirm once).

**Stop condition**: every dimension above has a concrete answer OR user explicitly says "skip remaining, use defaults".
</Socratic_Scope_Narrowing>

<Workflow_Steps>

**Step 0 — Socratic interview** (see Socratic_Scope_Narrowing)
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

1. **ASCII wireframe** (always produced — works in MD, Excel cells, plain text):
   - Reconstruct layout from `GetScreen` / `ReadScreen` (uses `HEADER` + `FLOW_LOGIC` + field positions `LINE` / `COLUMN` / `LENGTH` / `HEIGHT`) for Dynpros.
   - Reconstruct Selection-Screen from `PARAMETERS` / `SELECT-OPTIONS` / `SELECTION-SCREEN BLOCK` statements in the source.
   - Reconstruct ALV output from field catalog (columns + widths + headings).
   - Box-drawing chars (`┌─┐│└┘├┤┬┴┼`), one field per row or per `LINE`, show label + input box + F4-help marker `[▼]` + mandatory `*`.
2. **Mermaid diagram** (for MD output, when flow matters):
   - `flowchart TD` for screen-to-screen navigation (CALL SCREEN / LEAVE TO / SET SCREEN).
   - `classDiagram` for GUI Status menubar/toolbar/function-key mapping.
3. **SVG render** (optional, when user asked for "그림" / "image" / "picture" / L3+ / Excel output):
   - Generate via `scripts/spec/draw-screen.mjs` (pure Node, no external binary) → produces `.sc4sap/specs/assets/{object}_{screen_no}.svg`.
   - Embed in MD: `![Screen 0100](assets/ZSDR_OPEN_ORDER_ALV_0100.svg)`.
   - Embed in Excel: insert as image anchored to a dedicated `Screens` sheet via `worksheet.addImage()` (exceljs).
4. **Classical Dynpro** → include header line (short description, next-screen, cursor-pos) + flow-logic pseudo-code (`PBO` / `PAI` modules).
5. **GUI Status** → render menubar / application toolbar / function keys as an ASCII bar + a table of FKEY → FCODE → text.

Artifacts produced in this step are placed in the `Screens` section (MD) or `Screens` sheet (Excel). **If no screens exist** (pure class, FM, CDS, RAP without UI), skip this step silently.

**Step 4 — Render**
- **Markdown**: single `.md` with H2 sections per spec dimension, tables for selection-screen / tables / methods / exits.
- **Excel**: multi-sheet `.xlsx` via `scripts/spec/build-xlsx.mjs`. **Zero external npm dependencies** — the script is a self-contained pure-Node XLSX writer that uses only Node built-ins (`node:zlib` for DEFLATE, manual CRC32 table + ZIP central-directory assembly). This exists because some SAP customer networks block `registry.npmjs.org` — the plugin must work fully offline after `git clone`.
  - **Auto-open on completion** (MANDATORY): after the file is written, call `openInDefaultApp(outPath)` from the same module — it `spawn`s `cmd.exe /c start "" <path>` on Windows, `open` on macOS, `xdg-open` on Linux, detached + `unref()`'d so Claude Code doesn't block. The user sees the spec open in Excel / LibreOffice / default handler immediately. Pass `open: false` (API) or `--no-open` (CLI) only if the user explicitly asked to just write the file.
  - Sheets:
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

</Workflow_Steps>

<Spec_Templates>

### Markdown — L2 Standard Spec skeleton

```markdown
# Specification: {OBJECT_NAME}

- **Type**: {Report | Class | FM | CDS | RAP BO}
- **Package**: {PKG} · **Transport (original)**: {TR}
- **Author / Changed**: {user} / {date}
- **Archetype**: {ALV report | Batch | BDC | ...}
- **Purpose (1–2 sentences)**: ...

## 1. Business Context
## 2. Inputs — Selection Screen / Importing Parameters
| Field | Type | Required | Default | Description |
## 3. Data Model
| Table / CDS | Access | Key Fields | Notes |
## 4. Main Logic (step-by-step)
## 5. Outputs
## 6. Authorizations
## 7. Exceptions & Messages
## 8. Dependencies (BAPIs, RFCs, enhancements)
## 9. Screens (wireframes)
### 9.1 Selection-Screen 1000
```
┌─ Open Sales Order (ZSDR_OPEN_ORDER_ALV) ──────────────────┐
│  * Sales Organization  [____] [▼]                          │
│  * Document Date       [__________] to [__________] [▼]    │
│    Sold-to Party       [__________] to [__________] [▼]    │
│    Only open items     [X]                                 │
└────────────────────────────────────────────────────────────┘
  [F8 Execute]  [F3 Back]  [Shift+F1 Variant]
```
### 9.2 Output — ALV 0100
```
┌──────────┬──────────┬────────────┬──────────┬────────┬──────────┐
│ SalesOrd │ Item     │ Material   │ Qty      │ UoM    │ NetValue │
├──────────┼──────────┼────────────┼──────────┼────────┼──────────┤
│ 0000012… │ 000010   │ MAT-001    │   10.000 │ EA     │  1,200.00│
└──────────┴──────────┴────────────┴──────────┴────────┴──────────┘
```
### 9.3 Screen-flow
```mermaid
flowchart LR
  A[Selection 1000] -->|F8| B[ALV 0100]
  B -->|Double-click| C[VA03 VBAK]
```
## 10. Open Questions / Assumptions
```

### Excel — sheet naming convention

Sheets named in chosen language; examples for ko:
`개요`, `선택화면`, `데이터모델`, `처리로직`, `출력`, `권한`, `예외`, `확장점`, `어디서사용`, `부속오브젝트`, `리스크·PII`.

</Spec_Templates>

<Output_Format>
```
Spec generated: ZSDR_OPEN_ORDER_ALV
Depth: L2 Standard · Format: markdown · Lang: ko
Sections: 9 · Tables referenced: 6 · Screens: 1 · GUI status: 1
File: .sc4sap/specs/ZSDR_OPEN_ORDER_ALV-20260414-ko.md

Top-level summary:
  미결 판매오더를 영업조직·기간 기준으로 조회하여 ALV로 출력하는 리포트.
  주요 테이블: VBAK, VBAP, VBUK, KNA1 (+ CDS I_SalesOrder).
  권한: S_TCODE=ZSDR01, S_TABU_DIS=VBAK.

Next options:
  • "Excel 로 다시 뽑아줘"
  • "Where-used 추가해서 L3 로 확장"
  • "English 버전 추가"
```
</Output_Format>

<MCP_Tools_Used>
- `SearchObject`, `GetObjectInfo`
- `GetProgFullCode`, `GetIncludesList`, `GetInclude`
- `ReadClass`, `ReadFunctionModule`, `ReadInterface`, `ReadView`
- `Read BehaviorDefinition`, `Read BehaviorImplementation`, `Read ServiceDefinition`, `Read ServiceBinding`
- `GetLocalDefinitions`, `GetLocalMacros`, `GetLocalTestClass`, `GetLocalTypes`
- `GetScreensList`, `GetGuiStatusList`, `GetTextElement`
- `GetMetadataExtension`
- `GetAbapAST`, `GetAbapSemanticAnalysis`
- `GetWhereUsed`, `GetEnhancements`, `GetEnhancementSpot`
</MCP_Tools_Used>

<Related_Skills>
- `/sc4sap:analyze-code` — code quality review (what's wrong)
- `/sc4sap:program` — spec → new program (forward direction)
- `/sc4sap:deep-interview` — requirement clarification for new builds
- `/sc4sap:ask` — single-question routing
</Related_Skills>

<Data_Extraction_Safety>
Spec generation only reads **source code + DDIC metadata + where-used** — never `GetTableContents` / `GetSqlQuery`. No row data is extracted. The blocklist hook is respected if the user asks for sample data (refuse and document the request in the `Risk & PII` sheet instead).
</Data_Extraction_Safety>

Task: {{ARGUMENTS}}
