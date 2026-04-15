# Customer / Vendor / BP Master PII
<!-- tier: minimal -->

Name, address, tax ID, DUNS, national ID, DOB, relationships — core master-data PII for business partners, customers, and vendors.

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
