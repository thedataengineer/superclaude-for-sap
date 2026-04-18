---
name: sc4sap:create-object
description: ABAP object creation workflow — confirm transport+package, auto-create and activate
level: 3
---

# SC4SAP Create Object

Guided ABAP object creation workflow. Hybrid mode: confirms transport and package interactively, then auto-creates, writes initial code, and activates the object.

<Purpose>
sc4sap:create-object handles the full lifecycle of creating a new ABAP object: determining the right object type, confirming package and transport assignment, creating the object via MCP, generating a well-structured initial implementation, and activating it — all in one workflow.
</Purpose>

<Use_When>
- User says "create", "new class", "new program", "create object", "add a function module", "new table", etc.
- A new ABAP development artifact needs to be created from scratch
- User knows what they want to build but needs the creation scaffolded correctly
</Use_When>

<Do_Not_Use_When>
- Modifying an existing object -- use direct MCP `Update*` tools (`UpdateClass`, `UpdateProgram`, `UpdateInclude`, etc.)
- Creating multiple interdependent objects -- use `/sc4sap:team` for parallel orchestration or `/sc4sap:create-program` for a full program with includes
- User just wants to understand what type to use -- ask a module consultant agent directly
</Do_Not_Use_When>

<Session_Trust_Bootstrap>
**MANDATORY — runs as Step 0 before any MCP call or user interaction.**

Invoke `/sc4sap:trust-session` with `parent_skill=sc4sap:create-object` to pre-grant all MCP tool + file-op permissions for this session (eliminates per-tool "Allow this tool?" prompts during Create* + activation flow).

- If `.sc4sap/session-trust.log` already has a line within the last 24h, skip silently.
- Otherwise run it and surface the one-line confirmation.
- All subsequent `Agent` dispatches within this skill MUST pass `mode: "dontAsk"`.

Full spec: see [`../trust-session/SKILL.md`](../trust-session/SKILL.md).
</Session_Trust_Bootstrap>

<Supported_Object_Types>
| Type | MCP Create Tool | Description |
|------|----------------|-------------|
| Class | `CreateClass` | ABAP OO class (local or global) |
| Interface | `CreateInterface` | ABAP OO interface |
| Program | `CreateProgram` | Executable program (report) |
| Function Module | `CreateFunctionModule` + `CreateFunctionGroup` | RFC-capable function module |
| Table | `CreateTable` | Transparent database table |
| Structure | `CreateStructure` | ABAP structure (type definition) |
| Data Element | `CreateDataElement` | Domain-based data element |
| Domain | `CreateDomain` | Value domain with fixed values or ranges |
| CDS View | `CreateView` | Core Data Services view |
| Service Definition | `CreateServiceDefinition` | OData service definition |
| Service Binding | `CreateServiceBinding` | OData service binding (UI5/API) |
| Behavior Definition | `CreateBehaviorDefinition` | RAP behavior definition |
| Screen | `CreateScreen` | Dynpro screen (selection screen or dialog) |
| GUI Status | `CreateGuiStatus` | PF-Status (menu bar, toolbar, function keys) |
</Supported_Object_Types>

<ECC_DDIC_Fallback>
**MANDATORY**: Read [`../../common/ecc-ddic-fallback.md`](../../common/ecc-ddic-fallback.md) before creating any Table / Data Element / Domain. It defines when the ECC branch triggers, the helper-program naming rules, the strict template format (mirroring the files under `ecc/`), and the hard constraints (`$TMP` only, no activate, no CTS).
</ECC_DDIC_Fallback>

<Hybrid_Mode>
**Confirm** (interactive):
- Object name (enforce Z/Y prefix, max 30 chars, uppercase)
- Package assignment (search with `GetPackage` if unsure)
- Transport number (list open transports via `ListTransports`, or create new)
- Short description

**Auto-execute** (after confirmation):
- Create object via appropriate MCP Create* tool
- Generate initial implementation (skeleton with proper structure)
- Activate the object
- Verify activation via `GetInactiveObjects`
</Hybrid_Mode>

<Workflow_Steps>
**MANDATORY**: Follow the step sequence defined in [`workflow-steps.md`](workflow-steps.md). It covers Step 1 (classify) → Step 2 (metadata) → Step 3 (pre-creation check) → Step 3.5 (version branch) → Step 4 / Step 4-ECC → Step 5 / Step 6 (standard flow only) → Step 7 (completion report, including the mandatory ECC message format).

At Step 2 (metadata collection) — when the object belongs to a specific SAP module (MM table, SD structure, PS data element, …) — read `SAP_ACTIVE_MODULES` from `sap.env` / `config.json` and consult [`../../common/active-modules.md`](../../common/active-modules.md). If companion modules are active, proactively suggest integration fields (e.g., creating an MM CBO table in a landscape with PS active → suggest adding `PS_POSID` / `AUFNR`). Do NOT add silently — propose to user and let them accept/decline.
</Workflow_Steps>

<Naming_Convention_Enforcement>
**MANDATORY**: Always read `configs/common/naming-conventions.md` for the complete, authoritative ABAP naming conventions reference before creating any object.

The reference file covers:
- General rules (prefix, case, character set, length limits)
- Module codes (SD/MM/FI/CO/...) for the `Z{MODULE}_...` pattern
- Object-specific patterns — Classes (ZCL_/ZIF_/ZCX_), Programs (ZR_), Function Groups/Modules, Data Dictionary (ZT_/ZDE_/ZDO_), UI (Dynpro/GUI Status), OData/RAP (Z_I_/Z_C_/Z_BP_/Z_SB_), Enhancements, IDoc/ALE
- Code-level naming (variables: LV_/LS_/LT_/IV_/EV_/MV_; constants GC_/LC_; types TY_; methods)
- Validation rules (uppercase, Z/Y prefix, character set, max length, non-generic)

**Quick validation checklist (applied before every create):**
1. Starts with `Z` or `Y` (customer namespace)
2. UPPERCASE only, characters in `[A-Z0-9_]`
3. Within max length (30 chars for most objects)
4. Not generic (ZTEST/ZTEMP/ZDUMMY forbidden)
5. Object-type prefix follows the reference (e.g., `ZCL_` for classes, `ZIF_` for interfaces)
6. Screen = 4-digit number (e.g., 0100); GUI Status = uppercase identifier (e.g., STATUS_0100) — both require a parent program

If the user-provided name violates any rule, suggest a compliant alternative based on `configs/common/naming-conventions.md` before proceeding.
</Naming_Convention_Enforcement>

<MCP_Tools_Used>
- `SearchObject` — check for existing objects
- `ListTransports` — list available transports
- `GetPackage` — verify package existence
- `CreateClass` / `CreateInterface` / `CreateProgram` / `CreateFunctionGroup` / `CreateFunctionModule` / `CreateTable` / `CreateStructure` / `CreateDataElement` / `CreateDomain` / `CreateView` / `CreateServiceDefinition` / `CreateServiceBinding` / `CreateBehaviorDefinition` / `CreateScreen` / `CreateGuiStatus`
- `UpdateClass` / `UpdateProgram` / `UpdateScreen` / `UpdateGuiStatus` / etc. — write initial implementation
- `GetInactiveObjects` — verify activation
- **ECC DDIC fallback:** only `CreateProgram` + `UpdateProgram` (target `$TMP`). `CreateTable` / `CreateDataElement` / `CreateDomain` must NOT be attempted when `SAP_VERSION = ECC`.
</MCP_Tools_Used>

Task: {{ARGUMENTS}}
