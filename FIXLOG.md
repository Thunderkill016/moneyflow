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
