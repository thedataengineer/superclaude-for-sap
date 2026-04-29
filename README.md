<p align="center">
  <img src="prism.png" alt="Prism for SAP" width="720"/>
</p>

<p align="center">
  English | <a href="README.ko.md">한국어</a> | <a href="README.ja.md">日本語</a> | <a href="README.de.md">Deutsch</a>
</p>

# Prism for SAP (prism)

> Claude Code plugin for SAP ABAP development — SAP ECC / S/4HANA On-Premise / S/4HANA Cloud (Public & Private)

[![MCP server on npm](https://img.shields.io/npm/v/abap-mcp-adt-powerup?label=mcp-server&color=cb3837&logo=npm)](https://www.npmjs.com/package/abap-mcp-adt-powerup)
[![Plugin version](https://img.shields.io/badge/prism-v0.6.0-6B4FBB)](https://github.com/prism-for-sap/releases)
[![GitHub stars](https://img.shields.io/github/stars/prism-for-sap?style=flat&color=yellow)](https://github.com/prism-for-sap)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## What is prism?

Prism for SAP transforms Claude Code into a full-stack SAP development assistant. It connects to your SAP system via the [MCP ABAP ADT server](https://github.com/abap-mcp-adt-powerup) (150+ tools) to create, read, update, and delete ABAP objects directly — classes, function modules, reports, CDS views, Dynpro, GUI status, and more.

## Core Capabilities

| Capability | What it does |
|------------|--------------|
| 🔌 **Auto MCP Install** | `abap-mcp-adt-powerup` is auto-installed, configured, and connection-tested during `/prism:setup`. No manual MCP wiring. |
| 🌐 **Multi-Environment Profiles (Dev / QA / Prod)** | Register multiple SAP systems per company (e.g. `KR-DEV`, `KR-QA`, `KR-PRD`, `US-DEV`) and hot-switch between them in-session via `/prism:sap-option`. **QA and Prod profiles are auto-protected**: a 2-layer defense (PreToolUse hook + MCP-server guard) blocks `Create*/Update*/Delete*`, `CreateTransport`, and runtime code execution tools — bypassing the hook does not bypass enforcement. Passwords are stored in the **OS keychain** (`@napi-rs/keyring` — Windows Credential Manager / macOS Keychain / libsecret) so `.prism/` never leaks secrets to git. Artifacts (specs, CBO catalogs, audits) are isolated per profile with read-only cross-view so QA sessions can inspect Dev-produced specs without contaminating them. |
| 🏗️ **Formatted Auto Program Maker** | Builds ABAP programs end-to-end: Main + conditional Includes (OOP/Procedural), full ALV + Docking, Dynpro + GUI Status, mandatory Text Elements, ABAP Unit tests — platform-aware (ECC / S4 On-Prem / Cloud). |
| 🔍 **Program Analyze** | Read any ABAP object via MCP, run Clean ABAP / performance / security review, or reverse-engineer into Functional/Technical Spec (Markdown/Excel). |
| 🧪 **Analyze Code** | `/prism:analyze-code` — dedicated static review pass (`sap-code-reviewer`): Clean ABAP, performance, security, SAP standard compliance. Severity-ranked findings with concrete fix suggestions. |
| 🔀 **Compare Programs** | `/prism:compare-programs` — side-by-side business comparison of 2–5 ABAP programs that share the same scenario but split by module (MM/CO), country (KR/EU), or persona (controller/warehouse). Consultant-facing Markdown report across 10 configurable dimensions. |
| 🩺 **Maintenance Diagnosis** | Operational triage loop: ST22 dumps, SM02 system messages, /IWFND/ERROR_LOG, profiler traces, logs, where-used graphs — all from Claude. |
| ♻️ **CBO Reuse (Brownfield Accelerator)** | Inventory a Z-package once — `create-program` / `program-to-spec` prefer reusing existing CBO assets over duplicates. |
| 🧷 **CBO Extension Awareness (CMOD / GGB1·2 / BAdI / APPEND)** | Inventories user-exits (CMOD), substitutions & validations (GGB1/GGB2), BAdI implementations, and APPEND structures. `create-program` / BAPI flows prefer existing Extension fields (e.g. BAPI `EXTENSIONIN` / table appends) over new CBOs; dump & incident diagnosis inspects Extension points as first-class suspects. |
| 🏭 **Industry Context** | 14 industry reference files (retail, fashion, cosmetics, tire, automotive, pharma, F&B, chemical, electronics, construction, steel, utilities, banking, public-sector). |
| 🌏 **Country / Localization** | 15 per-country files + EU-common (KR/JP/CN/US/DE/GB/FR/IT/ES/NL/BR/MX/IN/AU/SG). e-invoicing, banking, payroll, tax localization. |
| 🧩 **Active-Module Awareness** | Cross-module integration hints: MM + PS active → auto-suggest WBS fields on MM CBOs; SD + CO active → CO-PA derivation. [Details →](common/active-modules.md) |
| 🤝 **Module Consultation** | `sap-analyst` / `sap-critic` / `sap-planner` / `sap-architect` delegate to 14 module consultants + 1 BC consultant when business judgement is needed. Users can also ask a module consultant directly via `/prism:ask-consultant` — auto-routes SD/MM/FI/CO/PP/PS/PM/QM/TR/HCM/WM/TM/BW/Ariba/BC by keywords, answers against the configured SAP environment (version, industry, country, active modules), read-only. |
| ⚡ **Per-Phase Model Routing** | Every skill targets a cost-tuned main-thread tier (Haiku for config / diagnostics / Q&A, Sonnet for analyze / create / compare orchestration) while delegating heavy work to specialized agents (Opus for novel ABAP generation, cross-module synthesis, and incident triage; Sonnet for facts extraction; Haiku for report rendering). The main-thread target is declarative — runtime main follows the user's session model; per-phase `Agent()` dispatches DO run on their declared tier. Model choice is visible in every response prefix + per-phase banner (e.g. `▶ phase=3 (writer-spec) · agent=sap-writer · model=Opus 4.7`). Full matrix — per-skill, per-phase — in [docs/skill-model-architecture.md](docs/skill-model-architecture.md). |

## Documentation

- 📦 **[Installation & Setup →](docs/INSTALLATION.md)** — requirements, install options, wizard steps, blocklist configuration
- 🎯 **[Features Deep-Dive →](docs/FEATURES.md)** — 25 agents, 19 skills, MCP tools, RFC backends, hooks, data-extraction policy
- 🧠 **[Skill Model Architecture →](docs/skill-model-architecture.md)** — per-skill / per-phase model allocation (Haiku 4.5 / Sonnet 4.6 / Opus 4.7), model override patterns, escalation ladders, design rationale
- 📜 **[Changelog →](docs/CHANGELOG.md)** — version history and breaking changes

## Unleashed

<p align="center">
  <a href="prism_unleashed.png">
    <img src="prism_unleashed.png" alt="SC4SAP Unleashed" width="100%"/>
  </a>
</p>

## Author

- **Prism Contributors** &nbsp; [![LinkedIn](https://img.shields.io/badge/-LinkedIn-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/seunghyun-paek-5b83b7183/)

## Contributors

- **김시훈 (Kim Sihun)** &nbsp; [![LinkedIn](https://img.shields.io/badge/-LinkedIn-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/sihun-kim-27737132b/)

## Acknowledgments

This project was inspired by [**oh-my-claudecode**](https://github.com/huryechan/oh-my-claudecode) by **허예찬 (Hur Ye-chan)**. The multi-agent orchestration patterns, Socratic deep-interview gating, persistent loop concepts, and overall plugin philosophy here all trace back to that work.

[**mcp-abap-adt**](https://github.com/fr0ster/mcp-abap-adt) by **fr0ster** was a major contribution to building our customized MCP server (`abap-mcp-adt-powerup`). The pioneering ADT-over-MCP work — request shaping, endpoint coverage, object I/O — provided the conceptual foundation we drew on while designing and extending our own server.

## License

[MIT](LICENSE)
