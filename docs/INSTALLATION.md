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

> **MCP Server** ([abap-mcp-adt-powerup](https://github.com/babamba2/abap-mcp-adt-powerup)) is **automatically installed and configured** during `/sc4sap:setup` — no manual pre-install required.

## Installation

> **Note** — sc4sap is **not yet on the official Claude Code plugin marketplace**. For now, add this repository as a custom marketplace in Claude Code, then install the plugin from it.

### Option A — Add as custom marketplace (recommended)

Inside a Claude Code session, run:

```
/plugin marketplace add https://github.com/babamba2/superclaude-for-sap.git
/plugin install sc4sap
```

To update later:

```
/plugin marketplace update babamba2/superclaude-for-sap
/plugin install sc4sap
```

### Option B — Install from source

```bash
git clone https://github.com/babamba2/superclaude-for-sap.git
cd superclaude-for-sap
npm install && npm run build
```

Then point Claude Code at the local plugin directory via `/plugin marketplace add <local-path>`.

## Setup

```bash
# Run the setup skill — walks you through the wizard one question at a time
/sc4sap:setup
```

### Subcommands

```bash
/sc4sap:setup                # full wizard (default)
/sc4sap:setup doctor         # route to /sc4sap:sap-doctor
/sc4sap:setup mcp            # route to /sc4sap:mcp-setup
/sc4sap:setup spro           # SPRO config auto-extraction only
/sc4sap:setup customizations # Z*/Y* enhancement + extension inventory only
```

### Wizard Steps

The wizard asks **one question at a time** — never dumps the whole questionnaire. Existing values in `.sc4sap/sap.env` / `.sc4sap/config.json` are shown so you can press Enter to keep them.

| # | Step | What happens |
|---|------|--------------|
| 1 | **Version check** | Verify Claude Code version compatibility |
| 2 | **SAP system version + Industry** | Choose `S4` / `ECC`, enter ABAP release, pick industry from 15-option menu. Drives SPRO tables / BAPIs / TCodes + ABAP syntax gating + industry-specific configuration patterns. |
| 3 | **Install MCP server** | Clone + build `abap-mcp-adt-powerup` into `<PLUGIN_ROOT>/vendor/abap-mcp-adt/`. Skipped if already installed (`--update` to refresh). |
| 4 | **SAP connection** | One field per question — `SAP_URL`, `SAP_CLIENT`, `SAP_AUTH_TYPE`, `SAP_USERNAME`, `SAP_PASSWORD`, `SAP_LANGUAGE`, `SAP_SYSTEM_TYPE`, `SAP_VERSION`, `ABAP_RELEASE`, `SAP_ACTIVE_MODULES` (comma-separated), `TLS_REJECT_UNAUTHORIZED` (dev only). Written to `.sc4sap/sap.env`. |
| 4bis | **RFC backend selection** | Pick `soap` / `native` / `gateway` / `odata` / `zrfc` — see [RFC backends](FEATURES.md#rfc-backend-selection). |
| 5 | **Reconnect MCP** | Prompt to run `/mcp` so the newly installed server starts. |
| 6 | **Test connection** | `GetSession` round-trip against SAP. |
| 7 | **Confirm system info** | Show system ID, client, user. |
| 8 | **ADT authority check** | `GetInactiveObjects` to verify ADT permissions. |
| 9 | **Create `ZMCP_ADT_UTILS`** | Required utility function group (package `$TMP`). Creates `ZMCP_ADT_DISPATCH` + `ZMCP_ADT_TEXTPOOL`, RFC-enabled and activated. |
| 10 | **Write `config.json`** | Plugin-side config — `sapVersion`, `abapRelease`, `industry`, `activeModules`, `systemInfo`. |
| 11 | **SPRO extraction (optional)** | `y/N` — initial extraction is token-heavy but the resulting `.sc4sap/spro-config.json` cache dramatically reduces future token usage. |
| 11b | **Customization inventory (optional)** | `y/N` — parse each module's `enhancements.md`, then query live SAP to find which standard exits the customer has actually implemented (`Z*`/`Y*`). Writes `.sc4sap/customizations/{MODULE}/{enhancements,extensions}.json`. |
| 12 | **🔒 Blocklist hook (MANDATORY)** | Pick profile (`strict` / `standard` / `minimal` / `custom`), install via `node scripts/install-hooks.mjs`, smoke-test with BNKA payload. Setup does not complete unless this succeeds. |

> **Two blocklist layers, configured separately**
> - **L3 (step 12)** — Claude Code `PreToolUse` hook, profile in `.sc4sap/config.json` → `blocklistProfile`. Fires for any Claude Code session, regardless of MCP server.
> - **L4 (step 4, optional)** — MCP-server internal guard, profile in `sap.env` → `MCP_BLOCKLIST_PROFILE`. Applies only to `abap-mcp-adt-powerup`.
>
> Typical: L3 `strict`, L4 `standard`. Change L3 by re-running `/sc4sap:setup`; change L4 via `/sc4sap:sap-option`.

## After Setup

- Verify health: `/sc4sap:sap-doctor`
- Rotate credentials / adjust L4 blocklist: `/sc4sap:sap-option`
- Re-extract SPRO later: `/sc4sap:setup spro`
- Edit active modules: `/sc4sap:sap-option modules`

---

See also: [Features Deep-Dive →](FEATURES.md) · [Changelog →](CHANGELOG.md)
