# SPRO Lookup Protocol

**MANDATORY for all sc4sap consultant agents and any skill that needs SAP Customizing / IMG data.**

When you need SAP Customizing information for a module, resolve the lookup in this order:

## Resolution Order

### 1. Local SPRO Cache (preferred)

Check for `.sc4sap/spro-config.json` at the project root.

- If present:
  - Load the file and use `modules.{MODULE}` for the target module
  - Surface the cache timestamp in your reasoning/output (e.g., "config snapshot: 2026-04-13T…")
  - **Do NOT call MCP** to re-fetch tables that already exist in the cache
  - If the user question targets a module that is missing from the cached `modules` map, fall through to Step 2 for that module only
- Module-specific cache files `.sc4sap/spro-config-{MODULE}.json` are also acceptable if the merged file is absent

Per-module populated keys typically include: customizing tables, view contents, timestamp, extraction source.

### 2. Static Reference Docs (fallback)

If the cache does not exist, read the plugin-shipped static docs:

- `configs/{MODULE}/spro.md` — SPRO customizing reference
- `configs/{MODULE}/tcodes.md` — transaction codes
- `configs/{MODULE}/tables.md` — key tables
- `configs/{MODULE}/bapi.md` — BAPI / Function Module reference
- `configs/{MODULE}/enhancements.md` — BAdI / User Exit / BTE
- `configs/{MODULE}/workflows.md` — development workflows

These are versioned with the plugin and always available, but reflect a generic reference — not the customer's actual customizing.

### 3. Live MCP Query (last resort)

If neither cache nor static doc has the answer:

1. Warn the user: "로컬 캐시가 없어 서버를 직접 조회합니다. 토큰 소모가 발생합니다. 진행할까요?"
2. On confirm: use MCP `GetTableContents`, `GetView`, or equivalent
3. Do **not** silently hit the server — always surface the cost implication

## Setup Awareness

- The cache is populated by `/sc4sap:setup spro` (optional step during setup).
- If the cache is missing, you MAY recommend the user run `/sc4sap:setup spro` after the current task — but do not block the current task on it.
- Treat a stale cache (> 90 days, or user-indicated customizing change) as a prompt to suggest refresh, but still prefer it over live query unless the user explicitly opts out.

## Agent Integration Checklist

Every consultant agent's `<Reference_Data>` section MUST list:

1. Local SPRO Cache (`.sc4sap/spro-config.json` → `modules.{MODULE}`) — **priority 1**
2. Static reference (`configs/{MODULE}/spro.md` etc.) — fallback
3. Pointer to this protocol: `common/spro-lookup.md`

Any skill that delegates to a consultant MUST pass a "local cache available: yes/no" flag in its handoff context so the consultant can short-circuit the lookup decision.
