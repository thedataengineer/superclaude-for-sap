# Addresses / Communication
<!-- tier: minimal -->

Central Address Management tables (ADR*) — home/work addresses, phone, fax, email, URLs. All PII.

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
