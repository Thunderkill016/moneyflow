# DECISIONS.md — autonomous decision log (one line each)

- 2026-10-16 — Kept Fresh Blue design system; the red #D92D20 + water-buffalo direction is UNAPPROVED (open — owner decides). No repaint work done or planned.
- 2026-10-16 — Debt repayments post direction-derived income/expense ledger rows (not a fourth transfer-like kind): a repayment is real money movement; matches Money Lover and the existing 3-kind enum.
- 2026-10-16 — Capture draft persistence via account-scoped prefs slot (capture_draft.dart) instead of RestorationMixin: routes are pushed with `MaterialPageRoute` closures, which `restorablePush` cannot express; 7-day TTL + idempotency key persisted so post-death retries dedupe.
- 2026-10-16 — `showTimedSnackBar` watchdog over framework timer: accessibleNavigation disables framework dismissal entirely; watchdog keeps UX intact for everyone (tested on-device).
- 2026-10-16 — Rule apply-to-existing sweeps per-candidate through the version-checked RPC with honest X/Y reporting, rather than a new bulk RPC: existing contract already re-validates each row; no schema change needed.
- 2026-10-16 — Event budgets derive `spent` live from ledger rows in date∩category scope (no `event_id` tag on transactions): no ledger schema change, partial splits count only in-scope legs.
- 2026-10-16 — Non-idempotent RPCs (create_financial_account, upsert_savings_goal, upsert_recurring_*) defended by in-flight busy guards + cancel-lock; adding server idempotency keys was out of slice scope (schema change for marginal race window).
- 2026-10-16 — Migrations for debts/event_budgets are committed but NOT applied to production Neon: repo rules require explicit owner approval for production schema writes.
- 2026-10-16 — READ_SMS deliberately absent: notification-listener capture + SMS paste cover the need; adding it would trigger Play's restricted-permission declaration for marginal gain.
