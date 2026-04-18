# 변경 이력

← [README로 돌아가기](../README.ko.md) · [설치](INSTALLATION.ko.md) · [기능](FEATURES.ko.md)

sc4sap의 모든 주요 변경사항이 여기에 기록됩니다. 전체 릴리즈 노트는 [GitHub Releases](https://github.com/babamba2/superclaude-for-sap/releases) 참고.

이 프로젝트는 [Semantic Versioning](https://semver.org/)과 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 형식을 따릅니다.

---

## [미출시]

### 추가
- **활성 모듈 인식** (`common/active-modules.md`) — 교차 모듈 통합 매트릭스. `SAP_ACTIVE_MODULES` 환경변수 + `config.json`의 `activeModules`가 `create-program`, `create-object`, `analyze-cbo-obj`, 컨설턴트 에이전트에서 통합 필드 제안을 구동. 예: MM 오브젝트 + PS 활성 → WBS 필드(`PS_POSID` / `AUFNR`) 자동 제안.
- **Fix #3 `handleUpdateDomain.ts`** — 핸들러 속성명을 `AdtDomain.update()`의 snake_case 기대값과 일치시킴(`value_table`, `fixed_values`, `conversion_exit`, `sign_exists`). 이전엔 silent drop.
- **Fix #4 `core/domain/update.ts`** (mcp-abap-adt-clients) — `<doma:valueTableRef>` 자체 닫는 경우를 위해 `patchXmlElementAttribute` → `patchXmlBlock`. 이제 완전한 `adtcore:uri` + `adtcore:type` + `adtcore:name` 속성 생성.

### 변경
- **`handleCreateTable.ts`** — Create 직후 MANDT 기반 transparent table 스켈레톤(`key mandt : mandt not null`) 자동 주입. SAP 백엔드의 기본 CDS 스타일 `key client : abap.clnt` 대체. 첫 사용자가 UpdateTable에서 `ExceptionResourceAlreadyExists`를 더 이상 겪지 않음.
- **`handleUpdateTable.ts`** — `ddl_code` 스키마 description에 MANDT 예시 + annotation 보존 가이드 추가.
- **`rfc-backend-selection.md`** — `odata` / `zrfc` 백엔드에 대한 bootstrap 순서 노트 추가 (Step 9c/9d chicken-and-egg를 first-time vs re-run 시나리오로 명시).

### 문서
- README 분할 — 메인 페이지는 슬림 (핵심 기능 + 제작자 + 기여자). 설치/상세기능/히스토리를 `docs/INSTALLATION.md` / `docs/FEATURES.md` / `docs/CHANGELOG.md` (이 파일)로 이동.

---

## 릴리즈 이력

이전 릴리즈는 [Git 태그 히스토리](https://github.com/babamba2/superclaude-for-sap/tags)와 [GitHub Releases](https://github.com/babamba2/superclaude-for-sap/releases) 참고.

### 버전 체계

sc4sap은 `v{MAJOR}.{MINOR}.{PATCH}` 형식:
- **MAJOR** — 스킬 API, 구성 스키마, 최소 SAP/Claude Code 버전에 대한 breaking change
- **MINOR** — 새 스킬, 새 에이전트, 새 common 규칙, 하위 호환 기능 추가
- **PATCH** — 버그 수정, 문서 전용 변경, 비-breaking 리팩토링

### 호환성

- **Claude Code**: >= 2.x
- **Node.js**: >= 20.0.0
- **SAP**: ECC 6.0 / S/4HANA On-Premise / S/4HANA Cloud (Public & Private)
- **MCP 서버**: 번들된 `abap-mcp-adt-powerup` (`/sc4sap:setup`이 자동 설치, 릴리즈별 버전 고정)

---

← [README로 돌아가기](../README.ko.md)
