# Changelog

← [Back to README](../README.md) · [Installation](INSTALLATION.md) · [Features](FEATURES.md)

All notable changes to sc4sap are documented here. For full release notes, see [GitHub Releases](https://github.com/babamba2/superclaude-for-sap/releases).

The project adheres to [Semantic Versioning](https://semver.org/) and the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

---

## [Unreleased]

### Added
- **Active-module awareness** (`common/active-modules.md`) — cross-module integration matrix. `SAP_ACTIVE_MODULES` env var + `activeModules` in `config.json` now drive proactive integration-field suggestions in `create-program`, `create-object`, `analyze-cbo-obj`, and consultant agents. Example: MM object + PS active → auto-suggest WBS fields (`PS_POSID` / `AUFNR`).
- **Fix #3 `handleUpdateDomain.ts`** — handler property naming aligned to `AdtDomain.update()` snake_case expectations (`value_table`, `fixed_values`, `conversion_exit`, `sign_exists`). Previously silently dropped.
- **Fix #4 `core/domain/update.ts`** (mcp-abap-adt-clients) — `patchXmlBlock` replaces `patchXmlElementAttribute` for `<doma:valueTableRef>` self-closing case; now emits full `adtcore:uri` + `adtcore:type` + `adtcore:name` attributes.

### Changed
- **`handleCreateTable.ts`** — auto-inject MANDT-based transparent-table skeleton (`key mandt : mandt not null`) after Create; replaces SAP backend's default CDS-style `key client : abap.clnt`. First-time users no longer hit `ExceptionResourceAlreadyExists` on UpdateTable.
- **`handleUpdateTable.ts`** — `ddl_code` schema description updated with MANDT example + annotation preservation guidance.
- **`rfc-backend-selection.md`** — added explicit bootstrap-order note for `odata` / `zrfc` backends (Step 9c/9d chicken-and-egg now documented with first-time vs re-run scenarios).

### Documentation
- README split — main page now slim (core capabilities + author + contributors). Installation / features / history moved to `docs/INSTALLATION.md` / `docs/FEATURES.md` / `docs/CHANGELOG.md` (this file).

---

## Release history

For older releases, see the [Git tag history](https://github.com/babamba2/superclaude-for-sap/tags) and [GitHub Releases](https://github.com/babamba2/superclaude-for-sap/releases).

### Version scheme

sc4sap follows `v{MAJOR}.{MINOR}.{PATCH}`:
- **MAJOR** — breaking changes to skill API, config schema, or minimum SAP/Claude Code version
- **MINOR** — new skills, new agents, new common rules, backward-compatible feature additions
- **PATCH** — bug fixes, documentation-only changes, non-breaking refactors

### Compatibility

- **Claude Code**: >= 2.x
- **Node.js**: >= 20.0.0
- **SAP**: ECC 6.0 / S/4HANA On-Premise / S/4HANA Cloud (Public & Private)
- **MCP server**: bundled `abap-mcp-adt-powerup` (auto-installed by `/sc4sap:setup`; version pinned by release)

---

← [Back to README](../README.md)
