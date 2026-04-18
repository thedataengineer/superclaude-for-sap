# 설치 및 설정

← [README로 돌아가기](../README.ko.md)

## 요구사항

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-339933?logo=node.js&logoColor=white)
![Claude Code](https://img.shields.io/badge/Claude_Code-CLI-6B4FBB?logo=anthropic&logoColor=white)
![SAP ECC](https://img.shields.io/badge/SAP-ECC_6.0-0FAAFF?logo=sap&logoColor=white)
![SAP S/4HANA](https://img.shields.io/badge/SAP-S%2F4HANA_On--Premise-0FAAFF?logo=sap&logoColor=white)
![SAP S/4HANA Cloud](https://img.shields.io/badge/SAP-S%2F4HANA_Cloud-0FAAFF?logo=sap&logoColor=white)
![MCP ABAP ADT](https://img.shields.io/badge/MCP_ABAP_ADT-Auto--Installed-FF6600)

| 항목 | 상세 |
|------|------|
| **Node.js** | >= 20.0.0 |
| **Claude Code** | CLI 설치 완료 (Max/Pro 구독 또는 API 키) |
| **SAP 시스템** | **SAP ECC 6.0** / **S/4HANA On-Premise** / **S/4HANA Cloud (Public & Private)** — ADT 활성화됨 |

> **MCP 서버** ([abap-mcp-adt-powerup](https://github.com/babamba2/abap-mcp-adt-powerup))는 `/sc4sap:setup` 중 **자동 설치·설정**됩니다 — 수동 사전 설치 불필요.

## 설치

> **Note** — sc4sap은 **아직 공식 Claude Code 플러그인 마켓플레이스에 등록되지 않았습니다**. 당분간은 이 저장소를 커스텀 마켓플레이스로 추가한 뒤 플러그인을 설치하세요.

### 옵션 A — 커스텀 마켓플레이스로 추가 (권장)

Claude Code 세션 안에서:

```
/plugin marketplace add https://github.com/babamba2/superclaude-for-sap.git
/plugin install sc4sap
```

업데이트:

```
/plugin marketplace update babamba2/superclaude-for-sap
/plugin install sc4sap
```

### 옵션 B — 소스에서 설치

```bash
git clone https://github.com/babamba2/superclaude-for-sap.git
cd superclaude-for-sap
npm install && npm run build
```

그 후 Claude Code에서 `/plugin marketplace add <로컬-경로>`로 로컬 플러그인 디렉토리를 지정.

## 설정

```bash
# 설정 스킬 실행 — 위저드가 한 번에 한 질문씩 안내
/sc4sap:setup
```

### 서브커맨드

```bash
/sc4sap:setup                # 전체 위저드 (기본)
/sc4sap:setup doctor         # /sc4sap:sap-doctor로 라우팅
/sc4sap:setup mcp            # /sc4sap:mcp-setup으로 라우팅
/sc4sap:setup spro           # SPRO 설정 자동 추출만
/sc4sap:setup customizations # Z*/Y* 확장/증설 인벤토리만
```

### 위저드 단계

위저드는 **한 번에 한 질문**만 합니다 — 전체 설문지를 한꺼번에 던지지 않음. `.sc4sap/sap.env` / `.sc4sap/config.json`에 기존값이 있으면 보여주고 Enter로 유지 가능.

| # | 단계 | 내용 |
|---|------|------|
| 1 | **버전 확인** | Claude Code 버전 호환성 검증 |
| 2 | **SAP 버전 + 산업** | `S4` / `ECC` 선택, ABAP 릴리즈 입력, 15개 산업 메뉴에서 선택. SPRO 테이블/BAPI/TCode + ABAP 문법 게이팅 + 산업별 구성 패턴을 구동 |
| 3 | **MCP 서버 설치** | `abap-mcp-adt-powerup`을 `<PLUGIN_ROOT>/vendor/abap-mcp-adt/`에 클론+빌드. 이미 설치됐으면 스킵 (`--update`로 갱신) |
| 4 | **SAP 연결** | 한 필드당 한 질문 — `SAP_URL`, `SAP_CLIENT`, `SAP_AUTH_TYPE`, `SAP_USERNAME`, `SAP_PASSWORD`, `SAP_LANGUAGE`, `SAP_SYSTEM_TYPE`, `SAP_VERSION`, `ABAP_RELEASE`, `SAP_ACTIVE_MODULES` (쉼표 구분), `TLS_REJECT_UNAUTHORIZED`. `.sc4sap/sap.env`에 기록 |
| 4bis | **RFC 백엔드 선택** | `soap` / `native` / `gateway` / `odata` / `zrfc` 중 선택 — [RFC 백엔드](FEATURES.ko.md#-rfc-백엔드-선택) 참고 |
| 5 | **MCP 재연결** | 새로 설치된 서버 기동을 위해 `/mcp` 실행 프롬프트 |
| 6 | **연결 테스트** | SAP 대상 `GetSession` 왕복 |
| 7 | **시스템 정보 확인** | 시스템 ID, 클라이언트, 사용자 표시 |
| 8 | **ADT 권한 체크** | `GetInactiveObjects`로 ADT 권한 검증 |
| 9 | **`ZMCP_ADT_UTILS` 생성** | 필수 유틸리티 함수그룹 (패키지 `$TMP`). `ZMCP_ADT_DISPATCH` + `ZMCP_ADT_TEXTPOOL` 생성, RFC-enabled 및 활성화 |
| 10 | **`config.json` 작성** | 플러그인측 구성 — `sapVersion`, `abapRelease`, `industry`, `activeModules`, `systemInfo` |
| 11 | **SPRO 추출 (선택)** | `y/N` — 초기 추출은 토큰 비용이 크지만, 생성된 `.sc4sap/spro-config.json` 캐시가 이후 토큰 사용을 크게 줄임 |
| 11b | **커스터마이징 인벤토리 (선택)** | `y/N` — 각 모듈의 `enhancements.md` 파싱 후 실제 구현된 `Z*`/`Y*` 확장을 라이브 SAP에 질의. `.sc4sap/customizations/{MODULE}/{enhancements,extensions}.json`에 저장 |
| 12 | **🔒 블록리스트 훅 (필수)** | 프로필 선택 (`strict`/`standard`/`minimal`/`custom`), `node scripts/install-hooks.mjs`로 설치, BNKA 페이로드로 스모크 테스트. 이 단계 성공 없이는 설정 미완료 |

> **두 블록리스트 레이어, 개별 설정**
> - **L3 (12단계)** — Claude Code `PreToolUse` 훅, 프로필은 `.sc4sap/config.json` → `blocklistProfile`. MCP 서버 유무 무관 모든 세션에 적용
> - **L4 (4단계, 선택)** — MCP 서버 내부 가드, 프로필은 `sap.env` → `MCP_BLOCKLIST_PROFILE`. `abap-mcp-adt-powerup`에만 적용
>
> 일반적 조합: L3 `strict`, L4 `standard`. L3 변경은 `/sc4sap:setup` 재실행, L4 변경은 `/sc4sap:sap-option`.

## 설정 완료 후

- 상태 점검: `/sc4sap:sap-doctor`
- 자격증명/L4 블록리스트 조정: `/sc4sap:sap-option`
- SPRO 재추출: `/sc4sap:setup spro`
- 활성 모듈 편집: `/sc4sap:sap-option modules`

---

함께 보기: [기능 상세 →](FEATURES.ko.md) · [변경 이력 →](CHANGELOG.ko.md)
