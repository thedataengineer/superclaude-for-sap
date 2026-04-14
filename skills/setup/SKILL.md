---
name: sc4sap:setup
description: Plugin setup — install abap-mcp-adt-powerup, write .sc4sap/{sap.env,config.json}, create ZMCP_ADT_UTILS, install PreToolUse blocklist hook, optional SPRO config auto-generation
level: 2
---

# SC4SAP Setup

Use `/sc4sap:setup` as the unified setup and configuration entrypoint for SuperClaude for SAP.

## Usage

```bash
/sc4sap:setup                  # full setup wizard
/sc4sap:setup doctor           # diagnose installation and SAP connection
/sc4sap:setup mcp              # configure abap-mcp-adt-powerup MCP server
/sc4sap:setup spro             # auto-generate SPRO config from S/4HANA system
```

## Routing

Process the request by the **first argument only**:

- No argument, `wizard`, or `--force` -> run the full setup wizard (install plugin, configure MCP, test SAP connection)
- `doctor` -> route to `/sc4sap:sap-doctor` with remaining args
- `mcp` -> route to `/sc4sap:mcp-setup` with remaining args
- `spro` -> run SPRO config auto-generation workflow (see below)

## Interaction Style (MANDATORY)

> **한 번에 하나씩만 질문한다.** 여러 질문을 한꺼번에 나열하지 않는다.
>
> - 각 스텝을 **순차적으로** 진행하고, 각 스텝에서 필요한 입력을 **하나씩** 묻는다.
> - 사용자가 답하기 전에 다음 질문으로 넘어가지 않는다.
> - 사용자가 답하면 즉시 해당 값을 기록/적용하고 다음 스텝으로 이동한다.
> - 한 스텝 안에 여러 필드가 있어도(예: Step 4의 SAP 연결 정보) **필드별로 한 줄씩** 따로 묻는다.
>   예: `SAP_URL?` → 답변 → `SAP_CLIENT?` → 답변 → `SAP_AUTH_TYPE?` → ...
> - 이미 `.sc4sap/sap.env` 또는 `.sc4sap/config.json` 에 값이 있으면 현재 값을 보여주고 "Enter 로 유지 / 새 값 입력" 선택지를 준다.
> - 설명은 짧게. 긴 안내문을 벽처럼 붙여넣지 않는다.
>
> 사용자가 귀찮아할 수 있으므로 **절대로** 모든 질문을 한 메시지에 몰아서 묻지 않는다.

## Interaction Style (MANDATORY)

> **Ask one question at a time. Never batch questions.**
>
> - Walk through the steps **sequentially** and collect each input **one by one**.
> - Do not advance to the next question until the user has answered the current one.
> - As soon as the user answers, record/apply the value and move to the next step.
> - Even when a single step has multiple fields (e.g., Step 4 SAP connection info), ask **one field per message**.
>   Example: ask `SAP_URL?` → wait for answer → ask `SAP_CLIENT?` → wait → ask `SAP_AUTH_TYPE?` → ...
> - If a value already exists in `.sc4sap/sap.env` or `.sc4sap/config.json`, show the current value and offer "press Enter to keep / type a new value".
> - Keep prompts short. Do not paste long wall-of-text instructions.
>
> Never dump the entire questionnaire in a single message — users find it frustrating.

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

3. **Install `abap-mcp-adt-powerup` MCP server** — run `node scripts/build-mcp-server.mjs` to clone (`github.com/babamba2/abap-mcp-adt-powerup.git`) and build the external MCP server into `vendor/abap-mcp-adt/`
   - If already installed, skip (use `--update` to refresh)
   - On failure, show error and guide user to manual install
4. **Configure SAP connection** — ask user for SAP credentials and write `.sc4sap/sap.env`:
   - `SAP_URL` (e.g., `https://your-sap-host:44300`)
   - `SAP_CLIENT` (e.g., `100`)
   - `SAP_AUTH_TYPE` (`basic` or `xsuaa`)
   - `SAP_USERNAME` / `SAP_PASSWORD`
   - `SAP_LANGUAGE` (default: `EN`)
   - `SAP_SYSTEM_TYPE` (`onprem` or `cloud`)
   - `SAP_VERSION` (`S4` or `ECC`) — from step 2
   - `ABAP_RELEASE` (e.g., `750`, `756`, `758`) — from step 2; consumed by agents to gate ABAP syntax features
   - `TLS_REJECT_UNAUTHORIZED=0` (dev only, self-signed certs) — omit or unset in production
   - **Blocklist policy (optional, defaults to `standard`)** — this is the **MCP server-side guard (L4)** in `abap-mcp-adt-powerup`, read from env vars in `sap.env`. It is distinct from the **PreToolUse hook (L3)** configured in Step 12. Write these as commented examples so the user can uncomment as needed:
     ```
     # Blocklist profile: minimal | standard | strict | off
     #   minimal  — block only PII/credentials/banking
     #   standard — minimal + Protected Business Data (ACDOCA, BKPF, VBAK, EKKO, ...)   [default]
     #   strict   — standard + Audit/Security + Communication/Workflow
     #   off      — disable the guard entirely (NOT recommended)
     # MCP_BLOCKLIST_PROFILE=standard

     # Comma-separated table names (or Z-patterns) to ALWAYS block, on top of the profile
     # MCP_BLOCKLIST_EXTEND=ZHR_SALARY,ZCUSTOMER_PII

     # Comma-separated table names to WHITELIST (audited bypass). Use sparingly.
     # MCP_ALLOW_TABLE=ACDOCA
     ```
   - Do not set `MCP_BLOCKLIST_PROFILE` unless the user explicitly asks to loosen or tighten the default. `standard` is the safe default.
5. **Reconnect MCP** — prompt user to reconnect via `/mcp` so the newly installed server starts
6. Test SAP system connection via `GetSession`
7. Confirm connected system info (system ID, client, user)
8. Run `GetInactiveObjects` to confirm ADT access rights
9. **Create ABAP utility function modules** — required by the MCP server for Screen, GUI Status, and Text Element operations:
   1. Check if function group `ZMCP_ADT_UTILS` already exists via `SearchObject` (query=`ZMCP_ADT_UTILS`, objectType=`FUGR`)
   2. If NOT found, create the objects using MCP tools (package `$TMP` = **local-only, not transportable** by design — these are developer tooling helpers, not business logic):
      - `CreateFunctionGroup` — name: `ZMCP_ADT_UTILS`, package: `$TMP`, description: `MCP ADT Utility Functions`
      - `CreateFunctionModule` — name: `ZMCP_ADT_DISPATCH`, group: `ZMCP_ADT_UTILS`, description: `MCP ADT Dispatcher for Screen/GUI Status`
      - `CreateFunctionModule` — name: `ZMCP_ADT_TEXTPOOL`, group: `ZMCP_ADT_UTILS`, description: `MCP ADT Text Pool Read/Write`
      - `UpdateFunctionModule` — for each FM, read the ABAP source from `abap/zmcp_adt_dispatch.abap` and `abap/zmcp_adt_textpool.abap` in the plugin directory, then upload via UpdateFunctionModule
      - Both function modules MUST be set as **RFC-enabled**
      - Activate all objects
   3. If already found, skip creation and report "ZMCP_ADT_UTILS already exists"
   4. Test by calling `SearchObject` for `ZMCP_ADT_DISPATCH` to verify
10. Write plugin config to `.sc4sap/config.json` — include `sapVersion` and `abapRelease` fields.
    - Note: these are **duplicated** in `sap.env` (step 4) on purpose. `sap.env` is consumed by the MCP server process; `config.json` is consumed by plugin-side components (PreToolUse hook, agents, SPRO cache). Keep both in sync when the user changes them via `/sc4sap:sap-option`.
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

12. **🔒 Data Extraction Blocklist — PreToolUse hook (L3, MANDATORY — not skippable)** — install the Claude Code `PreToolUse` hook that blocks row extraction from sensitive tables *before* the MCP call is even made.

    > **Two-layer model — do not conflate:**
    > - **L3 (this step)** = Claude Code PreToolUse hook, config in `.sc4sap/config.json` → `blocklistProfile`. Values: `strict` | `standard` | `minimal` | `custom`. Fires for any Claude Code session regardless of which MCP server is in use.
    > - **L4 (step 4, optional)** = MCP server internal guard, config in `sap.env` → `MCP_BLOCKLIST_PROFILE`. Values: `minimal` | `standard` | `strict` | `off`. Applies only to `abap-mcp-adt-powerup`.
    >
    > They enforce similar intent but are **independent**. Typical setups run L3 on `strict` (the default) and leave L4 on `standard`. A user can change L3 here (or by editing `config.json`); L4 is changed via `/sc4sap:sap-option`.

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
    echo '{"tool_name":"mcp__plugin_sc4sap_sap__GetTableContents","tool_input":{"table_name":"BNKA"}}' \
      | node scripts/hooks/block-forbidden-tables.mjs
    ```
    Expected: JSON containing `"permissionDecision":"deny"` in `hookSpecificOutput`. If not, halt setup and surface the error. (The hook matches tool names by substring — any name containing `GetTableContents` or `GetSqlQuery` works.)

    **Step D — Final confirmation**:
    - Print profile, extend file path (exists? yes/no), custom file path (for custom mode), and the full settings.json hook entry.
    - Remind the user they can change the **L3 hook profile** anytime by re-running `/sc4sap:setup` or editing `.sc4sap/config.json` → `blocklistProfile`.
    - For the **L4 MCP-server profile** (`MCP_BLOCKLIST_PROFILE` in `sap.env`), direct them to `/sc4sap:sap-option`.

    Setup cannot complete without Step 12 succeeding. If the hook install fails (no node, permission error, etc.), stop and report — do not mark setup as done.

<SAP_Version_Reference>
When you need to explain ECC vs S/4HANA differences (tables, TCodes, BAPIs, development patterns) during setup or when routing follow-up questions, **read `common/sap-version-reference.md`** and apply the rules there. Do not duplicate the comparison table inline — the file is the single source of truth.
</SAP_Version_Reference>

<ABAP_Release_Reference>
When you need to reason about ABAP syntax availability for a given `ABAP_RELEASE` (e.g., whether inline declarations, RAP, or Open SQL expressions are allowed), **read `common/abap-release-reference.md`** and follow the rules there. Do not duplicate the feature matrix inline.
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

- `/sc4sap:sap-doctor`, `/sc4sap:mcp-setup`, `/sc4sap:sap-option` remain valid direct entrypoints.
- Prefer `/sc4sap:setup` in documentation and user guidance.
- Config is stored in `.sc4sap/` in the project root (`sap.env` for MCP-server env, `config.json` for plugin-side settings, optional `blocklist-extend.txt` / `blocklist-custom.txt`).
- After setup: to change SAP credentials or the L4 MCP blocklist profile, use `/sc4sap:sap-option`. To change the L3 hook profile, re-run `/sc4sap:setup` or edit `.sc4sap/config.json`.
