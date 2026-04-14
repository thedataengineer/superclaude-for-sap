# SAP Version Reference (ECC vs S/4HANA)

Comprehensive reference of the differences between **ECC 6.0** and **S/4HANA** that change agent behavior — tables, TCodes, BAPIs, Fiori apps, and development patterns.

Agents MUST check `SAP_VERSION` from `.sc4sap/config.json` (or `sap.env`) **before** recommending any TCode, table, BAPI, or pattern. Agents MUST also check `ABAP_RELEASE` before generating ABAP code — see `common/abap-release-reference.md` for release-by-release syntax.

If `SAP_VERSION` is unset, fail safe: ask the user to run `/sc4sap:setup` or `/sc4sap:sap-option` before proceeding.

---

## 1. Master Data

### 1.1 Business Partner (가장 자주 틀리는 영역)

| Area | ECC 6.0 | S/4HANA |
|------|---------|---------|
| 모델 | Customer (KNA1) + Vendor (LFA1) 분리 | BP 통합 (BUT000 + roles) |
| 생성 TCode | XD01 (Customer) / XK01 (Vendor) / MK01 | BP (통합) |
| 변경 TCode | XD02 / XK02 / VD02 / MK02 | BP |
| 표시 TCode | XD03 / XK03 | BP |
| 핵심 테이블 | KNA1, KNB1 (회사코드), KNVV (영업영역) / LFA1, LFB1, LFM1 | BUT000, BUT020 (주소), BUT100 (역할), BUT0BK (은행), KNA1/LFA1 여전히 동기화됨 |
| 주소 | ADRC (via ADRNR) | ADRC (BUT020 via PARTNER_GUID) |
| BAPI | BAPI_CUSTOMER_CREATEFROMDATA1 / BAPI_VENDOR_CREATE | BUPA_CREATE_FROM_DATA, CVI_EI_INBOUND_MAIN |

**에이전트 지침:**
- S/4HANA에서 `BAPI_CUSTOMER_CREATEFROMDATA1`을 절대 새로 추천하지 마세요 — SAP가 제거 예정(deprecated)으로 명시함. 대신 CVI/BUPA 계열 또는 OData `API_BUSINESS_PARTNER` 사용.
- KNA1/LFA1는 S/4HANA에서도 호환성을 위해 유지되지만 **읽기 전용으로만 참조**하고, 생성·변경은 BP 트랜잭션/CVI API로만 수행.

### 1.2 Material Master

| Area | ECC 6.0 | S/4HANA |
|------|---------|---------|
| 길이 제한 | MATNR 18자리 | MATNR 40자리 (1909+) |
| TCode | MM01 / MM02 / MM03 | MM01 / MM02 / MM03 (변경 없음) |
| 테이블 | MARA, MARC (plant), MARD (storage), MVKE (sales), MBEW (valuation) | 동일 — MARA는 유지, MATNR 필드 길이만 확장 |
| 이미지/문서 | DMS | DMS + Fiori "Manage Product Master Data" |

**에이전트 지침:**
- ECC 시스템에 코드 생성 시 `MATNR` 선언에 `CHAR18` 강제 — `CHAR40`으로 선언하면 ECC 7.x 런타임에서 자를 위험.
- S/4HANA에서는 `MATNR` 하드코딩된 길이 대신 도메인 `MATNR`을 참조.

---

## 2. Logistics & Inventory

### 2.1 Material Movement Document

| Area | ECC 6.0 | S/4HANA |
|------|---------|---------|
| 테이블 구조 | MKPF (header) + MSEG (item) | MATDOC (통합 단일 테이블) |
| 과거 호환 | — | MKPF/MSEG는 **CDS 뷰로 재현**됨 (compatibility views) |
| TCode | MB01/MB1A/MB1B/MB1C, MIGO | MIGO (only) — MB* 트랜잭션 다수 obsolete |
| BAPI | BAPI_GOODS_CREATE_FROM_DATA, BAPI_GOODS_MVT_CREATE | 동일 BAPI 유지, 내부 로직만 MATDOC로 대체 |

**에이전트 지침:**
- S/4HANA에서 MKPF/MSEG를 **직접 SELECT하지 마세요** — 성능 저하와 부정확한 결과. 대신 MATDOC 또는 released CDS view (`I_MaterialDocumentItem` 등) 사용.
- ECC에서는 MKPF ∪ MSEG JOIN이 정답.

### 2.2 Sales Documents

| Area | ECC 6.0 | S/4HANA |
|------|---------|---------|
| 생성 TCode | VA01 (Order) / VA21 (Quote) / VA11 (Inquiry) | VA01 + Fiori "Manage Sales Orders" (F1873) |
| 테이블 | VBAK (header), VBAP (item), VBEP (schedule), VBKD (business data) | 동일 — VBAK/VBAP 구조 유지 |
| BAPI | BAPI_SALESORDER_CREATEFROMDAT2 | 동일 (+ API_SALES_ORDER_SRV OData) |
| 출력 | NACE (condition-based) | BRF+ Output Management (SAP S4 1809+) |

### 2.3 Purchasing

| Area | ECC 6.0 | S/4HANA |
|------|---------|---------|
| PO 생성 | ME21N / ME21 | ME21N + Fiori "Manage Purchase Orders" (F0842A) |
| PR 생성 | ME51N | ME51N + Fiori "Manage Purchase Requisitions" |
| 테이블 | EKKO (header), EKPO (item), EKET (schedule), EKKN (acct assignment) | 동일 |
| 승인 | Release Strategy (ME28/ME29N) | Flexible Workflow + 기존 Release Strategy 병존 |

---

## 3. Financials

### 3.1 Accounting Document (Universal Journal)

| Area | ECC 6.0 | S/4HANA |
|------|---------|---------|
| 전표 저장 | BKPF (header) + BSEG (item, CLUSTER TABLE) | **ACDOCA** (Universal Journal — 투명 테이블, 단일) |
| 총계 | GLT0 / FAGLFLEXT (new GL) | ACDOCA 통합 — 별도 totals 테이블 불필요 |
| 하위원장 | BSID/BSIK/BSAD/BSAK (index tables) | ACDOCA 기반 CDS 뷰로 통합 제공 |
| TCode | FB01, FB50, FBL3N, FBL5N | FB01/FB50 유지, 신규 Fiori "Post General Journal Entries" (F0718) |
| 자산회계 | ANLA + ANLP (classic) | ACDOCA 통합 (new asset accounting, 필수) |
| 신GL | FAGLFLEXA (선택) | 없음 — ACDOCA가 대체 |

**에이전트 지침:**
- S/4HANA에서 **BSEG를 직접 SELECT하지 마세요** — 클러스터 테이블에서 투명 테이블로 변경되었지만 ACDOCA가 실제 sorced data. BSEG는 legacy 호환용.
- 보고서 작성 시 S/4는 ACDOCA (+ released CDS view `I_JournalEntryItem`), ECC는 BSEG ∪ BKPF 조합.
- ECC에서는 new GL 활성화 여부를 `T881`/`T882G`에서 먼저 확인.

### 3.2 G/L Master

| Area | ECC 6.0 | S/4HANA |
|------|---------|---------|
| Chart of accounts | SKA1 (chart level) + SKB1 (company code) | 동일 + **FINS_FIN_GLA** (extensions) |
| TCode | FS00 | FS00 + Fiori "Manage G/L Account Master Data" |

### 3.3 Credit Management

| Area | ECC 6.0 | S/4HANA |
|------|---------|---------|
| 구현 | FI-AR-CR (classic) | SAP Credit Management (FSCM, UKM*) — mandatory |
| 테이블 | KNKK, KNKA | UKMBP_CMS_SGM, UKMBP_CMS (BP-based) |
| TCode | FD32, F.28 (rebuild) | UKM_BP, UKM_COMMITMENTS |

---

## 4. Costing & Controlling

| Area | ECC 6.0 | S/4HANA |
|------|---------|---------|
| 주요 테이블 | COEP (line items), COSP/COSS (totals) | ACDOCA (CO 전표 통합) + COEP (유지) |
| Internal Order | KO01/KO02/KO03 | 동일 |
| Cost Center Master | KS01 | KS01 + Fiori "Manage Cost Centers" |
| Profitability Analysis | CE1xxxx/CE4xxxx (costing-based) | ACDOCA (account-based CO-PA, default) |

**에이전트 지침:**
- ACCOUNT-BASED CO-PA가 S/4 표준 — costing-based CO-PA 사용 확인 후에만 CE1/CE4 테이블 추천.

---

## 5. Planning & Execution

### 5.1 MRP

| Area | ECC 6.0 | S/4HANA |
|------|---------|---------|
| 전통적 MRP | MD01 / MD02 / MD03 | 유지 (compatibility) |
| MRP Live | 없음 | **MD01N** (HANA 기반, in-memory, 10x+ 빠름) — 권장 기본값 |
| 테이블 | MDKP, MDTB (obsolete in S4) | PPH_DBVM (HANA 최적화) |

### 5.2 Production Order

| Area | ECC 6.0 | S/4HANA |
|------|---------|---------|
| TCode | CO01/CO02/CO03 | 동일 + Fiori "Manage Production Orders" |
| 테이블 | AUFK (header), AFKO (order), AFPO (item) | 동일 |

---

## 6. Output Management

| Area | ECC 6.0 | S/4HANA |
|------|---------|---------|
| 방식 | NACE (condition-based), SmartForms / SAPscript | **BRF+** Output Management (S4 1809+) + Adobe Forms 권장; NACE 호환 유지 |
| 신규 개발 | NACE 기반 조건 레코드 | BRF+ 조건 + determination |

**에이전트 지침:**
- S/4 신규 프로젝트에 SAPscript 생성 금지. SmartForms는 가능하되 Adobe Forms가 권장.

---

## 7. Development Model

| Area | ECC 6.0 | S/4HANA |
|------|---------|---------|
| 권장 모델 | Classic Dynpro + Module Pool + BAPI | **RAP** (ABAP RESTful Application Programming, 754+) |
| 클라이언트 | SAPGUI + WebDynpro | SAPGUI (legacy) + **Fiori** (표준) |
| DB 접근 | Open SQL + SELECT ON tables | **CDS views + Released APIs** (clean core) |
| 확장성 | User-exits, BAdI, customer includes | **Key User Extensibility** (in-app) + BAdI + CDS extensions |
| Cloud 대응 | N/A | ABAP Cloud Development Model (released APIs only) — 756+ |

---

## 8. Enforcement Rules

- Agents MUST check `SAP_VERSION` from config before recommending TCodes, tables, BAPIs, or development patterns.
- Agents MUST check `ABAP_RELEASE` from config before generating ABAP code — using unsupported syntax causes activation errors.
- If `SAP_VERSION` is unset, fail safe: ask the user to run `/sc4sap:setup` or `/sc4sap:sap-option` before proceeding.
- When migrating ECC→S/4HANA scripts, never assume compatibility views alone are enough — verify with `GetView` before SELECT.
- For S/4HANA ABAP Cloud tier (`SAP_SYSTEM_TYPE=cloud`), only released APIs (C1 tier) are callable — consult `common/spro-lookup.md` and SAP Note guidance before recommending classic FMs/BAPIs.
