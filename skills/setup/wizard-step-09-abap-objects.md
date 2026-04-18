# Wizard Step 9 — ABAP Utility Objects Installation

Referenced by [`wizard-steps.md`](wizard-steps.md) — this file holds the full Step 9 content: three bundles installed in package `$TMP` (**local-only, not transportable** by design — these are developer/reuse helpers, not business logic).

## 9a. Function Modules `ZMCP_ADT_UTILS`

Required by the MCP server for Screen, GUI Status, and Text Element operations.

1. Check if function group `ZMCP_ADT_UTILS` already exists via `SearchObject` (query=`ZMCP_ADT_UTILS`, objectType=`FUGR`)
2. If NOT found, create the objects using MCP tools:
   - `CreateFunctionGroup` — name: `ZMCP_ADT_UTILS`, package: `$TMP`, description: `MCP ADT Utility Functions`
   - `CreateFunctionModule` — name: `ZMCP_ADT_DISPATCH`, group: `ZMCP_ADT_UTILS`, description: `MCP ADT Dispatcher for Screen/GUI Status`
   - `CreateFunctionModule` — name: `ZMCP_ADT_TEXTPOOL`, group: `ZMCP_ADT_UTILS`, description: `MCP ADT Text Pool Read/Write`
   - `UpdateFunctionModule` — for each FM, read the ABAP source from `abap/zmcp_adt_dispatch.abap` and `abap/zmcp_adt_textpool.abap` in the plugin directory, then upload via UpdateFunctionModule
   - Both function modules MUST be set as **RFC-enabled**
   - Activate all objects
3. If already found, skip creation and report "ZMCP_ADT_UTILS already exists"
4. Test by calling `SearchObject` for `ZMCP_ADT_DISPATCH` to verify

## 9b. ALV OOP Reuse Handlers `ZIF_S4SAP_CM` / `ZCX_S4SAP_EXCP` / `ZCL_S4SAP_CM_*`

Reusable ALV Grid + ALV Tree + SALV wrapper library consumed by generated programs (e.g. via `/sc4sap:create-program`) and custom dialogs.

1. Check if interface `ZIF_S4SAP_CM` already exists via `SearchObject` (query=`ZIF_S4SAP_CM`, objectType=`INTF`). If yes, skip 9b entirely and report "ALV OOP handlers already installed".
2. Source location: `abap/alv-oop-handlers/` (7 objects = 14 files, `.abap` source + `.xml` ADT metadata pairs).
3. Uses **standard message class `S_UNIFIED_CON`** (messages `013 No data found`, `000 &1 &2 &3 &4`). Do **not** create a custom message class — it is already shipped by SAP and the exception class is hardcoded against it. If `S_UNIFIED_CON` is missing from the system (very rare), stop and inform the user.
4. Create in **dependency order** (MCP calls: `CreateInterface`/`CreateClass` → `UpdateInterface`/`UpdateClass` with source from the `.abap` file → activate):
   - **① `ZIF_S4SAP_CM`** (interface) — no Z deps. Source: `zif_s4sap_cm.intf.abap`. Description from `.intf.xml` → `DESCRIPT`.
   - **② `ZCX_S4SAP_EXCP`** (exception class) — `CreateClass` with superclass `CX_STATIC_CHECK`, category `40` (exception), final, public. Source: `zcx_s4sap_excp.clas.abap`.
   - **③ `ZCL_S4SAP_CM_OALV`** (ALV Grid subclass of `CL_GUI_ALV_GRID`) — no Z deps. Source: `zcl_s4sap_cm_oalv.clas.abap`.
   - **④ `ZCL_S4SAP_CM_OTREE`** (ALV Tree subclass of `CL_GUI_ALV_TREE`) — no Z deps. Source: `zcl_s4sap_cm_otree.clas.abap`.
   - **⑤ `ZCL_S4SAP_CM_ALV_EVENT`** (event handler for `CL_GUI_ALV_GRID`) — no Z deps. Source: `zcl_s4sap_cm_alv_event.clas.abap`.
   - **⑥ `ZCL_S4SAP_CM_TREE_EVENT`** (event handler for `CL_GUI_ALV_TREE`) — no Z deps. Source: `zcl_s4sap_cm_tree_event.clas.abap`.
   - **⑦ `ZCL_S4SAP_CM_ALV`** (main container manager) — depends on ①②③④⑤⑥. Source: `zcl_s4sap_cm_alv.clas.abap`. Implements `ZIF_S4SAP_CM`.
5. After each object: run `GetAbapSemanticAnalysis` for syntax, then activate. If activation fails at step ⑦ with unresolved references, verify ①–⑥ are **active** (not just created) via `GetInactiveObjects`.
6. Final check: `SearchObject` for `ZCL_S4SAP_CM_ALV` returns an active object → report "✅ ALV OOP handlers installed (7 objects)".
7. On partial failure (some objects created, others failed): surface which object failed and the error; do NOT auto-delete successfully created objects — let the user decide whether to retry or remove.

## 9c. OData Backend Classes + Cache Utility — CONDITIONAL

Only when `SAP_RFC_BACKEND=odata`. Installs `ZCL_ZMCP_ADT_MPC/DPC/_EXT` classes + `ZMCP_ADT_FLUSH_CACHE` program + prints Basis registration guide. Full procedure in **[`odata-classes-install.md`](odata-classes-install.md)**.

## 9d. ZRFC ICF Handler Class — CONDITIONAL

Only when `SAP_RFC_BACKEND=zrfc`. Skip entirely for other backends.

Installs the single class that powers the `zrfc` backend: an `IF_HTTP_EXTENSION` handler that exposes `ZMCP_ADT_DISPATCH` / `ZMCP_ADT_TEXTPOOL` as HTTPS/JSON endpoints — so no SAP NW RFC SDK (paid license), no `/sap/bc/soap/rfc` ICF node, and no OData Gateway registration are required.

1. Check if class `ZCL_MCP_RFC_HTTP_HANDLER` exists via `SearchObject` (query=`ZCL_MCP_RFC_HTTP_HANDLER`, objectType=`CLAS`). If found, skip creation and report "ZRFC handler already installed".
2. Source location: `abap/zcl_mcp_rfc_http_handler.abap` in the `abap-mcp-adt-powerup` plugin directory.
3. Create the class via MCP:
   - `CreateClass` — name `ZCL_MCP_RFC_HTTP_HANDLER`, package `$TMP` (same convention as `ZMCP_ADT_UTILS`), superclass blank, final + public, description `"MCP RFC HTTP Handler (IF_HTTP_EXTENSION)"`.
   - `UpdateClass` — upload the full source from the plugin file. The class declares `INTERFACES if_http_extension`, a hardcoded private `gt_deny_list` populated in `class_constructor`, and methods for `/dispatch` / `/textpool` / `/call` routing + CSRF handling.
   - `GetAbapSemanticAnalysis` — verify no syntax errors.
   - Activate. Check `GetInactiveObjects` to confirm.
4. **SICF node activation — manual (MCP cannot control SICF)**. Print this block to the user:

   > **SAPGUI → SICF (transaction)**
   > - Hierarchy Type `SERVICE` → Execute
   > - Navigate: `default_host` → `sap` → `bc` → `rest`
   > - If node `rest` is inactive → right-click → **Activate Service** (and its parent chain)
   > - Right-click on `rest` → **New Sub-Element**:
   >   - **Name**: `zmcp_rfc`
   >   - **Handler List** tab → Handler: `ZCL_MCP_RFC_HTTP_HANDLER`
   >   - **Service Data** tab → Logon Data: leave default (Basic Auth + client-inherited)
   > - Right-click on the new `zmcp_rfc` node → **Activate Service**
   > - Verify: `curl -u $SAP_USERNAME:$SAP_PASSWORD -H "X-CSRF-Token: Fetch" "$SAP_URL/sap/bc/rest/zmcp_rfc/dispatch?sap-client=$SAP_CLIENT"` returns `200` with an `X-CSRF-Token` response header
   >
   > Confirm "SICF zmcp_rfc 활성화 완료" back to sc4sap before proceeding.

5. After SICF activation: re-run the CSRF probe from `rfc-backend-selection.md` "If the user chose `zrfc`" → item 2. If the probe succeeds, proceed to Step 5 (MCP reconnect). If it fails (`404`, `401`, empty token), halt and surface the symptom.

**Security note** — the deny list is hardcoded in `ZCL_MCP_RFC_HTTP_HANDLER->class_constructor`. Extending or tightening the list is a source change + transport, not an SM30 table edit. This is deliberate: a DDIC-table deny list would let any SM30-authorized user bypass the control.
