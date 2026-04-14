---
name: sc4sap:sap-option
description: View SAP system status snapshot and edit values in `.sc4sap/sap.env` (connection, blocklist) and HUD usage limits in `~/.claude/settings.json` → `env` — single entrypoint for all sc4sap runtime options
level: 2
---

# SC4SAP Option

Single entrypoint to **inspect live SAP state** and **edit the values stored in `.sc4sap/sap.env`** — the dotenv file that holds SAP connection credentials, TLS settings, and the `abap-mcp-adt-powerup` blocklist policy for row-extraction safety.

<Purpose>
`sap.env` is the single source of truth for per-user runtime configuration of the sc4sap MCP server. This skill also replaces the former `/sc4sap:hud` snapshot: before editing, it shows a compact status panel (system ID, client, user, inactive object count, active transport, blocklist profile) so the user can confirm which system they are about to change settings for.

Users should not edit `sap.env` blindly; this skill surfaces the current values (masking secrets), explains each option, lets the user pick what to change, and writes the file back safely with a backup.
</Purpose>

<Use_When>
- User says "sap option", "sap.env 보여줘", "change SAP password", "switch SAP client", "블록리스트 프로파일 바꿔", "loosen blocklist", "whitelist ACDOCA", "view SAP config", "SAP 옵션".
- User says "hud", "show status", "show system info", "현재 SAP 상태", "어떤 시스템 붙어있지" — run the status snapshot (workflow step 3) and stop there unless the user then asks to edit.
- User wants to change blocklist tier (`MCP_BLOCKLIST_PROFILE`) or manage `MCP_ALLOW_TABLE` / `MCP_BLOCKLIST_EXTEND`.
- User is rotating credentials, moving to a new SAP system, or flipping language/client.
- After `/sc4sap:setup` if the user wants to adjust without re-running full setup.
- User says "hud 한도", "5h limit", "weekly limit", "extra limit", "usage budget", "limit 설정" — route to the **HUD limits** flow (see `<HUD_Limits>`), which edits `~/.claude/settings.json` → `env`, not `sap.env`.
</Use_When>

<Status_Snapshot>
When invoked with `status` / `show` / `hud` (or as the preamble to any edit flow), render this panel. Keep it compact — roughly 10–14 lines — and silence sections that can't be fetched (e.g. MCP disconnected) rather than failing.

Contents (only show rows you could resolve):
- **System**: `<SID>` · client `<MANDT>` · user `<BNAME>` · lang `<SPRAS>`   *(from `GetSession`)*
- **Connection**: `<SAP_URL>` · auth `<SAP_AUTH_TYPE>` · type `<SAP_SYSTEM_TYPE>` · version `<SAP_VERSION>` · ABAP `<ABAP_RELEASE>`
- **Inactive objects**: `<count>` (0 = green, >0 = red)   *(from `GetInactiveObjects`)*
- **Active transport (pinned)**: `<TRKORR> — <description>` if present in `config.json` → `activeTransport`, else "-"
- **Blocklist (L4, MCP env)**: profile `<MCP_BLOCKLIST_PROFILE or "standard (default)">` · extend `<n>` entries · allow `<n>` entries
- **Blocklist (L3, PreToolUse hook)**: profile `<config.json blocklistProfile>` · extend/custom file presence
- **sap.env path**: absolute path being edited

If the user's intent is **status-only** (they just said "hud" / "show status"), render the panel and stop. Do not ask follow-up "what to change" questions unless the user continues.
</Status_Snapshot>

<File_Path>
- **Plugin install path**: `${CLAUDE_PLUGIN_ROOT}/.sc4sap/sap.env`
- Typical absolute path on Windows: `C:\Users\<user>\.claude\plugins\cache\sc4sap\sc4sap\<version>\.sc4sap\sap.env`
- If the file does not exist, tell the user to run `/sc4sap:setup` first. Do NOT create it from scratch here — setup handles the initial interactive credential flow.
</File_Path>

<Managed_Keys>
Connection (required):
- `SAP_URL`                — SAP host URL including port (e.g. `https://host:44300`)
- `SAP_CLIENT`             — 3-digit client (e.g. `100`)
- `SAP_AUTH_TYPE`          — `basic` | `xsuaa`
- `SAP_USERNAME`           — SAP user ID
- `SAP_PASSWORD`           — **secret — always mask when displaying**
- `SAP_LANGUAGE`           — `EN`, `DE`, `KO`, ...
- `SAP_SYSTEM_TYPE`        — `onprem` | `cloud` | `legacy`
- `SAP_VERSION`            — `S4` | `ECC`
- `ABAP_RELEASE`           — e.g. `756`, `758`
- `TLS_REJECT_UNAUTHORIZED` — `0` (accept self-signed, dev only) or unset

Blocklist policy (optional — guard for `GetTableContents` / `GetSqlQuery`):
- `MCP_BLOCKLIST_PROFILE`  — `minimal` | `standard` | `strict` | `off`  (default: `standard`)
- `MCP_BLOCKLIST_EXTEND`   — comma-separated extra table names / patterns (always denied)
- `MCP_ALLOW_TABLE`        — comma-separated whitelist for audited bypass

XSUAA (only when `SAP_AUTH_TYPE=xsuaa`):
- `XSUAA_URL`, `XSUAA_CLIENT_ID`, `XSUAA_CLIENT_SECRET`, `XSUAA_TOKEN_URL`

Do not manage keys that are not in this list — warn the user and skip.
</Managed_Keys>

<Workflow>
1. **Locate** `.sc4sap/sap.env`. If missing, stop and direct the user to `/sc4sap:setup`.

2. **Parse** existing values with a simple `KEY=VALUE` reader. Preserve:
   - comment lines (`#`)
   - blank lines
   - unmanaged keys (pass through untouched on write)

3. **Render the status snapshot** (see `<Status_Snapshot>`) — pull `GetSession` and `GetInactiveObjects` via the MCP server, merge with file values, show the compact panel. If the user's intent is status-only (`status` / `show` / `hud`), STOP here.

4. **Display full editor table** of managed key values. **MASK secrets**:
   - `SAP_PASSWORD`, `XSUAA_CLIENT_SECRET` → show `***` with length in parens (e.g. `*** (11 chars)`)
   - Never echo plaintext secrets, even if the user asks.
   - Commented-out keys (e.g. `# MCP_BLOCKLIST_PROFILE=standard`) → show as *(commented, default: standard)*.

5. **Ask** the user which key(s) to change. Accept:
   - A single key name
   - Multiple keys
   - "all" / "전체" — walk each managed key one by one
   - "blocklist" / "블록리스트" — step through only the `MCP_BLOCKLIST_*` / `MCP_ALLOW_TABLE` group
   - "connection" / "연결" — step through `SAP_*` credentials only
   - "status" / "hud" — return to the status snapshot only (re-render step 3)

6. **For each key to change:**
   - Show the current value (masked if secret).
   - Show allowed values / format (see `<Managed_Keys>` + `<Validation>`).
   - Ask for the new value. Accept `-` or empty input to leave unchanged; accept `unset` / `remove` / `comment` to comment the line out with `# ` prefix.
   - Validate per `<Validation>`. If invalid, reject and re-prompt.

7. **Preview diff** — show a Before/After block of only the lines that will change. Mask secret values in both columns.

8. **Confirm** — ask `Apply changes? (y/N)`. On `n`, abort without writing.

9. **Backup + write** — copy existing `sap.env` to `sap.env.bak` (overwrite previous backup), then write the new content atomically (write to `sap.env.tmp` then rename).

10. **Advise reconnection** — remind the user to run `/mcp` → reconnect `plugin:sc4sap:sap` for changes to take effect. Changes to `sap.env` are not hot-reloaded.

11. **Report** — list the keys changed, indicate backup path, and state "Please reconnect MCP (`/mcp`) to apply."
</Workflow>

<HUD_Limits>
HUD usage-limit env vars are **not** part of `sap.env` — Claude Code only exposes env vars declared under `~/.claude/settings.json` → `env` to the statusline subprocess. This skill manages them there.

**Managed keys (all optional; unset = HUD shows bare `$`):**
- `SC4SAP_5H_LIMIT_USD`           — dollar basis for the 5h block percentage (100% at this value).
- `SC4SAP_WEEKLY_LIMIT_USD`       — dollar basis for the 7d percentage (100% at this value).
- `SC4SAP_WEEKLY_EXTRA_LIMIT_USD` — dollar basis for the `+extra` overage segment (shown only when weekly > base).

**Plan preset shortcut (preferred):** if the user says "내 플랜은 X" / "apply pro plan" / "max20x로 세팅" etc., run:

```bash
node "<PLUGIN_ROOT>/scripts/hud/apply-plan.mjs" <plan>
```

where `<plan>` ∈ `pro` | `max5x` | `max20x` | `team` | `api` (aliases in `plan-presets.json`). This writes all three env vars from the preset table. Remind the user that **plan values are publicly discussed estimates**, not official Anthropic figures — they can override any single value via the manual flow below. Use `--show` to display the table, `--unset` to clear.

**Flow (manual per-key edit):**
1. Read `~/.claude/settings.json`. If missing, create it with `{}`.
2. Show the current three values (or `(unset)` each).
3. Ask which to change. Accept numeric dollar value, `unset`/`remove` to delete the key, or `-`/empty to keep.
4. Validate: positive number or `unset`. Reject negatives, strings, zero (zero means unset — suggest `unset` instead).
5. Preview diff (Before/After) for the `env` block only.
6. Confirm, then write back with:
   - Atomic write (`settings.json.tmp` → rename).
   - Preserve all other keys and formatting as much as possible (2-space JSON indent).
   - Back up the previous file to `settings.json.bak` once (do not spam backups — overwrite).
7. Remind the user: **restart Claude Code** for new env values to reach the statusline subprocess. `/mcp` reconnect is not enough.

**Example:**
```
Current HUD limits (~/.claude/settings.json → env):
  SC4SAP_5H_LIMIT_USD            = 35
  SC4SAP_WEEKLY_LIMIT_USD        = 200
  SC4SAP_WEEKLY_EXTRA_LIMIT_USD  = (unset)

Which to change?
> weekly extra = 100
```
</HUD_Limits>

<Validation>
- `SAP_URL`: must match `^https?://[^ ]+` and not end with `/`.
- `SAP_CLIENT`: exactly 3 digits.
- `SAP_AUTH_TYPE`: one of `basic` | `xsuaa`.
- `SAP_LANGUAGE`: 2-letter uppercase.
- `SAP_SYSTEM_TYPE`: one of `onprem` | `cloud` | `legacy`.
- `SAP_VERSION`: one of `S4` | `ECC`.
- `ABAP_RELEASE`: 3-digit numeric (e.g. `750`, `756`).
- `TLS_REJECT_UNAUTHORIZED`: `0` or unset. Warn that `0` is dev-only.
- `MCP_BLOCKLIST_PROFILE`: one of `minimal` | `standard` | `strict` | `off`. If user chooses `off`, require explicit confirmation ("This disables ALL row-extraction guards. Type `I UNDERSTAND` to proceed.").
- `MCP_BLOCKLIST_EXTEND` / `MCP_ALLOW_TABLE`: comma-separated uppercase table names (`[A-Z0-9_*]+` allowed; `*` is glob). Strip whitespace around commas.
- When adding to `MCP_ALLOW_TABLE`, explicitly warn that each entry is audited to stderr and is a soft bypass of the blocklist — user should remove entries when no longer needed.
- `SAP_PASSWORD`: no validation on content (may contain anything), but refuse empty.
</Validation>

<Security>
- Never print secrets (`SAP_PASSWORD`, `XSUAA_CLIENT_SECRET`) in chat output, diffs, logs, or confirmation prompts. Always mask.
- Never copy `sap.env` to any location outside `.sc4sap/` — no uploads to Notion, no pastes into issues.
- After writing, do not display the final file contents. Only summarize which keys changed.
- The backup `sap.env.bak` contains secrets — mention its existence but do not open/read it back to the user.
</Security>

<Edge_Cases>
- **File missing** → stop, direct to `/sc4sap:setup`. Do not create.
- **File has syntax errors** (lines that are not `KEY=VALUE` or comments) → show the offending lines, ask user to clean manually, abort.
- **User wants to add a key not in `<Managed_Keys>`** → warn, ask to confirm adding as a custom key (append at end with a `# custom` comment). Do not validate content.
- **User wants to remove a required connection key** (e.g. `SAP_URL`) → refuse; required keys can only be changed, not removed.
- **Plugin is launched from `marketplaces/` source tree** (dev mode) rather than `cache/` → still look up `.sc4sap/sap.env` relative to the plugin root; if both exist, prefer the one under the currently-running plugin directory and tell the user which path was edited.
</Edge_Cases>

<Standalone_TUI>
For users who want to edit `sap.env` **without blocking the Claude Code session**, a zero-dependency terminal editor is bundled:

```bash
# In a separate terminal window / tab:
node <PLUGIN_ROOT>/scripts/sap-option-tui.mjs            # defaults to ./.sc4sap/sap.env
node <PLUGIN_ROOT>/scripts/sap-option-tui.mjs --file /path/to/sap.env
```

- Menu-loop UI (no `/plugin`-style overlay; CC's TUI modal API isn't public).
- Preserves comments, ordering, and unmanaged keys on save.
- Atomic write with automatic `.bak` backup.
- Masks `SAP_PASSWORD` / `XSUAA_CLIENT_SECRET` both on display and on input.
- Validates per `<Validation>`; `off` blocklist requires typing `I UNDERSTAND`.

Remind the user to reconnect MCP (`/mcp`) in the Claude Code session after saving — env changes are not hot-reloaded.
</Standalone_TUI>

<Examples>
User: "sap.env 보여줘"
→ parse, display masked table, ask what to change.

User: "블록리스트 minimal 로 바꿔"
→ locate `MCP_BLOCKLIST_PROFILE`, show current, set to `minimal`, preview diff, confirm, write, remind to `/mcp` reconnect.

User: "ACDOCA 화이트리스트에 추가해줘"
→ read `MCP_ALLOW_TABLE`, append `ACDOCA` (dedupe, uppercase), warn about audit logging, confirm, write.

User: "SAP_PASSWORD 바꿔줘"
→ prompt for new password (do not echo), validate non-empty, diff shows `*** → ***`, confirm, write backup, remind to reconnect.

User: "hud 주간 한도 200달러로 바꿔"
→ route to `<HUD_Limits>` flow, edit `~/.claude/settings.json` → `env.SC4SAP_WEEKLY_LIMIT_USD = 200`, preview diff, confirm, write, remind user to **restart Claude Code** (not just `/mcp`).

User: "5h 한도 35, 주간 200, extra 100"
→ HUD flow, set all three at once, single diff, single confirmation, single write.
</Examples>
