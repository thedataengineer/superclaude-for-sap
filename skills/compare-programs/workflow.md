# Workflow Steps

## Step 0 — Trust Session (mandatory, see SKILL.md)

Invoke `/sc4sap:trust-session` with `parent_skill=sc4sap:compare-programs`. Skip silently if already trusted within 24h.

## Step 1 — Program Input (confirm or ask)

**Accepts**:
- User passes 2–5 program names in the initial argument: `"compare ZMMR_GR_LIST and ZCOR_GR_LIST"` / `"ZMMR_GR_LIST, ZCOR_GR_LIST, ZFIR_GR_LIST"`.
- User passes nothing → ask (in the user's current conversation language): *"Which 2–5 programs should I compare? (comma-separated, e.g. ZMMR_GR_LIST, ZCOR_GR_LIST)"*.

**Validation**:
1. For each name, call `SearchObject` to resolve the ADT object type (REPS / CLAS / FUGR / CDS).
2. If a name is ambiguous or missing → list candidates, ask user to choose.
3. If user provides only 1 → suggest `/sc4sap:program-to-spec` instead and stop.
4. If user provides > 5 → ask to trim, or propose splitting into multiple comparison sessions.

Store the confirmed list as `compared_objects` (array of `{name, type, package}`).

## Step 2 — Scope Confirmation

Show the **Scope Prompt** from `comparison-scope.md` with defaults pre-ticked. Render the prompt in the user's current conversation language. Wait for user response. Accept `ok` / `proceed` / `+N` / `-N` / `only N,M` / `all` (and equivalent phrasings in other languages).

Store the confirmed dimension set as `active_dimensions` (subset of 1–10). Echo back one line confirming the selection, e.g.: *"Dimensions confirmed: 1·2·3·5·6·7·10 (7 of 10). Starting analysis."*

## Step 3 — Read Phase (parallel, MCP)

Fire in parallel (one batch per program):

- **Source code**:
  - REPS → `GetProgFullCode` + `GetIncludesList` + per-include `GetInclude`
  - CLAS → `ReadClass`
  - FUGR → `ReadFunctionGroup` + constituent FMs via `ReadFunctionModule`
  - CDS → `ReadView` + `GetMetadataExtension`
- **Structural**:
  - `GetAbapAST` (for SELECT/AUTHORITY-CHECK extraction)
  - `GetObjectInfo` (package, author, transport history)
- **UI surface** (if applicable):
  - `GetScreensList` + per-screen `GetScreen`
  - `GetGuiStatusList`
  - `GetTextElement`
- **Enhancement surface** (only if dim 8 active):
  - `GetEnhancements`, `GetEnhancementImpl`, `GetEnhancementSpot`
- **Where-used** (only if user asked to include callers):
  - `GetWhereUsed`

Do NOT call `GetTableContents` or `GetSqlQuery` under any circumstance.

## Step 4 — Analyze Phase (agent pipeline)

Run in this order:

1. **Structural extraction** — dispatch `sap-code-reviewer` (with `mode: "dontAsk"`) per program in parallel. Task: "Extract facts only — selection-screen fields, main tables/CDS used, AUTHORITY-CHECK list, ALV output columns, computation narrative (1 paragraph). NO quality scoring."
2. **Module classification** — `sap-analyst` decides each program's primary module based on package prefix, table families touched, and TITLE wording.
3. **Module-specialist pass** (conditional) — for each distinct module in scope, dispatch the matching `sap-{module}-consultant` with the extracted facts and ask: *"Explain this program's business purpose from a {module} consultant's view. 2–3 sentences. What would a {module} user use this for vs. skip it for?"*.
4. **Dimension scoring** — `sap-analyst` scores each active dimension × each program with ✅ / 🔷 / ⚠️ / ❓ per `comparison-scope.md` rubric.
5. **Executive Summary drafting** — `sap-analyst` writes 3-sentence summary driven by the ⚠️ rows. Headline = the single biggest divergence.
6. **Recommendation drafting** — `sap-analyst` writes "when to use which" matrix (one row per program, one column per likely use-case).

All agents respond in the user's current conversation language (see SKILL.md `Language_Policy`).

## Step 5 — Render Phase

`sap-writer` receives:
- the scored dimension matrix,
- per-program narratives,
- the Executive Summary and Recommendation drafts,
- `report-template.md` as the skeleton.

Renders the Markdown and writes it to `.sc4sap/comparisons/{filename}.md` (path rule in SKILL.md).

Emit a concise completion block to the user (in the user's current conversation language — English skeleton below):

```
Comparison report generated.
File: .sc4sap/comparisons/ZMMR_GR_LIST__vs__ZCOR_GR_LIST-20260419.md
Dimensions: 7 · Divergent: 3 · Variant: 2 · Same: 2
Key divergence: ZMMR = quantity-centric (MSEG, M_MSEG_WWA) / ZCOR = cost-value-centric (ACDOCA, F_BKPF_*)
```

## Step 6 — Follow-up Options (offer, don't execute)

Present as a short menu (localized to the user's language at render time):

- Deeper analysis of a specific dimension — user specifies the number
- Add more programs to the comparison (current N → up to 5)
- Convert to Excel (.xlsx) *(deferred — stub for future parity with program-to-spec)*
- Generate the report in another language
- Add Where-used analysis to compare actual call-site frequency
- Derive a consolidation / split recommendation report from the findings

Wait for user instruction — do not loop automatically.

## Safety Rails

- Blocklist: `GetTableContents` / `GetSqlQuery` are **forbidden** in this skill.
- Country/Industry context: if dimension 9 is active, load `country/<iso>.md` based on `.sc4sap/config.json` → `country` (or `sap.env` → `SAP_COUNTRY`). If unset, ask once for the relevant country list.
- Module activation: respect `common/active-modules.md` — if a consulted module is not active in the project, flag with "(module not active in this landscape — observation only)".
- Per-call transports: this skill is **read-only** — never create or modify transports.
