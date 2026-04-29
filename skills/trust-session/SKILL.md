---
name: prism:trust-session
description: INTERNAL-ONLY permission bootstrap. Grants MCP tool + file-op permissions for the current session (except GetTableContents / GetSqlQuery, which remain prompt-gated). MUST be invoked by a parent skill (create-program, setup, team, analyze-*, create-object) — direct user invocation is rejected with a redirect message.
level: 2
internal: true
model: haiku
---

# PRISM Trust Session (Internal-Only)

Session-scoped permission auto-approval. When a long-running parent skill enters its automated phases, every MCP `Create*` / `Update*` / `Delete*` call would otherwise trigger a "Allow this tool?" prompt. This skill pre-grants **all** required tool permissions so the parent pipeline proceeds uninterrupted.

**⚠️ This skill is NOT user-facing.** It exists only as a sub-routine of other skills. Direct `/prism:trust-session` invocation by the user is rejected — see `<Standalone_Invocation_Refusal>` below.


<Purpose>
Eliminate permission prompts for automated SAP pipelines by writing a wildcard allowlist to `.claude/settings.local.json` at session start, and by enforcing `mode: "dontAsk"` on every downstream `Agent` dispatch. Must ride on the authority of a parent skill so the user's permission grant is contextual, not blanket.
</Purpose>

<Response_Prefix>
Every response triggered by this skill MUST begin with `[Model: <main-model> · Dispatched: <sub-summary>]` per [`../../common/model-routing-rule.md`](../../common/model-routing-rule.md) § Response Prefix Convention.
</Response_Prefix>

<Standalone_Invocation_Refusal>
**MANDATORY gate — runs as Step 0 before any file write.**

Detect whether this skill is being invoked standalone or by a parent skill:
- **Parent skill present**: the invocation is chained from `/prism:create-program`, `/prism:setup`, `/prism:team`, `/prism:analyze-cbo-obj`, `/prism:analyze-code`, `/prism:analyze-symptom`, or `/prism:create-object`. The caller passes `parent_skill={name}` as the first argument OR the invocation appears inside another skill's execution trace in the current turn.
- **Standalone (no parent)**: user typed `/prism:trust-session` directly, or the arguments do not identify a known parent.

**On standalone invocation, refuse and redirect**:

```
⚠️ /prism:trust-session is an internal-only skill. Direct invocation is not allowed.

To grant session-wide MCP permissions, run one of the following parent skills instead
(each auto-invokes trust-session at entry):

  • /prism:create-program       — program creation pipeline (invokes at Phase 1)
  • /prism:create-object        — single object creation
  • /prism:analyze-cbo-obj      — CBO package inventory walk
  • /prism:analyze-code         — code review
  • /prism:analyze-symptom      — dump / error root-cause analysis
  • /prism:team                 — parallel agent orchestration

→ A separate trust-session run is unnecessary — the parent skill handles it for you.
```

After printing the message, STOP. Do NOT modify `.claude/settings.local.json`. Do NOT write `.prism/session-trust.log`.
</Standalone_Invocation_Refusal>

<Use_When>
- Called automatically as Phase 0 / entry step of a parent skill (see list above)
- Parent skill passes `parent_skill={name}` argument to identify itself
</Use_When>

<Do_Not_Use_When>
- User types `/prism:trust-session` directly → refuse per `<Standalone_Invocation_Refusal>`
- Running on a production SAP system without change authorization
</Do_Not_Use_When>

<What_This_Skill_Does>
Two-layer permission grant:

**Layer 1 — `.claude/settings.local.json` allowlist** (project-local, persists). **Scope policy: SAP MCP handlers auto-approved; non-SAP operations kept prompt-gated**. Specifically:

- **SAP MCP — allowed (enumerated, NOT wildcarded)**:
  - **PRISM plugin namespace** (`mcp__plugin_prism_sap__`) — enumerate all `Get*` / `Read*` / `Create*` / `Update*` / `Delete*` / `List*` / `Search*` / `Runtime*` / `RunUnitTest` / `CreateTransport` / `ValidateServiceBinding` tools, **EXCEPT** `GetTableContents` and `GetSqlQuery`.
  - **Legacy ABAP ADT namespace** (`mcp__mcp-abap-adt__`) — same enumeration rule, same two exclusions.
  - Wildcards are forbidden in these two namespaces because they would silently include the two excluded tools.
- **Sub-agent dispatch — allowed**:
  - `Agent(*)` — required so Phase 6 4-bucket parallel review and any other sub-agent fan-out run without prompts. Each sub-agent's tool calls still go through the same allowlist individually.
- **Internal state file I/O — allowed (path-scoped)**:
  - `Write(.prism/**)`, `Edit(.prism/**)` — runtime state files only (`state.json`, `spec.md`, `plan.md`, `review.md`, `report.md`, `cbo/**`, `session-trust.log`, etc.). Writes outside `.prism/**` prompt.
  - `Read(.prism/**)`, `Read(prism/**)` — read project state and rule files (common/, skills/).
  - `Glob(.prism/**)`, `Glob(prism/**)`, `Grep(.prism/**)`, `Grep(prism/**)` — search within project and state folders.
- **Everything else — NOT added to allow** (so normal prompt behavior is preserved):
  - Non-SAP MCP namespaces (`mcp__claude_ai_Notion__*`, `mcp__ide__*`, and any other MCP server) — prompt per call.
  - `Bash(...)` — prompt per command; the pre-existing specific Bash entries in the user's settings remain but trust-session does not add new Bash wildcards.
  - `Write` / `Edit` outside `.prism/**` — prompt (prevents accidental edits to `prism/` source files, `.claude/`, or anywhere else).
  - `WebFetch` / `WebSearch` — prompt.
  - Any tool not listed above — prompt.

Idempotent: if an entry already exists, do not duplicate.

**Excluded from auto-approval — normal prompt behavior preserved**:
The following tools are deliberately left OUT of the allowlist (they are NOT added to `deny` — a `deny` entry would block them entirely, which is wrong). Because they are not in `allow`, Claude Code will surface the standard per-call permission prompt to the user, who decides whether to approve that specific invocation:

- `mcp__plugin_prism_sap__GetTableContents`
- `mcp__plugin_prism_sap__GetSqlQuery`
- `mcp__mcp-abap-adt__GetTableContents`
- `mcp__mcp-abap-adt__GetSqlQuery`

**Rationale**: Metadata operations (`GetTable`, `GetStructure`, `GetDataElement`) return DDIC schema and are safe to auto-approve. Row-level extraction (`GetTableContents`, `GetSqlQuery`) risks pulling PII, financial data, or authorization-sensitive records — each call must remain an explicit user decision, but the tool itself must stay callable (not denied). See `common/data-extraction-policy.md`.

**Important — do NOT use a wildcard for the SAP namespaces**: adding `mcp__plugin_prism_sap__*` to `allow` would silently auto-approve `GetTableContents`/`GetSqlQuery` too, defeating the safeguard. If a previous run added the wildcard, the Execution_Steps below remove it and replace it with the explicit enumeration.

**Layer 2 — Downstream `Agent` dispatch mode** (runtime):
Every subsequent `Agent` call made by the calling skill MUST pass `mode: "dontAsk"` (or `"acceptEdits"` when the sub-agent needs to write files). The caller is responsible for propagating this — `trust-session` documents the requirement; it cannot enforce it at runtime.
</What_This_Skill_Does>

<Execution_Steps>
0. **Standalone gate** — if `<Standalone_Invocation_Refusal>` conditions match, refuse and STOP. Do not proceed to step 1.
1. Read `.claude/settings.local.json` (create `{"permissions":{"allow":[]}}` skeleton if missing).
2. **Strip forbidden entries if any** — remove the following entries from `permissions.allow` when found (they violate the "SAP handlers only + scoped file I/O" policy):

   **Wildcards** (too broad):
   - `mcp__plugin_prism_sap__*` — would auto-approve the excluded row-data tools
   - `mcp__mcp-abap-adt__*` — same reason
   - `mcp__claude_ai_Notion__*`, `mcp__ide__*` — non-SAP MCP; must prompt
   - `Read(*)`, `Write(*)`, `Edit(*)`, `Glob(*)`, `Grep(*)` — replaced by path-scoped entries in Step 4.

   **Individual row-data tools** (must NEVER auto-approve — safeguard recovery):
   - `mcp__plugin_prism_sap__GetSqlQuery`
   - `mcp__plugin_prism_sap__GetTableContents`
   - `mcp__mcp-abap-adt__GetSqlQuery`
   - `mcp__mcp-abap-adt__GetTableContents`

   Rationale for the individual strip: Claude Code's "Always allow" button appends the specific tool identifier to `permissions.allow` when the user approves a prompt. Without this cleanup, a single accidental "Always allow" click on a row-data tool would permanently disable the safeguard. Every trust-session invocation re-enforces the policy by removing any such entry that may have crept in since the last run.
3. **Enumerate SAP tools from the canonical catalog** — the authoritative tool list lives in the `data/prism-mcp-tools-*.md` partials (operation-class split: `-write.md`, `-read.md`, `-runtime.md`). Execution:
   1. Resolve the plugin root and glob `${CLAUDE_PLUGIN_ROOT}/data/prism-mcp-tools-*.md` (one level deep, hyphen-suffixed partials only — exclude the index file `prism-mcp-tools.md` which contains no tool bullets). If `CLAUDE_PLUGIN_ROOT` is unavailable, fall back to the cache copy: `~/.claude/plugins/cache/prism/prism/*/data/prism-mcp-tools-*.md`.
   2. If the glob matches zero files, ABORT Step 3 with error: `"trust-session: canonical tool catalog partials missing — reinstall or update prism plugin"` (do NOT fall back to LLM-recalled lists).
   3. For every matched file, read it. Extract each line matching the pattern `- mcp__plugin_prism_sap__<Name>` — that is a tool identifier to append to `permissions.allow` for the `mcp__plugin_prism_sap__` namespace.
   4. For the legacy `mcp__mcp-abap-adt__` namespace, re-emit each identifier with the prefix swapped (`mcp__plugin_prism_sap__` → `mcp__mcp-abap-adt__`) and append those too.
   5. `GetTableContents` and `GetSqlQuery` are already absent from every partial by policy — no additional skip logic needed. Do NOT add them even if somehow encountered.
   6. Dedupe: skip any identifier already present in `permissions.allow`.
   7. Wildcard prohibition (re-emphasis): never write `mcp__plugin_prism_sap__*` or `mcp__mcp-abap-adt__*` — enumeration only.
4. **Sub-agent + scoped file ops** — append the following entries to `permissions.allow` only if not already present:
   ```
   Agent(*)
   Read(.prism/**)
   Read(prism/**)
   Write(.prism/**)
   Edit(.prism/**)
   Glob(.prism/**)
   Glob(prism/**)
   Grep(.prism/**)
   Grep(prism/**)
   ```
   Do NOT add `Read(*)`, `Write(*)`, `Edit(*)`, `Glob(*)`, `Grep(*)`, `mcp__claude_ai_Notion__*`, `mcp__ide__*`, or any other non-SAP wildcard — those remain prompt-gated per policy. If a previous run added them, remove them as part of Step 2.
5. Preserve all existing entries in the file verbatim (env, hooks, other permissions).
6. Write the updated JSON back with 2-space indent.
7. Print one-line confirmation: `"✅ Session trust granted by {parent_skill} — SAP MCP handlers + .prism/ state I/O + Agent dispatch auto-approved. Non-SAP ops (Bash, WebFetch, Write/Edit outside .prism/, GetTableContents, GetSqlQuery) remain prompt-gated."`
8. Record activation in `.prism/session-trust.log` (append line: `{ISO-timestamp} granted-by={parent_skill}`) for audit.
</Execution_Steps>

<Enforcement_Contract>
- Parent skills MUST invoke `trust-session` with `parent_skill={self-name}` argument BEFORE their first `Create*` / `Update*` MCP call.
- Parent skill is responsible for passing `mode: "dontAsk"` to its own `Agent` dispatches.
- If the user has `DISABLE_OMC=1` or any kill-switch env var set, skip Layer 1 writes and warn.
- **Standalone refusal is non-negotiable** — even if the user insists on direct invocation, the refusal message stands. User must run the parent skill.
</Enforcement_Contract>

<Revocation>
To revoke: user runs `/prism:sap-option` → permissions tab → "revoke session trust", which strips the wildcard entries from `settings.local.json`. Per-tool prompts resume on next run.
</Revocation>

<State_Files>
- `.claude/settings.local.json` — permissions allowlist (modified)
- `.prism/session-trust.log` — audit trail
</State_Files>

Task: {{ARGUMENTS}}
