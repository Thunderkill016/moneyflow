# findings.md — decisions + evidence (signal, not tool output)

## Verified facts

- SnackBar never auto-dismissed on this device: `accessibility_enabled=1` → `accessibleNavigation=true` → Flutter never schedules the dismiss timer. Fixed via `showTimedSnackBar` watchdog (features/shared/timed_snack_bar.dart), verified on-device.
- Neon Data API schema cache: new RPCs return PGRST202 until `PATCH /data-api` refresh — `NOTIFY pgrst` does nothing on the managed proxy.
- `auth.uid()` reads `pg_session_jwt` (per-session GUC) — per-transaction `set_config` does not simulate PostgREST auth in MCP SQL tests.
- Mobile already ships (verified by grep/tests, counters stale research notes): account reconciliation, split transactions, commitment due-day notifications + weekly digest, quick-add widget, rollover budgets, recurring detection, payee field, rules engine with preview+apply-to-existing.

## Decisions (also in DECISIONS.md)

- D1 repayments post real income/expense rows (direction-derived), not a transfer-like fourth kind — a repayment is money moving.
- Capture draft persistence chosen over RestorationMixin (plain routes can't restorablePush with closures).
- Rules sweep counts use server-mirroring client matchers so preview never promises what the RPC refuses.

## Evidence anchors

- flutter test: 1321 pass at D2 head; pgTAP 63 files pass; analyze clean.
- RESEARCH_TOP_FINANCE_APPS.md: 13 COPY + 39 ADAPT consolidated; AUDIT.md: 13 findings all FIXED.
