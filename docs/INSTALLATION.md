# Installation & Setup

← [Back to README](../README.md)

## Requirements

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-339933?logo=node.js&logoColor=white)
![Claude Code](https://img.shields.io/badge/Claude_Code-CLI-6B4FBB?logo=anthropic&logoColor=white)
![SAP ECC](https://img.shields.io/badge/SAP-ECC_6.0-0FAAFF?logo=sap&logoColor=white)
![SAP S/4HANA](https://img.shields.io/badge/SAP-S%2F4HANA_On--Premise-0FAAFF?logo=sap&logoColor=white)
![SAP S/4HANA Cloud](https://img.shields.io/badge/SAP-S%2F4HANA_Cloud-0FAAFF?logo=sap&logoColor=white)
![MCP ABAP ADT](https://img.shields.io/badge/MCP_ABAP_ADT-Auto--Installed-FF6600)

| Requirement | Details |
|-------------|---------|
| **Node.js** | >= 20.0.0 |
| **Claude Code** | CLI installed (Max/Pro subscription or API key) |
| **SAP System** | **SAP ECC 6.0** / **S/4HANA On-Premise** / **S/4HANA Cloud (Public & Private)** — ADT enabled |

> **MCP Server** ([abap-mcp-adt-powerup](https://github.com/abap-mcp-adt-powerup)) is **automatically installed and configured** during `/prism:setup` — no manual pre-install required.

## Installation

> **Note** — prism is **not yet on the official Claude Code plugin marketplace**. For now, add this repository as a custom marketplace in Claude Code, then install the plugin from it.

### Option A — Add as custom marketplace (recommended)

Inside a Claude Code session, run:

```
/plugin marketplace add https://github.com/prism-for-sap.git
/plugin install prism
```

To update later:

```
/plugin marketplace update prism-for-sap
/plugin install prism
```

### Option B — Install from source

```bash
git clone https://github.com/prism-for-sap.git
cd superclaude-for-sap
npm install && npm run build
```

Then point Claude Code at the local plugin directory via `/plugin marketplace add <local-path>`.

## Setup

```bash
# Run the setup skill — walks you through the wizard one question at a time
/prism:setup
```

### Subcommands

```bash
/prism:setup                # full wizard (default)
/prism:setup doctor         # route to /prism:sap-doctor
/prism:setup mcp            # route to /prism:mcp-setup
/prism:setup spro           # SPRO config auto-extraction only
/prism:setup customizations # Z*/Y* enhancement + extension inventory only
```

### Multi-profile architecture (0.6.0+)

prism supports multiple SAP connections (Dev / QA / Prod across one or more companies) in the same Claude Code session.

```
~/.prism/                                    ← user home (shared across repos)
└── profiles/
    ├── KR-DEV/{sap.env, config.json}         ← one profile per connection
    ├── KR-QA/ {sap.env, config.json}
    └── KR-PRD/{sap.env, config.json}

<project>/.prism/                            ← project root (engagement-scoped)
├── active-profile.txt                        ← "KR-DEV"
└── work/
    ├── KR-DEV/{program, cbo, customizations, ...}
    └── KR-PRD/{...}
```

Tier enum (`DEV` / `QA` / `PRD`) drives readonly enforcement: QA/PRD profiles block `Create*` / `Update*` / `Delete*` at two layers — a PreToolUse hook (L1, pre-wire) and the MCP server's own guard (L2, uncircumventable). QA/PRD profiles also REFUSE Step 9 ABAP utility installation; transport the utilities in via CTS from the matching DEV profile instead.

Passwords are stored in the OS keychain (Windows Credential Manager / macOS Keychain / Linux libsecret) via `@napi-rs/keyring`. When the keychain is unavailable (headless / Docker / missing optional dep), prism transparently falls back to plaintext in the profile env and warns the user.

Full design: [`multi-profile-design.md`](multi-profile-design.md). Artifact resolution rules: [`../common/multi-profile-artifact-resolution.md`](../common/multi-profile-artifact-resolution.md).

### Wizard Steps

The wizard asks **one question at a time** — never dumps the whole questionnaire. Existing profile values are shown so you can press Enter to keep them.

| # | Step | What happens |
|---|------|--------------|
| **0** | **Legacy detection & profile bootstrap** | Runs BEFORE any question. Calls `sap-profile-cli.mjs detect-legacy`. If a pre-0.6.0 `<project>/.prism/sap.env` is found → routes into a migration flow (ask `alias` + `tier`, run `sap-profile-cli.mjs migrate`, archive to `sap.env.legacy`, delete project `config.json`, point `active-profile.txt` at the new profile, resume at Step 5). If no legacy and no profiles exist → proceed to Step 1 for a fresh install. If profiles already exist → offer switch vs create-another. |
| 1 | **Version check** | Verify Claude Code version compatibility |
| 2 | **SAP system version + Industry** | Choose `S4` / `ECC`, enter ABAP release, pick industry from 15-option menu. Drives SPRO tables / BAPIs / TCodes + ABAP syntax gating + industry-specific configuration patterns. |
| 3 | **Install MCP server** | Clone + build `abap-mcp-adt-powerup` into `<PLUGIN_ROOT>/vendor/abap-mcp-adt/`. Skipped if already installed (`--update` to refresh). |
| **4** | **Profile creation & SAP connection** | Collect `alias` (`^[A-Z0-9_-]+$`, suggest `{ISO-COUNTRY}-{TIER}` e.g. `KR-DEV`), `SAP_TIER` (`DEV`/`QA`/`PRD`), optional same-company meta-copy from a sibling profile, then connection fields (`SAP_URL`, `SAP_CLIENT`, `SAP_AUTH_TYPE`, `SAP_USERNAME`, `SAP_PASSWORD`, `SAP_LANGUAGE`, `SAP_SYSTEM_TYPE`) one at a time. Delegate write to `sap-profile-cli.mjs add` → profile env under `~/.prism/profiles/<alias>/`, password to OS keychain. Write `<project>/.prism/active-profile.txt=<alias>`. NO file is written under `<project>/.prism/sap.env` or `<project>/.prism/config.json`. |
| 4bis | **RFC backend selection** | Pick `soap` / `native` / `gateway` / `odata` / `zrfc`. All `SAP_RFC_*` keys go into the active profile env. See [RFC backends](FEATURES.md#rfc-backend-selection). |
| 5 | **Reconnect MCP** | Prompt to run `/mcp`. The server's `ReloadProfile` tool reads the pointer + profile env (with keychain resolution) and refreshes the cached connection — no Claude Code restart needed. |
| 6 | **Test connection** | `GetSession` round-trip against SAP. |
| 7 | **Confirm system info** | Show system ID, client, user, language. Persist into `~/.prism/profiles/<alias>/config.json → systemInfo` (not the project folder). |
| 8 | **ADT authority check** | `GetInactiveObjects` to verify ADT permissions. |
| **9** | **Create ABAP utility objects (tier-gated)** | **DEV only.** Installs `ZMCP_ADT_UTILS` FG + `ZIF_S4SAP_CM` / `ZCL_S4SAP_CM_*` ALV OOP handlers (+ OData / ZRFC classes if chosen at 4bis). System-deduped by `SAP_URL + SAP_CLIENT`: a sibling DEV profile on the same host reuses the install. On **QA / PRD** Step 9 REFUSES and prints CTS import guidance — transport the utilities from the matching DEV system via the standard TMS route. |
| 10 | **Finalize profile `config.json`** | Write `sapVersion`, `abapRelease`, `industry`, `activeModules`, `namingConvention`, `blocklistProfile`, `activeTransport` into `~/.prism/profiles/<alias>/config.json`. The project `<project>/.prism/` never contains a `config.json` in multi-profile mode. |
| 11 | **SPRO extraction (optional)** | `y/N` — token-heavy; caches into `<project>/.prism/work/<alias>/spro-config.json`. Future skills reuse the cache. |
| 11b | **Customization inventory (optional)** | `y/N` — scans `Z*`/`Y*` enhancements + append structures; writes `<project>/.prism/work/<alias>/customizations/{MODULE}/{enhancements,extensions}.json`. |
| **12** | **🔒 PreToolUse hooks (MANDATORY)** | Installs BOTH `block-forbidden-tables.mjs` (row-extraction guard) AND `tier-readonly-guard.mjs` (tier-based mutation guard) into `.claude/settings.json` via `node scripts/install-hooks.mjs --project`. Smoke-tests both. Setup does not complete unless both succeed. |
| 13 | **HUD status line** | Register the prism status line in `~/.claude/settings.json`. After restart, the HUD shows `{alias} [{tier}] {🔒 if readonly}` + token usage. |

> **Defense in depth — three enforcement layers for safe operation**
> - **L1a (step 12, row extraction)** — Claude Code `PreToolUse` hook. Profile in `~/.prism/profiles/<alias>/config.json → blocklistProfile`. Denies `GetTableContents` / `GetSqlQuery` on sensitive tables.
> - **L1b (step 12, tier)** — Claude Code `PreToolUse` hook. Reads `SAP_TIER` from active profile every call (stateless). Denies mutations on QA/PRD.
> - **L2 (MCP server, uncircumventable)** — `abap-mcp-adt-powerup` internal guard. Row extraction via `sap.env → MCP_BLOCKLIST_PROFILE`; tier via `@readonly(tier)` decorator set at `ReloadProfile` time. Fires even if the hooks are missing or misconfigured.
>
> Both L1 hooks fail OPEN on IO/parse errors; the L2 MCP guard is always active. Typical default: L1a `strict`, MCP-server blocklist `standard`.

## After Setup

### Working with profiles

- Switch active system: `/prism:sap-option switch <alias>` (or interactive picker — uses `AskUserQuestion`, previews tier + allowed-tool matrix)
- Add another company or tier: `/prism:sap-option add` (wizard: alias → tier → optional same-company meta-copy → connection + keychain password capture)
- List profiles: `/prism:sap-option list` — shows each alias, tier badge, host, and a `●` marker for the active one
- Remove / rotate / purge: `/prism:sap-option remove|edit|purge` — soft-delete goes to `~/.prism/profiles/.trash/<alias>-<ts>/` with 7-day auto-purge
- Tier is immutable on an existing profile — change by remove + add

### Health & maintenance

- Verify health: `/prism:sap-doctor`
- Rotate credentials / change industry / adjust L2 MCP blocklist: `/prism:sap-option`
- Re-extract SPRO later: `/prism:setup spro` (requires an active profile)
- Re-run customization inventory: `/prism:setup customizations` (requires an active profile)

### Migration rollback (if you regret the 0.6.0 upgrade)

```bash
mv .prism/sap.env.legacy .prism/sap.env
rm .prism/active-profile.txt
rm -rf ~/.prism/profiles/<alias>
# If password was stored in the keychain (not plaintext fallback):
echo '{"service":"prism","account":"<alias>/<user>"}' \
  | node "$CLAUDE_PLUGIN_ROOT/scripts/sap-profile-cli.mjs" keychain-delete
```

---

See also: [Features Deep-Dive →](FEATURES.md) · [Changelog →](CHANGELOG.md)
