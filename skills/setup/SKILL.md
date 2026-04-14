---
name: sc4sap:setup
description: Plugin setup + MCP connection + SPRO config auto-generation from S/4HANA
level: 2
---

# SC4SAP Setup

Use `/sc4sap:setup` as the unified setup and configuration entrypoint for SuperClaude for SAP.

## Usage

```bash
/sc4sap:setup                  # full setup wizard
/sc4sap:setup doctor           # diagnose installation and SAP connection
/sc4sap:setup mcp              # configure mcp-abap-adt MCP server
/sc4sap:setup spro             # auto-generate SPRO config from S/4HANA system
```

## Routing

Process the request by the **first argument only**:

- No argument, `wizard`, or `--force` -> run the full setup wizard (install plugin, configure MCP, test SAP connection)
- `doctor` -> route to `/sc4sap:sap-doctor` with remaining args
- `mcp` -> route to `/sc4sap:mcp-setup` with remaining args
- `spro` -> run SPRO config auto-generation workflow (see below)

## Setup Wizard Steps

1. Verify Claude Code version compatibility
2. **Identify SAP system version** — ask user to select their SAP system type:
   - **S/4HANA** (S4) — Business Partner (BP) 통합, MATDOC 테이블, ACDOCA, Fiori, CDS 기반
   - **ECC 6.0** (ECC) — Vendor/Customer 분리 (XK01/XD01/FK01/FD01), MKPF/MSEG, BKPF/BSEG 개별 테이블

   Also ask for **ABAP Release version** (e.g., `750`, `751`, `756`, `757`, `758`):
   - Can be checked via `GetSession` or TCode `SE38` → System → Status after connection
   - Or ask user directly: "ABAP Release 버전을 입력해주세요 (예: 750, 756, 758)"

   This choice is **critical** — it determines:
   - Which SPRO config tables, BAPIs, TCodes, and workflows are referenced from `configs/`
   - How consultant agents (sap-sd-consultant, sap-mm-consultant, etc.) generate code and recommendations
   - Which tables/views agents query (e.g., ECC: `MKPF`+`MSEG` vs S4: `MATDOC`, ECC: `KNA1`+`LFA1` vs S4: `BUT000`)
   - Which ABAP syntax features agents can use in generated code (see ABAP Release Reference below)
   - Store as `SAP_VERSION` (`S4` or `ECC`) and `ABAP_RELEASE` (e.g., `756`) in `.sc4sap/sap.env` and `.sc4sap/config.json`

3. **Install `abap-mcp-adt` MCP server** — run `node scripts/build-mcp-server.mjs` to clone and build the external MCP server into `vendor/abap-mcp-adt/`
   - If already installed, skip (use `--update` to refresh)
   - On failure, show error and guide user to manual install
4. **Configure SAP connection** — ask user for SAP credentials and write `.sc4sap/sap.env`:
   - SAP_URL (e.g., `https://your-sap-host:44300`)
   - SAP_CLIENT (e.g., `100`)
   - SAP_AUTH_TYPE (`basic` or `xsuaa`)
   - SAP_USERNAME / SAP_PASSWORD
   - SAP_LANGUAGE (default: `EN`)
   - SAP_SYSTEM_TYPE (`onprem` or `cloud`)
   - SAP_VERSION (`S4` or `ECC`) — from step 2
5. **Reconnect MCP** — prompt user to reconnect via `/mcp` so the newly installed server starts
6. Test SAP system connection via `GetSession`
7. Confirm connected system info (system ID, client, user)
8. Run `GetInactiveObjects` to confirm ADT access rights
9. **Create ABAP utility function modules** — required by the MCP server for Screen, GUI Status, and Text Element operations:
   1. Check if function group `ZMCP_ADT_UTILS` already exists via `SearchObject` (query=`ZMCP_ADT_UTILS`, objectType=`FUGR`)
   2. If NOT found, create the objects using MCP tools:
      - `CreateFunctionGroup` — name: `ZMCP_ADT_UTILS`, package: `$TMP`, description: `MCP ADT Utility Functions`
      - `CreateFunctionModule` — name: `ZMCP_ADT_DISPATCH`, group: `ZMCP_ADT_UTILS`, description: `MCP ADT Dispatcher for Screen/GUI Status`
      - `CreateFunctionModule` — name: `ZMCP_ADT_TEXTPOOL`, group: `ZMCP_ADT_UTILS`, description: `MCP ADT Text Pool Read/Write`
      - `UpdateFunctionModule` — for each FM, read the ABAP source from `abap/zmcp_adt_dispatch.abap` and `abap/zmcp_adt_textpool.abap` in the plugin directory, then upload via UpdateFunctionModule
      - Both function modules MUST be set as **RFC-enabled**
      - Activate all objects
   3. If already found, skip creation and report "ZMCP_ADT_UTILS already exists"
   4. Test by calling `SearchObject` for `ZMCP_ADT_DISPATCH` to verify
10. Write plugin config to `.sc4sap/config.json` — include `sapVersion` and `abapRelease` fields
11. **Ask user about SPRO config extraction (선택 사항)** — prompt whether to run SPRO extraction now:

    ```
    SPRO 구성 데이터를 지금 추출하시겠습니까? (y/N)

    ℹ️  안내사항:
    - 선택 사항입니다. 나중에 `/sc4sap:setup spro` 명령으로 언제든 실행 가능합니다.
    - 🔺 최초 다운로드 시 토큰이 많이 소모됩니다 (모듈별로 수십~수백 테이블 조회).
    - ✅ 한 번 로컬에 받아두면, 이후 개발 시 agent가 로컬 캐시 (.sc4sap/spro-config.json)를
       참조하므로 토큰 사용량이 크게 절감됩니다.
    - ⏭️  지금 건너뛰어도 플러그인 기본 기능은 모두 동작합니다 (configs/ 폴더의 정적 참조 사용).

    Would you like to extract SPRO config now? (y/N)
    - Optional. You can run `/sc4sap:setup spro` anytime later.
    - 🔺 Initial download consumes significant tokens (dozens to hundreds of tables per module).
    - ✅ Once cached locally, future development sessions use the local cache
       (.sc4sap/spro-config.json), dramatically reducing token usage.
    - ⏭️  Skipping is fine — the plugin works with static configs/ references by default.
    ```

    - If user answers yes: proceed to run SPRO extraction (see `/sc4sap:setup spro` workflow below)
    - If user answers no or skips: confirm with "SPRO 추출을 건너뛰었습니다. 필요시 `/sc4sap:setup spro`로 실행하세요." and complete setup

12. **🔒 Data Extraction Blocklist (MANDATORY — not skippable)** — install the `PreToolUse` hook that blocks row extraction from sensitive tables.

    **Step A — Profile selection**: ask the user to choose a blocklist scope:

    ```
    🔒 데이터 추출 차단 프로파일을 선택하세요.
    하나는 반드시 선택해야 합니다 (setup 완료의 필수 조건).

      1) strict   — 모든 카테고리 차단 (권장 기본값)
                    PII + 인증/크레덴셜 + HR + 거래 테이블(VBAK/BKPF 등)
                    + 감사로그/워크플로우까지 전부

      2) standard — PII + 인증 + HR + 거래 테이블(VBAK/BKPF/ACDOCA 등)
                    감사로그/워크플로우는 허용

      3) minimal  — PII + 인증/크레덴셜 + HR + Tax만 차단
                    일반 비즈니스 거래 테이블은 허용

      4) custom   — 내장 목록 무시, 사용자가 .sc4sap/blocklist-custom.txt 에
                    직접 작성한 목록만 적용

    어느 프로파일이든 .sc4sap/blocklist-extend.txt 파일(있으면)의 추가
    항목이 합쳐져 적용됩니다.
    ```

    - Accept: `strict` / `standard` / `minimal` / `custom` (or 1/2/3/4)
    - Write the chosen value to `.sc4sap/config.json` as `blocklistProfile`
    - If `custom`: prompt user to create `.sc4sap/blocklist-custom.txt` now (one table name or pattern per line) or after setup; warn that an empty custom list means no enforcement at L3

    **Step B — Install the hook (mandatory)**:

    Run `node scripts/install-hooks.mjs` (defaults to user-level `~/.claude/settings.json`).
    - If the user prefers project-level enforcement: `node scripts/install-hooks.mjs --project`
    - On success, report: "✅ PreToolUse 훅이 설치되었습니다. 프로파일: {profile}"

    **Step C — Verification (smoke test)**:

    Pipe a BNKA test payload to the hook script and confirm it returns a `deny` decision. Example (bash):
    ```bash
    echo '{"tool_name":"mcp__abap__GetTableContents","tool_input":{"table":"BNKA"}}' \
      | node scripts/hooks/block-forbidden-tables.mjs
    ```
    Expected: JSON with `"permissionDecision":"deny"`. If not, halt setup and surface the error.

    **Step D — Final confirmation**:
    - Print profile, extend file path (exists? yes/no), custom file path (for custom mode), and the full settings.json hook entry.
    - Remind the user they can change the profile anytime by re-running `/sc4sap:setup` or editing `.sc4sap/config.json`.

    Setup cannot complete without Step 12 succeeding. If the hook install fails (no node, permission error, etc.), stop and report — do not mark setup as done.

<SAP_Version_Reference>
Key differences between ECC and S/4HANA that affect agent behavior:

| Area | ECC 6.0 | S/4HANA |
|------|---------|---------|
| Business Partner | Customer (KNA1, XD01) + Vendor (LFA1, XK01) 분리 | BP 통합 (BUT000, BP) |
| Material Document | MKPF (header) + MSEG (item) | MATDOC (통합) |
| Accounting Document | BKPF + BSEG | ACDOCA (Universal Journal) |
| G/L Accounts | SKA1 + SKB1 (classic GL) | SKA1 + SKB1 + FINSC (new GL default) |
| Asset Accounting | ANLA + ANLP (classic) | ACDOCA 통합 (new asset accounting) |
| Output Management | NACE (condition-based) | BRF+ / Output Management (S4 1809+) |
| Credit Management | VKM1/F.28 (classic) | UKM (SAP Credit Management) |
| MRP | MD01/MD02 | MD01N / ppMRP (embedded) |
| Purchasing | ME21N (classic PO) | ME21N + Fiori apps |
| Sales | VA01 (classic) | VA01 + Fiori apps (Manage Sales Orders) |

Agents MUST check `SAP_VERSION` from config before recommending TCodes, tables, BAPIs, or development patterns.
Agents MUST check `ABAP_RELEASE` from config before generating ABAP code — using unsupported syntax causes activation errors.
</SAP_Version_Reference>

<ABAP_Release_Reference>
Key ABAP syntax features by release — agents MUST NOT use features above the configured release:

| Release | Key Syntax Features |
|---------|-------------------|
| 740 | Inline declarations (`DATA(lv_x)`), constructor expressions (`NEW`, `VALUE`, `CORRESPONDING`, `CONV`, `CAST`, `REF`, `EXACT`, `COND`, `SWITCH`), table expressions (`itab[ key ]`), string templates (`\|{ var }\|`) |
| 741 | `FOR` expressions in VALUE/REDUCE, `FILTER`, meshes, `MOVE-CORRESPONDING` for deep structures |
| 750 | Open SQL expressions (CASE, CAST, COALESCE in SELECT), CDS view annotations, ABAP Channels (AMC/APC) |
| 751 | CDS view extensions, virtual elements in CDS, `ENUM` types, `GROUP BY` in internal tables |
| 752 | CDS access control, CDS metadata extensions, `CORRESPONDING` with mapping, virtual sorting of itab |
| 753 | ABAP CDS table functions, released APIs (whitelist), `AMDP` enhancements, `READ ENTITIES` (RAP preview) |
| 754 | ABAP RESTful Application Programming (RAP) model, behavior definitions, EML (`MODIFY ENTITIES`), `FINAL` classes |
| 755 | RAP managed/unmanaged scenarios, draft handling, ABAP SQL `LITERAL`, `@Environment.systemField` in CDS |
| 756 | ABAP Cloud Development Model, tier-1/tier-2 APIs, local ABAP types in ABAP SQL, `ABAP_BOOL`→`ABAP_BOOLEAN`, stricter CDS syntax |
| 757 | RAP side effects, ABAP SQL `CROSS JOIN`, `INNER/LEFT OUTER MANY TO MANY`, privileged mode in RAP |
| 758 | ABAP SQL `REPLACE`, `INITCAP`, new aggregate functions, RAP late numbering, background processing in RAP |

**Rules for code generation:**
- `ABAP_RELEASE < 740`: No inline declarations, no constructor expressions — use `DATA`, `CREATE OBJECT`, `MOVE-CORRESPONDING`
- `ABAP_RELEASE < 750`: No Open SQL expressions — use `SELECT` with simple fields only
- `ABAP_RELEASE < 754`: No RAP/EML — use classic BAPI/FM/class patterns
- `ABAP_RELEASE < 756`: No ABAP Cloud restrictions — all classic APIs available
- Always prefer modern syntax within the allowed release range
</ABAP_Release_Reference>

## SPRO Config Auto-Generation (`/sc4sap:setup spro`)

Reads S/4HANA configuration tables to generate a local SPRO reference config using the extraction script `scripts/extract-spro.mjs`.

> **토큰 사용 안내 (Token Usage Notice)**
> - 🔺 **최초 추출**: 모듈당 수십~수백 테이블을 MCP를 통해 조회하므로 **토큰 소모량이 큽니다**.
> - ✅ **이후 개발**: 로컬 캐시(`.sc4sap/spro-config.json`)를 참조하므로 **토큰 사용량이 크게 절감**됩니다.
> - 💡 매번 SAP 시스템에 접속해 동일한 설정을 재조회할 필요가 없어져, 반복 작업 시 비용 효율적입니다.
> - ⚙️  구성 변경이 있을 때만 `--force` 또는 특정 모듈만 재추출하면 됩니다.
>
> **Initial extraction** consumes significant tokens (queries dozens–hundreds of tables per module via MCP).
> **Subsequent development** reads the local cache (`.sc4sap/spro-config.json`), dramatically reducing token usage.
> Re-extract only when SAP customizing changes, using `--force` or per-module refresh.

### Step 1: Module Selection

1. Scan the `configs/` folder under the plugin directory to discover available modules
   - Available modules: the subdirectory names (e.g., `SD`, `MM`, `FI`, `CO`, `PP`, `PM`, `QM`, `WM`, `HCM`, `BW`, `TR`, `TM`, `Ariba`)
2. Present the module list to the user and ask which modules to extract SPRO config for
   - Example prompt: "다음 모듈 중 SPRO Config를 추출할 모듈을 선택해주세요 (쉼표로 구분, 'all'로 전체 선택):\n SD, MM, FI, CO, PP, PM, QM, WM, HCM, BW, TR, TM, Ariba"
   - Accept: comma-separated module names, or `all` for every module
3. Wait for user selection before proceeding

### Step 2: Execute Extraction Script (Module-Parallel)

Run `scripts/extract-spro.mjs` per module, **each as a separate background process** for parallel execution:

```bash
# Launch each module in parallel using run_in_background
node scripts/extract-spro.mjs SD   # background
node scripts/extract-spro.mjs MM   # background
node scripts/extract-spro.mjs FI   # background
node scripts/extract-spro.mjs CO   # background
```

**Execution rules:**
- **MUST** run each module as a separate `Bash` call with `run_in_background: true`
- **MUST** launch all modules simultaneously in a single message (parallel tool calls)
- Each module process independently connects to the MCP server, queries all tables from `configs/{MODULE}/spro.md`, and writes results to `.sc4sap/spro-config-{MODULE}.json`
- The script automatically sets `row_number: 9999` to retrieve ALL rows
- Wait for all background processes to complete before proceeding

### Step 3: Merge & Report

After all modules complete:

1. Read each `.sc4sap/spro-config-{MODULE}.json` and merge into a single `.sc4sap/spro-config.json`:
   ```json
   {
     "timestamp": "2026-04-13T...",
     "system": "S4HANA",
     "modules": {
       "SD": { ... },
       "MM": { ... }
     },
     "errors": [...],
     "summary": { "modules_processed": 4, "tables_success": 105, "tables_failed": 60 }
   }
   ```
2. Report summary to user: modules processed, tables read (success/fail), total records, config file location
3. Clean up individual module files if merge succeeded

## Notes

- `/sc4sap:sap-doctor`, `/sc4sap:mcp-setup` remain valid direct entrypoints
- Prefer `/sc4sap:setup` in documentation and user guidance
- Config is stored in `.sc4sap/` in the project root

Task: {{ARGUMENTS}}
