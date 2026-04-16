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
- Before `/sc4sap:create-program` or `/sc4sap:autopilot` on a new spec — so reuse is evaluated
- User says "analyze CBO", "analyze custom objects", "map Z package", "list frequently used customs", "CBO inventory"
</Use_When>

<Do_Not_Use_When>
- User wants a code quality review of one object → `/sc4sap:analyze-code`
- User wants to reverse-engineer ONE program into a spec → `/sc4sap:program-to-spec`
- User wants to create an object → `/sc4sap:create-object`
- Package does not yet contain custom objects (CBO discovery is not meaningful)
</Do_Not_Use_When>

<Workflow_Steps>

**Step 1 — Ask for the CBO package name** (exactly one question)
> "Which CBO package do you want to analyze? (e.g., `ZSD_MAIN`, `ZMM_CORE`). If you only know a prefix like `ZSD*`, tell me the prefix and I will search for packages."

- If the user gives a prefix pattern: call `SearchObject(objectType='DEVC', query=<prefix>)` and list matches, then re-ask.
- Verify the final package with `GetPackage(<name>)`. If it does not exist, report and stop.

**Step 2 — Ask which module this package belongs to** (exactly one question, constrained list)
> "Which SAP module does this package belong to? Pick one of: SD / MM / PP / PM / QM / WM / TM / TR / FI / CO / HCM / BW / PS / Ariba."

- Valid values = the folder list under `configs/`. Reject anything else and re-ask.
- Normalize to uppercase (e.g., `sd` → `SD`) and verify `configs/<MODULE>/` exists.

**Step 3 — Walk the package** (auto)
- `GetPackageContents(package=<name>)` for the root package.
- If sub-packages exist, walk them with `GetPackageTree`.
- Collect objects of these types (ignore the rest):
  | Type | MCP object type | What it represents |
  |------|-----------------|--------------------|
  | Table | `TABL` | Transparent / pooled table |
  | Structure | `STRU` | DDIC structure |
  | Table type | `TTYP` | DDIC table type |
  | Data element | `DTEL` | Field semantics |
  | Domain | `DOMA` | Value range |
  | View | `VIEW` | DDIC view / CDS view |
  | Class | `CLAS` | Global class (ZCL_) |
  | Interface | `INTF` | Global interface (ZIF_) |
  | Function group | `FUGR` | Function pool (and its FMs) |
  | Program | `PROG` | Executable / include / module pool |

**Step 4 — Build the reference graph** (auto)
- For each collected object, call `GetWhereUsed(<object>)` to get its usage locations.
- Keep only usages whose owning object is **also inside the package** (internal reuse). Drop SAP-standard callers.
- Rank each object by internal reference count. Label the top tier as "frequently used" using these thresholds (tune per package size):
  - Small package (<30 objects): ref count ≥ 2
  - Medium (30–150): ref count ≥ 3
  - Large (>150): ref count ≥ 5
- Additionally keep any object whose name ends in patterns that signal shared utility (`*_UTIL*`, `*_HELPER*`, `*_COMMON*`, `*_CONST*`, `*_TYPES*`, `*_MSG*`).

**Step 5 — Infer business purpose** (auto, per frequently-used object)
For each object in the frequently-used set, collect the signals below and summarise the business purpose in 1–2 sentences:
- DDIC short description (`GetObjectInfo`)
- For tables/structures: primary key + foreign keys to SAP standard tables (VBAK/MARA/BKPF/...) from `GetTable` / `GetStructure`
- For data elements: domain, field label, documentation — via `GetDataElement`
- For classes: public interface list, key method names — via `GetClass`
- For function modules: importing/exporting/tables parameters — via `GetFunctionGroup` + `GetFunctionModule`
- Heuristic role classification: `header / line / log / mapping / classification / config / util / service / event / dto`

**Step 6 — Persist the inventory** (auto)
Write to `.sc4sap/cbo/<MODULE>/<PACKAGE>/`:

- `index.md` — human-readable summary:
  - Package name, module, SAP version, scan timestamp
  - `## Frequently used tables`, `## Frequently used structures`, `## Frequently used data elements`, `## Frequently used classes`, `## Frequently used function modules`, `## Frequently used table types`, `## Frequently used programs/views`
  - Each entry: object name · ref count · role · one-line business purpose · suggested reuse scenario
- `inventory.json` — machine-readable, consumed by `program` / `program-to-spec` / `create-object`:
  ```json
  {
    "package": "ZSD_MAIN",
    "module": "SD",
    "scanned_at": "<ISO timestamp>",
    "sap_version": "<S4|ECC>",
    "objects": [
      {
        "name": "ZSD_ORDER_LOG",
        "type": "TABL",
        "ref_count": 7,
        "role": "log",
        "purpose": "append-only sales-order processing log keyed by VBELN",
        "keys": ["MANDT", "VBELN", "POSNR", "LOGDATE"],
        "fk_to_standard": ["VBAK-VBELN", "VBAP-POSNR"],
        "reuse_hint": "extend this table instead of creating a new order log"
      }
    ]
  }
  ```
- `raw-walk.md` (optional) — full list of every object in the package with type + description, for reference. Only generate if user asks for it or package has <200 objects.

**Step 7 — PII / blocklist check** (auto, mandatory)
Objects whose name contains `PII`, `HR`, `CUST`, `VEND`, `BANK`, `PRICE`, `SALARY`, `PAY`, `CARD` (or similar) must be flagged in `index.md` under a `## Sensitive CBO objects` section and compared against `exceptions/custom-patterns.md`. Suggest the user add matching tables to `.sc4sap/blocklist-extend.txt`. Never call `GetTableContents` here — this skill only reads DDIC metadata, never row data.

**Step 8 — Hand-off summary** (auto)
Print to the user:
```
CBO inventory written:
  .sc4sap/cbo/<MODULE>/<PACKAGE>/index.md
  .sc4sap/cbo/<MODULE>/<PACKAGE>/inventory.json

Frequently used: N tables · M structures · K data elements · P classes · Q FMs
Sensitive objects flagged: X

Downstream skills (/sc4sap:create-program, /sc4sap:program-to-spec, /sc4sap:autopilot)
will read inventory.json first and prefer these assets over creating new ones.
```

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
