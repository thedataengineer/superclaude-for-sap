English | [한국어](README.ko.md)

# SuperClaude for SAP (sc4sap)

> Claude Code plugin for SAP ABAP development on On-Premise S/4HANA

[![npm version](https://img.shields.io/badge/npm-v4.11.5-cb3837?logo=npm&logoColor=white)](https://www.npmjs.com/package/superclaude-for-sap) 
[![GitHub stars](https://img.shields.io/github/stars/babamba2/superclaude-for-sap?style=flat&color=yellow)](https://github.com/babamba2/superclaude-for-sap)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## What is sc4sap?

SuperClaude for SAP transforms Claude Code into a full-stack SAP development assistant. It connects to your SAP system via the [MCP ABAP ADT server](https://github.com/babamba2/abap-mcp-adt-powerup) (150+ tools) to create, read, update, and delete ABAP objects directly — classes, function modules, reports, CDS views, and more.

## Requirements

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-339933?logo=node.js&logoColor=white)
![Claude Code](https://img.shields.io/badge/Claude_Code-CLI-6B4FBB?logo=anthropic&logoColor=white)
![SAP S/4HANA](https://img.shields.io/badge/SAP-S%2F4HANA_On--Premise-0FAAFF?logo=sap&logoColor=white)
![MCP ABAP ADT](https://img.shields.io/badge/MCP_ABAP_ADT-Server_Required-FF6600)

| Requirement | Details |
|-------------|---------|
| **Node.js** | >= 20.0.0 |
| **Claude Code** | CLI installed (Max/Pro subscription or API key) |
| **SAP System** | On-Premise S/4HANA with ADT enabled |
| **MCP Server** | [abap-mcp-adt-powerup](https://github.com/babamba2/abap-mcp-adt-powerup) configured |

## Features

### 24 SAP-Specialized Agents

| Category | Agents |
|----------|--------|
| **Core (10)** | Analyst, Architect, Code Reviewer, Critic, Debugger, Doc Specialist, Executor, Planner, QA Tester, Writer |
| **Basis (1)** | BC Consultant — system admin, transport management, diagnostics |
| **Modules (13)** | SD, MM, FI, CO, PP, PM, QM, TR, HCM, WM, TM, Ariba, BW |

### 15 Skills

| Skill | Description |
|-------|-------------|
| `sc4sap:setup` | Plugin setup + SPRO config auto-generation + blocklist hook install |
| `sc4sap:autopilot` | Full autonomous execution pipeline |
| `sc4sap:ralph` | Persistent loop with SAP verification |
| `sc4sap:ralplan` | Consensus-based planning |
| `sc4sap:team` | Coordinated parallel agent execution |
| `sc4sap:teams` | CLI team runtime (tmux-based) |
| `sc4sap:ask` | Question routing to appropriate agent |
| `sc4sap:deep-interview` | Socratic requirements gathering |
| `sc4sap:hud` | HUD display with SAP system status |
| `sc4sap:mcp-setup` | MCP ABAP ADT server setup guide |
| `sc4sap:sap-doctor` | Plugin + MCP + SAP connection diagnostics |
| `sc4sap:release` | CTS transport release workflow |
| `sc4sap:create-object` | ABAP object creation (hybrid mode) |
| `sc4sap:program` | Full ABAP program pipeline — Main+Include, OOP/Procedural, ALV, test, 4-layer agent pipeline |
| `sc4sap:analyze-code` | ABAP code analysis & improvement |
| `sc4sap:analyze-symptom` | Step-by-step SAP operational error/symptom analysis (dumps, logs, SAP Note candidates) |

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
- **S/4HANA On-Premise** — prefer CDS + AMDP + RAP, Business Partner APIs, ACDOCA for finance
- **S/4HANA Cloud (Public)** — **classical Dynpro forbidden**; redirects to RAP + Fiori Elements, `if_oo_adt_classrun`, or SALV-only output. Full prohibited-statement list + Cloud-native API replacements in `skills/program/cloud-abap-constraints.md`
- **S/4HANA Cloud (Private)** — classical Dynpro technically possible but warned; extensibility-first

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

**Modules**: SD, MM, FI, CO, PP, PM, QM, TR, HCM, WM, TM, Ariba, BW

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

## Installation

```bash
# Install from marketplace
claude plugin install sc4sap

# Or install from source
git clone https://github.com/babamba2/superclaude-for-sap.git
cd superclaude-for-sap
npm install && npm run build
```

## Setup

```bash
# Run the setup skill to configure MCP connection and generate SPRO configs
/sc4sap:setup
```

This will:
1. Verify MCP ABAP ADT server connection
2. Auto-generate SPRO config files from your S/4HANA system
3. Configure hooks and agents
4. **Install the Data Extraction Blocklist hook** (mandatory) — prompts for profile (`strict` / `standard` / `minimal` / `custom`) and registers the `PreToolUse` hook in your Claude Code settings

## Quick Start

```bash
# Create an ABAP class
/sc4sap:create-object

# Analyze existing code
/sc4sap:analyze-code

# Release a transport
/sc4sap:release

# Full autonomous development
/sc4sap:autopilot
```

## Example Use Cases

**ABAP Class Creation & Unit Testing**
```
Create a custom sales order validation class ZCL_SD_ORDER_VALIDATOR
with methods for credit check, delivery date validation, and pricing
verification. Include ABAP Unit tests for each method.
```

**Cross-Module Integration Analysis**
```
Analyze the integration points between SD billing (VF01) and FI
accounting document posting. Show me which BAPIs and user exits
are involved in the billing-to-accounting flow.
```

**Module Consultant Workflow**
```
As an FI consultant, help me configure automatic payment program
(F110) for vendor payments via bank transfer. What master data,
SPRO settings, and custom development are needed?
```

## Tech Stack

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)
![MCP](https://img.shields.io/badge/MCP_SDK-Protocol-FF6600)

## Roadmap

- **v0.1.x** (current) — 24 agents, 15 skills, 13 module configs, shared `common/` conventions, SPRO local cache, Data Extraction Blocklist (**L1–L4 all shipped**; L4 is opt-in via `SC4SAP_POLICY=on` in `abap-mcp-adt-powerup`), Cloud ABAP awareness, RAP skill
- **v0.2.0** (planned) — richer `sc4sap:program` OOP templates, upstream PR to make L4 the default-on shipping behavior

## Acknowledgments

This project was inspired by [**oh-my-claudecode**](https://github.com/huryechan/oh-my-claudecode) by **허예찬 (Hur Ye-chan)**. The multi-agent orchestration patterns, Socratic deep-interview gating, ralph/autopilot pipelines, and the overall plugin philosophy here all trace back to that work. Huge thanks — sc4sap would not exist in this form without it.

## Author

paek seunghyun

## License

[MIT](LICENSE)
