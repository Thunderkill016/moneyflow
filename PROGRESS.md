# PROGRESS — MoneyFlow Android mega-task
STATUS: IN_PROGRESS
LAST UPDATE: 2026-10-16 (P1 fix round)
DONE THIS ROUND:
- Step Zero DONE: branch mobile/android-app pushed, PR #795 open (head ec8591b9).
- Prior session shipped: permanent-delete trash (mobile+web+RPC+schema-cache fix), SnackBar a11y watchdog fix (1187+ tests green), Monarch deep-dive docs/research/MONARCH_DEEP_DIVE.md, rules preview + apply-to-existing (mobile+web), edit→rule offer (mobile). All committed.
- Repo has extensive prior research: docs/research/PRODUCT_COMPETITIVE_MEMORY.md, PHASE_B_FRESH_PRODUCT_EXPERIENCE_RESEARCH.md, MONARCH_DEEP_DIVE.md — reuse, do not redo.
- **All 6 AUDIT.md P1 findings fixed and shipped on feat/mobile-theme** (see FIXLOG.md for per-ID evidence):
  - P1-1: auth verifier/URL logging removed + error paths redact URI query (HttpException embeds `uri =` verbatim).
  - P1-2: `int.tryParse` + `_safeInt` bound in the inbox paste parser and CSV amount cell — 20+-digit runs drop honestly.
  - P1-3: `whole > _maxSafeAmount ~/ scale` bound BEFORE the shorthand multiply in the shared-text parser.
  - P1-4: `OperationIdempotencyKeys` — stable per-scope keys for pay-commitment/receive-income, release on success; balance adjustment reuses one key per dialog.
  - P1-5: `submitting`/`busy` guards on every non-idempotent dialog (planning budget/goal/adjust, account form, recurring form, balance adjustment, inbox rule save) — submit AND cancel disabled mid-flight.
  - P1-6: shared VN clock `vnNow`/`vnToday`/`vnMonthStart` in domain/report.dart; all ledger dates routed through it; notification scheduling stays device-local by design.
  - Verification: `flutter analyze` clean; `flutter test` green (one new test asserted on a label that also lives on the page — fixed to assert on AlertDialog; re-run of all touched test files passes).
AUDIT OPEN: P0=0 P1=0 P2=7 (all P1 shipped; P2-1..P2-7 remain — see AUDIT.md)
GAPS OPEN: web EditTransactionDialog lacks "save as rule" offer (mobile has it); Monarch P2/P3 items in MONARCH_DEEP_DIVE.md §16 unscoped.
NEXT STEP: P2 findings per AUDIT.md — P2-4 (cross-account session restore failure leaves stranger JWT cached) is the sharpest; then P2-1 restoration, P2-3 comment/dev-endpoint honesty, P2-2 feed ListView.builder, P2-6 voice parser clamp, P2-5 R8, P2-7 cold-start bound.
RESUME: re-read this file, then continue at NEXT STEP.
