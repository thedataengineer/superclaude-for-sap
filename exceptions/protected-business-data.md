# Protected Business Data
<!-- tier: standard -->
<!-- action: warn -->

Transactional tables that aggregate customer/vendor PII with commercial data (orders, invoices, accounting). Blocked at `standard` and above.

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
