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
- User says "program to spec", "reverse engineer", "make a spec", "document this program", "functional specification", "technical specification", "generate a specification"
- Knowledge transfer / handover of legacy ABAP to another team
- Preparing a refactoring or rewrite (need to capture as-is behavior)
- Compliance / audit requires a written spec for custom code
- Building a WRICEF inventory with detailed per-object specs
</Use_When>

<Do_Not_Use_When>
- User wants a **code quality review** → `/sc4sap:analyze-code`
- User wants to **create a new** program from a spec → `/sc4sap:create-program`
- User wants to **fix** the program → direct MCP `Update*` calls or re-run `/sc4sap:create-program`
- Object does not exist yet
</Do_Not_Use_When>

<Socratic_Scope_Narrowing>
The interview is a **funnel**: every turn reduces the remaining decision space. Score remaining ambiguity 0–10 after each answer; stop when **≤3**.

**Default opener — bundled 4-question `AskUserQuestion`** (MANDATORY when the target object is already supplied in `ARGUMENTS`):
Issue ONE `AskUserQuestion` call with these four questions in this exact order — Audience / Format / Depth / Language — each a single-select with "(Recommended)" as the first option. This replaces Rounds 2+3+5 in one UI turn. Only fall back to per-round questioning when the object itself is missing or ambiguous (Round 1) or when the user picks L3/L4 (Round 4 scope trimming).

| # | Header | Question | Options (Recommended first) |
|---|--------|----------|-----------------------------|
| 1 | Audience | Who is the primary audience for the spec? | Both (Recommended) · Functional · Technical |
| 2 | Format | Which output format? | Markdown (Recommended) · Excel · Both |
| 3 | Depth | What depth of detail? | L2 Standard (Recommended) · L1 Overview · L3 Deep Technical · L4 Audit-grade |
| 4 | Language | Output language? | Korean · English · Japanese (order follows user's current language — promote the matching one to first with "(Recommended)") |

**Round 1 — Target object (only if ARGUMENTS did not supply it)**
- "Which object? (program / FM group / class / CDS / RAP BO name)"
- Verify via `SearchObject`. If ambiguous, list candidates.

**Round 2 — Audience + format** *(covered by the default opener — do not ask separately)*
- Audience: **Functional** (business readers — SD/FI/MM users) vs **Technical** (developers) vs **Both**
- Format: **Markdown** (review-friendly, git-friendly) vs **Excel** (project-PMO-friendly, reviewable cell-by-cell)
- Default if user says "up to you" / "you choose" → Both + Markdown.

**Round 3 — Depth (pick one)** *(covered by the default opener)*
| Depth | Contains |
|-------|----------|
| **L1 — Overview** | Purpose, inputs, outputs, 1-paragraph flow |
| **L2 — Standard Spec** (default) | L1 + inputs & screens, data model, main logic steps, authorizations, outputs, exceptions |
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
The 6-step workflow (Step 0 Socratic → Step 5 Review) lives in a companion file to keep this skill doc short.

**MUST read `workflow-steps.md`** (in this skill folder) and execute the steps defined there in order whenever this skill runs.
</Workflow_Steps>

<Spec_Templates>
The Markdown L2 skeleton and the Excel sheet-naming convention live in a companion file.

**MUST read `spec-templates.md`** (in this skill folder) when rendering the artifact in Step 4.
</Spec_Templates>

<Output_Format>
```
Spec generated: ZSDR_OPEN_ORDER_ALV
Depth: L2 Standard · Format: markdown · Lang: ko
Sections: 9 · Tables referenced: 6 · Screens: 1 · GUI status: 1
File: .sc4sap/specs/ZSDR_OPEN_ORDER_ALV-20260414-ko.md

Top-level summary:
  Report that lists open sales orders by Sales Organization and date range and displays them via ALV.
  Main tables: VBAK, VBAP, VBUK, KNA1 (+ CDS I_SalesOrder).
  Authorizations: S_TCODE=ZSDR01, S_TABU_DIS=VBAK.

Next options:
  • "Regenerate as Excel"
  • "Extend to L3 with Where-used"
  • "Add an English version"
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
- `/sc4sap:create-program` — spec → new program (forward direction)
- `/sc4sap:deep-interview` — requirement clarification for new builds
</Related_Skills>

<Data_Extraction_Safety>
Spec generation only reads **source code + DDIC metadata + where-used** — never `GetTableContents` / `GetSqlQuery`. No row data is extracted. The blocklist hook is respected if the user asks for sample data (refuse and document the request in the `Risk & PII` sheet instead).
</Data_Extraction_Safety>

<Inputs_And_Screens_Rendering>
Excel output — the **Selection Screen** and **ALV layout** on the `Inputs & Screens` sheet are rendered as **embedded PNG images** (not cell-border wireframes). Pipeline lives in `scripts/spec/screen-image-renderer.mjs` (SVG templates + headless Edge/Chrome rasterizer); `build()` in `rich-xlsx-template.mjs` consumes the PNG buffers via its `images` parameter.

Mandatory rules (propagate to every per-spec driver):
- **ALV sample rows ≤ 3** (up to 5 only when demonstrating lock / edit / mixed-status variants). Never dump more — the image is a mockup, not a data extract.
- **Color palette = grey + yellow only**. Headers, title bars, table captions use **light grey** (fill 2). Yellow (fill 3 / style 20) is reserved for warning rows. Green fill is retired — do not reintroduce.
- **Yellow warning rows MUST sit at the BOTTOM** of the `Inputs & Screens` sheet (Authority / Auth-check caveats, Data-volume / runtime caveats) — readers scan top→bottom; constraints come last.
- **Informational rows** (Flow diagram, BAPI / Action mapping) above the Parameters table use minimal formatting — no heavy fills, no decorative borders.
- **Fallback**: when rasterization returns null (no headless browser), degrade to legacy cell-border wireframes via `screenFrameRow` / `screenMerge` helpers — never silently omit the screens.

Markdown output — unchanged: continue emitting ASCII wireframes inside fenced code blocks (MD renders them uniformly).
</Inputs_And_Screens_Rendering>

Task: {{ARGUMENTS}}
