# SuperClaude for SAP (sc4sap) — Development Rules

## SAP Development Standards

### Naming Conventions
- **Custom objects**: Always use `Z` or `Y` prefix (e.g., `ZCL_SALES_ORDER`, `ZTSD_ORDER_HEADER`)
- **Z prefix**: Standard custom development
- **Y prefix**: Temporary or prototype objects
- **Namespace**: Follow `Z{MODULE}_{OBJECT_TYPE}_{NAME}` pattern when possible
  - Examples: `ZSD_CL_ORDER_PROCESSOR`, `ZMM_IF_MATERIAL_API`, `ZFI_TT_POSTING_ITEMS`
- **Includes**: `Z{PROGRAM}_TOP`, `Z{PROGRAM}_F01`, `Z{PROGRAM}_SEL`
- **Function Groups**: `Z{MODULE}_{DESCRIPTION}`
- **Tables**: `ZT{MODULE}_{DESCRIPTION}` (e.g., `ZTSD_ORDER_LOG`)
- **Data Elements**: `ZDE_{DESCRIPTION}` or `Z{MODULE}_DE_{DESCRIPTION}`
- **Domains**: `ZDO_{DESCRIPTION}` or `Z{MODULE}_DO_{DESCRIPTION}`

### Transport Policy
- Every change must be assigned to a transport request
- Use descriptive transport descriptions: `[MODULE] [Action] [Object] - [Brief description]`
  - Example: `[SD] Create ZCL_SALES_ORDER - Sales order processing class`
- Never release transports with syntax errors or inactive objects
- One transport per logical change unit

### SAP Version & ABAP Release Awareness
- **CRITICAL**: Always check `.sc4sap/config.json` for `sapVersion` and `abapRelease` before any work
- `sapVersion`: `S4` (S/4HANA) or `ECC` (ECC 6.0) — determines tables, BAPIs, TCodes, patterns
- `abapRelease`: e.g., `750`, `756`, `758` — determines available ABAP syntax features
- Key version differences:
  - **S4**: BP (BUT000), MATDOC, ACDOCA (Universal Journal), Fiori, CDS-based
  - **ECC**: Vendor (LFA1/XK01) + Customer (KNA1/XD01) separate, MKPF/MSEG, BKPF/BSEG
- ABAP syntax restrictions by release:
  - **< 740**: No inline declarations, no constructor expressions (`NEW`, `VALUE`, `CORRESPONDING`)
  - **< 750**: No Open SQL expressions (CASE/CAST/COALESCE in SELECT)
  - **< 754**: No RAP/EML, no `FINAL` classes
  - **≥ 740**: Prefer modern syntax within the allowed release range

### Coding Standards (ABAP Clean Code)
- Follow SAP ABAP Clean Code guidelines
- Use meaningful variable names (no single-letter variables except loop counters)
- Prefer `NEW` over `CREATE OBJECT` (ABAP 740+)
- Prefer `VALUE` and `CORRESPONDING` over `MOVE-CORRESPONDING` (ABAP 740+)
- Use inline declarations where appropriate (ABAP 740+)
- Always handle exceptions with `TRY...CATCH`
- Avoid `SELECT *` — always specify required fields
- Use CDS views over direct table access where possible (ABAP 750+)
- Write unit tests for all custom classes (when applicable)
- **Always verify syntax is compatible with the configured `abapRelease`**

### Object Activation
- Always activate objects after creation or modification
- Check for syntax errors before activation using `GetAbapSemanticAnalysis`
- Verify no inactive objects remain using `GetInactiveObjects`

### 🔒 Data Extraction Policy (MANDATORY)
Before **any** call to `GetTableContents`, `GetSqlQuery`, or other row-returning MCP tools:
1. **Check `exceptions/table_exception.md`** at the plugin root for the table (and every table inside a join/view).
2. If a match is found (exact name, family pattern like `PA*`/`USR*`, Z-pattern): **refuse the call**, explain the category, and offer the allowed alternatives listed in `common/data-extraction-policy.md`.
3. Never bypass silently. Never argue the policy with the user — surface it and let them decide.
4. Schema/DDIC (`GetTable`, `GetStructure`, `GetView`, `GetDataElement`, `GetDomain`) is always permitted.

This applies to **every session** — sc4sap agents, direct user requests, pipelines, and ad-hoc analysis. Backed by a `PreToolUse` hook (`scripts/hooks/block-forbidden-tables.mjs`) when installed. See `common/data-extraction-policy.md` for the full protocol.

## Plugin Usage

### Skills (sc4sap: prefix)
All skills are invoked with the `sc4sap:` prefix:
- `/sc4sap:setup` — Initial plugin setup + SPRO config generation
- `/sc4sap:autopilot` — Full autonomous execution pipeline
- `/sc4sap:ralph` — Persistent loop with SAP verification
- `/sc4sap:release` — CTS transport release workflow
- `/sc4sap:mcp-setup` — MCP ABAP ADT server configuration guide

### Agents
SAP-specialized agents are available for delegation:
- `sap-analyst`, `sap-architect`, `sap-code-reviewer`, `sap-critic`
- `sap-debugger`, `sap-doc-specialist`, `sap-executor`, `sap-planner`
- `sap-qa-tester`, `sap-writer`
- `sap-bc-consultant` — SAP Basis administration
- Module consultants: `sap-sd-consultant`, `sap-mm-consultant`, etc.

### SPRO Config Reference
Module config data is stored in `configs/{MODULE}/`:
- `spro.md` — SPRO configuration tables/views
- `tcodes.md` — Transaction codes
- `bapi.md` — BAPI/Function Module list
- `workflows.md` — Representative development workflows

### MCP Server (mcp-abap-adt)
All SAP system interactions go through the MCP ABAP ADT server (150+ tools):
- CRUD: `CreateClass`, `UpdateClass`, `GetClass`, `DeleteClass`, etc.
- Analysis: `GetAbapAST`, `GetAbapSemanticAnalysis`, `GetWhereUsed`
- Runtime: `RunUnitTest`, `GetUnitTestResult`
- System: `GetTableContents`, `GetSqlQuery`
- Transport: `CreateTransport`, `GetTransport`, `ListTransports`
