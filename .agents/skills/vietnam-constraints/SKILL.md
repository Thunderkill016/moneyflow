---
description: Use when planning or building MoneyFlow features, integrations, or data import.
---

# Vietnam Constraints — MoneyFlow

- Vietnam has no consumer open banking. NEVER attempt bank auto-sync or screen-scraping
  (fragile, violates bank ToS, destroys the "trustworthy" positioning).
- Approved equivalents: SMS paste/parse, statement import (CSV/XLSX), receipt/manual entry,
  balance reconciliation.
- Android manifest must NOT include `READ_SMS` (avoids the Play Permissions Declaration Form) —
  the app uses SMS paste instead.
- No feature may pay, move real money, or touch real bank accounts.
