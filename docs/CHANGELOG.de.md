# Changelog

← [Zurück zur README](../README.de.md) · [Installation](INSTALLATION.de.md) · [Funktionen](FEATURES.de.md)

Alle nennenswerten Änderungen an sc4sap werden hier dokumentiert. Vollständige Release Notes: [GitHub Releases](https://github.com/babamba2/superclaude-for-sap/releases).

Das Projekt folgt [Semantic Versioning](https://semver.org/) und dem [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)-Format.

---

## [Unveröffentlicht]

### Hinzugefügt
- **Aktive-Modul-Erkennung** (`common/active-modules.md`) — Cross-Module-Integrationsmatrix. `SAP_ACTIVE_MODULES` Env-Var + `activeModules` in `config.json` steuern nun proaktive Integrationsfeld-Vorschläge in `create-program`, `create-object`, `analyze-cbo-obj` und Consultant-Agenten. Beispiel: MM-Objekt + PS aktiv → automatischer WBS-Feld-Vorschlag (`PS_POSID` / `AUFNR`).
- **Fix #3 `handleUpdateDomain.ts`** — Handler-Property-Namen angeglichen an die snake_case-Erwartungen von `AdtDomain.update()` (`value_table`, `fixed_values`, `conversion_exit`, `sign_exists`). Zuvor silent drop.
- **Fix #4 `core/domain/update.ts`** (mcp-abap-adt-clients) — `patchXmlBlock` ersetzt `patchXmlElementAttribute` für den `<doma:valueTableRef>` Self-Closing-Fall; emittiert jetzt volle `adtcore:uri` + `adtcore:type` + `adtcore:name` Attribute.

### Geändert
- **`handleCreateTable.ts`** — MANDT-basierte Transparent-Table-Skeleton (`key mandt : mandt not null`) direkt nach Create injiziert; ersetzt das CDS-Style-Default `key client : abap.clnt` des SAP-Backends. Erstanwender laufen nicht mehr auf `ExceptionResourceAlreadyExists` bei UpdateTable.
- **`handleUpdateTable.ts`** — `ddl_code` Schema-Description mit MANDT-Beispiel + Annotations-Preservation-Leitfaden aktualisiert.
- **`rfc-backend-selection.md`** — explizite Bootstrap-Reihenfolge-Note für `odata` / `zrfc`-Backends hinzugefügt (Step 9c/9d Chicken-and-Egg mit First-Time-vs-Re-Run-Szenarien dokumentiert).

### Dokumentation
- README aufgeteilt — Main-Seite ist jetzt schlank (Kernfunktionen + Autor + Mitwirkende). Installation / Features / Changelog nach `docs/INSTALLATION.md` / `docs/FEATURES.md` / `docs/CHANGELOG.md` (diese Datei) verschoben.

---

## Release-Historie

Ältere Releases siehe [Git-Tag-Historie](https://github.com/babamba2/superclaude-for-sap/tags) und [GitHub Releases](https://github.com/babamba2/superclaude-for-sap/releases).

### Versionsschema

sc4sap folgt `v{MAJOR}.{MINOR}.{PATCH}`:
- **MAJOR** — Breaking Changes an Skill-API, Config-Schema oder Mindest-SAP/Claude-Code-Version
- **MINOR** — neue Skills, neue Agenten, neue Common-Regeln, rückwärtskompatible Feature-Erweiterungen
- **PATCH** — Bugfixes, reine Dokumentationsänderungen, nicht-breaking Refaktorierungen

### Kompatibilität

- **Claude Code**: >= 2.x
- **Node.js**: >= 20.0.0
- **SAP**: ECC 6.0 / S/4HANA On-Premise / S/4HANA Cloud (Public & Private)
- **MCP-Server**: gebündeltes `abap-mcp-adt-powerup` (auto-installiert durch `/sc4sap:setup`; Version pro Release gepinnt)

---

← [Zurück zur README](../README.de.md)
