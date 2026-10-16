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
