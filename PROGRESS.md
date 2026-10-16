# PROGRESS — MoneyFlow Android mega-task
STATUS: IN_PROGRESS
LAST UPDATE: 2026-10-16 (D3 honest month remainder + budget threshold alerts)
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
- **All 7 AUDIT.md P2 findings fixed and shipped on feat/mobile-theme** (see FIXLOG.md for per-ID evidence):
  - P2-1: account-scoped capture-draft slot (`mf_capture_draft.<userId>`) — amount/note/payee/kind/category/account/date/split + idempotency key survive process death; draft restore + banner + TTL; edit mode/demo deliberately out of scope.
  - P2-2: activity feed converted to `ListView.builder` — lazy keyed rows, day headers ride in the first row's cell; scroll-perf test added.
  - P2-3: stale "sandbox" comments/docs corrected — debug/profile defaults honestly documented as moneyflow-prod (the only provisioned project); no-sandbox warning added.
  - P2-4: failed delete-account rollback now discards the stranger session/JWT and forces a local sign-out via `onSessionDropped` — no wrong-tenant residue.
  - P2-5: R8 minify + resource shrinking enabled for release (`proguard-rules.pro`: Flutter embedding, dexterous Gson keeps, play-core dontwarn); `assembleRelease` verified green (64.2MB APK, debug-release escape hatch — no upload keystore locally).
  - P2-6: voice parser clamps at `_maxSafeAmount` before rounding — absurd spoken amounts return null instead of int64 saturation.
  - P2-7: cold-start session probe bounded at 8s (`_sessionProbeBudget`) → trusted offline render; 2.5s slow-network hint on the boot spinner.
  - Verification: `dart format` clean; `flutter analyze` clean; `flutter test` 1258 tests all green; `flutter build apk --release` green.
- **D1 debt/loan tracking shipped on feat/mobile-theme** (Class-3 slice —
  see FIXLOG.md "FEATURE: D1 debt tracking" for files and proof):
  - `debts` + `debt_repayments` tables, RLS select-only, OAuth mutation
    guard, FK left-prefix indexes; four reviewed SECURITY DEFINER RPCs
    (inventory 61→66, including a recorded catch-up for
    `permanently_delete_money_transaction`).
  - `apply_debt_repayment` is atomic: FOR UPDATE debt row, direction-
    derived ledger kind (payable→expense, receivable→income — never
    transfer), category-kind check, advisory-lock + stored-intent
    idempotent replay, remaining decrement, settles at zero. Creating a
    debt posts NO ledger row.
  - Mobile `DebtsPage` on the authenticated menu only (no demo seam —
    honest absence, not fake data); direction+counterparty grouping never
    nets "I owe" against "they owe me".
  - Verification: `dart format` clean; `flutter analyze` clean;
    `flutter test` 1286 green; embedded-pgTAP 62 files / 0 failures;
    `check:migrations` 90 pinned; `check:rls` 9/9; `check:knowledge`;
    `test:ci-policy` 203/203. Migration NOT applied to production Neon —
    deployment pending owner approval.
- **D2 event/occasion budgets shipped on feat/mobile-theme** (Class-3
  slice — see FIXLOG.md "FEATURE: D2 event/occasion budgets" for files
  and proof; packet docs/plans/active/event-budgets.md):
  - `event_budgets` + `event_budget_categories` (optional category scope;
    zero rows = "Tất cả danh mục"), RLS select-only, OAuth mutation
    guard, FK left-prefix indexes; three reviewed SECURITY DEFINER RPCs
    (inventory 66→69).
  - `event_budget_progress` computes `spent_minor` live over real
    `transaction_entries` expense legs in the inclusive window —
    per-entry math (a partial split contributes only in-scope legs),
    transfers/income structurally excluded. No ledger row is ever
    written by event CRUD — never a second ledger.
  - Mobile `EventsPage` on the authenticated menu only (no demo seam —
    honest absence, same as debts): active/upcoming/closed sections,
    day-pace "hôm nay" tick bar, read-only detail listing the exact feed
    rows the figure counted (same predicate as the view — the drill
    cannot disagree with the card). Archived scope categories are
    preserved through an edit, never silently dropped.
  - Verification: `dart format` clean; `flutter analyze` clean;
    `flutter test` 1321 green (35 new D2 tests); embedded-pgTAP 63
    files / 0 failures (24 new assertions); `check:migrations` 91
    pinned; `check:rls` 9/9; `check:knowledge`; `test:ci-policy`
    203/203. Migration NOT applied to production Neon — deployment
    pending owner approval.
- **D3 honest "còn lại tháng này" + budget threshold alerts shipped on
  feat/mobile-theme** (mobile-only, no schema work — see FIXLOG.md
  "FEATURE: D3" for files and proof):
  - The "Chi được hôm nay" tile is now the "Còn lại tháng này" card:
    month remainder hero (headroom − unpaid due commitments), "~₫/ngày"
    equivalence, basis line "Theo ngân sách tháng và chi đã ghi" plus
    named commitment reserve; over-plan state renders an explicit
    "− X ₫ thiếu" — never colour alone, never a silent 0.
  - `budgetAlerts` (domain/budget.dart) surfaces 80%/100% category
    lines on the card using the same carry-aware effective math the
    Kế hoạch tiles render; dashboard prefers a new `loadBudgetRange`
    window seam so badge and tile can never disagree.
  - No-budget nudge has a real "Mở Kế hoạch" action via the new public
    `HomeShellState.selectTab`; demo wires seeded prior-month rows.
  - Verification: `dart format` clean; `flutter analyze` clean;
    `flutter test` 1338 green (17 new D3 tests).
AUDIT OPEN: P0=0 P1=0 P2=0 (all findings shipped — see FIXLOG.md)
GAPS OPEN: web EditTransactionDialog lacks "save as rule" offer (mobile has it); Monarch P2/P3 items in MONARCH_DEEP_DIVE.md §16 unscoped.
NEXT STEP: Loop B gap list — D4 (payee statistics + MoM category deltas: top-10 payees chart, per-category MoM delta column, similar-transactions block, payee/reviewed/pending filter chips, RESEARCH_TOP_FINANCE_APPS.md §10); D1+D2+D3 done.
RESUME: re-read this file, then continue at NEXT STEP.
