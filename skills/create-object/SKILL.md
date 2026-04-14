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
- Modifying an existing object -- use ralph or direct MCP Update* tools
- Creating multiple interdependent objects -- use `/sc4sap:autopilot` or `/sc4sap:team`
- User just wants to understand what type to use -- use `/sc4sap:ask`
</Do_Not_Use_When>

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

**Step 1 - Classify Object Type** (auto)
- Parse user request to determine object type
- If ambiguous: ask "Do you want a class, program, function module, or other type?"

**Step 2 - Collect Metadata** (confirm required)
- Object name: suggest name based on description, enforce naming conventions
  - Z/Y prefix required for customer objects
  - Max 30 characters
  - Uppercase only
  - No special characters except underscore
- Short description: 1 line, max 60 chars
- Package: show recent packages or search; warn if `$TMP` (local, not transportable)
- Transport: list open transports owned by current user; option to create new

**Step 3 - Pre-Creation Check** (auto)
- Call `SearchObject` to verify the name does not already exist
- If exists: "Object {name} already exists. Use ralph to modify it instead."

**Step 4 - Create Object** (auto)
- Call appropriate Create* MCP tool with confirmed metadata
- For Function Module: create Function Group first if it doesn't exist (`CreateFunctionGroup`)
- For Service Binding: ensure Service Definition exists first
- For Screen / GUI Status: parent program must exist first; create program if needed

**Step 5 - Generate Initial Implementation** (auto)
- Write skeleton code appropriate to object type:
  - Class: constructor, standard interface implementations if applicable
  - Program: REPORT statement, basic structure
  - Function Module: parameter documentation, basic error handling
  - Table: key fields, client field for client-dependent tables
  - Interface: method signatures based on described purpose
  - Screen: PROCESS BEFORE OUTPUT / PROCESS AFTER INPUT flow logic, basic module stubs
  - GUI Status: standard function key layout (Back/Exit/Cancel), application toolbar
- Write code via appropriate Update* MCP tool

**Step 6 - Activate** (auto)
- Activate the object
- Check `GetInactiveObjects` — must be empty for this object
- If activation fails: display error, suggest fix, retry once

**Step 7 - Completion Report**
- Object name and type
- Package and transport
- Activation status (ACTIVE / FAILED)
- Next steps suggestion (e.g., "Add methods with `/sc4sap:ralph`" or "Release with `/sc4sap:release`")

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
</MCP_Tools_Used>

Task: {{ARGUMENTS}}
