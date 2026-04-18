# Installation & Setup

← [Zurück zur README](../README.de.md)

## Anforderungen

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-339933?logo=node.js&logoColor=white)
![Claude Code](https://img.shields.io/badge/Claude_Code-CLI-6B4FBB?logo=anthropic&logoColor=white)
![SAP ECC](https://img.shields.io/badge/SAP-ECC_6.0-0FAAFF?logo=sap&logoColor=white)
![SAP S/4HANA](https://img.shields.io/badge/SAP-S%2F4HANA_On--Premise-0FAAFF?logo=sap&logoColor=white)
![SAP S/4HANA Cloud](https://img.shields.io/badge/SAP-S%2F4HANA_Cloud-0FAAFF?logo=sap&logoColor=white)
![MCP ABAP ADT](https://img.shields.io/badge/MCP_ABAP_ADT-Auto--Installed-FF6600)

| Anforderung | Details |
|-------------|---------|
| **Node.js** | >= 20.0.0 |
| **Claude Code** | CLI installiert (Max/Pro-Abo oder API-Key) |
| **SAP-System** | **SAP ECC 6.0** / **S/4HANA On-Premise** / **S/4HANA Cloud (Public & Private)** — ADT aktiviert |

> **MCP Server** ([abap-mcp-adt-powerup](https://github.com/babamba2/abap-mcp-adt-powerup)) wird während `/sc4sap:setup` **automatisch installiert und konfiguriert** — keine manuelle Vorabinstallation erforderlich.

## Installation

> **Hinweis** — sc4sap ist **noch nicht im offiziellen Claude Code Plugin-Marketplace**. Fügen Sie dieses Repository vorerst als Custom Marketplace in Claude Code hinzu und installieren Sie das Plugin daraus.

### Option A — Als Custom Marketplace hinzufügen (empfohlen)

Innerhalb einer Claude-Code-Sitzung:

```
/plugin marketplace add https://github.com/babamba2/superclaude-for-sap.git
/plugin install sc4sap
```

Für spätere Updates:

```
/plugin marketplace update babamba2/superclaude-for-sap
/plugin install sc4sap
```

### Option B — Aus dem Quellcode installieren

```bash
git clone https://github.com/babamba2/superclaude-for-sap.git
cd superclaude-for-sap
npm install && npm run build
```

Dann in Claude Code `/plugin marketplace add <lokaler-pfad>` auf das lokale Plugin-Verzeichnis.

## Setup

```bash
# Setup-Skill ausführen — Wizard führt eine Frage nach der anderen
/sc4sap:setup
```

### Unterbefehle

```bash
/sc4sap:setup                # Voller Wizard (Standard)
/sc4sap:setup doctor         # Routet zu /sc4sap:sap-doctor
/sc4sap:setup mcp            # Routet zu /sc4sap:mcp-setup
/sc4sap:setup spro           # Nur SPRO-Konfig-Autoextraktion
/sc4sap:setup customizations # Nur Z*/Y* Enhancement- + Extension-Inventar
```

### Wizard-Schritte

Der Wizard stellt **eine Frage nach der anderen** — kein kompletter Fragenkatalog auf einmal. Bestehende Werte in `.sc4sap/sap.env` / `.sc4sap/config.json` werden angezeigt, Enter zum Beibehalten.

| # | Schritt | Was passiert |
|---|---------|-------------|
| 1 | **Versionsprüfung** | Claude-Code-Versionskompatibilität verifizieren |
| 2 | **SAP-Version + Branche** | `S4` / `ECC` wählen, ABAP-Release eingeben, Branche aus 15er-Menü wählen. Steuert SPRO-Tabellen / BAPIs / TCodes + ABAP-Syntax-Gating + branchenspezifische Konfigurationsmuster |
| 3 | **MCP-Server installieren** | `abap-mcp-adt-powerup` nach `<PLUGIN_ROOT>/vendor/abap-mcp-adt/` klonen+bauen. Übersprungen wenn bereits installiert (`--update` zum Auffrischen) |
| 4 | **SAP-Verbindung** | Ein Feld pro Frage — `SAP_URL`, `SAP_CLIENT`, `SAP_AUTH_TYPE`, `SAP_USERNAME`, `SAP_PASSWORD`, `SAP_LANGUAGE`, `SAP_SYSTEM_TYPE`, `SAP_VERSION`, `ABAP_RELEASE`, `SAP_ACTIVE_MODULES` (kommagetrennt), `TLS_REJECT_UNAUTHORIZED`. Geschrieben nach `.sc4sap/sap.env` |
| 4bis | **RFC-Backend-Auswahl** | `soap` / `native` / `gateway` / `odata` / `zrfc` wählen — siehe [RFC-Backends](FEATURES.de.md#-rfc-backend-auswahl) |
| 5 | **MCP neu verbinden** | Aufforderung `/mcp` auszuführen, damit der neu installierte Server startet |
| 6 | **Verbindung testen** | `GetSession`-Roundtrip gegen SAP |
| 7 | **Systeminfo bestätigen** | System-ID, Mandant, Benutzer anzeigen |
| 8 | **ADT-Berechtigungsprüfung** | `GetInactiveObjects` zur Verifikation von ADT-Berechtigungen |
| 9 | **`ZMCP_ADT_UTILS` erstellen** | Benötigte Utility-Funktionsgruppe (Paket `$TMP`). Erstellt `ZMCP_ADT_DISPATCH` + `ZMCP_ADT_TEXTPOOL`, RFC-fähig und aktiviert |
| 10 | **`config.json` schreiben** | Plugin-seitige Konfig — `sapVersion`, `abapRelease`, `industry`, `activeModules`, `systemInfo` |
| 11 | **SPRO-Extraktion (optional)** | `y/N` — die Erstextraktion ist tokenintensiv, aber der resultierende `.sc4sap/spro-config.json`-Cache reduziert den zukünftigen Tokenverbrauch drastisch |
| 11b | **Customizing-Inventar (optional)** | `y/N` — parsed `enhancements.md` jedes Moduls, dann live SAP abfragen, welche Standard-Exits der Kunde tatsächlich mit `Z*`/`Y*`-Objekten implementiert hat. Schreibt `.sc4sap/customizations/{MODULE}/{enhancements,extensions}.json` |
| 12 | **🔒 Blocklist-Hook (PFLICHT)** | Profil wählen (`strict`/`standard`/`minimal`/`custom`), via `node scripts/install-hooks.mjs` installieren, mit BNKA-Payload Smoke-Test. Setup abgeschlossen erst, wenn dies erfolgreich ist |

> **Zwei Blocklist-Schichten, separat konfiguriert**
> - **L3 (Schritt 12)** — Claude Code `PreToolUse`-Hook, Profil in `.sc4sap/config.json` → `blocklistProfile`. Feuert in jeder Claude-Code-Session, unabhängig vom MCP-Server
> - **L4 (Schritt 4, optional)** — MCP-Server-interner Guard, Profil in `sap.env` → `MCP_BLOCKLIST_PROFILE`. Gilt nur für `abap-mcp-adt-powerup`
>
> Typisch: L3 `strict`, L4 `standard`. L3 ändern durch erneutes `/sc4sap:setup`; L4 via `/sc4sap:sap-option`.

## Nach dem Setup

- Health-Check: `/sc4sap:sap-doctor`
- Credentials rotieren / L4-Blocklist anpassen: `/sc4sap:sap-option`
- SPRO neu extrahieren: `/sc4sap:setup spro`
- Aktive Module bearbeiten: `/sc4sap:sap-option modules`

---

Siehe auch: [Funktionen im Detail →](FEATURES.de.md) · [Changelog →](CHANGELOG.de.md)
