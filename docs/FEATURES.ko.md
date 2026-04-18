# 기능 상세

← [README로 돌아가기](../README.ko.md) · [설치 →](INSTALLATION.ko.md)

## 목차

- [25개 SAP 전문 에이전트](#25개-sap-전문-에이전트)
- [18개 스킬](#18개-스킬)
- [스킬 — 예시 & 워크플로우](#스킬--예시--워크플로우)
- [MCP ABAP ADT 서버 기능](#mcp-abap-adt-서버-고유-기능)
- [공유 컨벤션](#공유-컨벤션-common)
- [산업 레퍼런스](#산업-레퍼런스-industry)
- [국가/로컬라이제이션](#국가로컬라이제이션-레퍼런스-country)
- [활성 모듈 통합](#활성-모듈-통합)
- [SAP 플랫폼 인식](#sap-플랫폼-인식-ecc--s4-on-prem--cloud)
- [SPRO 구성 레퍼런스](#spro-구성-레퍼런스)
- [SAP 특화 훅](#sap-특화-훅)
- [데이터 추출 블록리스트](#-데이터-추출-블록리스트)
- [acknowledge_risk HARD RULE](#-acknowledge_risk--hard-rule)
- [RFC 백엔드 선택](#-rfc-백엔드-선택)
- [RFC 게이트웨이 (Enterprise)](#-rfc-게이트웨이-enterprise-배포)

## 25개 SAP 전문 에이전트

| 카테고리 | 에이전트 |
|---------|---------|
| **Core (10)** | Analyst, Architect, Code Reviewer, Critic, Debugger, Doc Specialist, Executor, Planner, QA Tester, Writer |
| **Basis (1)** | BC Consultant — 시스템 관리, 전송 관리, 진단 |
| **Modules (14)** | SD, MM, FI, CO, PP, PS, PM, QM, TR, HCM, WM, TM, Ariba, BW |

**위임 맵 (Module Consultation Protocol)**:
- `sap-analyst` / `sap-critic` / `sap-planner` → `## Module Consultation Needed` → `sap-{module}-consultant` (업무 의미) 또는 `sap-bc-consultant` (시스템 레벨)
- `sap-architect` → `## Consultation Needed` → `sap-bc-consultant` (전송 전략, 권한, 성능, 사이징, 패치) 또는 모듈 컨설턴트
- `sap-analyst` / `sap-critic` / `sap-planner`는 필수 **Country Context** 블록 보유(`country/<iso>.md` 로드)
- **Core 에이전트의 직접 MCP 읽기 권한** — 패키지/DDIC/클래스/프로그램/where-used/런타임 덤프 툴을 읽기 전용으로 보유. 쓰기 CRUD는 `sap-executor` / `sap-planner` / `sap-writer` / `sap-qa-tester` / `sap-debugger`에 집중

## 18개 스킬

| 스킬 | 설명 |
|------|------|
| `sc4sap:setup` | 플러그인 설정 — MCP 서버 자동 설치, SPRO 구성 생성, 블록리스트 훅 설치 |
| `sc4sap:mcp-setup` | 독립적인 MCP ABAP ADT 서버 설치/재설정 가이드 |
| `sc4sap:sap-option` | `.sc4sap/sap.env` 보기/편집 (자격증명, RFC 백엔드, 블록리스트, 활성 모듈) |
| `sc4sap:sap-doctor` | 플러그인 + MCP + SAP 진단 (6 레이어) |
| `sc4sap:create-object` | ABAP 객체 생성 (하이브리드 모드 — 전송+패키지 확인, 생성, 활성화) |
| `sc4sap:create-program` | 풀 ABAP 프로그램 파이프라인 — Main+Include, OOP/Procedural, ALV, Dynpro, Text Elements, ABAP Unit |
| `sc4sap:program-to-spec` | ABAP 프로그램을 Functional/Technical Spec으로 역공학 (Markdown / Excel) |
| `sc4sap:analyze-code` | ABAP 코드 분석 (Clean ABAP / 성능 / 보안) |
| `sc4sap:analyze-cbo-obj` | CBO 인벤토리 스캐너 + 교차 모듈 갭 분석 |
| `sc4sap:analyze-symptom` | SAP 운영 에러/증상 단계별 분석 (덤프, 로그, SAP Note 후보) |
| `sc4sap:trust-session` | INTERNAL-ONLY — 세션 전체 MCP 권한 부트스트랩 |
| `sc4sap:deep-interview` | 구현 전 Socratic 요구사항 수집 |
| `sc4sap:team` | 조정된 병렬 에이전트 실행 (네이티브 Claude Code teams) |
| `sc4sap:release` | CTS 전송 릴리즈 워크플로우 |

## 스킬 — 예시 & 워크플로우

### `/sc4sap:create-object`
하이브리드 모드 단일 객체 생성: 전송+패키지 대화식 확인 후 생성/스캐폴드/활성화.
```
/sc4sap:create-object
→ "패키지 ZSD_ORDER에 클래스 ZCL_SD_ORDER_VALIDATOR 생성"
```
흐름: 타입 추론 → 패키지+전송 확인 → MCP `Create*` → 초기 구현 → `GetAbapSemanticAnalysis` → 활성화.

### `/sc4sap:create-program`
플래그십 프로그램 생성 파이프라인 — Main+Include 래핑, OOP/Procedural, 풀 ALV+Dynpro 지원.
```
/sc4sap:create-program
→ "미결 판매주문용 ALV 리포트 작성, 영업조직+날짜 범위 선택화면"
```
흐름 (Phase 0–8):
- Phase 0 — SAP 버전 preflight + 활성 모듈 로드
- Phase 1A — 모듈 컨설턴트 업무 인터뷰 (산업/국가 preflight, 업무 목적, 표준 SAP 대안)
- Phase 1B — `sap-analyst` + `sap-architect` 기술 인터뷰 (7 차원)
- Phase 2 — CBO + 커스터마이징 재사용 게이트로 계획
- Phase 3 — 스펙 + 사용자 승인
- Phase 3.5 — 실행 모드 게이트 (`auto` / `manual` / `hybrid`)
- Phase 4 — 병렬 Include 생성 → 배치 활성화
- Phase 5 — ABAP Unit
- Phase 6 — 4 버킷 컨벤션 리뷰 (Sonnet 병렬, MAJOR 발견 시 Opus 에스컬레이션)
- Phase 7 — 디버그 에스컬레이션
- Phase 8 — 타이밍 테이블 포함 완료 보고

### `/sc4sap:analyze-code`
```
/sc4sap:analyze-code
→ "ZCL_SD_ORDER_VALIDATOR의 Clean ABAP 위반과 SELECT * 사용 리뷰"
```

### `/sc4sap:analyze-cbo-obj`
Z 패키지 탐색, 재사용 자산 카탈로그, 교차 모듈 갭 분석.
```
/sc4sap:analyze-cbo-obj
→ "ZSD_ORDER 패키지에서 MM 모듈 재사용 후보 스캔"
```
흐름: `GetPackageTree` → 카테고리별 walk → 빈도 휴리스틱 → 교차 모듈 갭 체크 → `.sc4sap/cbo/<MODULE>/<PACKAGE>/inventory.json`.

### `/sc4sap:analyze-symptom`
```
/sc4sap:analyze-symptom
→ "F110 중 ZFI_POSTING 234라인의 MESSAGE_TYPE_X 덤프"
```
흐름: `RuntimeListDumps` → `RuntimeAnalyzeDump` → 스택 트레이스 → SAP Note 후보 → 치료 옵션.

### `/sc4sap:program-to-spec`
Socratic scope narrowing으로 ABAP 프로그램을 스펙으로 역공학 (Markdown/Excel).

### `/sc4sap:team`
네이티브 Claude Code teams로 조정된 병렬 에이전트 실행.

### `/sc4sap:release`
CTS 전송 릴리즈 워크플로우 — 리스트, 검증, 릴리즈, 임포트 확인.

### `/sc4sap:sap-doctor`
플러그인 + MCP + SAP 연결 진단. 뭔가 이상할 때 가장 먼저 실행.

### `/sc4sap:sap-option`
`.sc4sap/sap.env` 보기/편집 — 자격증명, RFC 백엔드, 블록리스트 정책, 활성 모듈. 시크릿 마스킹.

## MCP ABAP ADT 서버 — 고유 기능

sc4sap은 **[abap-mcp-adt-powerup](https://github.com/babamba2/abap-mcp-adt-powerup)** (150+ 툴)로 구동됩니다. 일반적인 Class / Program / Table / CDS / FM CRUD 외에도, 대부분의 MCP 서버가 다루지 않는 **classic Dynpro 아티팩트에 대한 완전 R/U/C 커버리지**를 추가:

| 아티팩트 | 커버리지 |
|---------|---------|
| **Screen (Dynpro)** | `GetScreen` / `CreateScreen` / `UpdateScreen` / `DeleteScreen` — 헤더 + 플로우 로직 왕복 |
| **GUI Status** | `GetGuiStatus` / `CreateGuiStatus` / `UpdateGuiStatus` / `DeleteGuiStatus` — 메뉴바, 기능키, 툴바 |
| **Text Element** | `GetTextElement` / `CreateTextElement` / `UpdateTextElement` / `DeleteTextElement` — 텍스트 심볼, 선택 텍스트, 리스트 헤딩 |
| **Includes** | `GetInclude` / `CreateInclude` / `UpdateInclude` / `DeleteInclude` — Main+Include 컨벤션 |
| **Local 정의/매크로/테스트/타입** | 프로그램 내 로컬 섹션을 독립 편집 |
| **Metadata Extension (CDS)** | Fiori/UI annotation 레이어링 |
| **Behavior Definition / Implementation (RAP)** | 풀 RAP BDEF + BHV 사이클 |
| **Service Definition / Binding** | OData V2/V4 노출 + `ValidateServiceBinding` |
| **Enhancements / BAdI** | `GetEnhancements`, `GetEnhancementSpot`, `GetEnhancementImpl` 디스커버리 |
| **Runtime & Profiling** | `RuntimeAnalyzeDump`, `RuntimeListSystemMessages`, `RuntimeGetGatewayErrorLog`, `RuntimeGetProfilerTraceData`, `RuntimeRunProgramWithProfiling` — ST22/SM02/`/IWFND/ERROR_LOG`/SAT 프로파일링을 Claude에서 |
| **Semantic / AST** | `GetAbapAST`, `GetAbapSemanticAnalysis`, `GetAbapSystemSymbols`, `GetWhereUsed` |
| **Unit Tests** | ABAP Unit (`CreateUnitTest`)과 CDS Unit (`CreateCdsUnitTest`) 양쪽 |
| **Transport** | `GetTransport`, `ListTransports`, `CreateTransport` |

## 공유 컨벤션 (`common/`)

교차 스킬 작성 규칙이 `common/`에 위치. `CLAUDE.md`는 이 파일들을 참조하는 얇은 인덱스.

| 파일 | 내용 |
|------|------|
| `clean-code.md` + `clean-code-oop.md` + `clean-code-procedural.md` | Clean ABAP 표준, 패러다임별 분리 |
| `include-structure.md` | Main + 조건부 Include 세트 (t/s/c/a/o/i/e/f/_tst) |
| `oop-pattern.md` | 2-class OOP 분리 (`LCL_DATA` + `LCL_ALV` + `LCL_EVENT`) |
| `alv-rules.md` | 풀 ALV (CL_GUI_ALV_GRID + Docking) vs SALV + SALV-factory fieldcatalog |
| `text-element-rule.md` | 필수 Text Elements — 2-pass 언어 규칙 (primary + `'E'` 안전망) |
| `constant-rule.md` | 필수 CONSTANTS (non-fieldcatalog 매직 리터럴) |
| `procedural-form-naming.md` | ALV 바인딩 FORM의 `_{screen_no}` 접미사 |
| `naming-conventions.md` | 프로그램, Include, LCL_*, 스크린, GUI 스테이터스의 공유 네이밍 |
| `sap-version-reference.md` | ECC vs S/4HANA 차이 |
| `abap-release-reference.md` | 릴리즈별 ABAP 문법 가용성 |
| `spro-lookup.md` | SPRO 조회 우선순위 (로컬 캐시 → 정적 → MCP) |
| `data-extraction-policy.md` | 에이전트 거부 프로토콜 + `acknowledge_risk` HARD RULE |
| `active-modules.md` | 교차 모듈 통합 매트릭스 (MM↔PS, SD↔CO, QM↔PP…) |

## 산업 레퍼런스 (`industry/`)

14개 산업 파일 — 모든 `sap-*-consultant`가 참조. 각 파일은 **Business Characteristics / Key Processes / Master Data / Module Implications / Common Customizations / SAP Industry Solutions / Pitfalls** 커버.

산업: retail, fashion, cosmetics, tire, automotive, pharmaceutical, food-beverage, chemical, electronics, construction, steel, utilities, banking, public-sector.

## 국가/로컬라이제이션 레퍼런스 (`country/`)

15개 국가 파일 + `eu-common.md` — analyst / critic / planner에게 필수. 각 파일은 **Formats / Tax System / e-Invoicing / Banking / Payroll / Statutory Reporting / SAP Country Version / Pitfalls** 커버.

| 파일 | 주요 특수성 |
|------|-----------|
| 🇰🇷 `kr.md` | e-세금계산서 (NTS), 사업자등록번호, 주민번호 PII |
| 🇯🇵 `jp.md` | Qualified Invoice System (2023+), Zengin, 法人番号 |
| 🇨🇳 `cn.md` | Golden Tax, 发票/e-fapiao, SAFE FX |
| 🇺🇸 `us.md` | Sales & Use Tax (VAT 없음), 1099, Nexus |
| 🇩🇪 `de.md` | USt, ELSTER, XRechnung / ZUGFeRD, SEPA |
| 🇬🇧 `gb.md` | VAT + MTD, BACS/FPS/CHAPS, Brexit 이후 (GB vs XI) |
| 🇫🇷 `fr.md` | TVA, FEC, Factur-X 2026 |
| 🇮🇹 `it.md` | IVA, FatturaPA / SDI (2019~ 의무) |
| 🇪🇸 `es.md` | IVA, SII (실시간 4일), TicketBAI |
| 🇳🇱 `nl.md` | BTW, KvK, Peppol, XAF |
| 🇧🇷 `br.md` | NF-e, SPED, CFOP, PIX |
| 🇲🇽 `mx.md` | CFDI 4.0, SAT, Carta Porte, SPEI |
| 🇮🇳 `in.md` | GST, IRN e-invoice, e-Way Bill, TDS |
| 🇦🇺 `au.md` | GST, ABN, STP Phase 2, BAS |
| 🇸🇬 `sg.md` | GST, UEN, InvoiceNow, PayNow |
| 🇪🇺 `eu-common.md` | VIES, INTRASTAT, SEPA, GDPR |

다국가 롤아웃: 관련 파일 모두 로드 + 국가 간 터치포인트 (intra-EU VAT, intercompany, transfer pricing, 국경 원천징수) 표면화.

## 활성 모듈 통합

`common/active-modules.md`가 교차 모듈 통합 매트릭스 정의. 여러 모듈이 활성일 때 스킬이 통합 필드를 선제적으로 제안.

예: MM PO 생성 시 **PS 활성** 상황 → 계정지정 `P`/`Q` + `PS_POSID` (WBS) 제안; **CO 활성** → 비용센터 파생 제안; **QM 활성** → GR 시 inspection lot 자동 생성.

`/sc4sap:setup` (Step 4) 또는 `/sc4sap:sap-option modules`로 설정. `create-program`, `create-object`, `analyze-cbo-obj`, 모든 컨설턴트 에이전트가 소비.

## SAP 플랫폼 인식 (ECC / S4 On-Prem / Cloud)

`sc4sap:create-program`은 필수 SAP 버전 Preflight 실행. `.sc4sap/config.json`의 `sapVersion`과 `abapRelease` 읽기:

- **ECC** — RAP/ACDOCA/BP 없음, 릴리즈별 문법 게이팅
- **S/4HANA On-Premise** — classical Dynpro 경고, extensibility-first, 재무에 MATDOC + ACDOCA
- **S/4HANA Cloud (Public)** — **classical Dynpro 금지**, RAP + Fiori Elements / `if_oo_adt_classrun` / SALV-only로 리디렉트. 전체 목록은 `common/cloud-abap-constraints.md`
- **S/4HANA Cloud (Private)** — CDS + AMDP + RAP + Business Partner API 선호

## SPRO 구성 레퍼런스

14개 SAP 모듈에 대한 내장 레퍼런스 데이터 (`configs/{MODULE}/`):
- `spro.md` — SPRO 구성 테이블/뷰
- `tcodes.md` — 트랜잭션 코드
- `bapi.md` — BAPI/FM 레퍼런스
- `tables.md` — 핵심 테이블
- `enhancements.md` — BAdI / User Exit / BTE / VOFM
- `workflows.md` — 개발 워크플로우

모듈: SD, MM, FI, CO, PP, PS, PM, QM, TR, HCM, WM, TM, Ariba, BW.

### SPRO 로컬 캐시 (토큰 절약)

`/sc4sap:setup spro`는 고객별 SPRO 커스터마이징을 `.sc4sap/spro-config.json`으로 추출. 컨설턴트는 `common/spro-lookup.md` 우선순위 따름:
1. 로컬 캐시 → 2. 정적 레퍼런스 → 3. 라이브 MCP 질의 (확인 필요).

## SAP 특화 훅

- **SPRO 자동 주입** — Haiku LLM이 사용자 입력을 분류하여 관련 모듈 SPRO 구성 주입
- **전송 검증** — MCP Create/Update 전에 전송 존재 여부 확인
- **자동 활성화** — 생성/수정 후 ABAP 객체 활성화 트리거
- **문법 체커** — ABAP 에러 시 의미 분석 자동 실행
- **🔒 데이터 추출 블록리스트** — `PreToolUse` 훅이 민감 SAP 테이블 행 추출 차단

## 🔒 데이터 추출 블록리스트

민감 테이블(PII, 자격증명, 급여, 뱅킹, 거래 재무)에서 `GetTableContents` / `GetSqlQuery`를 통한 행 데이터 추출을 방지하는 심층 방어 레이어.

**4-layer 집행**: L1 에이전트 지침 · L2 `CLAUDE.md` 글로벌 디렉티브 · L3 Claude Code `PreToolUse` 훅 · L4 MCP 서버 env-gated 가드.

**블록리스트 소스**: `exceptions/table_exception.md`가 인덱스, 실제 리스트는 `exceptions/` 하의 11개 섹션 파일.

| Tier | 커버리지 |
|------|---------|
| minimal | Banking/Payment, Master-data PII, Addresses, Auth/Security, HR/Payroll, Tax/Govt IDs, Pricing/Conditions, 커스텀 `Z*` PII 패턴 |
| standard | + Protected Business Data (VBAK/BKPF/ACDOCA/VBRK/EKKO/CDHDR/STXH + CDS) |
| strict | + Audit/Security logs, Communication/Workflow |

**액션**: `deny` (차단) vs `warn` (경고 프리픽스로 진행). 호출 내 어떤 테이블이라도 `deny`면 전체 차단.

**프로필** (`/sc4sap:setup`에서 선택): `strict` / `standard` / `minimal` / `custom`. 사이트별 추가는 `.sc4sap/blocklist-extend.txt`.

**설치** (`/sc4sap:setup`이 자동, 수동):
```bash
node scripts/install-hooks.mjs            # user-level
node scripts/install-hooks.mjs --project  # project-level
```

**검증**:
```bash
echo '{"tool_name":"mcp__abap__GetTableContents","tool_input":{"table":"BNKA"}}' \
  | node scripts/hooks/block-forbidden-tables.mjs
# 기대: JSON의 "permissionDecision":"deny"
```

**L4 서버측 집행** (모든 클라이언트 — 외부 스크립트 포함 — 차단):
```bash
export SC4SAP_POLICY=on
export SC4SAP_POLICY_PROFILE=strict
export SC4SAP_BLOCKLIST_PATH=/path/to/sc4sap/exceptions/table_exception.md
export SC4SAP_ALLOW_TABLE=TAB1,TAB2  # 세션 긴급 면제 (로그됨)
```

스키마/DDIC 메타데이터 (`GetTable`, `GetStructure`, `GetView`, `GetDataElement`, `GetDomain`)와 존재 체크는 계속 허용.

## 🚫 `acknowledge_risk` — HARD RULE

`GetTableContents` / `GetSqlQuery`는 `acknowledge_risk: true` 파라미터로 ask-tier 게이트를 우회할 수 있음. **이것은 편의 플래그가 아니라 감사 경계**.

1. **첫 호출에 `acknowledge_risk: true` 절대 금지** — 훅/서버가 게이팅하게 둠
2. **`ask` 응답 시** STOP — 거부 사유를 사용자에게 표면화
3. **테이블과 범위를 명시한 yes/no 질문**
4. **명시적 긍정 키워드 후에만 `acknowledge_risk: true`로 재시도**: `yes` / `y` / `승인` / `authorize` / `approve` / `proceed` / `confirmed`
5. **모호한 명령은 승인 아님** — `"뽑아봐"`, `"pull it"`, `"try it"`, `"my mistake"`, 침묵
6. **호출당, 테이블당, 세션당** — 승인은 이월되지 않음

전체 프로토콜: `common/data-extraction-policy.md`.

### ⚠️ "Always allow" 함정
`GetTableContents` / `GetSqlQuery` 권한 프롬프트 등장 시 **"Allow once"** 선택, **"Always allow"** 절대 금지. "Always allow"는 툴 ID를 `permissions.allow`에 추가하여 이 안전장치를 영구 무력화. 복구: 부모 스킬 재실행 — `trust-session` Step 2가 `GetTableContents` / `GetSqlQuery` 엔트리를 매번 스캔/제거.

## 🔀 RFC 백엔드 선택

Screen / GUI Status / Text Element 연산은 SAP의 RFC-enabled FM으로 디스패치. 5개 전송 백엔드:

| `SAP_RFC_BACKEND` | 방식 | 언제 사용 |
|---|---|---|
| `soap` (기본) | HTTPS `/sap/bc/soap/rfc` | 대부분 — ICF 노드 활성 시 즉시 작동 |
| `native` | `node-rfc` + NW RFC SDK | 최저 레이턴시; 유료 SDK 필요. _Deprecated — `zrfc` 사용_ |
| `gateway` | sc4sap-rfc-gateway 미들웨어로 HTTPS | 10+ 팀, 중앙 배포 |
| `odata` | HTTPS OData v2 `ZMCP_ADT_SRV` | SOAP 차단 + OData Gateway 허용. [docs/odata-backend.md](odata-backend.md) |
| 🆕 `zrfc` | HTTPS ICF 핸들러 `/sap/bc/rest/zmcp_rfc` | SOAP 차단 + OData Gateway 어려움 (전형적 ECC). SDK·Gateway 불필요 — 클래스 + SICF 노드 하나 |

`/sc4sap:sap-option`으로 언제든 전환, MCP 재연결, `/sc4sap:sap-doctor`로 검증.

## 🏢 RFC 게이트웨이 (Enterprise 배포)

대규모 SAP 개발팀(수십 명 개발자)에서 개발자 랩톱이 SAP NW RFC SDK / MSVC를 필요로 하지 않도록 **중앙 RFC Gateway** 미들웨어 지원. Linux 호스트 하나가 `node-rfc` + SDK 운영; 모든 MCP 클라이언트는 HTTPS/JSON으로 통신.

**언제 필요**:
- IT 정책이 개발자 머신에 SAP NW RFC SDK 설치 금지
- SAP Basis가 `/sap/bc/soap/rfc`를 회사 전체에 비활성화
- 중앙 RFC 로깅, 속도 제한, 개발자별 감사 추적 필요

**설정**:
```
/sc4sap:sap-option
# SAP_RFC_BACKEND=gateway
#     SAP_RFC_GATEWAY_URL=https://rfc-gw.company.com
#     SAP_RFC_GATEWAY_TOKEN=<team-or-per-user-bearer>
```

게이트웨이가 개발자 자격증명을 `X-SAP-*` 헤더로 전달 — SAP 감사 로그가 실제 사용자 식별.

> **비공개 저장소.** 게이트웨이 소스는 비공개 저장소에 위치 — Docker 이미지 빌드에 SAP 라이선스 NW RFC SDK 필요 (재배포 불가). 조직은 유지보수자에게 접근 요청, 클론, S-user로 SDK 다운로드, 자사 네트워크에서 이미지 빌드. 오픈소스 사용자: `SAP_RFC_BACKEND=soap` (기본) 계속 사용.

클라이언트 설계는 공개 (`abap-mcp-adt-powerup/src/lib/gatewayRfc.ts`) — HTTP 계약은 문서화됨, 호환 가능 미들웨어 (Node/Java/Python)는 모두 동작.

---

← [README로 돌아가기](../README.ko.md) · [설치 →](INSTALLATION.ko.md) · [변경 이력 →](CHANGELOG.ko.md)
