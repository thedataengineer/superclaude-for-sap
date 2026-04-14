[English](README.md) | 한국어 | [日本語](README.ja.md)

# SuperClaude for SAP (sc4sap)

> SAP On-Premise S/4HANA ABAP 개발을 위한 Claude Code 플러그인

[![npm version](https://img.shields.io/npm/v/superclaude-for-sap?color=cb3837)](https://www.npmjs.com/package/superclaude-for-sap)
[![GitHub stars](https://img.shields.io/github/stars/babamba2/superclaude-for-sap?style=flat&color=yellow)](https://github.com/babamba2/superclaude-for-sap)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## sc4sap란?

SuperClaude for SAP는 Claude Code를 풀스택 SAP 개발 어시스턴트로 변환합니다. [MCP ABAP ADT 서버](https://github.com/babamba2/abap-mcp-adt-powerup)(150+ 도구)를 통해 SAP 시스템에 직접 연결하여 클래스, 펑션 모듈, 리포트, CDS 뷰 등의 ABAP 오브젝트를 생성/조회/수정/삭제할 수 있습니다.

## 요구사항

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-339933?logo=node.js&logoColor=white)
![Claude Code](https://img.shields.io/badge/Claude_Code-CLI-6B4FBB?logo=anthropic&logoColor=white)
![SAP S/4HANA](https://img.shields.io/badge/SAP-S%2F4HANA_On--Premise-0FAAFF?logo=sap&logoColor=white)
![MCP ABAP ADT](https://img.shields.io/badge/MCP_ABAP_ADT-자동_설치-FF6600)

| 요구사항 | 상세 |
|----------|------|
| **Node.js** | >= 20.0.0 |
| **Claude Code** | CLI 설치 (Max/Pro 구독 또는 API 키) |
| **SAP 시스템** | On-Premise S/4HANA (ADT 활성화) |

> **MCP 서버** ([abap-mcp-adt-powerup](https://github.com/babamba2/abap-mcp-adt-powerup))는 `/sc4sap:setup` 실행 시 **자동 설치 및 구성**됩니다 — 수동 사전 설치가 필요 없습니다.

## 설치

```bash
# 마켓플레이스에서 설치
claude plugin install sc4sap

# 또는 소스에서 설치
git clone https://github.com/babamba2/superclaude-for-sap.git
cd superclaude-for-sap
npm install && npm run build
```

## 설정

```bash
# MCP 연결 설정 및 SPRO 컨피그 생성
/sc4sap:setup
```

실행 시:
1. **MCP ABAP ADT 서버(`abap-mcp-adt-powerup`) 자동 설치** 및 연결 확인
2. S/4HANA 시스템에서 SPRO 컨피그 파일 자동 생성
3. 훅 및 에이전트 설정
4. **데이터 추출 차단 훅 설치 (필수)** — 프로파일(`strict` / `standard` / `minimal` / `custom`) 선택 후 Claude Code `settings.json`에 `PreToolUse` 훅 등록

## 기능

### 24개 SAP 전문 에이전트

| 분류 | 에이전트 |
|------|----------|
| **Core (10)** | Analyst, Architect, Code Reviewer, Critic, Debugger, Doc Specialist, Executor, Planner, QA Tester, Writer |
| **Basis (1)** | BC Consultant — 시스템 관리, 트랜스포트 관리, 진단 |
| **모듈 (13)** | SD, MM, FI, CO, PP, PM, QM, TR, HCM, WM, TM, Ariba, BW |

### 15개 스킬

| 스킬 | 설명 |
|------|------|
| `sc4sap:setup` | 플러그인 설정 + SPRO 컨피그 자동 생성 + 차단 훅 설치 |
| `sc4sap:autopilot` | 자율 실행 파이프라인 |
| `sc4sap:ralph` | SAP 검증 포함 지속 루프 |
| `sc4sap:ralplan` | 합의 기반 기획 |
| `sc4sap:team` | 병렬 에이전트 협업 실행 |
| `sc4sap:teams` | CLI 팀 런타임 (tmux 기반) |
| `sc4sap:ask` | 적절한 에이전트에 질문 라우팅 |
| `sc4sap:deep-interview` | 소크라테스식 요구사항 수집 |
| `sc4sap:mcp-setup` | MCP ABAP ADT 서버 설정 가이드 |
| `sc4sap:sap-option` | `.sc4sap/sap.env` 값 조회/수정 (자격증명·블록리스트 프로파일·화이트리스트) |
| `sc4sap:sap-doctor` | 플러그인 + MCP + SAP 연결 진단 |
| `sc4sap:release` | CTS 트랜스포트 릴리즈 워크플로우 |
| `sc4sap:create-object` | ABAP 오브젝트 생성 (하이브리드 모드) |
| `sc4sap:program` | ABAP 프로그램 풀 파이프라인 — Main+Include, OOP/Procedural, ALV, 테스트, 4단계 에이전트 |
| `sc4sap:analyze-code` | ABAP 코드 분석 및 개선 |
| `sc4sap:analyze-symptom` | SAP 운영 에러 단계별 증상 분석 (덤프, 로그, SAP Note 후보) |

### MCP ABAP ADT 서버 — 고유 기능

sc4sap은 확장형 ADT MCP 서버인 **[abap-mcp-adt-powerup](https://github.com/babamba2/abap-mcp-adt-powerup)** (150+ 도구) 위에서 동작합니다. 일반적인 ADT MCP에서 지원하는 Class / Program / Table / CDS / Function Module CRUD 외에, **다른 MCP 서버들이 지원하지 않는 고전 Dynpro 아티팩트까지 전체 Read / Update / Create 커버리지**를 제공합니다:

| 아티팩트 | 조회 | 생성 | 수정 | 삭제 | 비고 |
|----------|------|------|------|------|------|
| **Screen (Dynpro)** | `GetScreen`, `ReadScreen`, `GetScreensList` | `CreateScreen` | `UpdateScreen` | `DeleteScreen` | Dynpro 헤더 + Flow Logic 풀 라운드트립을 MCP JSON으로 주고받음 (대문자 `HEADER` / `FLOW_LOGIC` / `LINE` 키) |
| **GUI Status** | `GetGuiStatus`, `ReadGuiStatus`, `GetGuiStatusList` | `CreateGuiStatus` | `UpdateGuiStatus` | `DeleteGuiStatus` | 메뉴바, 펑션키, 애플리케이션 툴바를 프로그래매틱 생성/수정 |
| **Text Element** | `GetTextElement` | `CreateTextElement` | `UpdateTextElement` | `DeleteTextElement` | Text Symbol, Selection Text, List Heading — Text Element 강제 규칙에 필수 |
| **Includes** | `GetInclude`, `GetIncludesList` | `CreateInclude` | `UpdateInclude` | `DeleteInclude` | Main+Include 규약에 사용 |
| **Local defs/macros/tests/types** | `GetLocalDefinitions`, `GetLocalMacros`, `GetLocalTestClass`, `GetLocalTypes` | — | `UpdateLocalDefinitions`, `UpdateLocalMacros`, `UpdateLocalTestClass`, `UpdateLocalTypes` | `DeleteLocal*` | 프로그램 내부 로컬 섹션을 독립적으로 편집 |
| **Metadata Extension (CDS)** | `GetMetadataExtension` | `CreateMetadataExtension` | `UpdateMetadataExtension` | `DeleteMetadataExtension` | CDS 위 Fiori/UI 어노테이션 레이어링 |
| **Behavior Definition / Implementation (RAP)** | `Get/Read BehaviorDefinition`, `Get/Read BehaviorImplementation` | `Create*` | `Update*` | `Delete*` | RAP BDEF + BHV 전체 사이클 |
| **Service Definition / Binding** | `Get/Read ServiceDefinition`, `Get/Read ServiceBinding`, `ListServiceBindingTypes`, `ValidateServiceBinding` | `Create*` | `Update*` | `Delete*` | OData V2/V4 노출 및 검증 |
| **Enhancements / BAdI** | `GetEnhancements`, `GetEnhancementSpot`, `GetEnhancementImpl` | — | — | — | 확장 포인트 탐색 |
| **런타임 & 프로파일링** | `RuntimeListDumps`, `RuntimeAnalyzeDump`, `RuntimeGetDumpById`, `RuntimeListProfilerTraceFiles`, `RuntimeGetProfilerTraceData`, `RuntimeAnalyzeProfilerTrace`, `RuntimeCreateProfilerTraceParameters`, `RuntimeRunProgramWithProfiling`, `RuntimeRunClassWithProfiling` | — | — | — | ST22 덤프 분석 + SAT 스타일 프로파일링을 Claude 내부에서 수행 |
| **의미 분석 / AST** | `GetAbapAST`, `GetAbapSemanticAnalysis`, `GetAbapSystemSymbols`, `GetAdtTypes`, `GetTypeInfo`, `GetWhereUsed` | — | — | — | 단순 문법검사보다 풍부한 분석 |
| **Unit Test (ABAP + CDS)** | `GetUnitTest`, `GetUnitTestResult`, `GetUnitTestStatus`, `GetCdsUnitTest`, `GetCdsUnitTestResult`, `GetCdsUnitTestStatus` | `CreateUnitTest`, `CreateCdsUnitTest` | `UpdateUnitTest`, `UpdateCdsUnitTest` | `DeleteUnitTest`, `DeleteCdsUnitTest` | ABAP Unit과 CDS 테스트 프레임워크 모두 지원 |
| **트랜스포트** | `GetTransport`, `ListTransports` | `CreateTransport` | — | — | 트랜스포트 라이프사이클 전체를 MCP에서 |

특히 Dynpro / GUI Status / Text Element CRUD 덕분에 `sc4sap:program`의 **고전 UI 파이프라인(ALV + Docking + Selection Screen)을 AI가 엔드투엔드로 자동 구성**할 수 있습니다 — 대부분의 ADT MCP 서버에서는 불가능한 시나리오입니다.

### 공통 규약 (`common/`)

스킬과 에이전트가 동일한 기준을 따르도록 공통 규칙을 `common/` 폴더에 모았습니다:

| 파일 | 내용 |
|------|------|
| `common/include-structure.md` | Main 프로그램 + 조건부 Include (t/s/c/a/o/i/e/f/_tst) |
| `common/oop-pattern.md` | 2-class OOP 분리 (`LCL_DATA` + `LCL_ALV` + 옵션 `LCL_EVENT`) |
| `common/alv-rules.md` | Full ALV (CL_GUI_ALV_GRID + Docking) vs SALV + SALV 팩토리 필드카탈로그 |
| `common/text-element-rule.md` | Text Element 강제 — 하드코딩 리터럴 금지 |
| `common/constant-rule.md` | 필드카탈로그 외 매직 리터럴은 `CONSTANTS` 필수 |
| `common/procedural-form-naming.md` | ALV 관련 Procedural FORM은 `_{screen_no}` 접미사 |
| `common/naming-conventions.md` | 프로그램/Include/LCL/Screen/GUI Status 공통 네이밍 |
| `common/spro-lookup.md` | SPRO 조회 우선순위 — 로컬 캐시 → 정적 문서 → MCP |
| `common/data-extraction-policy.md` | 차단 대상 테이블에 대한 에이전트 거부 프로토콜 |

### SAP 플랫폼 인식 (ECC / S4 On-Prem / Cloud)

`sc4sap:program`은 모든 단계 전에 **SAP Version Preflight**를 실행합니다. `.sc4sap/config.json`의 `sapVersion`(ECC / S4 On-Prem / S/4HANA Cloud Public / Private)과 `abapRelease`를 확인하고 분기:

- **ECC** — RAP/ACDOCA/BP 불가, 릴리스별 문법 제한 (인라인 선언 <740, CDS <750 등)
- **S/4HANA On-Premise** — CDS + AMDP + RAP 우선, Business Partner, ACDOCA 기반 재무
- **S/4HANA Cloud (Public)** — **고전 Dynpro 금지**. RAP + Fiori Elements / `if_oo_adt_classrun` / SALV-only로 자동 리다이렉트. 금지 구문 + Cloud 대체 API 전체 목록: `skills/program/cloud-abap-constraints.md`
- **S/4HANA Cloud (Private)** — 고전 Dynpro 가능하지만 경고 + 확장성 우선 권장

### SPRO 컨피그 참조

13개 SAP 모듈 전체에 대한 내장 참조 데이터:

```
configs/{MODULE}/
  ├── spro.md         # SPRO 설정 테이블/뷰
  ├── tcodes.md       # 트랜잭션 코드
  ├── bapi.md         # BAPI/FM 참조
  ├── tables.md       # 주요 테이블
  ├── enhancements.md # BAdI / User Exit / BTE / VOFM
  └── workflows.md    # 개발 워크플로우
configs/common/       # 공통 참조 (IDOC, Factory Calendar, DD* 테이블 등)
```

**모듈**: SD, MM, FI, CO, PP, PM, QM, TR, HCM, WM, TM, Ariba, BW

### SPRO 로컬 캐시 (토큰 절약)

`/sc4sap:setup spro`는 운영 S/4HANA에서 고객사 SPRO 커스터마이징을 `.sc4sap/spro-config.json`에 추출합니다. 모든 consultant 에이전트는 `common/spro-lookup.md` 우선순위를 따릅니다:

1. **Priority 1 — 로컬 캐시** (`.sc4sap/spro-config.json` → `modules.{MODULE}`) — MCP 호출 없음
2. **Priority 2 — 정적 참조** (`configs/{MODULE}/*.md`)
3. **Priority 3 — 실시간 MCP 조회** — 사용자 컨펌 + 토큰 비용 안내 후에만

한 번 추출해두면 이후 모든 세션에서 토큰이 크게 절감됩니다.

### SAP 특화 훅

- **SPRO 자동 주입** — Haiku LLM이 사용자 입력을 분류하여 관련 모듈 SPRO 컨피그를 자동 주입
- **트랜스포트 검증** — MCP ABAP Create/Update 전 트랜스포트 존재 여부 확인
- **자동 활성화** — 오브젝트 생성/수정 후 ABAP 활성화 자동 트리거
- **구문 검사** — ABAP 에러 발생 시 시맨틱 분석 자동 실행
- **🔒 데이터 추출 차단 리스트** — 민감 테이블 행 조회를 `PreToolUse` 훅이 차단 (아래 참조)

### 🔒 데이터 추출 차단 리스트

민감 테이블(개인정보, 인증, 급여, 은행, 거래 재무)의 행 데이터가 `GetTableContents` / `GetSqlQuery`로 추출되는 것을 막는 필수 다계층 방어 체계입니다. sc4sap 에이전트 호출, 사용자 직접 입력, 같은 세션의 다른 플러그인 모두에 적용됩니다.

**4계층 방어**:

| 계층 | 위치 | 역할 |
|------|------|------|
| L1 — 에이전트 지시문 | `common/data-extraction-policy.md`, consultant agents | 차단 대상 조회 시 카테고리 + 이유 + 대안을 안내하며 거부 |
| L2 — 전역 지시 | `CLAUDE.md` "Data Extraction Policy" 블록 | 모든 Claude 세션(직접 프롬프트 포함)에 기본 로드 |
| L3 — Claude Code 훅 | `scripts/hooks/block-forbidden-tables.mjs` (`PreToolUse`) | MCP 호출을 가로채 `deny` 반환 (프로그래매틱 차단) |
| L4 — MCP 서버 (opt-in) | `abap-mcp-adt-powerup` 소스 (`src/lib/policy/blocklist.ts`) | 호출 주체와 무관하게 MCP 서버 내부에서 하드 차단 — `SC4SAP_POLICY=on` 환경변수로 활성화 |

**차단 목록 소스**: `exceptions/table_exception.md` — 100+ 테이블/패턴. 은행(BNKA, KNBK, LFBK, REGUH), 고객/거래처 마스터 PII(KNA1, LFA1, BUT000, BUT0ID), 주소(ADRC, ADR6, ADRP), 인증(USR02 비밀번호 해시, RFCDES, AGR_1251), HR/급여(PA* / HRP* / PCL* 패턴), 세금 ID, 보호 대상 거래 데이터(VBAK/BKPF/ACDOCA), 감사 로그, 커스텀 `Z*` PII 패턴 등.

**2가지 액션 — `deny` vs `warn`**:

- **`deny`** (기본값) — 호출이 즉시 차단되며 SAP에 전송되지 않습니다. 에이전트가 카테고리·이유·대안을 사용자에게 설명합니다.
- **`warn`** — 호출은 진행하되, 응답 앞에 `⚠️ sc4sap blocklist WARNING` 블록이 테이블·카테고리·권장 대안과 함께 붙어 반환됩니다. 업무상 일상적으로 접근하는 카테고리에 적합합니다.

`warn` 기본 카테고리: **Protected Business Data** (VBAK/BKPF/ACDOCA 등)와 **Customer-Specific PII Patterns** (`Z*` 테이블). 그 외는 모두 `deny`. 한 호출이 하나라도 `deny` 테이블을 포함하면 전체가 차단됩니다 (`deny`가 우선).

**프로파일 선택** — `/sc4sap:setup` 시 하나를 반드시 선택:

| 프로파일 | 차단 범위 |
|----------|-----------|
| `strict` (기본 권장) | PII + 인증 + HR + 거래 재무 + 감사 로그 + 워크플로우 |
| `standard` | PII + 인증 + HR + 거래 재무 |
| `minimal` | PII + 인증 + HR + Tax (일반 비즈니스 테이블 허용) |
| `custom` | 내장 목록 무시, `.sc4sap/blocklist-custom.txt` 만 사용 |

모든 프로파일은 `.sc4sap/blocklist-extend.txt`(한 줄에 테이블명/패턴 하나)에 있는 추가 항목도 함께 적용합니다.

**설치** — `/sc4sap:setup`이 **필수 단계로 자동 설치**합니다. 수동 설치:

```bash
node scripts/install-hooks.mjs            # 사용자 레벨 (~/.claude/settings.json)
node scripts/install-hooks.mjs --project  # 프로젝트 레벨 (.claude/settings.json)
node scripts/install-hooks.mjs --uninstall
```

**검증**:

```bash
echo '{"tool_name":"mcp__abap__GetTableContents","tool_input":{"table":"BNKA"}}' \
  | node scripts/hooks/block-forbidden-tables.mjs
# 기대 결과: "permissionDecision":"deny" 를 포함한 JSON
```

차단 대상 테이블이라도 스키마/DDIC 메타데이터(`GetTable`, `GetStructure`, `GetView`, `GetDataElement`, `GetDomain`), 존재 확인(`SearchObject`), `GetSqlQuery`를 통한 COUNT/SUM 집계는 허용됩니다. 일회성 예외는 `.sc4sap/data-access-approval-{YYYYMMDD}.md` 파일로 문서화합니다.

**L4 서버측 강제** (직접 JSON-RPC, 다른 LLM, 외부 스크립트 등 모든 호출자 차단):

```bash
# mcp-abap-adt-powerup 시작 시 환경변수로 활성화
export SC4SAP_POLICY=on                    # 또는 strict | standard | minimal | custom
export SC4SAP_POLICY_PROFILE=strict        # 선택 (SC4SAP_POLICY=on일 때 기본값)
export SC4SAP_BLOCKLIST_PATH=/path/to/sc4sap/exceptions/table_exception.md  # 선택 (추가 목록)
export SC4SAP_ALLOW_TABLE=TAB1,TAB2        # 세션 한정 긴급 예외 (로그 기록)
```

차단된 테이블 호출 시 MCP 서버가 `isError: true`와 카테고리 별 이유를 반환하며, SAP 시스템에는 요청이 전송되지 않습니다.

## 스킬별 예시 및 동작 방식

각 스킬의 한 줄 호출 예시, 실제 프롬프트 예시, 내부 동작 흐름을 정리했습니다. 스크린샷은 추후 업데이트 예정입니다.

### `/sc4sap:setup`

최초 1회 온보딩: MCP ABAP ADT 서버 설치, SPRO 캐시 추출, 데이터 추출 차단 훅 설치.

```
/sc4sap:setup
```

**동작** — 연결 테스트 → SAP 버전 자동 감지 (ECC / S4 On-Prem / Cloud) → 모듈별 SPRO 추출 → 차단 프로파일 선택 (`strict` / `standard` / `minimal` / `custom`) → `settings.json`에 훅 등록.

> _스크린샷 자리 — 셋업 마법사_

---

### `/sc4sap:create-object`

하이브리드 모드 단일 오브젝트 생성: 트랜스포트 + 패키지를 대화형으로 확인한 뒤 생성 → 초기 코드 작성 → 활성화.

```
/sc4sap:create-object
→ "ZCL_SD_ORDER_VALIDATOR 클래스를 ZSD_ORDER 패키지에 만들어줘"
```

**동작** — 타입 추론 (Class / Interface / Program / FM / Table / Structure / Data Element / Domain / CDS / Service Def / Service Binding) → 패키지·트랜스포트 확인 → MCP `Create*` → 초기 구현 작성 → `GetAbapSemanticAnalysis` → 활성화.

> _스크린샷 자리 — 생성 확인 및 활성화_

---

### `/sc4sap:program`

Main + Include 구조, OOP/Procedural, 전체 ALV + Dynpro를 지원하는 플래그십 프로그램 생성 파이프라인.

```
/sc4sap:program
→ "미결 판매 오더 ALV 리포트 — 영업조직 + 기간 선택화면으로"
```

**동작** — SAP 버전 Preflight (`.sc4sap/config.json`) → 소크라테스식 인터뷰 → 플래너 스펙 → 사용자 확인 → executor가 Main + 조건부 Include (t/s/c/a/o/i/e/f/_tst) + Screen + GUI Status + Text Element 작성 → qa-tester가 ABAP Unit 작성 → code-reviewer 게이트 → 활성화. 플랫폼별 분기 (ECC / S4 On-Prem / Cloud Public은 고전 Dynpro 금지 → `if_oo_adt_classrun` / SALV / RAP로 자동 리다이렉트).

> _스크린샷 자리 — 파이프라인 + ALV 결과_

---

### `/sc4sap:analyze-code`

기존 ABAP 오브젝트를 MCP로 읽어 `sap-code-reviewer`가 Clean ABAP + 성능 + 보안 기준으로 분류된 findings와 개선안을 반환.

```
/sc4sap:analyze-code
→ "ZCL_SD_ORDER_VALIDATOR의 Clean ABAP 위반과 SELECT * 검토"
```

**동작** — `ReadClass` / `GetProgFullCode` → `GetAbapSemanticAnalysis` + `GetWhereUsed` → sap-code-reviewer 분석 → 카테고리별 리포트 (Clean ABAP / 성능 / 보안 / SAP 표준) → 선택적 자동 수정 루프.

> _스크린샷 자리 — 리뷰 결과 테이블_

---

### `/sc4sap:analyze-symptom`

런타임/운영 에러 단계별 조사: 덤프, 로그, SAP Note 후보.

```
/sc4sap:analyze-symptom
→ "F110 실행 중 ZFI_POSTING 234라인에서 MESSAGE_TYPE_X 덤프"
```

**동작** — `RuntimeListDumps` / `RuntimeGetDumpById` / `RuntimeAnalyzeDump` → 스택 파싱 → SAP Note 후보 검색 → 근본 원인 가설 → 조치 옵션 (컨피그 / 코드 / 사용자 조치).

> _스크린샷 자리 — 덤프 분석 + Note 후보_

---

### `/sc4sap:autopilot`

모호한 아이디어에서 활성화·테스트 완료된 ABAP 오브젝트까지 전체 자율 파이프라인 — `deep-interview` → `ralplan` → 에이전트 파이프라인 → `ralph` 루프.

```
/sc4sap:autopilot
→ "거래처 지급 승인 워크플로우를 커스텀으로 만들어줘"
```

**동작** — deep-interview로 범위 확정 → ralplan 합의 플랜 → sap-planner WRICEF 분해 → sap-executor 오브젝트 생성 → sap-qa-tester 단위테스트 → sap-code-reviewer 게이트 → ralph 루프로 녹색될 때까지 재시도.

> _스크린샷 자리 — 오토파일럿 진행 스트림_

---

### `/sc4sap:ralph`

자가교정 지속 루프: 문법 Clean + 활성화 성공 + 단위테스트 통과 3종 세트가 되면 종료. "어쨌든 되게 해" 케이스에 투입.

```
/sc4sap:ralph
→ "ZMM_GR_POSTING과 포함 Include 전부 활성화 에러 해결"
```

**동작** — 반복: `GetAbapSemanticAnalysis` → 에러 식별 → `UpdateProgram` / `UpdateClass` / `UpdateInclude`로 수정 → 활성화 → 단위테스트 재실행 → 3종 통과 시 종료. 수동 개입 또는 최대 반복 도달 시 취소.

> _스크린샷 자리 — ralph 반복 로그_

---

### `/sc4sap:ralplan`

합의 기반 플래닝 게이트 — 여러 에이전트 관점 (analyst / architect / critic)이 코딩 전에 하나의 플랜으로 수렴. 오토파일럿이 엉뚱한 것을 만드는 상황을 방지.

```
/sc4sap:ralplan
→ "레거시 ZSD_ORDER_RELEASE를 RAP 기반 워크플로우로 재작성 계획"
```

**동작** — sap-analyst가 요구 추출 → sap-architect가 기술 설계 제안 → sap-critic이 반박 → 수렴 반복 → 승인된 플랜이 autopilot / team으로 전달.

> _스크린샷 자리 — ralplan 수렴 디프_

---

### `/sc4sap:deep-interview`

코드 작성 전 소크라테스식 요구사항 수집. 숨은 가정, 엣지케이스, 모듈 간 영향도를 끌어냄.

```
/sc4sap:deep-interview
→ "커스텀 여신 한도 체크가 필요해"
```

**동작** — 초기 의도 → 계층적 질문 (어느 모듈, 어떤 마스터, 타이밍, 에러 UX, 승인자) → 스펙 요약 → 사용자 확인.

> _스크린샷 자리 — 인터뷰 Q&A_

---

### `/sc4sap:team` / `/sc4sap:teams`

병렬 에이전트 협업 실행. `team`은 네이티브 Claude Code teams (인프로세스), `teams`는 tmux CLI 판 (프로세스 레벨 병렬).

```
/sc4sap:team
→ "이 WRICEF 리스트를 워커 4명에 분배해서 병렬로 빌드"
```

**동작** — 공유 태스크 리스트 → N 워커가 작업 픽업 → 각자 create-object / program / ralph 실행 → 트랜스포트로 병합.

> _스크린샷 자리 — tmux 판 뷰 / 팀 대시보드_

---

### `/sc4sap:release`

CTS 트랜스포트 릴리즈 워크플로우 — 목록, 검증 (Inactive 없음·문법 에러 없음), 릴리즈, 다음 시스템 임포트 확인.

```
/sc4sap:release
→ "DEVK900123 트랜스포트 릴리즈"
```

**동작** — `GetTransport` → 검증 체크리스트 → STMS 릴리즈 → 임포트 상태 모니터링 → 임포트 후 스모크 체크.

> _스크린샷 자리 — 릴리즈 체크리스트_

---

### `/sc4sap:ask`

풀 스킬 파이프라인 없이 적절한 전문 에이전트로 질문만 라우팅.

```
/sc4sap:ask
→ "VA01 Save 후 가격 반영 시점에 동작하는 BAdI?"
```

**동작** — 질문 분류 (모듈 / 기술 / 컨피그 / 에러) → 매칭되는 consultant 에이전트로 라우팅 (예: `sap-sd-consultant`) → SPRO 캐시 + MCP `GetEnhancementSpot` 조회로 답변.

> _스크린샷 자리 — 라우팅 답변_

---

### `/sc4sap:doctor` (별칭: `sap-doctor`)

플러그인 + MCP + SAP 시스템 진단. 뭔가 이상할 때 가장 먼저 실행.

```
/sc4sap:doctor
```

**동작** — 플러그인 설치 확인 → MCP 서버 핸드셰이크 → SAP RFC/ADT 연결 → SPRO 캐시 신선도 → 훅 등록 상태 → 차단 훅 활성 여부 → 조치 가능한 리포트.

> _스크린샷 자리 — 진단 리포트_

---

### `/sc4sap:mcp-setup`

`/sc4sap:setup`이 MCP 자동 설치를 건너뛴 경우 (예: 기존 글로벌 MCP 설정) `abap-mcp-adt-powerup`을 개별 설치·재구성하는 가이드.

```
/sc4sap:mcp-setup
```

### `/sc4sap:sap-option`

`.sc4sap/sap.env`에 기록된 값을 대화형으로 조회·수정합니다. SAP 접속 자격증명, TLS 설정, 그리고 행 추출 안전장치인 블록리스트 정책을 포함합니다. 화면 표시 시 비밀번호·시크릿은 자동으로 마스킹되며, 저장 전 Before/After diff를 미리 보여주고 `sap.env.bak` 백업을 남깁니다.

```
/sc4sap:sap-option
```

주요 사용 사례: `SAP_PASSWORD` 로테이션, `SAP_CLIENT` 변경, `MCP_BLOCKLIST_PROFILE` 전환 (`minimal` / `standard` / `strict` / `off`), 감사 로그가 남는 `MCP_ALLOW_TABLE` 예외 테이블 등록, `MCP_BLOCKLIST_EXTEND`에 사이트별 Z-테이블 추가. 저장 후에는 `/mcp` 재연결이 필요합니다.

## 기술 스택

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)
![MCP](https://img.shields.io/badge/MCP_SDK-Protocol-FF6600)

## 로드맵

- **v0.1.x** (현재) — 24 에이전트, 15 스킬, 13 모듈 컨피그, 공통 `common/` 규약, SPRO 로컬 캐시, 데이터 추출 차단 리스트(**L1–L4 모두 출시**; L4는 `abap-mcp-adt-powerup`의 `SC4SAP_POLICY=on` 환경변수로 opt-in), Cloud ABAP 인식
- **v0.2.0** (예정) — RAP 스킬, 멀티 시스템(Dev/QA/Prod), `sc4sap:program` OOP 템플릿 확장, L4 기본 활성화를 위한 업스트림 PR

## Acknowledgments

이 프로젝트는 [**oh-my-claudecode**](https://github.com/huryechan/oh-my-claudecode) (**허예찬**) 플러그인에 감명을 받아 제작되었습니다. 멀티 에이전트 오케스트레이션 패턴, Socratic deep-interview 게이팅, ralph/autopilot 파이프라인, 전체 플러그인 철학 모두 해당 작업에서 영감을 얻었습니다. 깊이 감사드립니다 — sc4sap은 이 작업 없이는 지금의 모습일 수 없었습니다.

## 저자

백승현 (paek seunghyun)

## 라이선스

[MIT](LICENSE)
