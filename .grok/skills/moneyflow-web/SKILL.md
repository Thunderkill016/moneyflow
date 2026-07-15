---
name: moneyflow-web
description: >
  Implement MoneyFlow personal finance web features with industry PFM patterns.
  Use when building thu chi UI, ledger, budgets, insights, daily loop, empty states,
  transfer copy, export, or when user says moneyflow-web, PFM, tài chính cá nhân feature.
  Enforces G5 + BEST_OF_MATRIX + integer VND + transfer ≠ expense.
metadata:
  short-description: "MoneyFlow PFM feature patterns"
---

# MoneyFlow Web (PFM patterns)

## Product law (always)

- Brand: **thu chi cá nhân**, not “hộp thư tài chính”
- JTBD: ghi nhanh → số dư / tháng này tiền đi đâu
- Safe-to-spend = insight secondary
- Lab (inbox/import/rules) = More → **Nâng cao** only
- Forbidden: bank sync, AI advisor, family, OCR, AGPL paste

## Domain rules

- Money = **integer** VND đồng; format only at display
- Transfer = balanced legs; **never** in expense totals
- Soft delete + undo where destructive
- Financial math in `src/lib/*`, not only components

## Daily loop checklist (before shipping a “home” change)

1. Open app → attention or clear KPI
2. Ghi chi ≤ ~10s (FAB / dialog / Nhập nhanh)
3. Safe-to-spend or remaining readable
4. Transfer shows “Chuyển khoản · không tính chi”
5. Export discoverable
6. Empty states: **one** primary CTA

## Implementation order

1. Read existing page + lib + tests
2. Plan 3–6 bullets (no drive-by refactors)
3. Code minimal
4. Unit test pure functions; e2e if expense path
5. `npm run lint && npm run typecheck && npm run test`

## UI conventions

- Calm Vietnamese; no guilt language
- Money signs: `+` / `−` / `↔` not color-only
- Prefer existing `EmptyState`, `AppShell`, dialogs dynamic-imported
- shadcn tokens when adding primitives; no new hex spaghetti

## Best-of rule

One excellent pattern per competitor max — see `docs/BEST_OF_MATRIX.md`.  
Never dump all competitor features into primary nav.
