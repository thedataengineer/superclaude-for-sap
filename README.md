English | [한국어](README.ko.md) | [日本語](README.ja.md)

# SuperClaude for SAP (sc4sap)

> Claude Code plugin for SAP ABAP development — SAP ECC / S/4HANA On-Premise / S/4HANA Cloud (Public & Private)

[![npm version](https://img.shields.io/badge/npm-v4.11.5-cb3837?logo=npm&logoColor=white)](https://www.npmjs.com/package/superclaude-for-sap) 
[![GitHub stars](https://img.shields.io/github/stars/babamba2/superclaude-for-sap?style=flat&color=yellow)](https://github.com/babamba2/superclaude-for-sap)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## What is sc4sap?

SuperClaude for SAP transforms Claude Code into a full-stack SAP development assistant. It connects to your SAP system via the [MCP ABAP ADT server](https://github.com/babamba2/abap-mcp-adt-powerup) (150+ tools) to create, read, update, and delete ABAP objects directly — classes, function modules, reports, CDS views, Dynpro, GUI status, and more.

### Core Capabilities

| Capability | What it does | Skill |
|------------|--------------|-------|
| **🔌 Auto MCP Install** | `abap-mcp-adt-powerup` is auto-installed, configured, and connection-tested during setup. No manual MCP wiring, no `claude_desktop_config.json` editing — credentials go to `.sc4sap/sap.env` and the hook/blocklist layers register themselves. | `/sc4sap:setup` |
| **🏗️ Formatted Auto Program Maker** | Builds ABAP programs end-to-end following sc4sap conventions: Main + conditional Includes (t/s/c/a/o/i/e/f/_tst), OOP or Procedural split (`LCL_DATA` / `LCL_ALV` / `LCL_EVENT`), full ALV (CL_GUI_ALV_GRID + Docking) or SALV, mandatory Text Elements & CONSTANTS, Dynpro + GUI Status, ABAP Unit tests — all platform-aware (ECC / S4 On-Prem / Cloud). | `/sc4sap:program`, `/sc4sap:autopilot` |
| **🔍 Program Analyze** | Reverse-direction intelligence: read any ABAP object via MCP, run Clean ABAP / performance / security review, or reverse-engineer a program into a Functional / Technical Spec (Markdown or Excel) with Socratic scope narrowing. | `/sc4sap:analyze-code`, `/sc4sap:program-to-spec` |
| **🩺 Maintenance Diagnosis** | Operational triage loop: inspect ST22 dumps, SAT-style profiler traces, logs, and where-used graphs directly from Claude; narrow hypotheses, surface SAP Note candidates, and diagnose plugin / MCP / SAP connectivity health. | `/sc4sap:analyze-symptom`, `/sc4sap:sap-doctor` |

## Requirements

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-339933?logo=node.js&logoColor=white)
![Claude Code](https://img.shields.io/badge/Claude_Code-CLI-6B4FBB?logo=anthropic&logoColor=white)
![SAP ECC](https://img.shields.io/badge/SAP-ECC_6.0-0FAAFF?logo=sap&logoColor=white)
![SAP S/4HANA](https://img.shields.io/badge/SAP-S%2F4HANA_On--Premise-0FAAFF?logo=sap&logoColor=white)
![SAP S/4HANA Cloud](https://img.shields.io/badge/SAP-S%2F4HANA_Cloud-0FAAFF?logo=sap&logoColor=white)
![MCP ABAP ADT](https://img.shields.io/badge/MCP_ABAP_ADT-Auto--Installed-FF6600)

| Requirement | Details |
|-------------|---------|
| **Node.js** | >= 20.0.0 |
| **Claude Code** | CLI installed (Max/Pro subscription or API key) |
| **SAP System** | **SAP ECC 6.0** / **S/4HANA On-Premise** / **S/4HANA Cloud (Public & Private)** — ADT enabled |

> **MCP Server** ([abap-mcp-adt-powerup](https://github.com/babamba2/abap-mcp-adt-powerup)) is **automatically installed and configured** during `/sc4sap:setup` — no manual pre-install required.

## Installation

> **Note** — sc4sap is **not yet on the official Claude Code plugin marketplace**. For now, add this repository as a custom marketplace in Claude Code, then install the plugin from it.

### Option A — Add as custom marketplace (recommended)

Inside a Claude Code session, run:

```
/plugin marketplace add https://github.com/babamba2/superclaude-for-sap.git
/plugin install sc4sap
```

To update later:

```
/plugin marketplace update babamba2/superclaude-for-sap
/plugin install sc4sap
```

### Option B — Install from source

```bash
git clone https://github.com/babamba2/superclaude-for-sap.git
cd superclaude-for-sap
npm install && npm run build
```

Then point Claude Code at the local plugin directory via `/plugin marketplace add <local-path>`.

## Setup

```bash
# Run the setup skill — walks you through the wizard one question at a time
/sc4sap:setup
```

### Subcommands

```bash
/sc4sap:setup              # full wizard (default)
/sc4sap:setup doctor       # route to /sc4sap:sap-doctor
/sc4sap:setup mcp          # route to /sc4sap:mcp-setup
/sc4sap:setup spro         # SPRO config auto-extraction only
```

### Wizard Steps

The wizard asks **one question at a time** — never dumps the whole questionnaire. Existing values in `.sc4sap/sap.env` / `.sc4sap/config.json` are shown so you can press Enter to keep them.

| # | Step | What happens |
|---|------|--------------|
| 1 | **Version check** | Verify Claude Code version compatibility |
| 2 | **SAP system version** | Choose `S4` (S/4HANA — BP, MATDOC, ACDOCA, Fiori, CDS) or `ECC` (ECC 6.0 — XK01/XD01, MKPF/MSEG, BKPF/BSEG). Then enter **ABAP Release** (e.g., `750`, `756`, `758`). Drives which SPRO tables / BAPIs / TCodes agents reference and which ABAP syntax features are allowed |
| 3 | **Install MCP server** | Clone + build `abap-mcp-adt-powerup` into `<PLUGIN_ROOT>/vendor/abap-mcp-adt/`. Skipped if already installed (`--update` to refresh) |
| 4 | **SAP connection** | Asked one field per question — `SAP_URL`, `SAP_CLIENT`, `SAP_AUTH_TYPE` (`basic` / `xsuaa`), `SAP_USERNAME`, `SAP_PASSWORD`, `SAP_LANGUAGE`, `SAP_SYSTEM_TYPE` (`onprem` / `cloud`), `SAP_VERSION`, `ABAP_RELEASE`, `TLS_REJECT_UNAUTHORIZED` (dev only). Written to `.sc4sap/sap.env`. Optional L4 MCP-server blocklist vars (`MCP_BLOCKLIST_PROFILE`, `MCP_BLOCKLIST_EXTEND`, `MCP_ALLOW_TABLE`) are written as commented examples |
| 5 | **Reconnect MCP** | Prompt to run `/mcp` so the newly installed server starts |
| 6 | **Test connection** | `GetSession` round-trip against SAP |
| 7 | **Confirm system info** | Show system ID, client, user |
| 8 | **ADT authority check** | `GetInactiveObjects` to verify ADT permissions |
| 9 | **Create `ZMCP_ADT_UTILS`** | Required utility function group (package `$TMP`, local-only). Creates `ZMCP_ADT_DISPATCH` (Screen / GUI Status dispatcher) and `ZMCP_ADT_TEXTPOOL` (Text Pool R/W), both **RFC-enabled** and activated. Skipped if the FG already exists |
| 10 | **Write `config.json`** | Plugin-side config with `sapVersion` + `abapRelease` (synced with `sap.env`) |
| 11 | **SPRO extraction (optional)** | Prompt `y/N` — initial extraction is token-heavy but the resulting `.sc4sap/spro-config.json` cache dramatically reduces future token usage. Skipping is fine; static `configs/{MODULE}/*.md` references still work. Runs module-parallel via `scripts/extract-spro.mjs` |
| 12 | **🔒 Blocklist hook (MANDATORY)** | **(a)** Pick profile — `strict` (default, everything) / `standard` (PII + credentials + HR + transactional finance) / `minimal` (PII + credentials + HR + Tax only) / `custom` (user list in `.sc4sap/blocklist-custom.txt`). **(b)** Install via `node scripts/install-hooks.mjs` (user-level) or `--project` (project-level). **(c)** Smoke-test with a BNKA payload, expect `permissionDecision: deny`. **(d)** Print final hook entry + extend / custom file status. Setup does not complete unless this succeeds |

> **Two blocklist layers, configured separately**
> - **L3 (step 12)** — Claude Code `PreToolUse` hook, profile in `.sc4sap/config.json` → `blocklistProfile`. Fires for any Claude Code session, regardless of MCP server.
> - **L4 (step 4, optional)** — MCP-server internal guard, profile in `sap.env` → `MCP_BLOCKLIST_PROFILE`. Applies only to `abap-mcp-adt-powerup`.
>
> Typical: L3 `strict`, L4 `standard`. Change L3 by re-running `/sc4sap:setup`; change L4 via `/sc4sap:sap-option`.

### After Setup

- Verify health: `/sc4sap:sap-doctor`
- Rotate credentials / adjust L4 blocklist: `/sc4sap:sap-option`
- Re-extract SPRO later: `/sc4sap:setup spro`

## Features

### 24 SAP-Specialized Agents

| Category | Agents |
|----------|--------|
| **Core (10)** | Analyst, Architect, Code Reviewer, Critic, Debugger, Doc Specialist, Executor, Planner, QA Tester, Writer |
| **Basis (1)** | BC Consultant — system admin, transport management, diagnostics |
| **Modules (14)** | SD, MM, FI, CO, PP, PS, PM, QM, TR, HCM, WM, TM, Ariba, BW |

### 17 Skills

| Skill | Description |
|-------|-------------|
| `sc4sap:setup` | Plugin setup — auto-installs `abap-mcp-adt-powerup` MCP server, generates SPRO config, installs blocklist hook |
| `sc4sap:mcp-setup` | Standalone MCP ABAP ADT server install / reconfigure guide |
| `sc4sap:sap-option` | View / edit `.sc4sap/sap.env` (credentials, blocklist profile, whitelists) |
| `sc4sap:sap-doctor` | Plugin + MCP + SAP connection diagnostics |
| `sc4sap:create-object` | ABAP object creation (hybrid mode — transport + package confirm, create, activate) |
| `sc4sap:program` | Full ABAP program pipeline — Main+Include, OOP/Procedural, ALV, Dynpro, Text Elements, ABAP Unit |
| `sc4sap:program-to-spec` | Reverse-engineer an ABAP program into a Functional/Technical Spec (Markdown / Excel) |
| `sc4sap:analyze-code` | ABAP code analysis & improvement (Clean ABAP / performance / security) |
| `sc4sap:analyze-symptom` | Step-by-step SAP operational error/symptom analysis (dumps, logs, SAP Note candidates) |
| `sc4sap:autopilot` | Full autonomous execution pipeline — idea → activated, tested ABAP |
| `sc4sap:ralph` | Persistent self-correcting loop until syntax clean + activation + unit tests pass |
| `sc4sap:ralplan` | Consensus-based planning gate (analyst / architect / critic convergence) |
| `sc4sap:deep-interview` | Socratic requirements gathering before implementation |
| `sc4sap:ask` | Question routing to appropriate expert agent |
| `sc4sap:team` | Coordinated parallel agent execution (native Claude Code teams) |
| `sc4sap:teams` | CLI team runtime (tmux-based process-parallel execution) |
| `sc4sap:release` | CTS transport release workflow (validate, release, import monitor) |

### MCP ABAP ADT Server — Unique Capabilities

sc4sap is backed by **[abap-mcp-adt-powerup](https://github.com/babamba2/abap-mcp-adt-powerup)**, an extended ADT MCP server (150+ tools). Beyond the usual Class / Program / Table / CDS / Function Module CRUD found in standard ADT MCPs, it adds **full Read / Update / Create coverage for classic Dynpro artifacts** that most MCP servers don't touch:

| Artifact | Read | Create | Update | Delete | Notes |
|----------|------|--------|--------|--------|-------|
| **Screen (Dynpro)** | `GetScreen`, `ReadScreen`, `GetScreensList` | `CreateScreen` | `UpdateScreen` | `DeleteScreen` | Full Dynpro header + flow logic round-trip in MCP JSON (uppercase `HEADER` / `FLOW_LOGIC` / `LINE` keys) |
| **GUI Status** | `GetGuiStatus`, `ReadGuiStatus`, `GetGuiStatusList` | `CreateGuiStatus` | `UpdateGuiStatus` | `DeleteGuiStatus` | Menu bar, function keys, application toolbar — programmatically created and edited |
| **Text Element** | `GetTextElement` | `CreateTextElement` | `UpdateTextElement` | `DeleteTextElement` | Text symbols, selection texts, list headings — required for Text Element enforcement rule |
| **Includes** | `GetInclude`, `GetIncludesList` | `CreateInclude` | `UpdateInclude` | `DeleteInclude` | Used by Main+Include convention |
| **Local defs/macros/tests/types** | `GetLocalDefinitions`, `GetLocalMacros`, `GetLocalTestClass`, `GetLocalTypes` | — | `UpdateLocalDefinitions`, `UpdateLocalMacros`, `UpdateLocalTestClass`, `UpdateLocalTypes` | `DeleteLocal*` | In-program local sections edited independently |
| **Metadata Extension (CDS)** | `GetMetadataExtension` | `CreateMetadataExtension` | `UpdateMetadataExtension` | `DeleteMetadataExtension` | Fiori/UI annotation layering on CDS |
| **Behavior Definition / Implementation (RAP)** | `Get/Read BehaviorDefinition`, `Get/Read BehaviorImplementation` | `Create*` | `Update*` | `Delete*` | Full RAP BDEF + BHV cycle |
| **Service Definition / Binding** | `Get/Read ServiceDefinition`, `Get/Read ServiceBinding`, `ListServiceBindingTypes`, `ValidateServiceBinding` | `Create*` | `Update*` | `Delete*` | OData V2/V4 exposure and validation |
| **Enhancements / BAdI** | `GetEnhancements`, `GetEnhancementSpot`, `GetEnhancementImpl` | — | — | — | Discovery of extension points |
| **Runtime & Profiling** | `RuntimeListDumps`, `RuntimeAnalyzeDump`, `RuntimeGetDumpById`, `RuntimeListProfilerTraceFiles`, `RuntimeGetProfilerTraceData`, `RuntimeAnalyzeProfilerTrace`, `RuntimeCreateProfilerTraceParameters`, `RuntimeRunProgramWithProfiling`, `RuntimeRunClassWithProfiling` | — | — | — | ST22 dump analysis + SAT-style profiling entirely from Claude |
| **Semantic / AST** | `GetAbapAST`, `GetAbapSemanticAnalysis`, `GetAbapSystemSymbols`, `GetAdtTypes`, `GetTypeInfo`, `GetWhereUsed` | — | — | — | Richer analysis than plain syntax check |
| **Unit Tests (ABAP + CDS)** | `GetUnitTest`, `GetUnitTestResult`, `GetUnitTestStatus`, `GetCdsUnitTest`, `GetCdsUnitTestResult`, `GetCdsUnitTestStatus` | `CreateUnitTest`, `CreateCdsUnitTest` | `UpdateUnitTest`, `UpdateCdsUnitTest` | `DeleteUnitTest`, `DeleteCdsUnitTest` | Both ABAP Unit and CDS test framework |
| **Transport** | `GetTransport`, `ListTransports` | `CreateTransport` | — | — | Full transport lifecycle in MCP |

The Dynpro / GUI Status / Text Element CRUD in particular enable sc4sap's classical-UI pipeline (`sc4sap:program` with ALV + Docking + selection screen) to be fully AI-driven end-to-end — a scenario most ADT MCP servers cannot support.

### Shared Conventions (`common/`)

Cross-skill authoring rules live in `common/` so every skill and agent follows the same playbook without duplicating text:

| File | Covers |
|------|--------|
| `common/include-structure.md` | Main program + conditional include set (t/s/c/a/o/i/e/f/_tst) |
| `common/oop-pattern.md` | Two-class OOP split (`LCL_DATA` + `LCL_ALV` + optional `LCL_EVENT`) |
| `common/alv-rules.md` | Full ALV (CL_GUI_ALV_GRID + Docking Container) vs SALV + SALV-factory fieldcatalog pattern |
| `common/text-element-rule.md` | Mandatory Text Elements — no hardcoded display literals |
| `common/constant-rule.md` | Mandatory `CONSTANTS` for non-fieldcatalog magic literals |
| `common/procedural-form-naming.md` | `_{screen_no}` suffix for ALV-bound FORMs |
| `common/naming-conventions.md` | Shared naming for programs, includes, LCL_*, screens, GUI status |
| `common/spro-lookup.md` | SPRO lookup priority — local cache → static docs → MCP query |
| `common/data-extraction-policy.md` | Agent-side refusal protocol for blocked tables |

### SAP Platform Awareness (ECC / S4 On-Prem / Cloud)

`sc4sap:program` runs a mandatory **SAP Version Preflight** before anything else, reading `.sc4sap/config.json` for `sapVersion` (ECC / S4 On-Prem / S/4HANA Cloud Public / Private) and `abapRelease`. The pipeline branches accordingly:

- **ECC** — no RAP/ACDOCA/BP; syntax gated by release (no inline decl <740, no CDS <750, etc.)
- **S/4HANA On-Premise** — classical Dynpro technically possible but warned; extensibility-first, MATDOC ACDOCA for finance
- **S/4HANA Cloud (Public)** — **classical Dynpro forbidden**; redirects to RAP + Fiori Elements, `if_oo_adt_classrun`, or SALV-only output. Full prohibited-statement list + Cloud-native API replacements in `skills/program/cloud-abap-constraints.md`
- **S/4HANA Cloud (Private)** — refer CDS + AMDP + RAP, Business Partner APIs

### SPRO Configuration Reference

Built-in reference data for all 13 SAP modules:

```
configs/{MODULE}/
  ├── spro.md        # SPRO configuration tables/views
  ├── tcodes.md      # Transaction codes
  ├── bapi.md        # BAPI/FM reference
  ├── tables.md      # Key tables
  ├── enhancements.md # BAdI / User Exit / BTE / VOFM
  └── workflows.md   # Development workflows
configs/common/      # cross-module references (IDOC, Factory Calendar, DD* tables, etc.)
```

**Modules**: SD, MM, FI, CO, PP, PS, PM, QM, TR, HCM, WM, TM, Ariba, BW

### SPRO Local Cache (Token-Saving)

`/sc4sap:setup spro` extracts customer-specific SPRO customizing from the live S/4HANA system into `.sc4sap/spro-config.json`. Every consultant agent follows `common/spro-lookup.md`:

1. **Priority 1 — Local cache** (`.sc4sap/spro-config.json` → `modules.{MODULE}`) — no MCP call
2. **Priority 2 — Static references** (`configs/{MODULE}/*.md`)
3. **Priority 3 — Live MCP query** — only with user confirmation (token cost warned)

One-time extraction saves substantial tokens across all future sessions.

### SAP-Specific Hooks

- **SPRO Auto-Injection** — Haiku LLM classifies user input and injects relevant module SPRO config
- **Transport Validation** — Checks transport exists before MCP ABAP Create/Update operations
- **Auto-Activation** — Triggers ABAP object activation after creation/modification
- **Syntax Checker** — Auto-runs semantic analysis on ABAP errors
- **🔒 Data Extraction Blocklist** — `PreToolUse` hook blocks row extraction from sensitive SAP tables (see below)

### 🔒 Data Extraction Blocklist

A mandatory defense-in-depth layer that prevents row data from sensitive tables (PII, credentials, payroll, banking, transactional finance) from being extracted via `GetTableContents` / `GetSqlQuery` — by sc4sap agents, direct user prompts, or other plugins in the same Claude Code session.

**Four enforcement layers**:

| Layer | Where | What it does |
|-------|-------|--------------|
| L1 — Agent instructions | `common/data-extraction-policy.md`, consultant agents | Every agent refuses blocked extraction with a categorized reason + alternatives |
| L2 — Global directive | `CLAUDE.md` "Data Extraction Policy" block | Loaded into every Claude session, including direct prompts |
| L3 — Claude Code hook | `scripts/hooks/block-forbidden-tables.mjs` (`PreToolUse`) | Programmatic block — intercepts the MCP call and returns a `deny` decision |
| L4 — MCP server (opt-in) | `abap-mcp-adt-powerup` source (`src/lib/policy/blocklist.ts`) | Hardcoded block inside the MCP server regardless of caller — enable with env `SC4SAP_POLICY=on` |

**Blocklist source**: `exceptions/table_exception.md` — 100+ tables / patterns across Banking (BNKA, KNBK, LFBK, REGUH), Customer/Vendor master PII (KNA1, LFA1, BUT000, BUT0ID), Addresses (ADRC, ADR6, ADRP), Authentication (USR02 password hashes, RFCDES, AGR_1251), HR/Payroll (PA* / HRP* / PCL* patterns), Tax IDs, Protected Business Data (VBAK/BKPF/ACDOCA), Audit logs, and customer `Z*` PII patterns.

**Two actions — `deny` vs `warn`**:

- **`deny`** (default for every category) — the call is blocked outright. SAP is not contacted. The agent surfaces the category, reason, and safer alternatives.
- **`warn`** — the call proceeds, but the response is prefixed with a `⚠️ sc4sap blocklist WARNING` block listing the table(s), category, and recommended alternatives. Intended for categories where legitimate daily use is common.

`warn`-default categories: **Protected Business Data** (VBAK/BKPF/ACDOCA/etc.) and **Customer-Specific PII Patterns** (`Z*` tables). Everything else stays `deny`. If a single call touches *any* `deny` table, the whole call is blocked — `deny` wins.

**Configurable scope** — choose one profile during `/sc4sap:setup`:

| Profile | Blocks |
|---------|--------|
| `strict` (default) | PII + credentials + HR + transactional finance + audit logs + workflow |
| `standard` | PII + credentials + HR + transactional finance |
| `minimal` | PII + credentials + HR + Tax only (business tables allowed) |
| `custom` | User-supplied list only (`.sc4sap/blocklist-custom.txt`) |

Any profile additionally honors `.sc4sap/blocklist-extend.txt` (one table name or pattern per line) for site-specific additions.

**Install** — automated and **required** by `/sc4sap:setup`; manual install:

```bash
node scripts/install-hooks.mjs            # user-level (~/.claude/settings.json)
node scripts/install-hooks.mjs --project  # project-level (.claude/settings.json)
node scripts/install-hooks.mjs --uninstall
```

**Verify**:

```bash
echo '{"tool_name":"mcp__abap__GetTableContents","tool_input":{"table":"BNKA"}}' \
  | node scripts/hooks/block-forbidden-tables.mjs
# Expected: JSON with "permissionDecision":"deny"
```

Schema/DDIC metadata (`GetTable`, `GetStructure`, `GetView`, `GetDataElement`, `GetDomain`), existence checks (`SearchObject`), and counts/aggregates via `GetSqlQuery` remain allowed. Per-task exceptions can be documented in `.sc4sap/data-access-approval-{YYYYMMDD}.md`.

**L4 server-side enforcement** (stops calls from any client — direct JSON-RPC, other LLMs, external scripts):

```bash
# Activate when starting mcp-abap-adt-powerup
export SC4SAP_POLICY=on                    # or: strict | standard | minimal | custom
export SC4SAP_POLICY_PROFILE=strict        # optional, default when SC4SAP_POLICY=on
export SC4SAP_BLOCKLIST_PATH=/path/to/sc4sap/exceptions/table_exception.md  # optional extra list
export SC4SAP_ALLOW_TABLE=TAB1,TAB2        # session-scoped emergency exemption (logged)
```

When a blocked table is accessed, the MCP server responds with `isError: true` and the categorized reason — no SAP round-trip occurs.

## Skills — Examples & Workflow

Each skill below shows a one-line invocation, a typical prompt, and what happens under the hood. Screenshots will be added in a future update.

### `/sc4sap:setup`

One-time onboarding: installs the MCP ABAP ADT server, extracts SPRO cache, installs the data-extraction blocklist hook.

```
/sc4sap:setup
```

**Flow** — connection test → SAP version detect (ECC / S4 On-Prem / Cloud) → SPRO extraction per module → blocklist profile prompt (`strict` / `standard` / `minimal` / `custom`) → hook registration in `settings.json`.

> _Screenshot placeholder — setup wizard_

---

### `/sc4sap:create-object`

Hybrid-mode single-object creation: confirms transport + package interactively, then creates, scaffolds, and activates.

```
/sc4sap:create-object
→ "Create a class ZCL_SD_ORDER_VALIDATOR in package ZSD_ORDER"
```

**Flow** — type inference (Class / Interface / Program / FM / Table / Structure / Data Element / Domain / CDS / Service Def / Service Binding) → package + transport confirm → MCP `Create*` → initial implementation written → `GetAbapSemanticAnalysis` → activate.

> _Screenshot placeholder — create-object confirmation + activation_

---

### `/sc4sap:program`

Flagship program creation pipeline with Main + Include wrapping, OOP or Procedural, full ALV + Dynpro support.

```
/sc4sap:program
→ "Make an ALV report for open sales orders, selection screen by sales org + date range"
```

**Flow** — SAP version preflight (`.sc4sap/config.json`) → Socratic interview → planner spec → user confirm → executor writes Main program + conditional Includes (t/s/c/a/o/i/e/f/_tst) + Screen + GUI Status + Text Elements → qa-tester writes ABAP Unit → code-reviewer gate → activate. Branches by platform (ECC / S4 On-Prem / Cloud Public forbids classical Dynpro → auto-redirect to `if_oo_adt_classrun` / SALV / RAP).

> _Screenshot placeholder — program pipeline with ALV output_

---

### `/sc4sap:analyze-code`

Reads an existing ABAP object via MCP, runs `sap-code-reviewer` against Clean ABAP + performance + security, returns categorized findings with suggested fixes.

```
/sc4sap:analyze-code
→ "Review ZCL_SD_ORDER_VALIDATOR for Clean ABAP violations and SELECT * usage"
```

**Flow** — `ReadClass` / `GetProgFullCode` → `GetAbapSemanticAnalysis` + `GetWhereUsed` → sap-code-reviewer analysis → categorized report (Clean ABAP / Performance / Security / SAP Standard) → optional apply-fix loop.

> _Screenshot placeholder — review findings table_

---

### `/sc4sap:analyze-symptom`

Step-by-step runtime / operational error investigation: dumps, logs, SAP Note candidates.

```
/sc4sap:analyze-symptom
→ "Dump MESSAGE_TYPE_X in ZFI_POSTING at line 234 during F110"
```

**Flow** — `RuntimeListDumps` / `RuntimeGetDumpById` / `RuntimeAnalyzeDump` → stack trace parse → SAP Note candidate search → root cause hypothesis → remediation options (config / code / user action).

> _Screenshot placeholder — dump analysis and Note candidates_

---

### `/sc4sap:program-to-spec`

Reverse-engineer an existing ABAP program back into a Functional / Technical Spec — Markdown or Excel. Socratic scope narrowing prevents "document everything" bloat.

```
/sc4sap:program-to-spec
→ "Write a spec for ZSD_ORDER_RELEASE — focus on approval logic and BAdI hooks"
```

**Flow** — scope narrowing Q&A → `GetProgFullCode` / `ReadClass` / includes walk → `GetWhereUsed` + `GetEnhancements` → structured spec (purpose / selection screen / data flow / APIs / enhancements / authorization) → Markdown or Excel artifact.

> _Screenshot placeholder — generated spec artifact_

---

### `/sc4sap:autopilot`

Full autonomous pipeline from vague idea to activated, tested ABAP objects — runs `deep-interview` → `ralplan` → agent pipeline → `ralph` loop until clean.

```
/sc4sap:autopilot
→ "Build a custom Vendor Payment approval workflow"
```

**Flow** — deep-interview crystallizes scope → ralplan consensus plan → sap-planner WRICEF breakdown → sap-executor creates objects → sap-qa-tester runs unit tests → sap-code-reviewer gates → ralph loop retries until green.

> _Screenshot placeholder — autopilot progress stream_

---

### `/sc4sap:ralph`

Persistent self-correcting loop: runs until syntax is clean, activation succeeds, and unit tests pass. Drop-in for any "make it work" task.

```
/sc4sap:ralph
→ "Fix all activation errors in ZMM_GR_POSTING and its includes"
```

**Flow** — iterate: `GetAbapSemanticAnalysis` → identify error → edit via `UpdateProgram` / `UpdateClass` / `UpdateInclude` → activate → re-run unit test → stop when all three pass. Cancels on manual intervention or max iterations.

> _Screenshot placeholder — ralph iteration log_

---

### `/sc4sap:ralplan`

Consensus planning gate — multiple agent perspectives (analyst / architect / critic) converge on one plan before coding starts. Prevents autopilot from building the wrong thing.

```
/sc4sap:ralplan
→ "Plan the rewrite of legacy ZSD_ORDER_RELEASE to RAP-based workflow"
```

**Flow** — sap-analyst extracts requirements → sap-architect proposes technical design → sap-critic challenges design → convergence iterations → approved plan handed to autopilot / team.

> _Screenshot placeholder — ralplan convergence diff_

---

### `/sc4sap:deep-interview`

Socratic requirements gathering before any code is written. Surfaces hidden assumptions, edge cases, and module-cross-cutting effects.

```
/sc4sap:deep-interview
→ "I need a custom credit-limit check"
```

**Flow** — initial user intent → layered questions (what modules, what master data, what timing, what error UX, who approves) → specification summary → user confirm.

> _Screenshot placeholder — interview Q&A_

---

### `/sc4sap:team` / `/sc4sap:teams`

Coordinated parallel agent execution. `team` uses native Claude Code teams (in-process); `teams` uses tmux CLI panes (process-level parallelism).

```
/sc4sap:team
→ "Split this WRICEF list into 4 workers and build in parallel"
```

**Flow** — shared task list → N workers pick tasks → each runs create-object / program / ralph → merge-back via transport.

> _Screenshot placeholder — tmux pane view / team dashboard_

---

### `/sc4sap:release`

CTS transport release workflow — list, validate (no inactive objects, no syntax errors), release, and confirm import to next system.

```
/sc4sap:release
→ "Release transport DEVK900123"
```

**Flow** — `GetTransport` → validation checklist → release via STMS → monitor import status → post-import smoke check.

> _Screenshot placeholder — release checklist_

---

### `/sc4sap:ask`

Question routing to the right expert agent without committing to a full skill pipeline.

```
/sc4sap:ask
→ "Which BAdI fires on VA01 save after pricing?"
```

**Flow** — classify question (module / technical / config / error) → route to matching consultant agent (e.g. `sap-sd-consultant`) → answer with SPRO cache + MCP `GetEnhancementSpot` lookups.

> _Screenshot placeholder — routed answer_

---

### `/sc4sap:sap-doctor`

Plugin + MCP + SAP system diagnostics. First thing to run when something's off. (Renamed from `doctor` to avoid conflict with Claude Code's built-in `/doctor`.)

```
/sc4sap:sap-doctor
```

**Flow** — plugin install check → MCP server handshake → SAP RFC/ADT connectivity → SPRO cache freshness → hook registration → blocklist active → report with actionable fixes.

> _Screenshot placeholder — doctor report_

---

### `/sc4sap:mcp-setup`

Standalone guide to install / reconfigure `abap-mcp-adt-powerup` if `/sc4sap:setup` didn't run it (e.g., existing global MCP config).

```
/sc4sap:mcp-setup
```

### `/sc4sap:sap-option`

Interactively view and edit `.sc4sap/sap.env` — SAP connection credentials, TLS settings, and blocklist policy for row-extraction safety. Secrets are masked in the display; writes are preceded by a diff preview and create a `sap.env.bak` backup.

```
/sc4sap:sap-option
```

Common uses: rotate `SAP_PASSWORD`, switch `SAP_CLIENT`, change `MCP_BLOCKLIST_PROFILE` (`minimal` / `standard` / `strict` / `off`), add an audited `MCP_ALLOW_TABLE` entry, or append to `MCP_BLOCKLIST_EXTEND`. Reconnect MCP (`/mcp`) after saving.

## Tech Stack

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)
![MCP](https://img.shields.io/badge/MCP_SDK-Protocol-FF6600)

## Roadmap

- **v0.1.x** (current) — 24 agents, 17 skills, 13 module configs, shared `common/` conventions, SPRO local cache, Data Extraction Blocklist (**L1–L4 all shipped**; L4 is opt-in via `SC4SAP_POLICY=on` in `abap-mcp-adt-powerup`), Cloud ABAP awareness, RAP skill
- **v0.2.0** (planned) — richer `sc4sap:program` OOP templates, upstream PR to make L4 the default-on shipping behavior

## Acknowledgments

This project was inspired by [**oh-my-claudecode**](https://github.com/huryechan/oh-my-claudecode) by **허예찬 (Hur Ye-chan)**. The multi-agent orchestration patterns, Socratic deep-interview gating, ralph/autopilot pipelines, and the overall plugin philosophy here all trace back to that work. Huge thanks — sc4sap would not exist in this form without it.

## Author

- [paek seunghyun](https://www.linkedin.com/in/seunghyun-paek-5b83b7183/)

## Contributors

- [김시훈 (Kim Sihun)](https://www.linkedin.com/in/sihun-kim-27737132b/)

## License

[MIT](LICENSE)
