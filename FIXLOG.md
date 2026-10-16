# FIXLOG — MoneyFlow Android (`mobile/`)

Fixes landed for `AUDIT.md` findings, in audit-id order.
Format: `ID | files changed | why | proof (test names)`.

- **P1-1** | `mobile/lib/data/neon/auth_client.dart`,
  `mobile/lib/data/google_sign_in.dart` | The verifier-exchange URL and
  the loopback callback URI were `debugPrint`ed verbatim — both carry
  `neon_auth_session_verifier`, and `debugPrint` compiles into release
  builds, so a live credential reached logcat. The exchange URL log was
  deleted (status-only line kept); the callback log now prints the path
  only; error paths route through `_redactedError` because dart:io
  `HttpException`s embed `uri = …` — query and all — in `toString()`. |
  `neon_client_test.dart: finishGoogleRedirect never logs the verifier —
  release logcat must not carry auth material`;
  `google_sign_in_test.dart: the verifier never reaches debugPrint — the
  callback URI carries auth material that must not reach release logcat`;
  `google_sign_in_test.dart: a failing exchange logs no verifier —
  HttpException carries the request URI verbatim and its query IS the
  secret`.
- **P1-2** | `mobile/lib/data/share/inbox_paste_parser.dart`,
  `mobile/lib/domain/csv_import.dart` | Both `_parseVndAmountToken`
  copies ran `int.parse` on regex-unbounded `\d+` runs — a 20+-digit
  bank reference threw `FormatException`, crashing the paste analyze
  path, silently killing notification events, and aborting whole CSV
  imports. Both sites now use `int.tryParse` feeding the `_safeInt`
  bound, so the oversized token falls to null like every other
  non-amount; `bank_notification_parser` and `inbox_page` propagate the
  honest drop unchanged. |
  `inbox_test.dart: a 20+-digit run never crashes — it is a reference,
  not money`;
  `csv_import_test.dart: amount cell: a 20+-digit run is rejected, not a
  crash`;
  `notification_capture_test.dart: a 20+-digit run drops the event
  instead of crashing`.
- **P1-3** | `mobile/lib/data/share/share_text_parser.dart` | `_matchValue`
  multiplied `whole * scale` before any bound — int64 wrap could turn
  `18446744073710tr` into a plausible 448.384đ prefill. Now bounds
  `whole > _maxSafeAmount ~/ scale` BEFORE multiplying, the same rule
  `parseMoneyInput` applies. |
  `share_text_parser_test.dart: shorthand overflow is rejected BEFORE
  the multiply wraps`.
- **P1-4** | `mobile/lib/data/neon/real_store.dart`,
  `mobile/lib/app/app.dart` | `payCommitment`, `receiveIncome` and the
  balance-adjustment `createTransaction` minted a fresh idempotency key
  per attempt — a retry after a lost response sent a NEW key, defeating
  the server dedupe and risking a duplicate expense/income. Added
  `OperationIdempotencyKeys` (one UUID per logical scope, held across
  retries, released on success so a deliberate new action is a new
  intent); commitment/income scopes are `<op>:<id>:<month-start>` with
  the month captured once; balance adjustment mints one key per dialog
  and replays it on submit retries. |
  `planning_store_test.dart: OperationIdempotencyKeys — keyFor replays
  the same key across attempts on one scope; separate scopes never share
  a key; release lets a deliberate new action mint a fresh key`;
  `planning_store_test.dart: payCommitment carries the caller-supplied
  idempotency key; receiveIncome carries the caller-supplied idempotency
  key`;
  `balance_adjustment_test.dart: a failed submit stays retryable — busy
  clears on error`.
- **P1-5** | `mobile/lib/features/planning/planning_page.dart`,
  `mobile/lib/features/accounts/accounts_page.dart`,
  `mobile/lib/features/planning/recurring_form_dialog.dart`,
  `mobile/lib/features/accounts/balance_adjustment_dialog.dart`,
  `mobile/lib/features/inbox/inbox_page.dart` | Dialog confirm buttons
  stayed enabled mid-RPC on non-idempotent writes (`adjust_savings_goal`
  is a pure delta, `create_financial_account` and the upserts have no
  dedupe key): a second tap could post twice. Every dialog now holds a
  `submitting`/`busy` flag that disables submit AND cancel while the
  request is in flight (cancel mid-flight would pop the dialog while the
  write still lands), clears on failure for an honest retry. The rule-
  from-approve snackbar action uses the `_ruleSaving` flag for the same
  reason — `upsert_inbox_rule` has no key either. |
  `accounts_page_test.dart: a second tap while create is in flight
  cannot create two accounts; a failed create stays retryable in the
  same dialog`;
  `planning_reports_test.dart: a second tap while a budget save is in
  flight cannot double-write; a failed budget save stays retryable in
  the same dialog; a second tap while a goal adjust is in flight cannot
  double-post`;
  `balance_adjustment_test.dart: a second tap while the RPC is in flight
  cannot double-submit`.
- **P1-6** | `mobile/lib/domain/report.dart`,
  `mobile/lib/domain/datetime_label.dart`,
  `mobile/lib/domain/weekly_digest.dart`, `mobile/lib/app/app.dart`,
  `mobile/lib/features/capture/capture_page.dart`,
  `mobile/lib/features/planning/planning_page.dart`,
  `mobile/lib/features/reports/reports_page.dart`,
  `mobile/lib/features/dashboard/dashboard_page.dart`,
  `mobile/lib/features/activity/activity_page.dart`,
  `mobile/lib/features/timeline/timeline_page.dart`,
  `mobile/lib/features/voice/voice_capture_page.dart`,
  `mobile/lib/features/accounts/account_reconciliation_page.dart`,
  `mobile/lib/features/inbox/inbox_page.dart`,
  `mobile/lib/data/share/inbox_paste_parser.dart`,
  `mobile/lib/data/notification_capture/bank_notification_parser.dart`,
  `mobile/lib/domain/csv_import.dart` | Ledger dates split between
  device-local `DateTime.now()` and hardcoded UTC+7 shifts — on a
  non-Saigon device `occurredOn`, `p_month_start` and `p_paid_on`
  permanently recorded the wrong civil date. One shared clock now lives
  in `domain/report.dart` (`vnUtcOffset`/`vnNow`/`vnToday`/
  `vnMonthStart`); every ledger-facing surface and the duplicated +7
  helpers route through it, while notification scheduling and cache
  timestamps stay device-local instants by design. |
  `report_test.dart: VN civil clock (audit P1-6) — vnToday anchors on
  Asia/Saigon not the device zone; vnMonthStart rolls over on the VN
  month boundary; vnNow reads the instant in the VN civil calendar`;
  `weekly_digest_test.dart: the window anchors on the VN week, not the
  device zone`.

- **P2-1** | `mobile/lib/data/capture_draft.dart` (new),
  `mobile/lib/features/capture/capture_page.dart`,
  `mobile/lib/app/app.dart` | Process death while the capture form was
  open lost every typed field: the form is pushed via plain
  `MaterialPageRoute`, and Flutter's `RestorationMixin` only works for
  `restorablePush` routes — which cannot close over `_store`/`onSubmit`
  seams (restorable builders must be static entry points). So the fix
  is the audit's own alternative: an account-scoped SharedPreferences
  draft slot (`mf_capture_draft.<userId>`) persisting amount/note/payee/
  kind/category/account/destination/date/repeat/split lines plus the
  idempotency key — a retried submit after death dedupes instead of
  double-posting. Writes are debounced (400ms) on every mutation plus an
  immediate flush on `AppLifecycleState.paused` and `dispose`; a
  restored draft shows an honest "Đã khôi phục bản nháp chưa lưu" banner
  with Xóa; a share-prefill wins over the parked draft; drafts expire
  after 7 days; ids re-validate against the live account/category lists;
  submit consumes the slot (a `_draftConsumed` flag stops the dispose
  flush resurrecting an already-saved form). Edit mode and demo stay
  out of scope — an edit draft would resurrect a stale
  `expectedUpdatedAt` concurrency token, and demo writes nothing. |
  `capture_draft_test.dart: CaptureDraft round-trips every field
  through JSON; refuses garbage; isEmpty; store scoping/TTL/corrupt
  blob; a stored draft restores fields and shows the banner; Xóa
  clears the stored slot and resets the form; editing dismisses the
  banner; edits persist to the slot; a share prefill wins; no scope
  (demo) restores nothing; a successful submit consumes the draft`.
- **P2-2** | `mobile/lib/features/activity/activity_page.dart` | The
  feed built `ListView(children:)` — every loaded row mounted eagerly
  on each "Xem thêm" press. Now `ListView.builder` with a fixed header
  band (recent-searches/chips/review-filter/empty states) plus one
  lazily-built item per transaction; the day header rides inside its
  first row's keyed (`ValueKey('tx-<id>')`) cell so reloads reuse
  elements; footer/load-more/fade-in/selection unchanged. |
  `activity_page_test.dart: lazy feed — offscreen rows are not built
  until scrolled to; day headers survive the lazy conversion`.
- **P2-3** | `mobile/lib/data/neon/neon_config.dart`,
  `mobile/README.md`, `mobile/test/neon_config_test.dart` | Comments
  claimed debug/profile defaults pointed at
  `moneyflow-acceptance-sandbox`; the constants actually point at
  `moneyflow-prod`, the only provisioned Neon project — a plain
  `flutter run` writes into production and the docs lied about it.
  Comments, the compiled-in-defaults error text and README now say so
  plainly, warn that unqualified dev runs read/write prod, and explain
  no sandbox exists until one is created and passed via dart-defines.
  Stale test names updated to "dev defaults/endpoints". | Documentation
  fix — `neon_config_test.dart` renamed descriptions; same assertions.
- **P2-4** | `mobile/lib/app/delete_account.dart`,
  `mobile/lib/app/app.dart` | A stranger-account Google re-auth whose
  rollback `restoreSession(prior.sessionToken)` threw left `_auth`
  holding the stranger's session + cached JWT — Data API calls would
  have run under the wrong tenant until expiry. The dialog now treats a
  throw or null restore as rollback failure: `discardSession()` drops
  every credential in memory, then a new `onSessionDropped` seam lets
  `AuthGate` run the full local sign-out (`SessionStore.clear`, residue
  sweep, queue/cache rebinding, lock reset) and pop the dead shell back
  to the login gate with an honest snackbar. No delete RPC ever fires
  on this path. |
  `delete_account_test.dart: a stranger re-auth whose rollback fails
  drops the stranger session and forces a local sign-out — no delete`;
  `delete_account_test.dart: rollback failure leaves the auth client
  with no session at all`.
- **P2-5** | `mobile/android/app/build.gradle.kts`,
  `mobile/android/app/proguard-rules.pro` (new) | Release artifacts
  shipped unshrunk/unobfuscated. `isMinifyEnabled` +
  `isShrinkResources` are now on for release with
  `proguard-android-optimize` plus app rules: Flutter embedding keeps,
  the `com.dexterous.**` Gson keeps flutter_local_notifications needs
  for scheduled-notification restore, and `-dontwarn
  com.google.android.play.core.**` — R8's own missing_rules.txt output
  for the engine's dead deferred-component linkage (the Play Core
  library isn't packaged). Verified: `flutter build apk --release
  -PmfAllowDebugRelease=true` → `app-release.apk` 64.2MB (first attempt
  failed on the Play Core classes before the dontwarn was added; the
  exact failure was R8 missing-class errors on splitinstall/splitcompat).
  Upload-key signing still requires `key.properties` — the verification
  ran under the documented debug-release escape hatch, so a Play AAB
  needs the owner's keystore. | Build evidence: `assembleRelease`
  green with R8; no new tests (build-system change).
- **P2-6** | `mobile/lib/domain/voice_money_parser.dart`,
  `mobile/test/voice_money_parser_test.dart` | `_parseFullAmount`
  accumulated a `double` and called `.round()` unbounded — absurd spoken
  amounts saturated to int64 max and displayed as plausible. Now
  `total > _maxSafeAmount` (9007199254740991, the same bound the share
  parser uses) is rejected BEFORE rounding. |
  `voice_money_parser_test.dart: absurd amounts return null
  (123456789012345678 đồng / 10000000 tỷ / 999999999999999999999999);
  sane neighbors (hai tỷ, 100 tỷ) still parse`.
- **P2-7** | `mobile/lib/app/app.dart`,
  `mobile/test/session_restore_test.dart` | Cold start blocked the gate
  on `restoreSession` → `/get-session` with only the transport's 10s
  connect + 30s inactivity bounds — up to ~40s of dead spinner. The
  probe now has its own `_sessionProbeBudget` (8s — a real round-trip
  plus scale-to-zero wake): on `TimeoutException` the existing
  `_restoreOffline` path renders the cached shell and the lazy JWT
  refresh re-validates on the next request. A `_bootHintTimer` (2.5s)
  adds the "Mạng đang chậm — sẽ mở bản ngoại tuyến nếu không kết nối
  được" affordance so the spinner never reads as a hang. |
  `session_restore_test.dart: a never-answering /get-session drops the
  spinner into the offline shell within the probe budget — stored
  token kept`.
- **FEATURE: D1 debt tracking** | `supabase/migrations/20261016120000_debts.sql`,
  `db/neon/migrations/20261016120000_debts.sql` (generated),
  `db/neon/migrations/MANIFEST.json`,
  `supabase/migration-identity.json`,
  `supabase/tests/database/debts.test.sql`,
  `supabase/tests/database/security_definer_contract.test.sql`,
  `mobile/lib/domain/debts.dart`,
  `mobile/lib/data/neon/real_store.dart`,
  `mobile/lib/features/debts/debts_page.dart`,
  `mobile/lib/app/app.dart`,
  `mobile/test/debts_test.dart`,
  `mobile/test/debts_store_test.dart`,
  `mobile/test/debts_page_test.dart`,
  `mobile/test/settings_page_test.dart` |
  Loop B gap D1 (RESEARCH_TOP_FINANCE_APPS.md §10 — informal vay/cho vay
  among family, friends, colleagues): `debts` tracks counterparty,
  direction (`payable`/`receivable`), principal, remaining, note, due
  date, state (`open`/`settled`/`archived`), version and tombstone;
  `debt_repayments` links each applied repayment to the real ledger
  transaction it produced. Creating a debt posts nothing — the tracking
  record is not a second ledger. `apply_debt_repayment` atomically
  validates ownership + open state + `amount <= remaining` under
  FOR UPDATE, posts a direction-derived kind (payable → expense,
  receivable → income — never transfer, never caller-picked) with
  category-kind check, advisory-lock + stored `creation_intent` idempotent
  replay, decrements remaining and settles at zero. RLS select-only for
  `authenticated` — all writes ride the four reviewed SECURITY DEFINER
  RPCs (inventory 66); both tables carry `guard_oauth_mutation`. Mobile:
  `DebtsPage` (authenticated menu only — no demo seam, no fake) groups
  open debts per direction+counterparty so "I owe Hai" and "Hai owes me"
  never net, repay dialog filters categories by derived kind and reuses
  one minted key per dialog intent; every write refetches — the server
  owns remaining/state. Deployment pending owner approval — migration
  written and verified, never applied to production Neon. |
  `debts.test.sql` (21 assertions: direction-derived expense/income,
  remaining transitions, overpay/category-kind/settled guards, replay +
  intent pinning, tenant isolation, soft delete); embedded-pgTAP run:
  62 files, 0 failures;
  `debts_test.dart` (domain: parse, remaining math, grouping, error map);
  `debts_store_test.dart` (RPC payload shapes + boolean-refusal surfacing);
  `debts_page_test.dart` (12 widget cases: empty/add/repay/settled/
  archive/delete/read-only/error).
- **FEATURE: D2 event/occasion budgets** |
  `supabase/migrations/20261016180000_event_budgets.sql`,
  `db/neon/migrations/20261016180000_event_budgets.sql` (generated),
  `db/neon/migrations/MANIFEST.json`,
  `supabase/migration-identity.json`,
  `supabase/tests/database/event_budgets.test.sql`,
  `supabase/tests/database/security_definer_contract.test.sql`,
  `docs/plans/active/event-budgets.md`,
  `mobile/lib/domain/events.dart`,
  `mobile/lib/data/neon/real_store.dart`,
  `mobile/lib/features/events/events_page.dart`,
  `mobile/lib/app/app.dart`,
  `mobile/test/events_test.dart`,
  `mobile/test/events_store_test.dart`,
  `mobile/test/events_page_test.dart` |
  Loop B gap D2 (RESEARCH_TOP_FINANCE_APPS.md §10 — Money Lover's
  date-ranged occasion budget for Tết/đám cưới/du lịch): `event_budgets`
  carries name, inclusive `start_date`/`end_date`, `limit_minor`,
  idempotent-create pinning (`idempotency_key` + `creation_intent`),
  `updated_at` and `deleted_at` tombstone; `event_budget_categories` is
  the optional scope set — zero rows means every expense counts ("Tất
  cả danh mục"). An event holds no money: creating/editing/deleting one
  writes no `financial_transactions` row, and `event_budget_progress`'s
  `spent_minor` is a live aggregate over real `transaction_entries`
  expense legs inside the inclusive window (per-entry math, so a
  partial split contributes only its in-scope legs; transfers and
  income structurally excluded by `kind='expense'`). RLS select-only —
  all writes ride the three reviewed SECURITY DEFINER RPCs (inventory
  69); both tables carry `guard_oauth_mutation` and every FK a
  left-prefix cover index. Create replays by advisory-lock + stored
  intent; update fails closed on `stale_write` via
  `p_expected_updated_at`; delete is a tombstone. Mobile: `EventsPage`
  on the authenticated menu only (no demo seam — honest absence)
  sections active/upcoming/closed, reuses `budgetState` + `MfTickBar`
  with a day-pace "hôm nay" marker; the read-only detail lists the feed
  rows the figure counted via the same `eventSpentOfTransaction`
  predicate the view uses — the drill can never disagree with the card.
  Deployment pending owner approval — migration written and verified,
  never applied to production Neon. |
  `event_budgets.test.sql` (24 assertions: create validation,
  scoped/unscoped progress, inclusive bounds, split-leg scope,
  transfer/income exclusion, idempotent replay + intent pinning,
  stale-write, tenant isolation, tombstone/view-drop); embedded-pgTAP
  run: 63 files, 0 failures;
  `events_test.dart` (20 domain cases: phase, day arithmetic, inclusive
  window, kind/scope/split predicate, scope label, error map);
  `events_store_test.dart` (6 cases: view read shape + RPC payload
  shapes + boolean-refusal surfacing);
  `events_page_test.dart` (9 widget cases: empty/add/scope/validate/
  sections/detail-drill/edit/delete/read-only/error).
  `flutter analyze` clean; `flutter test` 1321 all green;
  `check:migrations` 91 pinned; `check:rls` 9/9; `check:knowledge`;
  `test:ci-policy` 203/203.
- **FEATURE: D3 honest "còn lại tháng này" + budget threshold alerts** |
  `mobile/lib/domain/budget.dart`,
  `mobile/lib/domain/safe_to_spend.dart`,
  `mobile/lib/features/dashboard/dashboard_page.dart`,
  `mobile/lib/app/home_shell.dart`,
  `mobile/lib/app/app.dart`,
  `mobile/test/budget_test.dart`,
  `mobile/test/safe_to_spend_test.dart`,
  `mobile/test/home_shell_test.dart` |
  Loop B gap D3 (RESEARCH_TOP_FINANCE_APPS.md §10 — Simplifi "Left This
  Month" / PocketGuard "In My Pocket" / Copilot "Free to Spend"): the
  existing "Chi được hôm nay" tile becomes the "Còn lại tháng này"
  remainder card — hero = budget headroom left after reserving unpaid
  due commitments, "~Y ₫/ngày · còn N ngày" equivalence, and a basis
  line naming its inputs ("Theo ngân sách tháng và chi đã ghi", plus
  "đã trừ cam kết sắp trả X ₫" when a reserve exists). Never an
  account balance, never an invented number: `SafeDailySpend` gains
  `reservedMinor`/`shortfallMinor` so commitments overshooting the
  headroom render as an explicit "− X ₫ / Cam kết sắp trả vượt hạn mức"
  state (words + icon, never colour alone) instead of a silent 0. No
  budgets → setup nudge with a real "Mở Kế hoạch" action (HomeShell
  gains a public `selectTab`, wired through `_shellKey`). Threshold
  alerts: `budgetAlerts` in domain/budget.dart reuses the carry-aware
  `budgetEffectiveState` math the Kế hoạch tiles render, so the card's
  "vượt X ₫" / "sắp tới hạn mức — còn X ₫" lines can never disagree with
  planning; the dashboard prefers a new `loadBudgetRange` seam
  (`loadBudgetsInRange`, one window read feeding both figure and carry)
  and falls back to the month-scoped `loadBudgets` with a zero carry.
  Demo wires the seeded prior-month rows through the same seam. No push
  scheduling — in-app lines only, per the slice. |
  `budget_test.dart` (+9: 80%/100% thresholds, at-limit = near not over,
  carry flips near→over and rescues over→near, prior rows never alert,
  total ordering);
  `safe_to_spend_test.dart` (+7: reserved/shortfall disclosure, two
  Saigon-TZ month boundaries, basis label, "Mở Kế hoạch" tap, absent
  seam keeps text only, honest "thiếu" figure, per-category alert lines,
  carry parity with Kế hoạch);
  `home_shell_test.dart` (+1: selectTab programmatic switch + no-op
  guards). `dart format` clean; `flutter analyze` clean;
  `flutter test` 1338 all green.
- **FEATURE: D4 payee statistics + MoM category deltas** |
  `mobile/lib/domain/report.dart`,
  `mobile/lib/features/reports/reports_page.dart`,
  `mobile/lib/features/activity/activity_page.dart`,
  `mobile/test/report_test.dart`,
  `mobile/test/planning_reports_test.dart`,
  `mobile/test/activity_search_test.dart`,
  `mobile/test/reports_export_test.dart` |
  Loop B gap D4 (RESEARCH_TOP_FINANCE_APPS.md §10 — PocketGuard 7.3 MoM
  category arrows + top-10 merchants, Copilot 3.4 similar-txns, Monarch
  1.2 filters). The payee breakdown, `TransactionQuery.payee` drill-in
  and the "Cần xem lại" chip already shipped; this slice adds the
  statistics on top. Payee ranking: `CategoryShare` gains `count` —
  `buildPeriodReport` counts expense transactions per trimmed-payee
  bucket so "Chi theo người nhận" rows render "N giao dịch" under the
  bar (expense-only: income/transfers structurally excluded; the
  "Không tên" bucket keeps its honest label and its '' drill-in).
  MoM column: `expenseCategoryDeltas` buckets the current AND prior
  expense rows on the same key rule the breakdown groups by (stored
  category_id, else 'name:<label>'), so a rendered delta can never
  disagree with the row's own drill-in. ReportsPage reads
  `period.prev` as a companion — a failed or capped prior read yields
  `deltas == null` and the section explains "Chưa so được với kỳ
  trước — dữ liệu kỳ trước chưa tải đủ" instead of drawing arrows on
  a partial baseline. Cells: `▲/▼` + amount (rise = expense-red, fall
  = income-green — spending less is the good direction — with
  semanticsLabels so direction never rides colour alone), "mới" for a
  null baseline, "Không đổi" for a real zero; prior-only buckets append
  as honest 0 ₫ rows so a category that stopped entirely can't pose as
  never-having-existed. The delta rides the subtitle, not
  `ListTile.trailing` — trailing is height-capped and clipped the third
  line at 2x text scale (caught by the B1 audit test). Filters: the
  activity sheet gains an exact-payee "Người nhận" field on the same
  query field the drill-in uses; blank clears. Pending-filter and the
  transaction-detail "similar transactions" block are waived — the
  ledger has no pending/posted field to filter on and the app has no
  detail surface to host the block (see DECISIONS.md). |
  `report_test.dart` (+11: payee counts; delta rise/drop/level, "mới"
  vs real-zero baseline, no prior window, dropped-to-zero keeps
  name/id/negative change, name-only buckets match, same-name different
  ids stay separate, income/transfers/uncategorised never feed,
  categoryDeltaKey parity);
  `planning_reports_test.dart` (+4: payee count rows, ▲/▼/mới/Không
  đổi/dropped-to-zero render, capped prior read drops the column with
  a reason, failed prior read degrades the column not the report) plus
  range-call updates for the companion read;
  `activity_search_test.dart` (+1: exact payee applies and clears —
  'Grab' never matches 'GrabBike');
  `reports_export_test.dart` (call counts for the second range read).
  `dart format` clean; `flutter analyze` clean; `flutter test` 1354
  all green.
- **FEATURE: D5 review-loop polish — swipe gestures + dashboard
  attention card** | `mobile/lib/features/activity/activity_page.dart`,
  `mobile/lib/features/inbox/inbox_page.dart`,
  `mobile/lib/features/dashboard/dashboard_page.dart`,
  `mobile/lib/data/neon/real_store.dart`,
  `mobile/lib/domain/models.dart`,
  `mobile/lib/app/app.dart`,
  `mobile/test/dashboard_page_test.dart` (new),
  `mobile/test/activity_page_test.dart`,
  `mobile/test/inbox_test.dart`,
  `mobile/test/mf_theme_test.dart` |
  Loop B gap D5 (RESEARCH_TOP_FINANCE_APPS.md §10 — Monarch 1.5 swipe,
  Copilot 3.1 bulk mark-reviewed + dashboard card, Rocket 4.5 attention
  card). Recon found most of the loop already shipped (needsReview flag,
  bulk mark-reviewed via select mode, "Cần xem lại" chip, count-only
  dashboard card, explicit per-candidate inbox approve); this slice
  fills the real gaps only.
  Gestures: Activity rows flagged needs_review are now swipable right —
  "Đã xem" runs through the SAME `onBulkReview` RPC seam select mode
  uses (one id in the list), guarded per-row by `_reviewBusy` since the
  RPC has no idempotency key; the tile never actually dismisses — the
  flag flip (or row removal under the active filter) is the result —
  with "Hoàn tác" re-flagging through the same seam and failures
  snapping back with the shared `_bulkError` copy. Inbox rows swipe
  left into the SAME confirmed reject the "Từ chối" button runs —
  `_confirmReject`/`_writeReject`/`_markRejected` are shared, so the
  gesture saves the tap, never the confirmation; rejected ids hide via
  `_removedIds` until the next server truth arrives, and `_rejectBusy`
  defends the non-idempotent write. No approve gesture exists and no
  bulk-approve exists — approval posts to the ledger, so it stays
  inside the review sheet where account/category and the plan verdict
  are visible (see DECISIONS.md).
  Attention card: the count-only `_NeedsReviewCard` became
  `_AttentionCard` with four verified rows — inbox drafts (count +
  newest merchant/amount lines via `loadPendingInboxPreviews`,
  "Chưa vào sổ" subtitle), posted rows still flagged needs_review
  (count + payee-or-note/amount lines via
  `loadNeedsReviewTransactions` — the id read on
  `transaction_review_feed` is deliberately unbounded so the count is
  the full backlog while the preview caps at `_maxPreviewLines` = 2),
  overdue commitments and paid-different drift — both classified by
  the same `commitmentStatus` math the Kế hoạch list renders, on one
  `vnNow()` read shared with the remainder card. Every row taps to a
  real destination (inbox page, feed pre-filtered via the new
  `ActivityPage.initialOnlyNeedsReview`, planning tab); a row without
  a wired destination shows its count with no chevron instead of a
  dead affordance, and each optional read fails soft — the dashboard
  never breaks for an auxiliary card. Demo wires the real seeded
  inbox + commitment rows; posted needs-review has no demo seam so
  that row honestly stays absent.
  `dashboard_page_test.dart` (+10: card hides when nothing verified;
  inbox count/lines/overflow/tap; needs-review lines + filtered-feed
  tap; overdue + drift rows from verified states only; archived never
  surfaces; failed attention reads hide the card not the page; no
  destination → count without chevron; `loadNeedsReviewTransactions`
  request shape + unbounded count with capped preview + flagged
  mapping; empty flag set short-circuits to one request;
  `loadPendingInboxPreviews` limit param).
  `activity_page_test.dart` (+6: only flagged rows carry the
  affordance; swipe marks reviewed via the bulk seam and clears the
  flag line + chip; undo re-flags through the same seam; failed write
  snaps back with the error copy; swipe under the active filter
  removes the row into the honest empty state;
  `initialOnlyNeedsReview` opens pre-filtered).
  `inbox_test.dart` (+3: swipe-left runs the same confirmed reject —
  Dismissible present, dialog, write, row gone + snack; cancelled
  swipe snaps back with zero writes; failed write keeps the row with
  the error copy).
  `mf_theme_test.dart` (string updates for the renamed count line).
  `dart format` clean; `flutter analyze` clean; `flutter test` 1373
  all green.
- **FEATURE: D6 rule suggestion from repeated corrections** |
  `mobile/lib/domain/rule_suggestions.dart` (new),
  `mobile/lib/data/rule_suggestion_prefs.dart` (new),
  `mobile/lib/features/capture/capture_page.dart`,
  `mobile/lib/app/app.dart`,
  `mobile/test/rule_suggestion_test.dart` (new) |
  Loop B gap D6 (RESEARCH_TOP_FINANCE_APPS.md §10 — deterministic ADAPT
  of YNAB's "two-of-three" payee rule; the edit→rule checkbox already
  existed but nothing ever SUGGESTED a rule, so users with no rule
  habit never discover it). A manual re-categorization of a payee row
  is counted per (folded payee → categoryId) pair in an account-scoped
  prefs slot (`mf_rule_corrections.<uid>`, cap 200 pairs, weakest-first
  eviction); at `ruleSuggestionThreshold` = 2 identical corrections the
  post-save flow offers a rule DRAFT dialog ("Tạo quy tắc tự điền?" —
  Tạo quy tắc / Để sau / Không hỏi lại). Accept writes through the
  existing `onSaveRule` → `saveInboxRule` seam as an enabled merchant
  rule; it never auto-applies to the ledger and only prefills pending
  inbox candidates a human still approves. Suppressed when the pair is
  below threshold, when an enabled merchant/any rule already covers the
  payee (`ruleAlreadyCoversPayee`), when the pair was declined via
  "Không hỏi lại" (`mf_rule_corrections_off.<uid>`), when the category
  didn't actually change, or when the explicit checkbox already saved a
  rule this save (no double-offer). The edit itself saves first and
  always succeeds — a suggestion lookup failure is silent, a declined
  write is best-effort, and only the rule write's failure reports
  `savedRuleFailed` ("Đã lưu khoản — chưa lưu được quy tắc").
  `rule_suggestion_test.dart` (+18: pair key folds diacritics/case;
  threshold gate; covering-rule suppression; declined pairs stay quiet;
  unchanged-category and transfer edits count nothing; accept writes a
  merchant rule draft via saveRule with merchantName null; Để sau saves
  nothing and the pair can re-earn the offer; Không hỏi lại persists;
  rule-save failure → savedRuleFailed with the edit still landed;
  lookup throw → edit still saves, no dialog; edit without payee or
  without the seam offers nothing).
  `dart format` clean; `flutter analyze` clean; `flutter test` — see
  batch tail below.
- **FEATURE: D7 quick-fill capture chips** |
  `mobile/lib/data/quick_fills.dart` (new),
  `mobile/lib/features/capture/capture_page.dart`,
  `mobile/lib/app/app.dart`,
  `mobile/test/quick_fills_test.dart` (new) |
  Loop B gap D7 (RESEARCH_TOP_FINANCE_APPS.md §10 — Goodbudget 8.5 COPY:
  custom quick fills). Recon found the amount presets and "Mục hay dùng"
  category chips already shipped, but no saved TRANSACTION template —
  the requested unit carries kind/payee/amount/category/account. New
  `QuickFill` + `QuickFillStore` (`mf_quick_fills.<uid>`, most-recent
  first, dedupe on full-field equality, cap 12 — beyond that the row
  stops being one-tap). Capture gains a bookmark action "Lưu làm mẫu
  nhanh" (AppBar, hidden for transfers — a chip can't carry two
  accounts — and wherever no scope is wired; validation mirrors the
  submit's minimum so a template can't encode an unsavable form). Saved
  fills render as an `InputChip` row under the quick field in CREATE
  mode only — an edit is never overwritten by a template; chips whose
  account/category id no longer resolves (deleted wallet, archived or
  wrong-kind category) hide instead of applying a half-broken template,
  and a payee-less chip labels with the LIVE category name so a rename
  never shows stale copy. Tapping a chip fills
  kind/amount/category/payee/note/account and clears the auto-parse
  ownership markers so a later quick-parse can't stomp them — the user
  still reviews and saves explicitly; chip delete rides the InputChip
  affordance.
  `quick_fills_test.dart` (+15: store round-trip + scope wall; identical
  fill refreshes recency; oldest evicts at the cap; corrupt/shape-
  drifted entries drop; delete by equality; chips render labeled
  `payee · ₫` or live-category fallback; tap prefills every field with
  zero submits; stale-id chips hidden; bookmark save persists + chip
  appears + snackbar; missing amount/category → honest explain line;
  transfer mode and scope-less demo hide the affordance; edit mode
  shows no chips but can still save a template; delete affordance
  removes the stored row).
- **FEATURE: D8 commitment calendar view** |
  `mobile/lib/domain/commitments.dart` (+commitmentMonthGrid,
  commitmentsDueOnDay),
  `mobile/lib/features/planning/commitment_calendar.dart` (new),
  `mobile/lib/features/planning/planning_page.dart`,
  `mobile/test/commitment_calendar_test.dart` (new) |
  Loop B gap D8 (RESEARCH_TOP_FINANCE_APPS.md §10 — PocketGuard 8.4
  PORT: the commitments list answered "gì đến hạn" but not "ngày nào").
  `commitmentMonthGrid` builds the Monday-first T2…CN grid with null
  padding — malformed months render empty, never a guessed layout.
  `commitmentsDueOnDay` reuses `commitmentDueMonth` + `commitmentDueDate`
  so a yearly/quarterly row only marks the month its cycle actually
  lands in, and dueDay 31 marks the month's real last day under the
  existing clamp rule — no fabricated dates. `CommitmentCalendar` draws
  up to three status-colored dots per due day (same `commitmentStatus`
  math the feed tile uses, so dot color and row status can never
  disagree), rings today, selects a day on tap (re-tap deselects) and
  lists that day's commitments with name · amount · status line and the
  SAME `onPay` "Trả" seam the tile uses — no second write path; paid
  rows mark their day too ("đến hạn" is a fact about the date, not the
  payment) but show no Trả. The card mounts only when active
  commitments exist; a tapped day with nothing due says so in text.
  `commitment_calendar_test.dart` (+13: grid padding + Monday-first
  order + month-length + malformed-month refusal; due-day marking under
  monthly/yearly/clamped-31/paid cases; widget renders headers + hint;
  tap-a-day detail + Trả round-trip; empty-day honest line; deselect;
  paid row shows status without Trả; no onPay seam hides the button).
- **FEATURE: D9 month-close digest + in-app month summary card** |
  `mobile/lib/domain/month_close_digest.dart` (new),
  `mobile/lib/domain/month_summary.dart` (new),
  `mobile/lib/data/notifications.dart`,
  `mobile/lib/app/app.dart`,
  `mobile/lib/app/home_shell.dart`,
  `mobile/lib/features/settings/settings_page.dart`,
  `mobile/lib/features/dashboard/dashboard_page.dart` |
  Loop B gap D9 (RESEARCH_TOP_FINANCE_APPS.md §10 — Copilot 3.9 /
  Monarch recap ADAPT): the weekly digest existed but the culturally
  real bookkeeping boundary is the month close (lương → hết tháng).
  `nextMonthCloseFire` resolves the LAST calendar day at the shared
  configurable digest hour, rolling to next month's last day when this
  month's fire time already passed (`month_close_digest.dart:51`);
  `monthCloseWindow` anchors on the VN civil calendar — a 19:00
  last-local-day fire that is already the 1st in Saigon still closes
  the correct month. `MonthCloseNotificationService` schedules/cancels
  a ONE-SHOT zoned notification on id `monthCloseNotificationId =
  70002` (`notifications.dart:243`); the commitment id allocator now
  skips BOTH digest ids (`notifications.dart:279`). `refreshMonthCloseDigest`
  (`notifications.dart:442`) loads the two-month window once, computes
  the digest copy and returns the payload for the app-layer body; the
  feature is opt-in (default OFF, `mf_month_digest_enabled` pref),
  cancelled on toggle-off and on account deletion
  (`app.dart:1562,1569`). Settings shows the switch under the weekly
  one with the shared digest time label (`settings_page.dart:60`).
  The in-app `_MonthSummaryCard` (`dashboard_page.dart:932`) renders
  month-to-date thu/chi/còn lại, the top expense category, and the
  delta vs the equal-length trailing window from
  `buildMonthSummary` (`month_summary.dart:69`), names its range
  ("1/10 – 20/10") so a partial month never reads as whole, and links
  "Xem báo cáo tháng →" to the reports tab (`home_shell.dart`
  `homeShellReportsTab`). A missing/failed/truncated read or an empty
  month hides the card — no fake numbers. |
  `month_close_digest_test.dart` (+22: last-day resolution incl.
  same-month-already-past rollover, February non-leap, VN-anchored
  window, copy/digest math, opt-in orchestration, cancel-on-disable);
  `dashboard_page_test.dart` (month card renders totals + range +
  delta; truncated/absent read hides it; reports link switches tab);
  `settings_page_test.dart` (switch state + toggle callback);
  `notifications_test.dart` (allocator skips both digest ids).
- **FEATURE: D10 watchlist pin — monitor one category/payee without a
  budget** | `mobile/lib/domain/watchlist.dart` (new),
  `mobile/lib/data/watchlist_prefs.dart` (new),
  `mobile/lib/features/dashboard/dashboard_page.dart`,
  `mobile/lib/app/app.dart` |
  Loop B gap D10 (§10 — Simplifi 5.4 COPY): tracking one vice (trà
  sữa) shouldn't require budgeting ceremony. `WatchItem` pins a
  category OR payee (`watchlist.dart:18`); `watchMonthSpend`
  (`watchlist.dart:42`) sums ONLY this month's matching expenses from
  the same ledger read the summary card uses — income and transfers
  never count. `watchAlert` (`watchlist.dart:71`) maps an optional
  integer-VND threshold to ok/near(≥80%)/over(≥100%) — a pin without
  a threshold stays advisory, never a fake budget. Pins persist
  device-local under `mf_watch_items` (`watchlist_prefs.dart`) — no
  server contract exists, so nothing is implied. `_WatchCard`
  (`dashboard_page.dart:1014`) lists "Đang theo dõi" rows with
  "Chi X ₫ tháng này" + threshold state + "Bỏ theo dõi" per item;
  "Ghim" opens a sheet whose candidates come from THIS month's real
  ledger rows (categories + payees), never a preset taxonomy —
  re-pinning an existing name is a threshold update, not a duplicate.
  The card renders only when pins or candidate rows exist, the pin
  affordance exists only when the save seam is wired, and both seams
  absent → no card (`dashboard_page.dart:863-879`). |
  `watchlist_test.dart` (+9: month-sum correctness incl.
  income/transfer exclusion, payee exact-match, 80%/100% thresholds,
  prefs round-trip + corrupt-pref empty read, card totals + "Sắp tới
  ngưỡng", pin sheet real-values-only, unwatch through save seam,
  no-seam hides card); `dashboard_page_test.dart` (pin affordance
  absent without save seam).
- **FEATURE: D11 goal-status prerequisites + linked funding** |
  `mobile/lib/domain/models.dart` (+GoalAllocation:323, +GoalFunding
  typedef:338), `mobile/lib/domain/goal_projection.dart`,
  `mobile/lib/data/neon/real_store.dart`,
  `mobile/lib/features/planning/planning_page.dart`,
  `mobile/lib/app/app.dart` |
  Loop B gap D11 (§10 — Monarch 1.9 COPY): progress honesty beats a
  confident-looking bar. `goalMissingPrerequisites`
  (`goal_projection.dart:151`) names what's missing (target, target
  date, contribution evidence) instead of rendering an unexplained
  empty projection — pace/đúng hẹn only show when the prerequisites
  exist. `RealStore.loadGoalFunding` (`real_store.dart:777`) reads up
  to 20 recent `savings_goal_allocations` rows (the funding authority;
  signed: deposits positive, withdrawals negative) plus up to 20
  `transaction_feed` rows filtered by `goal_id` (annotation only —
  they never change the goal total), each with a `hasMore` flag so a
  truncated tail is disclosed. The goal tile's overflow menu gains
  "Chi tiết" → a bottom sheet (`planning_page.dart:1541`) listing the
  signed funding history and "Giao dịch liên kết" rows — no loader
  seam → no dead menu entry (`planning_page.dart:486`). The tile also
  carries the reserve line "Đã dành X — còn có thể dành Y"
  (`planning_page.dart:2183`): the web's `reserve.unreserved`
  analogue, computed from VND wallets. The research row's "include in
  monthly plan" toggle was NOT built — no such field or backend
  contract exists; see DECISIONS.md. All goal writes still run the
  confirmed `adjust_savings_goal` RPC. |
  `goal_projection_test.dart` (+4: missing target/date/evidence named
  individually, complete set → no complaint); `planning_reports_test.dart`
  (+4: detail sheet lists allocations + linked rows with signed
  amounts, hasMore disclosure, no loader → no Chi tiết, reserve line).
- **FEATURE: D12 non-monthly budget periods — weekly budgets on one
  cadence-aware seam** |
  `supabase/migrations/20261016190000_budget_periods.sql`,
  `db/neon/migrations/20261016190000_budget_periods.sql` (generated twin,
  byte-identical — no auth refs to rewrite),
  `supabase/tests/database/budget_periods.test.sql`,
  `supabase/tests/database/schema_and_rls.test.sql`,
  `supabase/tests/database/security_definer_contract.test.sql`,
  `mobile/lib/domain/models.dart`,
  `mobile/lib/domain/budget.dart`,
  `mobile/lib/domain/report.dart`,
  `mobile/lib/domain/safe_to_spend.dart`,
  `mobile/lib/data/neon/real_store.dart`,
  `mobile/lib/data/demo_store.dart`,
  `mobile/lib/features/planning/planning_page.dart`,
  `mobile/lib/app/app.dart` |
  Loop B gap D12 (§10 — Money Lover 6.5 ADAPT): weekly allowance
  budgeting ("tiền tiêu tuần") is a normal VN cadence; D2's event
  budgets already cover Tết-length custom windows, so the gap is
  recurring non-monthly periods only. `monthly_budgets.period_kind`
  admits exactly {'monthly','weekly'} — quarterly/yearly stay unwritten
  contract; `month_start` stays the column name as the period ANCHOR
  (1st-of-month / week-Monday, per-kind check
  `monthly_budgets_period_start_check`), and the conflict target widens
  to (user, category, period_kind, anchor) so a weekly and a monthly
  limit on one category — even sharing a first-of-month Monday — are
  two rows, not a collision. `upsert_monthly_budget` gains
  `p_period_kind` (the 4-arg signature dropped, named-arg callers
  resolve via the default; stale-write guard now scoped per kind);
  `budget_progress` sums the right window per kind ([Mon, Mon+7) vs the
  calendar month) and emits `period_kind` appended last. The dashboard
  bundle's budgets slice is now explicitly `period_kind='monthly'` —
  an anchor match alone would hand a first-of-month-Monday weekly row
  to "this month" (asserted via `pg_get_functiondef`). Mobile: the
  planning budgets section gains a Theo tháng/Theo tuần
  `SegmentedButton` — each tab owns its offset navigator (bounded to
  current+1 like months), row pool, rollover chain and carry-fill; the
  "Điền nhanh" sheet on Tuần shows only the prior-week carry because a
  3-month average is a monthly figure by construction. The form
  declares its cadence + resolved window ("Theo tuần · tuần 12/10 –
  18/10/2026") before any write; creates land on the viewed anchor,
  edits keep the row's own anchor+kind. `safeDailySpend` and the
  dashboard remainder stay monthly-only by explicit period filter; the
  store retries budget reads without `period_kind` against a
  pre-migration server (every row is monthly by the column's own
  default — never an invented cadence) and only sends `p_period_kind`
  for non-monthly saves, so monthly keeps working pre-migration.
  Integer đồng throughout; no new table/RPC kind — one seam, two
  cadences. |
  `budget_test.dart` (+11: Monday anchoring, 7-day shifts incl. year
  edge, non-Monday rejection, exclusive end, weekly pace, vi-VN labels
  incl. year-straddle, per-kind carry isolation, weekly alert scope,
  weekly carry-forward drafts); `safe_to_spend_test.dart` (+1: weekly
  rows never feed the monthly remainder even on a shared anchor date);
  `planning_store_test.dart` (+3: weekly body posts p_period_kind,
  period_kind selected+parsed, missing-column retry reads monthly);
  `planning_reports_test.dart` (+5 widget: tab swap pools, weekly empty
  state names cadence, ‹/› navigates Mondays with the same bound,
  create writes weekly+Monday anchor, "Chuyển từ tuần trước" copy);
  `budget_periods.test.sql` (17 assertions: Monday/1st anchor checks,
  invalid period kind, 7-day window sums incl. month-straddle, monthly
  window unchanged, same-anchor dual rows, per-kind conflict replay,
  stale guard, tenant isolation, delete path, bundle monthly scope).
- **FEATURE: D13 exclude-from-reports flag on ledger rows** |
  `supabase/migrations/20261016200000_report_exclusions.sql`,
  `db/neon/migrations/20261016200000_report_exclusions.sql` (generated
  twin, byte-identical — no auth refs to rewrite),
  `supabase/tests/database/report_exclusions.test.sql`,
  `supabase/tests/database/schema_and_rls.test.sql`,
  `mobile/lib/domain/models.dart`,
  `mobile/lib/domain/report.dart`,
  `mobile/lib/data/neon/real_store.dart`,
  `mobile/lib/features/capture/capture_page.dart`,
  `mobile/lib/features/reports/reports_page.dart`,
  `mobile/lib/features/activity/activity_page.dart`,
  `mobile/lib/app/app.dart` |
  Loop B gap D13 (§10 — Money Manager 4.1 / Monarch-style "hide from
  reports"): `financial_transactions.excluded_from_reports` NOT NULL
  default false, projected appended-last on transaction_feed and
  deleted_transaction_feed (the trash read parses through the same
  mapper). The write seam is `update_money_transaction`'s new
  `p_excluded_from_reports` param (null = preserve) — a standalone
  flag RPC was considered and dropped because
  `transactions_set_updated_at` rotates the concurrency token on every
  UPDATE, so a second call could never share the form's token; one
  write keeps the check honest. The reconciled-row guard's jsonb diff
  exempts the flag (metadata like payee/goal_id — reconciliation proves
  the money moved, not that it should appear in a report). Transfers
  stay unreachable via the existing kind lock. Mobile: feed reads try
  `excluded_from_reports` first and retry without it on a
  column-missing error (pre-migration rows are unflagged by the
  column's own default); `buildPeriodReport` skips flagged rows from
  every section while tallying excludedCount/excludedExpense/
  excludedIncome for the disclosure line "Đã loại N khoản khỏi báo cáo
  · chi X ₫ · thu Y ₫" (rendered even when the period is fully
  excluded, so the empty state can't pretend nothing was recorded);
  the activity row subtitle marks flagged rows "Đã loại khỏi báo cáo"
  (they stay in the ledger — money really moved); the capture edit
  form's SwitchListTile seeds from the row, disables while busy, hides
  for transfers and create mode, and only sends a bool when flipped.
  Contract: budgets, balances, safe-to-spend and the dashboard are
  unaffected — the flag is report scoping only. Web reports do not yet
  honor the flag (documented divergence, DECISIONS.md). |
  `report_test.dart` (+3: sections skip flagged rows with disclosure
  counters, fully-excluded period is empty-but-honest, headline count
  excludes flagged rows); `planning_store_test.dart` (+3: feed select
  carries the column, missing-column retry maps false, flipped flag
  rides the update body while untouched is omitted);
  `capture_audit_test.dart` (+4: switch visible+flips into intent,
  untouched sends null, unflag sends false, create mode hides it);
  `report_exclusions.test.sql` (13 assertions: column shape, feed and
  deleted-feed projection, flag-on via the update seam, null-param
  preserve, token rotation, stale_write, reconciled-row exemption,
  transfer kind lock, tenant isolation, anonymous reject).
- **FEATURE: neon-green theme migration — Soft Pop purple → #00FF88,
  dark-mode-first** |
  `mobile/lib/theme/mf_theme.dart`,
  `mobile/lib/data/settings_prefs.dart`,
  `mobile/lib/app/home_shell.dart`,
  `mobile/lib/features/dashboard/dashboard_page.dart`,
  `mobile/lib/features/auth/welcome_page.dart`,
  `mobile/lib/features/auth/register_page.dart`,
  `mobile/lib/features/auth/forgot_password_page.dart`,
  `mobile/lib/features/categories/category_visuals.dart` (comment only),
  `mobile/android/app/src/main/res/values/colors.xml`,
  `mobile/android/app/src/main/res/values-night/colors.xml`,
  `mobile/android/app/src/main/res/drawable/ic_shortcut_capture.xml`,
  `mobile/android/app/src/main/res/mipmap-*/ic_launcher{,_foreground}.png`
  (10 files) |
  Owner decision 2026-10-16 (GreenVault reference set,
  `docs/design/greenvault-reference/`): the entire mobile theme moves
  from Soft Pop violet (#6F4EF5 family) to neon green with dark mode as
  the primary experience. Semantic token NAMES are unchanged — every
  `MfColors` field keeps its name so feature code still reads
  `context.mf.*`; only VALUES migrated. Dark tokens: canvas `#0A0E0C`,
  surface `#121715`, brand/primary `#00FF88` with on-primary dark ink
  (white on #00FF88 fails contrast — nav FAB glyph, shortcut plus and
  widget button text take `mfPastelInk`/`#0A0E0C`). Light tokens:
  white canvas, `#F2F7F4` surface, `brand` keeps literal `#00FF88` for
  fills while `brandText`/ColorScheme.primary take the accessible
  `#00803E` (#00A854 family — pure neon is ~1.3:1 on white, fails AA).
  `mfBrandDeep` pins the gradient-end `#00CC6A`; `mfPastelFills` stays a
  sticker palette with a mint first fill; `mfPastelInk` moves to
  `#0E1A13`. Financial semantics stay distinct, never all-green: income
  emerald, expense rose, transfer cyan (was violet `#7C3AED`/`#A78BFA`
  — inside the purple sweep), warning amber. Dark-first:
  `SettingsPrefs.themeMode` defaults to `ThemeMode.dark` and unknown
  stored modes resolve dark — the settings radios can always leave the
  mode. Feature diffs are color-constant substitutions only: auth
  accent text/icons moved `mf.brand`→`mf.brandText`, the dashboard's
  hardcoded lilac gradient now reads `brandSubtle`→canvas, welcome
  artwork's lilac literals moved to the shared pastel tokens.
  `category_visuals.dart` keeps `Colors.deepPurple` for the stored
  `'violet'`/'Tím' category key — a user-picked web-contract data
  color, not brand chrome (documented inline). Android chrome: launcher
  + widget recolored from sky-blue `#0EA5E9`/white to `#00FF88`/ink,
  all five density PNGs re-rendered. |
  `mf_theme_test.dart` (dark/light token values pinned incl. canvas,
  surface, brand, brandText, transfer; HSV hue sweep asserts no
  235–320° purple family survives in either token set);
  `settings_page_test.dart` (dark-first default + unrecognised-mode
  fallback; mode pick round-trips light→dark→system);
  `android_launcher_icon_test.dart` (launcher bg is `#FF00FF88`);
  `device_features_test.dart` (edit-mode 'Lưu' tap: unfocus field
  before scrolling — the D13 switch grew the form past the test
  viewport and the focused field kept dragging the lazy ListView back);
  `dart format` clean; `flutter analyze` clean; `flutter test` all
  green; `flutter build apk --debug` green; installed on
  UKMBCUTWIFYTOVDQ and walked dashboard/activity/planning/reports/
  capture/settings — screenshots in
  `docs/design/neon-green-migration/` (10 PNGs) pixel-scanned: zero
  purple-suspect pixels on every main screen.
- **FEATURE: D14 category merge — merge_categories RPC + Gộp
  action** |
  `supabase/migrations/20261016210000_merge_categories.sql`,
  `db/neon/migrations/20261016210000_merge_categories.sql` (generated
  twin, byte-identical — no auth refs to rewrite),
  `supabase/tests/database/merge_categories.test.sql`,
  `supabase/tests/database/schema_and_rls.test.sql`,
  `supabase/tests/database/security_definer_contract.test.sql`,
  `mobile/lib/domain/categories.dart`,
  `mobile/lib/data/neon/real_store.dart`,
  `mobile/lib/features/categories/categories_page.dart`,
  `mobile/lib/app/app.dart` |
  Loop B gap D14 (§10 — Monarch/Mon Cash merge): duplicate categories
  ("Ăn uống" vs "Ăn uống 2") split history forever until rows can be
  folded together. One SECURITY DEFINER `merge_categories(uuid, uuid)`
  owns the whole write set — a client-side multi-table sweep could
  never be atomic and would strand the reconciled-row/tenant triggers.
  Guards: auth required, source ≠ target, same kind, target not
  archived, DEFAULT source refused (the seeded pack is the fallback
  category); both category rows lock in ascending-id order so opposite
  concurrent merges cannot deadlock. Reassignment: every
  transaction_entries leg, monthly_budgets row, recurring_commitments,
  recurring_income_templates, inbox_rules and inbox_candidates row
  moves to the target inside one transaction. Conflict policy is
  target-wins with honest drop counts in the jsonb result: a budget
  colliding on (period_kind, anchor) keeps the TARGET's limit and
  drops the source row (the target's number is the last judged fact);
  a duplicate event_budget_categories pair drops the source leg. The
  source ends as an ARCHIVED tombstone — never hard-deleted — so its
  name stays reserved by the (user_id,name,kind) unique key and its
  row stays an audit trail; resurrecting the name would silently
  re-split the merged history. Mobile: the category row overflow gains
  "Gộp vào danh mục khác" on custom rows (defaults can't be sources,
  the callback hides the action on harnesses without the right); one
  AlertDialog explains the reassignment scope + target-wins budget
  rule + no-undo, offers only same-kind live targets, disables Gộp
  until a target is picked and again while in flight (busy guard on
  the non-idempotent RPC). `RealStore.mergeCategory` POSTs the RPC;
  app.dart reloads the tabs on success. Errors map through
  `categoryMergeErrorMessage` — every raised token lands as honest
  Vietnamese, dialog stays open for retry. |
  `merge_categories.test.sql` (15 assertions: moved/dropped ledger
  report, entry/budget/commitment/template/rule/candidate reassignment,
  budget target-wins drop, event-pair dedupe, source archived not
  deleted, weekly non-colliding budget moves, same-id/kind-mismatch/
  archived-target/default-source/not-found/cross-tenant/anon refusals);
  `categories_store_test.dart` (+1: POSTs merge_categories
  with both ids); `categories_page_test.dart` (+3: affordance hidden
  on defaults and when unwired, dialog explains + filters same-kind
  live targets + disabled-until-picked + cancel writes nothing +
  confirm merges and refreshes, error maps to Vietnamese and keeps
  the dialog open).
- **D17 saving-rate line — ALREADY PRESENT, no code change** |
  (verification only — no files touched) |
  Loop B gap D17 (§10 — Monarch 1.10 saving rate): "one summary line
  on reports/dashboard using existing aggregates". The contract is
  fully shipped: `mobile/lib/domain/report.dart:238` declares
  `PeriodReport.savingsRatePercent`, computed at `report.dart:394` as
  `net / income` rounded percent from the period's existing aggregates
  (null when income is zero — no invented 0%); the Báo cáo totals grid
  renders it as the "Tiết kiệm" tile at
  `mobile/lib/features/reports/reports_page.dart:572-584` with the
  "của thu trong kỳ" basis subtitle, an honest "—" for the zero-income
  case, and the same period drill-in tap as the Thu/Chi/Còn lại
  cards. Nothing left to build: a second line would duplicate the
  tile. | `report_test.dart: savingsRatePercent mirrors web rounding;
  null when income is zero` (30% exact, null-guard, 1/3 → 33% round).
- **D16 account "closed" vocabulary — shipped** |
  `mobile/lib/features/accounts/accounts_page.dart`,
  `mobile/lib/features/accounts/account_register_page.dart`,
  `mobile/lib/features/accounts/account_reconciliation_page.dart`,
  `mobile/lib/data/neon/real_store.dart`,
  `mobile/lib/app/app.dart`,
  `mobile/test/accounts_page_test.dart` |
  Loop B gap D16 (§10 — Monarch close-account vocabulary): the archive
  surface now reads "Đóng/Mở lại" — close hides from lists and
  pickers, keeps all history, and reopens anytime, matching Monarch's
  close/reopen contract. The stored field and RPC stay `is_archived` /
  `set_financial_account_archived` — zero schema churn, only labels.
  Section header "Đã lưu trữ" → "Đã đóng"; row action "Khôi phục" →
  "Mở lại"; overflow/long-press "Lưu trữ" → "Đóng" with a confirm
  dialog that now states the full contract ("ẩn khỏi danh sách và bộ
  chọn; giao dịch cũ vẫn giữ — mở lại được bất cứ lúc nào"); snacks
  → "Đã đóng/mở lại tài khoản."; register chip → "Đã đóng";
  reconciliation hint → "Mở lại tài khoản trước…". Debts, categories,
  commitments and trash keep "lưu trữ/Khôi phục" — D16 scoped to
  accounts only. |
  `accounts_page_test.dart: closed accounts group under Đã đóng with
  Mở lại; a close failure surfaces instead of silently keeping put;
  read-only surface shows no Đóng/Lưu trữ affordance` (renamed +
  re-asserted; whole suite green, +1500 tests).

- **D15 refund net-off ("Hoàn tiền") — shipped** |
  `supabase/migrations/20261016220000_transaction_refunds.sql`,
  `db/neon/migrations/20261016220000_transaction_refunds.sql` (twin),
  `supabase/tests/database/refund_net_off.test.sql`,
  `supabase/tests/database/schema_and_rls.test.sql`,
  `supabase/tests/database/browser_role_privileges.test.sql`,
  `mobile/lib/domain/models.dart`,
  `mobile/lib/domain/report.dart`,
  `mobile/lib/domain/weekly_buckets.dart`,
  `mobile/lib/domain/month_summary.dart`,
  `mobile/lib/domain/weekly_digest.dart`,
  `mobile/lib/domain/month_close_digest.dart`,
  `mobile/lib/domain/watchlist.dart`,
  `mobile/lib/data/neon/real_store.dart`,
  `mobile/lib/data/capture_draft.dart`,
  `mobile/lib/data/offline_queue.dart`,
  `mobile/lib/features/capture/capture_page.dart`,
  `mobile/lib/features/capture/capture_submit.dart`,
  `mobile/lib/features/activity/activity_page.dart`,
  `mobile/lib/features/accounts/account_register_page.dart`,
  `mobile/lib/app/app.dart`,
  `mobile/test/report_test.dart`,
  `mobile/test/weekly_buckets_test.dart`,
  `mobile/test/month_close_digest_test.dart`,
  `mobile/test/weekly_digest_test.dart`,
  `mobile/test/watchlist_test.dart`,
  `mobile/test/capture_audit_test.dart`,
  `mobile/test/capture_draft_test.dart`,
  `mobile/test/offline_queue_test.dart`,
  `mobile/test/device_features_test.dart` |
  Loop B gap D15 (§10 — Simplifi 5.7/PocketGuard 7.3): "Hoàn tiền
  currently distorts category totals" — money back recorded as income
  inflated Thu and left the spend category untouched. Now a boolean
  `is_refund` on `financial_transactions` (NOT NULL default false, CHECK
  pins refund ⇒ income): the row stays income-kind in the ledger (cash
  really arrived — balance/register/timeline unchanged) but carries the
  EXPENSE category it reimburses, and every report aggregate nets it
  there — period totals/category/payee/account sections, category
  deltas, weekly chart buckets, month summary, weekly/month digests,
  watchlist spend. Budget + event-budget views net the same way. Write
  contract: `create_money_transaction` + `p_is_refund` (validated
  income-kind + expense-category, flag inside the idempotency intent so
  a flipped-flag replay fails closed), `update_money_transaction` +
  `p_is_refund` null-preserves and re-validates on the effective flag;
  flag exempt from the reconciled-field diff like
  `excluded_from_reports`. Capture UI: a "Hoàn tiền" switch on Thu rows
  swaps the category pool to expense categories, serializes through
  drafts and the offline queue (which also gained the D13
  `excludedFromReports` field it was missing); activity and register
  rows label the row "Hoàn tiền". |
  `refund_net_off.test.sql` 18 pgTAP assertions (column/default, CHECK,
  feed + deleted-feed, create/validate/idempotent-replay, update
  preserve/flag/unflag, cross-tenant + anonymous refusal, budget
  netting pinned and recomputed independently); `report_test.dart` D15
  group (netting, negative bucket, delta); `weekly_buckets_test.dart`,
  `month_close_digest_test.dart` (incl. baseline netting),
  `weekly_digest_test.dart`, `watchlist_test.dart` refund cases;
  `capture_audit_test.dart` D15 group (switch visibility by kind,
  category-pool flip clears stale pick, flag on intent, edit
  preserve/unflag); `capture_draft_test.dart` + `offline_queue_test.dart`
  codec fields. Gates: dart format → flutter analyze clean →
  flutter test +1512 all green; embedded pgTAP suite all green;
  `npm run check:migrations` (95 pinned) + `check:rls` pass.
- **D18 needs-review home widget — shipped** |
  `mobile/lib/data/widget_snapshot.dart`,
  `mobile/lib/data/quick_action.dart`,
  `mobile/lib/features/dashboard/dashboard_page.dart`,
  `mobile/lib/app/app.dart`,
  `mobile/android/app/src/main/kotlin/app/moneyflow/moneyflow/QuickActionContract.kt`,
  `mobile/android/app/src/main/kotlin/app/moneyflow/moneyflow/WidgetSnapshotContract.kt`,
  `mobile/android/app/src/main/kotlin/app/moneyflow/moneyflow/QuickCaptureWidgetProvider.kt`,
  `mobile/android/app/src/main/res/layout/widget_quick_capture.xml`,
  `mobile/android/app/src/main/res/values/strings.xml`,
  `mobile/test/widget_snapshot_test.dart`,
  `mobile/test/quick_action_test.dart`,
  `mobile/android/app/src/test/kotlin/app/moneyflow/moneyflow/WidgetSnapshotContractTest.kt`,
  `mobile/android/app/src/test/kotlin/app/moneyflow/moneyflow/QuickActionContractTest.kt` |
  Loop B gap D18 (§10 — Monarch 1.14 review-count widget): the
  home-screen widget gains a "Chờ duyệt" row showing the pending inbox
  count, and tapping it deep-links to the inbox — zero-open triage.
  `WidgetSnapshot` carries `pendingReview` (int?); the dashboard writes
  it via a dedicated tri-state read of `loadPendingCount` — absent seam
  or failed read → null (row hides), real read → the count, including a
  verified 0. This is deliberately NOT the `_loadAttention` value: that
  one folds absent/failed into 0 because a hidden card section needs no
  distinction, while a persisted launcher figure must never quote a
  fabricated zero. Scope: the count tallies exactly the queue its deep
  link opens — pending drafts only; posted needs_review rows keep their
  activity-feed destination via the attention card (DECISIONS.md).
  Kotlin: `Snapshot.pendingReview` (negative → clamped 0, absent/null →
  unknown), `Rendered.review` ("N mục", null hides the row — GONE on
  absent/stale snapshot too), new review row in the layout, and a
  `quick=review` PendingIntent crossing MainActivity's allowlist —
  `QuickActionContract.ACTION_REVIEW` added to both sides. Dart
  `_onQuickAction` now dispatches capture|review; the held-action slot
  generalized from a bool to `String? _pendingQuickAction` so a held
  review drains post-unlock. Demo maps review to the seeded inbox —
  honest destination, read-only writes as usual. |
  `widget_snapshot_test.dart` (+4: JSON contract key, dashboard writes
  the count, absent seam → null, failed read → null);
  `quick_action_test.dart` (+3: cold-start review opens demo inbox,
  warm review opens inbox, held review waits for biometric unlock);
  `WidgetSnapshotContractTest.kt` (+4 asserts: decode/absent-null/
  negative-clamp; render row, verified-zero renders, unknown hides,
  stale hides);
  `QuickActionContractTest.kt` (review accepted, REVIEW/'review '
  rejected). Gates: `dart format` clean; `flutter analyze` clean;
  `flutter test` all green; `./gradlew :app:testDebugUnitTest`
  BUILD SUCCESSFUL.
- **D19 reconcile cadence nudge — shipped** |
  `mobile/lib/data/notifications.dart`,
  `mobile/lib/features/accounts/account_register_page.dart`,
  `mobile/lib/app/app.dart`,
  `mobile/test/notifications_test.dart`,
  `mobile/test/account_register_test.dart` |
  Loop B gap D19 (§10 — Simplifi reconcile cadence): an optional
  monthly "statement day" reminder per account, living on the
  register's "Đối soát" card as a dense second row — set it and the
  device nudges at 09:00 on that day to open MoneyFlow and compare the
  balance. Pure device-local opt-in: `ReconcileReminderPrefs` stores
  `{accountId: day}` under `mf_reconcile_reminder_days` (corrupt or
  out-of-range reads fold to absent — a bad pref costs one reminder,
  never crashes); `planReconcileReminders` is a pure arm-list — day
  ≤28 rides ONE `dayOfMonthAndTime` repeat keyed `recon:<accountId>`,
  days 29–31 ride `eomReminderHorizonMonths` clamped one-shots keyed
  `recon:<accountId>#yyyyMM`, exactly the commitment-dues rule the
  plugin's exact-day scan requires (a repeating 31st would silently
  skip February). Armed set re-resolves against the LIVE accounts
  list: a deleted or closed account's nudge dies on the next pass —
  `cancelAllReconcileReminders` also runs on account deletion beside
  the digest cancels. The `recon:` namespace shares the
  `mf_commitment_notif_ids` allocator map but each scheduler's sweep
  keeps only its own keys (`_sweepNotifIds` shared helper). Re-arm
  cadence: every dashboard `loadAccounts` (the freshest roster),
  plus fire-and-forget after each pref write. The UI copy states the
  clamp honestly on the row and in the dialog ("Tháng thiếu ngày sẽ
  nhắc vào ngày cuối tháng"); the picker preselects the stored day →
  latest completed statement day → ngày 1, never an invented
  midpoint. Failed pref reads render "Chưa tải được cài đặt nhắc"
  instead of faking unset; save/clear ride a `_reminderBusy` guard;
  demo wires neither seam so the row never dead-renders. |
  `notifications_test.dart` (+5: prefs round-trip/clear/corrupt;
  planner repeating key, 29–31 clamped one-shot horizon, dropped
  missing/archived/invalid accounts);
  `account_register_test.dart` (+9: row hidden without seams or
  without the recon strip, unset/stored/failed-read states, save
  through the seam, EOM-clamp disclosure, statement-day preselect,
  Tắt nhắc clears). Gates: `dart format` clean; `flutter analyze`
  clean; `flutter test` all green.
