# Common - ABAP Naming Conventions
# 공통 - ABAP 명명 규칙

All custom ABAP objects MUST follow these naming conventions. Customer namespace uses `Z` (standard) or `Y` (temporary/prototype) prefix.
모든 커스텀 ABAP 오브젝트는 아래 명명 규칙을 따라야 합니다. 커스텀 네임스페이스는 `Z`(표준) 또는 `Y`(임시/프로토타입) 접두사를 사용합니다.

## General Rules / 공통 규칙

| Rule | Description |
|------|-------------|
| Prefix | `Z` (customer standard) or `Y` (temporary/prototype) — never modify SAP-delivered objects without enhancements |
| Case | UPPERCASE only (ABAP is case-insensitive, but convention is uppercase) |
| Character set | Letters (A-Z), digits (0-9), underscore (`_`) — no other special characters |
| Max length | 30 characters (most objects); 8 characters (package); 40 (class method) |
| Namespace pattern | `Z{MODULE}_{OBJECT_TYPE}_{NAME}` recommended for clarity |
| Avoid | Generic names (ZTEST, ZTEMP, ZDUMMY), Hungarian notation inside ABAP code |

## Module Codes / 모듈 코드

Use these 2-3 letter module codes as the second segment (`Z{MODULE}_...`):

| Code | Module |
|------|--------|
| SD | Sales and Distribution / 영업 및 유통 |
| MM | Materials Management / 자재 관리 |
| FI | Financial Accounting / 재무 회계 |
| CO | Controlling / 관리 회계 |
| PP | Production Planning / 생산 계획 |
| PM | Plant Maintenance / 설비 관리 |
| QM | Quality Management / 품질 관리 |
| HR / HCM | Human Capital Management / 인적 자본 관리 |
| WM | Warehouse Management / 창고 관리 |
| EWM | Extended Warehouse Management (S/4) |
| TM | Transportation Management / 운송 관리 |
| TR | Treasury / 재무(자금) |
| BW | Business Warehouse / 비즈니스 웨어하우스 |
| AR | Ariba integration |
| BC | Basis / 기반 |
| CA | Cross-Application / 공통 |

## Object-Specific Naming / 오브젝트별 명명 규칙

### Classes / 클래스

| Type | Pattern | Example |
|------|---------|---------|
| Global class | `ZCL_{MODULE}_{NAME}` | `ZCL_SD_ORDER_PROCESSOR` |
| Local class | `LCL_{NAME}` | `LCL_ITEM_HANDLER` |
| Persistent class | `ZCP_{MODULE}_{NAME}` | `ZCP_MM_MATERIAL` |
| Exception class | `ZCX_{MODULE}_{NAME}` | `ZCX_SD_ORDER_FAILED` |
| Test class (local) | `LTCL_{NAME}` | `LTCL_ORDER_PROCESSOR` |
| Test class (global) | `ZCL_{MODULE}_{NAME}_TEST` | `ZCL_SD_ORDER_TEST` |

### Interfaces / 인터페이스

| Type | Pattern | Example |
|------|---------|---------|
| Global interface | `ZIF_{MODULE}_{NAME}` | `ZIF_MM_MATERIAL_API` |
| Local interface | `LIF_{NAME}` | `LIF_CALCULABLE` |

### Programs / 프로그램

| Type | Pattern | Example |
|------|---------|---------|
| Executable (report) | `ZR_{MODULE}_{NAME}` or `Z_{MODULE}_{NAME}` | `ZR_SD_ORDER_LIST` |
| Include | `Z{PROGRAM}_TOP` (global data) | `ZR_SD_ORDER_LIST_TOP` |
| Include | `Z{PROGRAM}_F01` (forms) | `ZR_SD_ORDER_LIST_F01` |
| Include | `Z{PROGRAM}_SEL` (selection screen) | `ZR_SD_ORDER_LIST_SEL` |
| Include | `Z{PROGRAM}_CLS` (local classes) | `ZR_SD_ORDER_LIST_CLS` |
| Module pool | `SAPMZ{MODULE}_{NAME}` | `SAPMZSD_ORDER_DIALOG` |
| Subroutine pool | `Z_{MODULE}_{NAME}_SUB` | `Z_SD_ORDER_SUB` |

### Function Groups & Modules / 함수 그룹 및 모듈

| Type | Pattern | Example |
|------|---------|---------|
| Function Group | `ZFG_{MODULE}_{NAME}` or `Z{MODULE}_{DESCRIPTION}` | `ZFG_MM_MATERIAL`, `ZMM_MATERIAL` |
| Function Module | `Z_{MODULE}_{NAME}` or `Z_{FG}_{NAME}` | `Z_MM_MATERIAL_READ` |
| RFC Function Module | `Z_{MODULE}_RFC_{NAME}` | `Z_SD_RFC_ORDER_CREATE` |

### Data Dictionary / 데이터 사전

| Type | Pattern | Example |
|------|---------|---------|
| Transparent Table | `ZT{MODULE}_{NAME}` or `Z{MODULE}T_{NAME}` | `ZTSD_ORDER_LOG`, `ZSDT_ORDER_LOG` |
| Structure | `ZS_{MODULE}_{NAME}` or `ZSS_{MODULE}_{NAME}` | `ZS_SD_ORDER_HEADER` |
| Table Type | `ZTT_{MODULE}_{NAME}` | `ZTT_SD_ORDER_ITEMS` |
| Data Element | `ZDE_{NAME}` or `Z{MODULE}_DE_{NAME}` | `ZDE_ORDER_NUMBER`, `ZSD_DE_ORDER_NO` |
| Domain | `ZDO_{NAME}` or `Z{MODULE}_DO_{NAME}` | `ZDO_ORDER_STATUS` |
| Search Help | `ZSH_{MODULE}_{NAME}` | `ZSH_SD_ORDER` |
| Lock Object | `EZ_{MODULE}_{NAME}` | `EZ_SD_ORDER` (system prefix `E` for locks) |
| View | `ZV_{MODULE}_{NAME}` | `ZV_SD_ORDER_HDR` |
| CDS View | `Z_I_{ENTITY}` (interface), `Z_C_{ENTITY}` (consumption) | `Z_I_SALESORDER`, `Z_C_SALESORDER_UI` |
| CDS Behavior | `Z_BP_{ENTITY}` | `Z_BP_SALESORDER` |
| Table Function | `ZTF_{NAME}` | `ZTF_SALES_AGG` |

### UI / Dynpro

| Type | Pattern | Example |
|------|---------|---------|
| Dynpro Screen | 4-digit number (0100-9999); `0100` for main | `0100`, `0200`, `9000` |
| GUI Status | Uppercase identifier | `STATUS_0100`, `MAIN_STATUS` |
| GUI Title | Uppercase identifier | `TITLE_0100` |
| Selection Screen | Part of program | `AT SELECTION-SCREEN` |

### OData / RAP (S/4HANA) / OData 및 RAP

| Type | Pattern | Example |
|------|---------|---------|
| Service Definition | `Z_SD_{ENTITY}` or `Z_API_{ENTITY}` | `Z_SD_SALESORDER` |
| Service Binding | `Z_SB_{ENTITY}_{PROTOCOL}` | `Z_SB_SALESORDER_UI`, `Z_SB_SALESORDER_V2` |
| Behavior Definition | `Z_BP_{ENTITY}` | `Z_BP_SALESORDER` |
| Behavior Implementation | `ZCL_BP_{ENTITY}` | `ZCL_BP_SALESORDER` |
| Projection View | `Z_P_{ENTITY}` | `Z_P_SALESORDER` |

### Enhancements / 향상

| Type | Pattern | Example |
|------|---------|---------|
| Enhancement Implementation | `Z_{MODULE}_{BADI_NAME}_IMPL` | `Z_SD_BADI_SALES_IMPL` |
| Enhancement Spot | `Z_ENH_{MODULE}_{NAME}` | `Z_ENH_SD_PRICING` |
| CMOD Project | `Z{MODULE}_{NAME}` | `ZSD_ORDER` |
| Include (CMOD user exit) | `ZX{SAP_EXIT_INCLUDE}` | `ZXVVAU01` (for EXIT_SAPMV45A_*) |
| VOFM Routine | 3-digit (600-999 for custom) | `901`, `905` (application form routines) |

### Configuration / 설정

| Type | Pattern | Example |
|------|---------|---------|
| Package (Local) | `$TMP` | For local/temporary objects |
| Package (Custom) | `Z{MODULE}_{NAME}` | `ZSD_ORDER_MGMT` |
| Transport Request | Generated by SAP | `ABCK900123` |
| Number Range Object | `Z_{MODULE}_{NAME}` | `Z_SD_ORDER_NR` |

### IDoc / ALE

| Type | Pattern | Example |
|------|---------|---------|
| IDoc Type (Basic) | `Z{MODULE}_{NAME}` | `ZSD_ORDER_OUT` |
| Segment | `Z1{MODULE}_{NAME}` (S-type segment prefix `Z1`) | `Z1SD_HEADER`, `Z1SD_ITEM` |
| Message Type | `Z{MODULE}_{NAME}` | `ZSD_ORDER_NOTIF` |
| Process Code | `Z{MODULE}{NAME}` (4 chars max suggested) | `ZSDO1` |

## Code-Level Naming / 코드 레벨 명명

### Variables / 변수

| Prefix | Type | Example |
|--------|------|---------|
| `LV_` | Local Variable (scalar) | `LV_ORDER_NUMBER` |
| `LS_` | Local Structure | `LS_ORDER_HEADER` |
| `LT_` | Local Internal Table | `LT_ORDER_ITEMS` |
| `LR_` | Local Reference (object ref) | `LR_ORDER_HANDLER` |
| `LO_` | Local Object (instance ref) | `LO_ORDER` |
| `GV_` | Global Variable | `GV_CLIENT` (avoid globals where possible) |
| `GS_`, `GT_`, `GR_`, `GO_` | Global Structure/Table/Ref/Object | `GT_ORDER_CACHE` |
| `IV_` | Importing parameter (scalar) | `IV_ORDER_ID` |
| `IS_` | Importing Structure | `IS_ORDER_HEADER` |
| `IT_` | Importing internal Table | `IT_ORDER_ITEMS` |
| `EV_`, `ES_`, `ET_`, `ER_` | Exporting parameters | `EV_RESULT`, `ES_ORDER` |
| `CV_`, `CS_`, `CT_` | Changing parameters | `CV_STATUS` |
| `RV_`, `RS_`, `RT_`, `RR_` | Returning | `RV_TOTAL_AMOUNT` |
| `MV_`, `MS_`, `MT_`, `MR_`, `MO_` | Member (class attribute) | `MV_ORDER_ID`, `MO_LOGGER` |

### Constants / 상수

| Prefix | Description | Example |
|--------|-------------|---------|
| `GC_` | Global Constant | `GC_STATUS_NEW` |
| `LC_` | Local Constant | `LC_DEFAULT_CLIENT` |
| `CO_` | Interface/Class Constant | `CO_MAX_ITEMS` |

### Types / 타입

| Prefix | Description | Example |
|--------|-------------|---------|
| `TY_` | Local Type | `TY_ORDER_HEADER` |
| `TY_T_` | Local Table Type | `TY_T_ORDER_ITEMS` |
| `TY_S_` | Local Structure Type | `TY_S_ORDER_LINE` |

### Methods / 메서드

- Use verbs: `GET_`, `SET_`, `CREATE_`, `DELETE_`, `CALCULATE_`, `CHECK_`, `VALIDATE_`, `PROCESS_`, `CONVERT_`, `BUILD_`
- Private methods: no additional prefix; public methods use same style; static methods same
- Events: `ON_{EVENT}` (handler methods)
- Example: `GET_ORDER_DETAIL`, `CALCULATE_TAX`, `ON_VALUE_CHANGED`

### Forms (ABAP Subroutines - legacy) / 폼 (레거시)

- Pattern: `F01_{NAME}` / `FORM_{NAME}` / verb-based
- Example: `FORM GET_ORDER_DATA`, `FORM F01_READ_CUSTOMER`
- Modern ABAP prefers class methods over FORMs

## Special Prefixes / 특수 접두사 (예약됨)

| Prefix | Owner | Do NOT use |
|--------|-------|-----------|
| A, B, C, D, ... X | SAP standard | Customer modifications need key |
| Z | Customer namespace | ✅ Safe for custom development |
| Y | Customer namespace (alt) | ✅ Safe for temp/prototype |
| /namespace/ | Registered namespace | Requires SAP namespace registration |
| `SAPL` + FG | Function Group main pool | Auto-generated |
| `SAPM` + program | Module pool | Use `SAPMZ...` for custom |

## Validation Rules / 검증 규칙

Before creating any object, verify:

1. **Name starts with `Z` or `Y`** (customer namespace)
2. **Name is uppercase** (no lowercase letters)
3. **Only A-Z, 0-9, _** (no hyphens, spaces, special chars)
4. **Max length respected** (30 chars for most; check specific type)
5. **Not reserved** (not matching SAP reserved names)
6. **Not generic** (avoid `ZTEST`, `ZTEMP`, `ZDUMMY`, `Z1`, `ZAAA`)
7. **Descriptive** (name communicates purpose)
8. **Module code included** when applicable (`Z{MODULE}_...`)
9. **Package assignment correct** (not `$TMP` for transportable objects)

## Recommended Approach / 권장 접근

- Follow the `Z{MODULE}_{TYPE}_{NAME}` pattern for maximum clarity
- For classes, always use `ZCL_`, `ZIF_`, `ZCX_` type prefixes
- For local objects inside programs, use `LCL_`, `LIF_`, `LTCL_`
- Avoid `Y` prefix for production code — reserve for prototypes that will be renamed
- Respect character limits — truncate the `{NAME}` portion if needed, never the prefix
- In S/4HANA, follow RAP naming for OData/Fiori artifacts: `Z_I_`, `Z_C_`, `Z_SD_`, `Z_SB_`, `Z_BP_`
