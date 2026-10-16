# PROGRESS — MoneyFlow Android mega-task
STATUS: DONE — 2026-10-17 — all DoD items evidenced.
LAST UPDATE: 2026-10-17 (close-out: D24 shipped, D25 parked, re-audit clean, AAB built, device-verified)
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
- **D4 payee statistics + MoM category deltas shipped on
  feat/mobile-theme** (mobile-only, no schema work — see FIXLOG.md
  "FEATURE: D4" for files and proof):
  - "Chi theo người nhận" rows now carry "N giao dịch" beside the total
    (`CategoryShare.count`, expense-only buckets; drill-in unchanged).
  - "Chi theo danh mục" gains a per-category MoM column:
    `expenseCategoryDeltas` buckets current+prior expense rows on the
    same key rule the breakdown uses; `ReportsPage` reads `period.prev`
    as a companion so a failed/capped prior read degrades the column to
    an honest note, never arrows on a partial baseline. ▲/▼ + amount,
    "mới" for no prior data, "Không đổi" for a real zero; prior-only
    categories render as honest 0 ₫ rows instead of disappearing. The
    delta rides the subtitle (ListTile.trailing is height-capped and
    clipped a third line at 2x text scale — B1 audit caught it).
  - Activity filter sheet gains an exact-payee "Người nhận" field on
    the shipped `TransactionQuery.payee` plumbing. Pending chip and the
    detail "similar transactions" block waived — no ledger pending
    field exists and the app has no detail surface (see DECISIONS.md).
  - Verification: `dart format` clean; `flutter analyze` clean;
    `flutter test` 1354 green (16 new D4 tests).
- **D5 review-loop polish shipped on feat/mobile-theme** (mobile-only,
  no schema work — see FIXLOG.md "FEATURE: D5" for files and proof):
  - Activity needs-review rows swipe right → "Đã xem" through the same
    `onBulkReview` RPC seam as select mode (per-row `_reviewBusy`
    guard, snap-back on failure, "Hoàn tác" re-flags); the tile never
    dismisses — the flag flip is the result. One direction only: the
    visible delete icon + long-press already own the row's destructive
    affordance (DECISIONS.md).
  - Inbox rows swipe left into the SAME confirmed reject the "Từ chối"
    button runs — shared `_confirmReject`/`_writeReject`/`_markRejected`,
    `_removedIds` local hide until the next server read. No approve
    gesture and no bulk approve shipped on purpose — approval posts a
    ledger row and stays inside the review sheet (DECISIONS.md).
  - The count-only dashboard card became "Cần chú ý" attention card:
    inbox drafts (count + newest merchant/amount lines), posted rows
    still flagged needs_review (full-backlog count + preview lines via
    new `loadNeedsReviewTransactions`), overdue commitments and
    paid-different drift — every row taps to a real destination
    (inbox, feed pre-filtered via `initialOnlyNeedsReview`, Kế hoạch);
    no destination → count without a chevron; each read fails soft.
  - Verification: `dart format` clean; `flutter analyze` clean;
    `flutter test` 1373 green (19 new D5 tests).
- **D6 rule suggestions + D7 quick-fill chips + D8 commitment calendar
  shipped on feat/mobile-theme** (mobile-only, no schema work — see
  FIXLOG.md "FEATURE: D6/D7/D8" for files and proof):
  - D6: repeated manual payee→category corrections are counted per
    folded pair (account-scoped prefs, cap 200); at 2 identical fixes a
    post-edit dialog offers a rule DRAFT ("Tạo quy tắc tự điền?") that
    saves through the existing saveInboxRule seam — Tạo quy tắc / Để
    sau / Không hỏi lại; never auto-applies, suppressed when a covering
    rule exists or the pair was declined.
  - D7: Goodbudget-style "Mẫu nhanh" — bookmark action saves the current
    form (kind/payee/amount/category/account) into a per-account chip
    row under the capture quick field (cap 12, dedupe, stale ids hide);
    a chip only PREFILLS the form, the user still saves explicitly;
    hidden for transfers/demo; delete via chip affordance.
  - D8: PocketGuard-style month grid on Kế hoạch —
    `commitmentMonthGrid` (Mon-first, null padding, malformed month →
    empty) + `commitmentsDueOnDay` (honors interval cycles and the
    clamped last-day rule); status-colored dots, today ring, tap-a-day
    detail with the same "Trả" seam; paid marks still show.
  - Verification: `dart format` clean; `flutter analyze` clean;
    `flutter test` FULL SUITE green (18+15+13 new tests).
- **D9 month-close digest + D10 watchlist pin + D11 goal funding
  detail shipped on feat/mobile-theme** (mobile-only, no schema work —
  see FIXLOG.md "FEATURE: D9/D10/D11" for files and proof):
  - D9: last-calendar-day one-shot digest (id 70002, opt-in pref,
    VN-anchored window, shared digest time, re-armed on every
    sign-in/refresh, cancelled on toggle-off + account delete) plus
    the in-app "Tóm tắt tháng này" card — thu/chi/còn lại, top
    category, equal-length trailing-window delta, explicit range
    label, "Xem báo cáo tháng →" to the reports tab; absent/failed/
    truncated/empty reads hide the card.
  - D10: "Ghim"/"Đang theo dõi" watch card — pin a category or payee
    from real current-month ledger rows; month totals reuse the
    summary read; optional integer-VND threshold → ok/near/over; pins
    device-local (`mf_watch_items`); no save seam → no dead Ghim; no
    pins + no rows → no card.
  - D11: `goalMissingPrerequisites` names missing target/date/
    contribution evidence instead of a blank projection; "Chi tiết"
    sheet lists signed allocation history (funding authority) +
    goal-linked transactions (annotation only), 20-row caps with
    hasMore disclosure; reserve line "Đã dành X — còn có thể dành Y".
    "Include in monthly plan" toggle waived — no such field/contract
    exists (DECISIONS.md).
  - Verification: `dart format` clean; `flutter analyze` clean;
    `flutter test` FULL SUITE 1462 green (44 new tests).
- **D12 non-monthly budget periods shipped on feat/mobile-theme**
  (schema + mobile; migration committed, NOT applied to production):
  `monthly_budgets.period_kind` ∈ {monthly, weekly} with `month_start`
  as the per-kind anchor (weekly = Monday); unique key widened to
  (user, category, period_kind, anchor); 5-arg `upsert_monthly_budget`
  (old 4-arg dropped, named-arg monthly callers unaffected);
  `budget_progress` sums per-kind windows and emits `period_kind`;
  `get_dashboard_bundle` budgets slice pinned to monthly. Kế hoạch
  gains a Theo tháng/Theo tuần switch — per-tab rows, navigator, carry
  chain and quick-fill (weekly tab carries last week's limits only);
  remainder card stays monthly-only. Pre-migration reads fall back to
  the column-less select as monthly. See FIXLOG.md "FEATURE: D12".
  Verification: dart format clean; flutter analyze clean; flutter test
  1486 green (+21); pgTAP 64/64 suites (17 new assertions); migration
  identity 92 pinned; check:rls 9 pass.
- **D13 exclude-from-reports flag shipped on feat/mobile-theme**
  (schema + mobile; migration committed, NOT applied to production):
  `financial_transactions.excluded_from_reports` NOT NULL default false;
  transaction_feed + deleted_transaction_feed project it;
  `update_money_transaction` gains `p_excluded_from_reports` (null
  preserves — single write seam, no standalone flag RPC because
  `transactions_set_updated_at` rotates the token on every UPDATE);
  reconciled-guard jsonb diff exempts the flag. Mobile: feed reads
  retry without the column on pre-migration servers; report math skips
  flagged rows with excludedCount/expense/income disclosure ("Đã loại
  N khoản · chi X ₫ · thu Y ₫"); activity rows mark "Đã loại khỏi báo
  cáo"; edit form gets a seeded SwitchListTile (non-transfer, edit
  only, bool sent only when flipped). Budgets/balances/dashboard
  unaffected; web reports divergence recorded in DECISIONS.md. See
  FIXLOG.md "FEATURE: D13".
- **D14 category merge shipped on feat/mobile-theme** (schema + mobile;
  migration committed, NOT applied to production): SECURITY DEFINER
  `merge_categories(source, target)` reassigns every reference —
  transaction_entries, monthly_budgets, recurring_commitments,
  recurring_income_templates, inbox_rules, inbox_candidates,
  event_budget_categories — in one transaction, then archives the
  source as a tombstone (never deleted; the (user,name,kind) unique
  key keeps the merged name reserved). Guards: auth required, source ≠
  target, same kind, live target, default source locked; rows lock
  ascending-id to prevent opposite-direction deadlocks. Conflicts are
  target-wins with honest drop counts: a same-(period_kind, anchor)
  budget keeps the target's limit, a duplicate event pair drops the
  source leg. Mobile categories overflow gains "Gộp vào danh mục
  khác" on custom rows — one dialog explains scope + no-undo, lists
  same-kind live targets only, and in-flight-guards the non-idempotent
  RPC. See FIXLOG.md "FEATURE: D14" and DECISIONS.md.
- **Neon-green theme migration shipped on feat/mobile-theme** (theme +
  chrome only — no feature behavior changes): entire mobile theme moved
  from Soft Pop violet to the owner-approved #00FF88 direction with
  dark mode as the primary experience. `MfColors` token names stable —
  only values migrated (dark canvas #0A0E0C / surface #121715 / neon
  #00FF88; light keeps #00FF88 fills with accessible #00803E brandText +
  ColorScheme.primary); transfer recolored violet→cyan so no purple
  family survives; SettingsPrefs defaults dark. Android launcher,
  widget and shortcut chrome recolored sky-blue→neon (10 mipmap PNGs).
  Stored 'violet' category-color key intentionally kept — user data
  contract, not brand chrome. See FIXLOG.md "FEATURE: neon-green theme
  migration". Verification: dart format clean; flutter analyze clean;
  flutter test all green; debug APK built, installed on UKMBCUTWIFYTOVDQ,
  all main screens walked — screenshots in
  docs/design/neon-green-migration/ (10 PNGs, zero purple-suspect
  pixels).
- **D17 saving-rate line verified ALREADY-PRESENT on feat/mobile-theme**
  (verification only — no code change): `PeriodReport.savingsRatePercent`
  computes net/income rounded percent at `mobile/lib/domain/report.dart:394`
  (null when income is zero) and the Báo cáo totals grid renders it as the
  "Tiết kiệm" tile (`reports_page.dart:572-584`, "của thu trong kỳ" basis,
  "—" for zero-income, same period drill-in as Thu/Chi/Còn lại). Covered
  by `report_test.dart` ("savingsRatePercent mirrors web rounding").
  See FIXLOG.md "D17 saving-rate line".
- **D16 account "closed" vocabulary on feat/mobile-theme** — the
  accounts surface now reads Đóng/Mở lại end-to-end: "Đã đóng" section,
  "Mở lại" row action, "Đóng" overflow/long-press with a confirm dialog
  stating the close contract (hidden from lists+pickers, history kept,
  reopenable), register chip and reconciliation hint updated. Stored
  field/RPC unchanged (`is_archived` / set_financial_account_archived);
  debts/categories/commitments/trash keep archive vocabulary. Gates:
  dart format → flutter analyze clean → flutter test all green (+1500).
- **D15 refund net-off ("Hoàn tiền") on feat/mobile-theme** — money
  back now nets against the category it reimburses instead of
  inflating Thu. Schema: `is_refund` bool NOT NULL default false on
  financial_transactions + CHECK refund⇒income; feed/deleted-feed
  re-emit it; create/update RPCs take `p_is_refund` (validated
  income-kind + expense-category, flag inside the idempotency intent,
  null=preserve on update, exempt from reconciled-field diff);
  budget_progress + event_budget_progress net it. Mobile: Thu-only
  "Hoàn tiền" switch swaps the category pool to expense categories
  (toggling clears a stale pick), flag rides CaptureIntent → real/RPC
  + offline queue + drafts (queue also gained the missing D13
  excludedFromReports field), pre-migration fallback keeps old servers
  working; activity/register label the row "Hoàn tiền". Domain:
  period totals + category/payee/account sections + deltas, weekly
  chart buckets, month summary, weekly/month digests and watchlist all
  net refunds — ledger balance/register/timeline stay truthfully
  cash-in. Gates: dart format → flutter analyze clean → flutter test
  +1512 all green; embedded pgTAP suite green (18 new assertions);
  check:migrations + check:rls pass. See FIXLOG.md "D15 refund
  net-off".
- **D18 needs-review home widget shipped on feat/mobile-theme** —
  "Chờ duyệt" row on the Android widget (pending inbox count, verified
  zero renders "0 mục", unknown/stale hides the row) + `quick=review`
  deep link through the exported-activity allowlist into the inbox it
  tallies. Count is drafts only — matches the destination (DECISIONS.md).
  Gates: dart format → flutter analyze clean → flutter test all green;
  Gradle :app:testDebugUnitTest green. See FIXLOG.md "D18".
- **D19 reconcile cadence nudge shipped on feat/mobile-theme** —
  optional per-account monthly "statement day" reminder on the
  register's Đối soát card: device-local `mf_reconcile_reminder_days`
  pref + `recon:`-namespaced alarms (day ≤28 one repeating monthly
  nudge at 09:00; 29–31 clamped end-of-month one-shots, honest copy on
  row + dialog). Armed set re-resolves against the live accounts list
  on every dashboard load and dies with a deleted/closed account;
  picker suggests stored → latest completed statement day → ngày 1.
  Gates: dart format → flutter analyze clean → flutter test all green
  1533 (+14 new). See FIXLOG.md "D19".
- **D20 optional running-balance column shipped on feat/mobile-theme** —
  the derived per-row "Số dư" line (chained back from the stored
  balance, never stored) gains the missing OPTIONAL part: an AppBar
  eye-toggle on the register persisted as device-local
  `mf_register_running_balance` (default ON). Signed-in and demo
  registers both wire it; header "Số dư hiện tại" anchor stays always;
  icon appears only after the pref lands and only with a writer seam.
  Gates: dart format → flutter analyze clean → flutter test all green
  (+4 new). See FIXLOG.md "D20".
- **D21 scoped delete-history-before-date shipped on feat/mobile-theme** —
  definer RPC `delete_transactions_before(date, text[])` hard-deletes own
  rows before a civil cutoff, scoped to provenance buckets
  manual/notification/import, live+trashed alike, OUTSIDE the trash
  contract; schedule/debt-linked rows survive as disclosed `locked`;
  candidates keep their history row and lose only the approval link.
  Same migration fixes a live defect: permanently_delete's candidate
  unlink always threw approved_candidate_evidence_immutable for
  inbox-sourced rows — the guard now admits a marker-gated field-only
  release (still SECURITY INVOKER; owner+flag+shape, same pattern as the
  archive-restore shapes). UI: Settings → Dữ liệu → "Xóa lịch sử trước
  ngày" (seam-gated, signed-in only) → consequence step → vnToday-capped
  date + source checkboxes + typed XÓA + in-flight lockdown → snackbar
  discloses deleted/locked verbatim.
  Gates: pgTAP 68/68 + concurrency OK; check:migrations 96 pinned;
  check:rls 9/9; dart format clean; flutter analyze clean; flutter test
  all green 1548 (+11 new); debug APK built + adb installed. See
  FIXLOG.md "D21".
- **D22 per-account category activation — waived on feat/mobile-theme** —
  categories are per-user with no account column; the gap doc ranks it
  "P3 — only on real asks" and none exists; the honest slice is a new
  (account, category) relation + RPC + RLS + cross-surface scoping for a
  hygiene nicety. DECISIONS.md 2026-10-16; re-open only on a filed ask.
- **D23 photo attachments — waived on feat/mobile-theme** — no blob
  storage, attachment table, download auth or offline binary queue
  exists; the gap doc itself defers it on storage+privacy+sync cost, and
  note/payee search + provenance already cover the lookup need.
  DECISIONS.md 2026-10-16; revisit only with usage evidence.
- **D24 #hashtags in notes — shipped on feat/mobile-theme** (retrieval
  micro-slice, not a taxonomy — see FIXLOG.md "D24"): a leading `#` in
  the shared TransactionQuery search term scopes the match to `note` on
  both evaluators (`note.ilike` server-side, note-only `contains`
  client-side) — "gõ #tag trong ghi chú, tìm #tag ở Hoạt động/Dòng thời
  gian" is now a real convention with a discoverable note-field hint.
  Tag reports/tag index stay refused (second categorization system, §10).
  Web filters lack the `#` scope — recorded divergence. Gates: dart
  format clean; flutter analyze clean; targeted tests green (+4).
- **D25 trial-billing timeline — resolved-parked** — no paid tier,
  billing surface or paywall exists anywhere in the repo (verified);
  the reminder-before-charge intent is already served by commitment
  due-day reminders + digests + D19 reconcile nudges. Re-opens only if
  a paid tier ever ships. DECISIONS.md 2026-10-17.
- **Close-out re-audit — zero new findings** — second adversarial pass
  over `e637143a..HEAD` (63 files, all Loop B surfaces): money stays
  integer, refund nets consistently, posting RPCs are keyed, key-less
  creates sit behind busy guards, every new pref key is `mf_`-scoped,
  deep links are allowlisted, seam-gated UI leaves no dead affordances.
  Full detail in AUDIT.md "Re-audit — Loop B feature surface".
- **Release AAB built** —
  `mobile/build/app/outputs/bundle/release/app-release.aab` (49.5MB,
  R8-shrunk) via `MF_ALLOW_DEBUG_RELEASE=true` with the prod
  dart-defines. CAVEAT: debug-signed (ANDROIDD.RSA) — no upload keystore
  exists locally; a Play-uploadable AAB needs `android/key.properties`.
- **Device sanity on UKMBCUTWIFYTOVDQ** — debug APK installed, dashboard
  renders neon-green dark theme at HEAD (pixel-verified: dark canvas +
  #00FF88 accents; evidence PNGs docs/design/neon-green-migration/11-12
  — ScreenShield blocks adb screencap, so capture used a local
  unshielded debug build reverted before commit). Live check: `#x`
  query accepted in Hoạt động search, honest empty state. Cold start
  ≈10–17s splash→dashboard in a debug build, demo session.

## Definition of Done — evidence check

| DoD item | Status | Evidence |
|---|---|---|
| 6 money checks tested | PASS | integer đồng (`money_test`, `_maxSafeAmount` bounds); transfers never income/expense (`report_test`, `quick_parse_test`); idempotency on every posting write (`capture_submit_test`, `offline_queue_test`, `planning_store_test`); soft-delete + recovery (`trash_test`, D21 pgTAP); tenant isolation/RLS (`check:rls` 9/9, pgTAP tenant tests); VN civil dates (`vnToday` everywhere, `notifications_test`, D12/D19 day-clamp tests) |
| Zero open P0/P1/P2 | PASS | AUDIT.md: 13/13 fixed (FIXLOG.md per-ID); re-audit 2026-10-17 files zero new findings |
| Gap backlog shipped-or-waived | PASS | D1–D21 shipped; D22/D23 waived; D24 shipped micro-slice; D25 resolved-parked — FIXLOG.md + DECISIONS.md |
| AAB builds | PASS (caveat) | `app-release.aab` 49.5MB — debug-signed; Play needs the real upload keystore |
| Research + state files complete | PASS | RESEARCH_TOP_FINANCE_APPS.md, FIXLOG.md, DECISIONS.md, AUDIT.md, plan/findings/progress updated through close-out |
| Neon-green migrated + screenshotted | PASS | `mf_theme_test` pins tokens; 12 PNGs in docs/design/neon-green-migration/ incl. fresh-HEAD dashboard |

Known gaps (recorded, out of mobile scope — not DoD blockers):
web EditTransactionDialog rule-offer; web reports ignore
`excluded_from_reports`; web filters lack `#` note-scoping (D24 is
mobile-first); Monarch P2/P3 items unscoped; all seven Loop-B migrations
committed but NOT applied to production Neon (owner approval gate); PR
merge + CI state is owner/repo-side evidence.

AUDIT OPEN: P0=0 P1=0 P2=0 (all findings shipped + re-audit clean — see FIXLOG.md / AUDIT.md)
GAPS OPEN: none inside mobile scope. Cross-surface: web EditTransactionDialog lacks "save as rule" offer (mobile has it); web reports do not honor excluded_from_reports; web filters lack the D24 `#` note-scope; Monarch P2/P3 items in MONARCH_DEEP_DIVE.md §16 unscoped.
NEXT STEP: none — mega-task closed 2026-10-17. Owner-side items: apply the seven committed migrations to production Neon, provision the upload keystore for Play, merge on green CI.
RESUME: re-read this file; the backlog is empty — new work needs a fresh issue/packet.
STATUS: DONE — 2026-10-17 — all DoD items evidenced.
