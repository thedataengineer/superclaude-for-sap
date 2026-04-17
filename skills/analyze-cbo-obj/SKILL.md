---
name: sc4sap:analyze-cbo-obj
description: Analyze a CBO (Customer Business Object) package — discover frequently-used Z tables / function modules / data elements / classes / structures / table types — and save a per-module / per-package reference file so later `program` / `program-to-spec` runs prefer existing CBO elements over new ones.
level: 2
---

# SC4SAP Analyze CBO Objects

Walks a CBO (Customer Business Object) package, inventories every project-built ABAP element (table, structure, data element, class, interface, function module, program, view, table type), detects which elements are **frequently reused inside the package**, infers each element's business purpose from its name/fields/descriptions, and persists the result to `.sc4sap/cbo/<MODULE>/<PACKAGE>/` for downstream skills (`program`, `program-to-spec`, `create-object`, `autopilot`) to consult before creating anything new.

<Purpose>
Projects accumulate Z tables, Z data elements, Z function modules, and ZCL_ classes that encode domain logic. New development too often recreates near-duplicates because nobody has a compact inventory of what already exists. `analyze-cbo-obj` produces that inventory — once per package — and writes it to a file that later `sc4sap:` skills read automatically, so the next spec / program / object creation defaults to reusing proven CBO assets.
</Purpose>

<Use_When>
- Starting development on a module that already has a sizeable Z-package
- Onboarding onto an AMS / support engagement (need a map of custom assets)
- Before `/sc4sap:create-program` or `/sc4sap:create-object` on a new spec — so reuse is evaluated
- User says "analyze CBO", "analyze custom objects", "map Z package", "list frequently used customs", "CBO inventory"
</Use_When>

<Do_Not_Use_When>
- User wants a code quality review of one object → `/sc4sap:analyze-code`
- User wants to reverse-engineer ONE program into a spec → `/sc4sap:program-to-spec`
- User wants to create an object → `/sc4sap:create-object`
- Package does not yet contain custom objects (CBO discovery is not meaningful)
</Do_Not_Use_When>

<Session_Trust_Bootstrap>
**MANDATORY — runs as Step 0 before any MCP call or user interaction.**

Invoke `/sc4sap:trust-session` with `parent_skill=sc4sap:analyze-cbo-obj` to pre-grant all MCP tool + file-op permissions for this session (eliminates per-tool "Allow this tool?" prompts during the 8-step walk).

- If `.sc4sap/session-trust.log` already has a line within the last 24h, skip silently.
- Otherwise run it and surface the one-line confirmation.
- All subsequent `Agent` dispatches within this skill MUST pass `mode: "dontAsk"`.

Full spec: see [`../trust-session/SKILL.md`](../trust-session/SKILL.md).
</Session_Trust_Bootstrap>

<Workflow_Steps>
The 8-step workflow (Step 1 → Step 8) lives in a companion file to keep this skill doc short.

**MUST read [`workflow-steps.md`](./workflow-steps.md)** (in this skill folder) and execute the steps defined there in order whenever this skill runs. Highlights:
- Step 1 / 1.5 / 2 — Socratic questions: package name → flagship programs (optional) → module.
- Step 3 / 4 — Walk package (TABL/STRU/TTYP/DTEL/DOMA/VIEW/CLAS/INTF/FUGR/PROG) and build the `GetWhereUsed` graph; objects used by flagship programs receive a `key_boost = len(used_by_key_programs) * 10` so they always rank as "frequently used".
- Step 5 — Infer business purpose from DDIC metadata (role: header / line / log / mapping / classification / config / util / service / event / dto).
- Step 6 — Persist `.sc4sap/cbo/<MODULE>/<PACKAGE>/{index.md, inventory.json}` with **pinned (flagship-referenced) objects sorted to the top**; see the JSON schema example inside `workflow-steps.md`.
- Step 7 — Sensitive-name flagging against `exceptions/custom-patterns.md`; never call `GetTableContents` / `GetSqlQuery`.
- Step 8 — Hand-off summary for downstream skills.
</Workflow_Steps>

<Output_Files>
```
.sc4sap/cbo/
└── <MODULE>/               # SD, MM, PP, PM, QM, WM, TM, TR, FI, CO, HCM, BW, PS, Ariba
    └── <PACKAGE>/          # e.g., ZSD_MAIN
        ├── index.md        # human-readable summary, grouped by object type
        ├── inventory.json  # machine-readable, consumed by sibling skills
        └── raw-walk.md     # optional full walk (only if asked or small package)
```
</Output_Files>

<MCP_Tools_Used>
- Discovery: `GetPackage`, `GetPackageContents`, `GetPackageTree`, `SearchObject`, `GetObjectsByType`
- Object detail: `GetTable`, `GetStructure`, `GetDataElement`, `GetDomain`, `GetView`, `GetClass`, `GetInterface`, `GetFunctionGroup`, `GetFunctionModule`, `GetProgram`, `GetObjectInfo`
- Usage graph: `GetWhereUsed`
- NEVER used by this skill: `GetTableContents`, `GetSqlQuery` (no row data — DDIC metadata only)
</MCP_Tools_Used>

<Related_Skills>
- `/sc4sap:create-program` — reads `.sc4sap/cbo/<MODULE>/<PACKAGE>/inventory.json` during spec drafting to prefer existing CBO elements
- `/sc4sap:program-to-spec` — same, for reverse-engineering
- `/sc4sap:create-object` — same, to suggest reuse before creation
- `/sc4sap:analyze-code` — quality review of ONE object (complementary, not overlapping)
</Related_Skills>

<Data_Extraction_Safety>
This skill only reads DDIC metadata and where-used relations. It MUST NOT call `GetTableContents` or `GetSqlQuery`. Row-level access stays behind the standard blocklist + `acknowledge_risk` gate. See `common/data-extraction-policy.md`.
</Data_Extraction_Safety>

Task: {{ARGUMENTS}}
