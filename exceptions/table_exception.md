# Prohibited Tables — Data Extraction Blocklist

Tables listed here **MUST NOT** be read via `GetTableContents`, `GetSqlQuery`, or any other MCP data-extraction path.

These tables contain personally identifiable information (PII), credentials, payroll, banking, or other legally/ethically protected data. Schema and field metadata (`GetTable` for DDIC structure) may still be retrieved — **only row-level data extraction is forbidden**.

## Scope Profiles

Each category below carries a tier tag (`<!-- tier: minimal | standard | strict -->`) and optionally an action tag (`<!-- action: deny | warn -->`, default `deny`). The active profile is set in `.sc4sap/config.json` under `blocklistProfile`:

- `minimal` — PII + credentials only (Banking, Master PII, Addresses, Auth, HR, Tax)
- `standard` — minimal **+** Protected Business Data (transactional tables)
- `strict` — standard **+** Audit/Security Logs, Workflow/Comm (recommended default)
- `custom` — ignore built-in entries; use only `.sc4sap/blocklist-custom.txt`

Any profile additionally respects `.sc4sap/blocklist-extend.txt` (one table name or pattern per line) if present.

## Enforcement

- All sc4sap agents and skills MUST check this list before calling `GetTableContents` / `GetSqlQuery`.
- If a user request requires data from a blocked table: **refuse the extraction, explain which category applies (e.g., "PII — bank master"), and suggest alternatives** (aggregated CDS views, anonymized test data, or a consultant analysis without raw rows).
- For SELECT on joined views / CDS views that pull from a blocked table, the same rule applies.

---

## Banking / Payment (Customer & Vendor Financial Credentials)
<!-- tier: minimal -->

| Table | Description | Why |
|-------|-------------|-----|
| BNKA | Bank master data | Customer/vendor bank account credentials |
| KNBK | Customer bank details | Customer bank account numbers |
| LFBK | Vendor bank details | Vendor bank account numbers |
| BUT0BK | Business Partner bank details (S/4) | BP bank account numbers |
| T012K | House banks / bank account details | Company banking credentials |
| REGUH | Settlement data from payment program | Outgoing payment details |
| REGUP | Processed items from payment program | Payment line items |
| PAYR | Payment medium file | Cheque/payment numbers |
| FPLT | Billing plan — dates | Linked payment data |
| FPLTC | Billing plan — payment cards | Credit card tokens |
| CCARD | Payment cards (obsolete) | Credit card numbers |
| TCRCO | Credit card organizations | Card processor credentials |
| BSEGC | FI doc payment card segment | Card transaction data |
| FPAYH / FPAYHX / FPAYP / FPAYPX | Payment medium data | Payment file contents |

## Customer / Vendor Master PII
<!-- tier: minimal -->

| Table | Description | Why |
|-------|-------------|-----|
| KNA1 | Customer master — general | Name, address, tax ID, DUNS |
| KNB1 | Customer master — company code | Tax/credit data |
| KNVK | Customer contact person | Personal contact PII |
| KNVV | Customer sales data | Linked PII |
| KNVL | Customer tax license | Tax IDs |
| LFA1 | Vendor master — general | Name, address, tax ID |
| LFB1 | Vendor master — company code | Tax data |
| LFM1 / LFM2 | Vendor purchasing data | Linked PII |
| BUT000 | Business Partner — general (S/4) | BP core PII (name, DOB, gender) |
| BUT020 | BP addresses | Linked address keys |
| BUT021 / BUT021_FS | BP address usages | Address type per BP |
| BUT050 / BUT051 | BP relationships | Personal/business relations |
| BUT100 | BP roles | Role assignments |
| BUT0ID | BP identification numbers | Passport, national ID, SSN |
| BUT0BANK | BP bank data (S/4) | BP banking credentials |

## Addresses / Communication
<!-- tier: minimal -->

| Table | Description | Why |
|-------|-------------|-----|
| ADRC | Address master | Street, city, postal — PII |
| ADRP | Person master | Personal name, title, DOB |
| ADR2 | Telephone numbers | Phone PII |
| ADR3 | Fax numbers | Contact PII |
| ADR6 | Email addresses | Email PII |
| ADR7 | Teletex numbers | Contact PII |
| ADR9 | Communication types (misc) | Contact PII |
| ADR11 | Print data | Contact info |
| ADR12 | URLs (WWW) | Personal websites |
| ADR13 | Pager numbers | Contact PII |
| ADRT | Communication data — text | Free-text comm notes |
| ADRCT | Address text (notes) | Free-text PII |

## Authentication / Authorization / Security
<!-- tier: minimal -->

| Table | Description | Why |
|-------|-------------|-----|
| USR02 | User master — logon | **Password hashes** — NEVER extract |
| USH02 | Password change history | Historical password hashes |
| USRBF2 | User buffer — auth values | Auth value cache |
| USR01 | User master — runtime | Logon metadata |
| USR04 | User master auth profile buffer | Auth profiles |
| USR10 | User auth profiles | Profile assignments |
| USR12 | Auth values | Auth field values |
| USR21 | User → BP/address link | Identity linkage |
| USR22 | Logon data (extra) | Login details |
| USR40 | Prohibited passwords | Security policy |
| USR41 | Multi-logon | Session data |
| USR_CUST | User-specific customizing | Personal settings |
| AGR_1251 | Authorization data for roles | Auth field-value combos |
| AGR_USERS | User-role assignment | Role PII linkage |
| AGR_AGRS | Composite role contents | Role config |
| PRGN_CUST | PFCG customizing | Auth system config |
| RFCDES | RFC destinations | **Embedded RFC passwords/secrets** |
| RSECACTB / RSECTAB | Secure Store keys | Crypto key material |
| SNCSYSACL | SNC access list | Security policy |
| SSF_PSE_D | PSE / X.509 data | Crypto material |

## HR / Payroll / Personnel (Infotypes & Clusters)
<!-- tier: minimal -->

| Table / Pattern | Description | Why |
|-----------------|-------------|-----|
| PA0000 | Actions | Employment events |
| PA0001 | Organizational assignment | Position/org PII |
| PA0002 | Personal data | Name, DOB, gender, nationality |
| PA0006 | Addresses (employee) | Home address PII |
| PA0007 | Planned working time | Schedule PII |
| PA0008 | Basic pay | **Salary** — never extract |
| PA0009 | Bank details (employee) | Employee banking |
| PA0014 | Recurring payments/deductions | Payroll detail |
| PA0015 | Additional payments | Payroll detail |
| PA0017 | Travel privileges | Personal travel data |
| PA0019 | Monitoring of dates | Personal milestones |
| PA0021 | Family / related persons | Dependent PII |
| PA0023 | Previous employers | CV data |
| PA0024 | Qualifications | Personal skills |
| PA0027 | Cost distribution | Payroll detail |
| PA0028 | Internal medical service | **Medical data — highly sensitive** |
| PA0033 | Statistics | Employee statistics |
| PA0040 | Objects on loan | Asset assignments |
| PA0041 | Date specifications | Personal dates |
| PA0105 | Communication (user IDs, email, phone) | Contact PII |
| PA0185 | Personal IDs | Passport / national ID |
| PA0267 | One-time payments | Off-cycle payroll |
| PA0377 | Miscellaneous plans | Benefits |
| PA2001 | Absences | Sickness/leave PII |
| PA2002 | Attendances | Time tracking |
| PA2010 | EE remuneration info | Pay detail |
| PA2050 | Annual calendar | Personal schedule |
| PA* (all PA0xxx / PA2xxx / PA4xxx infotypes) | HR Infotypes | All employee PII |
| HRP1000 | Org object | Org structure |
| HRP1001 | Relationships | Org / person links |
| HRP* (all HRPxxxx infotypes) | OM/PD Infotypes | Personnel / Org data |
| PCL1 | HR cluster — time | Time evaluation clusters |
| PCL2 | HR cluster — **payroll results** | **Payroll results — NEVER extract** |
| PCL3 | HR cluster — applicant data | Recruitment PII |
| PCL4 | HR cluster — change documents | HR audit trail |
| PCL5 | HR cluster — travel expense | Travel payroll |
| PA9* / PB9* / PD9* | Customer-specific HR infotypes | Customer PII extensions |
| T526 | Administrator assignment | HR admin linkage |
| T52* (payroll config with values) | Payroll customizing with amounts | Wage-type values |

## Tax / Government IDs
<!-- tier: minimal -->

| Table | Description | Why |
|-------|-------------|-----|
| DFKKBPTAXNUM | BP tax numbers (FI-CA) | Tax IDs |
| TFKTAXNUMTYPE | Tax number types | Not sensitive, but linked |
| J_1BTXIC3 / J_1BNFDOC | Brazil tax/NF data | Regional tax PII |
| KNAS | Customer VAT registration | VAT / tax IDs |
| LFAS | Vendor VAT registration | VAT / tax IDs |
| BUT0TX | BP tax numbers | BP tax IDs |

## Protected Business Data
<!-- tier: standard -->
<!-- action: warn -->

| Table | Description | Why |
|-------|-------------|-----|
| VBRK | Billing header | Customer invoice PII linkage |
| VBRP | Billing item | Revenue per customer |
| VBAK / VBAP | Sales order header/item | Customer order PII |
| VBPA | Sales document partner | Partner PII in document |
| EKKO / EKPO | Purchase order | Vendor/price PII |
| BKPF / BSEG | Accounting document | Full FI posting with parties |
| ACDOCA | Universal Journal (S/4) | Full FI/CO with party data |
| FAGLFLEXA / FAGLFLEXT | New GL line items / totals | Financial detail |
| CDHDR / CDPOS | Change documents | Any field changes incl. PII |
| STXH / STXL | SAPscript text header / lines | Free-text PII possible |

> ⚠️ These "Protected Business Data" tables are **not unconditionally blocked** — extraction may be allowed for the user's own company code / sales org scope, with anonymization of party IDs. Require explicit user authorization per request; default posture is **blocked** until authorized.

## Audit / Security Logs
<!-- tier: strict -->

| Table | Description | Why |
|-------|-------------|-----|
| BALDAT / BALHDR | Application log data | May contain PII in message vars |
| SLG1 / SLGD | Application log (transaction) | Same as above |
| RSAU_BUF_DATA | Security audit log buffer | Security events |
| SNAP | ABAP short dumps | User actions, variable dumps |
| SMONI | System monitoring | Performance + user data |
| SWNCMONI / SWNCT* | Workload monitor | User activity |
| STAD / STATTRACE | Statistical records | User activity trace |
| DBTABLOG | Table change logs | Field-level change audit |

## Communication & Workflow
<!-- tier: strict -->

| Table | Description | Why |
|-------|-------------|-----|
| SOOD / SOC3 / SOST / SOFM | SAPoffice / mail storage | Mail body PII |
| SWWWIHEAD / SWWCONT / SWWLOGHIST | Workflow work item data | Agent assignments + context |
| BCST_SR / BCST_CAM | Broadcast / message records | Communication content |

## Customer-Specific PII Patterns
<!-- tier: minimal -->
<!-- action: warn -->

| Pattern | Description | Why |
|---------|-------------|-----|
| `Z*` / `Y*` with PII content | Customer/partner Z-tables storing PII | Must be added to this list case-by-case |
| `ZHR_*`, `ZPA_*` | Typical customer HR extensions | Employee PII |
| `ZCUST_*`, `ZKNA_*` | Customer-master extensions | Customer PII |
| `ZLFA_*`, `ZVEND_*` | Vendor-master extensions | Vendor PII |

> When a new Z-table is introduced, the developer/consultant MUST evaluate whether it belongs in this blocklist and append it before any extraction.

---

## Allowed Alternatives

When a legitimate use case needs data that touches blocked tables, prefer:

1. **Aggregated CDS views** designed for analytics (e.g., `I_*` released views that mask PII)
2. **Anonymized test data** from quality/sandbox systems
3. **Synthetic data** generated by the consultant agent from schema metadata
4. **Counts / aggregates only** — `SELECT COUNT(*)`, `SUM(...)` via `GetSqlQuery` with no personal fields in the SELECT list
5. **User authorization workflow** — explicit one-off approval documented in `.sc4sap/program/{PROG}/data-access-approval.md`

Never silently bypass the block. Always surface the reason to the user.
