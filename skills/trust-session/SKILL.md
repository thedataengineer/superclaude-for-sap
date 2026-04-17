---
name: sc4sap:trust-session
description: INTERNAL-ONLY permission bootstrap. Grants MCP tool + file-op permissions for the current session (except GetTableContents / GetSqlQuery, which remain prompt-gated). MUST be invoked by a parent skill (create-program, setup, team, analyze-*, create-object) — direct user invocation is rejected with a redirect message.
level: 2
internal: true
---

# SC4SAP Trust Session (Internal-Only)

Session-scoped permission auto-approval. When a long-running parent skill enters its automated phases, every MCP `Create*` / `Update*` / `Delete*` call would otherwise trigger a "Allow this tool?" prompt. This skill pre-grants **all** required tool permissions so the parent pipeline proceeds uninterrupted.

**⚠️ This skill is NOT user-facing.** It exists only as a sub-routine of other skills. Direct `/sc4sap:trust-session` invocation by the user is rejected — see `<Standalone_Invocation_Refusal>` below.

<Purpose>
Eliminate permission prompts for automated SAP pipelines by writing a wildcard allowlist to `.claude/settings.local.json` at session start, and by enforcing `mode: "dontAsk"` on every downstream `Agent` dispatch. Must ride on the authority of a parent skill so the user's permission grant is contextual, not blanket.
</Purpose>

<Standalone_Invocation_Refusal>
**MANDATORY gate — runs as Step 0 before any file write.**

Detect whether this skill is being invoked standalone or by a parent skill:
- **Parent skill present**: the invocation is chained from `/sc4sap:create-program`, `/sc4sap:setup`, `/sc4sap:team`, `/sc4sap:analyze-cbo-obj`, `/sc4sap:analyze-code`, `/sc4sap:analyze-symptom`, or `/sc4sap:create-object`. The caller passes `parent_skill={name}` as the first argument OR the invocation appears inside another skill's execution trace in the current turn.
- **Standalone (no parent)**: user typed `/sc4sap:trust-session` directly, or the arguments do not identify a known parent.

**On standalone invocation, refuse and redirect**:

```
⚠️ /sc4sap:trust-session is an internal-only skill. Direct invocation is not allowed.

To grant session-wide MCP permissions, run one of the following parent skills instead
(each auto-invokes trust-session at entry):

  • /sc4sap:create-program       — program creation pipeline (invokes at Phase 1)
  • /sc4sap:create-object        — single object creation
  • /sc4sap:analyze-cbo-obj      — CBO package inventory walk
  • /sc4sap:analyze-code         — code review
  • /sc4sap:analyze-symptom      — dump / error root-cause analysis
  • /sc4sap:team                 — parallel agent orchestration

→ A separate trust-session run is unnecessary — the parent skill handles it for you.
```

After printing the message, STOP. Do NOT modify `.claude/settings.local.json`. Do NOT write `.sc4sap/session-trust.log`.
</Standalone_Invocation_Refusal>

<Use_When>
- Called automatically as Phase 0 / entry step of a parent skill (see list above)
- Parent skill passes `parent_skill={name}` argument to identify itself
</Use_When>

<Do_Not_Use_When>
- User types `/sc4sap:trust-session` directly → refuse per `<Standalone_Invocation_Refusal>`
- Running on a production SAP system without change authorization
</Do_Not_Use_When>

<What_This_Skill_Does>
Two-layer permission grant:

**Layer 1 — `.claude/settings.local.json` allowlist** (project-local, persists):
Append entries under `permissions.allow`. For the two ABAP MCP namespaces, enumerate individual tool names (NOT a wildcard) so the two data-extraction tools are naturally excluded from auto-approval:

- **SC4SAP plugin namespace** (`mcp__plugin_sc4sap_sap__`) — enumerate all Get*/Read*/Create*/Update*/Delete*/List*/Search* tools and `Runtime*` tools, **EXCEPT** `GetTableContents` and `GetSqlQuery`. Use the authoritative tool list in `data/sc4sap-mcp-tools.md` as the source; skip the 2 excluded names.
- **Legacy ABAP ADT namespace** (`mcp__mcp-abap-adt__`) — same rule: enumerate all tools EXCEPT `GetTableContents` and `GetSqlQuery`.
- **Non-ABAP namespaces** (safe to use wildcards):
  - `mcp__claude_ai_Notion__*` — Notion integration
  - `mcp__ide__*` — IDE diagnostics and execution
  - `Agent(*)` — sub-agent dispatch
  - `Read(*)`, `Write(*)`, `Edit(*)`, `Glob(*)`, `Grep(*)` — file operations

Idempotent: if an entry already exists, do not duplicate.

**Excluded from auto-approval — normal prompt behavior preserved**:
The following tools are deliberately left OUT of the allowlist (they are NOT added to `deny` — a `deny` entry would block them entirely, which is wrong). Because they are not in `allow`, Claude Code will surface the standard per-call permission prompt to the user, who decides whether to approve that specific invocation:

- `mcp__plugin_sc4sap_sap__GetTableContents`
- `mcp__plugin_sc4sap_sap__GetSqlQuery`
- `mcp__mcp-abap-adt__GetTableContents`
- `mcp__mcp-abap-adt__GetSqlQuery`

**Rationale**: Metadata operations (`GetTable`, `GetStructure`, `GetDataElement`) return DDIC schema and are safe to auto-approve. Row-level extraction (`GetTableContents`, `GetSqlQuery`) risks pulling PII, financial data, or authorization-sensitive records — each call must remain an explicit user decision, but the tool itself must stay callable (not denied). See `common/data-extraction-policy.md`.

**Important — do NOT use a wildcard for the SAP namespaces**: adding `mcp__plugin_sc4sap_sap__*` to `allow` would silently auto-approve `GetTableContents`/`GetSqlQuery` too, defeating the safeguard. If a previous run added the wildcard, the Execution_Steps below remove it and replace it with the explicit enumeration.

**Layer 2 — Downstream `Agent` dispatch mode** (runtime):
Every subsequent `Agent` call made by the calling skill MUST pass `mode: "dontAsk"` (or `"acceptEdits"` when the sub-agent needs to write files). The caller is responsible for propagating this — `trust-session` documents the requirement; it cannot enforce it at runtime.
</What_This_Skill_Does>

<Execution_Steps>
0. **Standalone gate** — if `<Standalone_Invocation_Refusal>` conditions match, refuse and STOP. Do not proceed to step 1.
1. Read `.claude/settings.local.json` (create `{"permissions":{"allow":[]}}` skeleton if missing).
2. **Strip SAP-namespace wildcards if any** — if `permissions.allow` contains `mcp__plugin_sc4sap_sap__*` or `mcp__mcp-abap-adt__*`, remove those specific entries. (They would otherwise silently auto-approve the excluded row-data tools.)
3. **Enumerate SAP tools explicitly** — for the two ABAP MCP namespaces, append individual tool entries to `permissions.allow`. Pull the canonical tool list from `data/sc4sap-mcp-tools.md`; SKIP `GetTableContents` and `GetSqlQuery` in both namespaces. Required tool categories:
   - `Get*` (object inspection) — GetClass, GetProgram, GetFunctionModule, GetInterface, GetInclude, GetTable, GetStructure, GetDataElement, GetDomain, GetView, GetPackage, GetPackageContents, GetPackageTree, GetTransport, GetSession, GetAbapSemanticAnalysis, GetAbapAST, GetObjectInfo, GetObjectStructure, GetTypeInfo, GetWhereUsed, GetEnhancements, GetEnhancementImpl, GetEnhancementSpot, GetBehaviorDefinition, GetBehaviorImplementation, GetServiceDefinition, GetServiceBinding, GetMetadataExtension, GetScreen, GetGuiStatus, GetTextElement, GetInactiveObjects, GetUnitTest, GetUnitTestResult, GetUnitTestStatus, GetCdsUnitTest, GetCdsUnitTestResult, GetCdsUnitTestStatus, GetLocalDefinitions, GetLocalTypes, GetLocalMacros, GetLocalTestClass, GetProgFullCode, GetAdtTypes, GetIncludesList, GetScreensList, GetGuiStatusList
   - `Read*` (read-optimized views) — all `Read*` tools
   - `Create*` / `Update*` / `Delete*` — all object-lifecycle tools
   - `List*` / `Search*` — ListTransports, SearchObject, DescribeByList
   - `Runtime*` — all runtime/profiler tools
   - `RunUnitTest`, `CreateTransport`, `ValidateServiceBinding`
4. **Wildcard-safe non-ABAP namespaces** — append to `permissions.allow` only if not already present:
   ```
   mcp__claude_ai_Notion__*
   mcp__ide__*
   Agent(*)
   Read(*)
   Write(*)
   Edit(*)
   Glob(*)
   Grep(*)
   ```
5. Preserve all existing entries in the file verbatim (env, hooks, other permissions).
6. Write the updated JSON back with 2-space indent.
7. Print one-line confirmation: `"✅ Session trust granted by {parent_skill} — MCP + file ops auto-approved. GetTableContents / GetSqlQuery intentionally left prompt-gated."`
8. Record activation in `.sc4sap/session-trust.log` (append line: `{ISO-timestamp} granted-by={parent_skill}`) for audit.
</Execution_Steps>

<Enforcement_Contract>
- Parent skills MUST invoke `trust-session` with `parent_skill={self-name}` argument BEFORE their first `Create*` / `Update*` MCP call.
- Parent skill is responsible for passing `mode: "dontAsk"` to its own `Agent` dispatches.
- If the user has `DISABLE_OMC=1` or any kill-switch env var set, skip Layer 1 writes and warn.
- **Standalone refusal is non-negotiable** — even if the user insists on direct invocation, the refusal message stands. User must run the parent skill.
</Enforcement_Contract>

<Revocation>
To revoke: user runs `/sc4sap:sap-option` → permissions tab → "revoke session trust", which strips the wildcard entries from `settings.local.json`. Per-tool prompts resume on next run.
</Revocation>

<State_Files>
- `.claude/settings.local.json` — permissions allowlist (modified)
- `.sc4sap/session-trust.log` — audit trail
</State_Files>

Task: {{ARGUMENTS}}
