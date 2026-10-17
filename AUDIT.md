# AUDIT — MoneyFlow Android (`mobile/`)

Adversarial audit of the Flutter Android app, dated 2026-10-16, on branch
`feat/mobile-theme`. Scope: money correctness, backend/security, Android/Play
compliance, UX, performance. Inputs read first per the audit task:
`PROGRESS.md`, `RESEARCH_TOP_FINANCE_APPS.md`, `AGENTS.md`, `CLAUDE.md`.

Format: `ID | Severity (P0=money-loss/crash/security, P1=major UX/data,
P2=polish) | file:line | repro | expected fix`. Sorted P0 → P2.

Existing coverage cited where it already pins the invariant; every uncovered
invariant is filed as a finding requiring a test.

---

## P0 — money-loss / crash / security

**Checked, none found.**

HOW checked:

- Double-post surface-by-surface: every ledger write is RPC-routed
  (`create_money_transaction`, `create_split_expense`,
  `create_account_transfer`, `pay_recurring_commitment`,
  `record_recurring_income_template`, `approve_inbox_candidate`,
  `import_inbox_batch`) and carries a client `p_idempotency_key`
  (`mobile/lib/data/neon/real_store.dart:374-431,663-669,916-922,1154`).
  The capture form holds ONE key per form instance across retries
  (`mobile/lib/features/capture/capture_page.dart:159`), covered by
  `test/capture_submit_test.dart` and `test/offline_queue_test.dart:283-284`.
  The two paths that DO generate fresh keys per attempt are filed below as
  P1-4/P1-5 because they are retry-dependent, not single-tap paths.
- Hard deletes: no unguarded `DELETE` reaches the ledger — transaction
  removal is `soft_delete_money_transaction`
  (`real_store.dart:776-778`); `permanently_delete_money_transaction`
  (:794-806) is only reachable from the trash page on already-trashed rows
  (`mobile/lib/features/activity/trash_page.dart`); category/rule/budget
  deletes are server-guarded RPCs (:351, :871, :1250). Covered by
  `test/trash_test.dart`.
- Credential storage: session token lives in `flutter_secure_storage` with
  a one-way migration out of plaintext SharedPreferences
  (`mobile/lib/data/session_store.dart`); Data API calls send
  `Authorization: Bearer <JWT>` scoped by Postgres RLS
  (`mobile/lib/data/neon/data_api.dart`). Covered by
  `test/session_store_test.dart`, `test/session_restore_test.dart`.
- Endpoint trust: release builds refuse missing endpoints and every mode
  rejects non-HTTPS / non-`*.neon.tech` hosts and userinfo/fragment URLs
  (`mobile/lib/data/neon/neon_config.dart:59-101`). Covered by
  `test/neon_config_test.dart`.
- Cross-account replay: offline queue is keyed by userId and the drain loop
  re-checks the epoch mid-pass so a held capture can never post under the
  next account's JWT (`mobile/lib/data/offline_queue.dart:374-402`);
  parked notification text is owner-bound and dropped unread for anyone
  else (`.../NotificationCaptureService.kt:96-120,160-179`). Covered by
  `test/offline_queue_test.dart`, `test/notification_capture_test.dart`.

## P1 — major UX / data

- **P1-1** | P1 | `mobile/lib/data/neon/auth_client.dart:187`,
  `mobile/lib/data/google_sign_in.dart:109` | `debugPrint` logs the full
  verifier-exchange URL and the loopback callback URI — both carry
  `neon_auth_session_verifier` in the query (`finishGoogleRedirect` forwards
  `redirectUri.query` verbatim). `debugPrint` is NOT stripped in release
  builds, so a session-exchange credential lands in Android logcat readable
  via `adb logcat` while the verifier is still live. | Remove or redact the
  URL (log only the status, like `auth_client.dart:203` already does);
  add a test asserting the verifier string never reaches the log seam.
- **P1-2** | P1 | `mobile/lib/data/share/inbox_paste_parser.dart:161,164`,
  `mobile/lib/domain/csv_import.dart:416,419` | `int.parse` (not
  `tryParse`) runs on unbounded `\d+` runs — verified:
  `int.parse("99999999999999999999")` throws
  `FormatException: Positive input exceeds the limit of integer`. The
  throw propagates through `parseInboxPasteText` into
  `inbox_page.dart:1143` `_analyze` (no try/catch — the tap silently
  no-ops in release), through `parseInboxPasteLine` at
  `bank_notification_parser.dart:161` inside the unawaited
  `_handle` (unhandled async error; the event is never marked seen or
  counted), and through `parseCsvAmountCell` in CSV row parsing (one bad
  cell kills the whole import). A ≥20-digit run is realistic in bank
  reference/OTP fields. | Switch both sites to `int.tryParse` + the
  existing `_safeInt` bound; add tests for ≥20-digit tokens in
  `test/share_text_parser_test.dart`/`test/inbox_test.dart`/
  `test/csv_import_test.dart` mirroring `test/money_test.dart:103`.
- **P1-3** | P1 | `mobile/lib/data/share/share_text_parser.dart:174`
  | `whole * scale` multiplies BEFORE `_plausibleAmount` bounds the
  result (:194) — the bound sees the already-wrapped value. Verified
  arithmetically: `18446744073710 * 1000000` wraps to `448384` in int64,
  so shared text `"GD -18446744073710tr"` prefills a capture amount of
  448.384đ — wrong money presented as plausible. Review-gated (prefill
  only, never auto-posts), but it is exactly the class `money.dart`
  guards against and `test/money_test.dart:103` pins for
  `parseMoneyInput`; this parser copy has no equivalent
  (`share_text_parser_test.dart:31` only covers the grouped-digit
  bound). | Bound-check `whole > _maxSafeAmount ~/ scale` BEFORE
  multiplying; add the `18446744073710tr` regression test.
- **P1-4** | P1 | `mobile/lib/app/app.dart:2206,2231,1469` |
  `payCommitment`, `receiveIncome` and the balance-adjustment
  `createTransaction` call `newIdempotencyKey()` per invocation — a
  retry after a lost response (timeout → user re-taps) sends a
  DIFFERENT key, so the RPC's dedupe cannot fire and the ledger can
  take a duplicate expense/income. Server-side uniqueness (e.g. one
  payment per commitment per month) may partially mitigate — MUST be
  verified in the migrations; regardless, the client defeats its own
  dedupe contract. Contrast `capture_page.dart:159` (one key per form,
  correct). | Mint the key once per dialog/tile action and reuse on
  retry; verify the RPC's per-month constraint; add a "same key on
  retry" test in `test/planning_store_test.dart`.
- **P1-5** | P1 | `mobile/lib/features/planning/planning_page.dart:636,1334,1431`,
  `mobile/lib/features/accounts/accounts_page.dart:465` | Dialog
  confirm buttons stay enabled during the in-flight `await` (no
  submitting/`_busy` flag — compare the guarded `_busy` pattern at
  `inbox_page.dart:623,893`), and the backing RPCs are non-idempotent:
  `adjust_savings_goal` is a pure delta (double-tap doubles the
  deposit — `real_store.dart:972`), `create_financial_account` has no
  key/natural dedupe (double-tap → duplicate wallet whose opening
  balance inflates totals — :727); the same holds for
  `upsert_savings_goal`/`upsert_recurring_commitment`/
  `upsert_recurring_income_template`/`upsert_inbox_rule` creates
  (null id → duplicate rows on retry — :952, :880, :633, :1216). |
  Add a per-dialog `submitting` flag disabling the confirm button;
  add `p_idempotency_key` (or natural-key upserts) for the delta and
  create RPCs; add double-tap widget tests.
- **P1-6** | P1 | `mobile/lib/features/capture/capture_page.dart:168`,
  `mobile/lib/features/reports/reports_page.dart:106,132,364,386,407,431`,
  `mobile/lib/features/planning/planning_page.dart:205,279,1666`,
  `mobile/lib/app/app.dart:1466,1782,2059-2064`,
  `mobile/lib/features/dashboard/dashboard_page.dart:231,252,301`,
  `mobile/lib/domain/weekly_digest.dart:52` | "Today"/month
  boundaries derive from device-local `DateTime.now()` on these
  surfaces while `activity_page.dart:292`, `timeline_page.dart:69`,
  `voice_capture_page.dart:66` and `bank_notification_parser._vnDate`
  hardcode UTC+7 — two competing rules for the same calendar. Worst
  cases are writes: `capture_page.dart:168` stores a device-local
  `occurredOn`, and `app.dart:_today/_monthStart` feed
  `pay_recurring_commitment`/`record_recurring_income_template`
  `p_month_start`/`p_paid_on` — on a non-Asia/Saigon device (travel,
  work profile, emulator) the ledger permanently records the wrong
  date/month, and feed vs. reports disagree. | One domain helper
  (`vnToday()`/`vnMonthStart()` alongside `report.dart`'s `ymd`)
  used by every surface; tests pinning +7 grouping under a fake
  non-VN device clock.

## P2 — polish

- **P2-1** | P2 | `mobile/lib/features/capture/capture_page.dart:159-240`,
  `mobile/lib/features/voice/voice_capture_page.dart` | No
  `RestorationMixin`/restorable state anywhere in `lib/` (grep: zero
  matches) — process death while the capture form, voice sheet, or
  inbox review edits are open loses all typed input. The realistic
  flow is switching to a banking app to check the amount and coming
  back to an empty form. Held queue entries and parked notification
  drafts DO persist (`offline_queue.dart`,
  `NotificationCaptureService.kt:148-155`) — the gap is manual form
  state. | `RestorationMixin` on the capture form fields (or an
  account-scoped draft in SharedPreferences); a state-restoration
  widget test.
- **P2-2** | P2 | `mobile/lib/features/activity/activity_page.dart:728-769`
  | The feed uses `ListView(children: [...])` — every loaded page
  builds the full row set eagerly (30 rows/page × N "Xem thêm"
  presses plus day-header wrappers), while inbox/timeline use
  `ListView.builder` (`inbox_page.dart:452`,
  `timeline_page.dart:252`). Jank grows linearly
  with loaded history. | Switch to `ListView.builder` with
  keyed items; add a 300-row scroll perf test.
- **P2-3** | P2 | `mobile/lib/data/neon/neon_config.dart:5-6,109-113`
  | Header comment claims dev defaults point at the
  "moneyflow-acceptance-sandbox" but `_devAuth`/`_devApi` are the
  `moneyflow-prod` endpoints ("the only backend" per :109) — a plain
  `flutter run` writes developer/test activity into the production
  database and the comment lies about it. | Fix the stale comment;
  document (or gate) prod-write-from-debug in `mobile/README.md`.
- **P2-4** | P2 | `mobile/lib/app/delete_account.dart:158-169`,
  `mobile/lib/data/neon/auth_client.dart:213-215,286-313` | Google
  re-auth that signs into a DIFFERENT account is correctly detected,
  but the recovery is `restoreSession(prior.sessionToken)` — if that
  call throws (5xx/timeout per :307-309) the dialog shows an error
  while `_auth` still holds the stranger's in-memory session and
  cached JWT (`_jwt` set by `_cacheJwt` during
  `finishGoogleRedirect`, never invalidated on this path) — the app
  keeps issuing Data API calls under the wrong tenant until the JWT
  expires or the app restarts. | On restore failure, force full
  session/JWT invalidation and require re-login; add a test for the
  failed-restore path.
- **P2-5** | P2 | `mobile/android/app/build.gradle.kts:91-103` |
  Release builds enable no `isMinifyEnabled`/`isShrinkResources`/R8 —
  the Kotlin bridge/service code and resources ship unshrunk
  (Dart AOT limits the upside, but the AAB is larger and Java/Kotlin
  stays readable). | Enable R8 shrinking with keep rules for the
  plugin/service entrypoints; smoke-test the release AAB on device.
- **P2-6** | P2 | `mobile/lib/domain/voice_money_parser.dart:285` |
  `total.round()` has no `_maxSafeAmount` clamp — an absurd spoken
  amount saturates to int64 max (verified: `9e20.round()` →
  `9223372036854775807`) instead of failing. Bounded downstream by
  the `parseMoneyInput` re-parse at `voice_capture_page.dart:367`,
  so only the "Mình nghe được" chip shows the absurd figure. | Clamp
  at `_maxSafeAmount`; add an out-of-range phrase test to
  `test/voice_money_parser_test.dart`.
- **P2-7** | P2 | `mobile/lib/app/app.dart:286-358` | Cold start
  blocks the gate decision on `restoreSession` → `/get-session`
  (10s connect timeout + up to 30s inactivity timeout in
  `neon_transport.dart`) — on a slow network the boot spinner can
  sit ~40s before `_restoreOffline` engages, with no progress or
  "still trying" affordance. | Bound the wait (shorter session probe
  or early offline render); document the worst case; a transport-
  seam test for the timeout path.

---

## Checked areas — no findings

- **Money integer VND**: storage/RPC paths are integer đồng end-to-end;
  `formatMoney`'s float division and report share/savings-rate doubles are
  display/statistics only, never persisted
  (`mobile/lib/domain/money.dart`, `report.dart:229,323`). Parser overflow
  is guarded for `parseMoneyInput` — `test/money_test.dart:103-104`.
  The two parser copies that re-implement the bound incorrectly are
  P1-2/P1-3.
- **Transfers**: `create_account_transfer`/`update_account_transfer` are
  single atomic RPCs; transfers are excluded from income/expense totals
  (`report.dart:274-316`, `inbox.dart` kinds). `test/report_test.dart`,
  `test/quick_parse_test.dart`.
- **Idempotency on primary write path**: capture, split, transfer, inbox
  approve (candidateId IS the key), import batch — all keyed; queue replay
  preserves the same key (`offline_queue.dart:348-353`). The gaps are
  P1-4/P1-5 (secondary writes).
- **Permissions**: `INTERNET`, `USE_BIOMETRIC`, `POST_NOTIFICATIONS`,
  `RECEIVE_BOOT_COMPLETED`, `RECORD_AUDIO` — no `READ_SMS`,
  `READ_CALL_LOG`, contacts, or exact-alarm permissions
  (`AndroidManifest.xml:2-18`); notification listener is
  `BIND_NOTIFICATION_LISTENER_SERVICE`-protected and fires only after an
  explicit OS grant + in-app opt-in (:85-98, `NotificationCaptureService.kt
:40-46`).
- **Backup hygiene**: `allowBackup=true` with both rule files excluding
  `FlutterSharedPreferences.xml`, all secure-storage files, and
  `mf_notif_pending.xml` (raw bank-notification text) from cloud backup and
  device transfer — `test/android_backup_rules_test.dart`.
- **Shared-text injection**: ACTION_SEND text only ever prefills the
  capture form — no auto-post, no formula/HTML evaluation, note is
  trimmed+clipped (`share_text_parser.dart`, `app.dart:474-485`).
  `test/share_text_parser_test.dart`.
- **English UI strings**: grep across `mobile/lib/features/**` finds none
  in user-facing widgets; the English literals in `inbox.dart:567-568` /
  `reconciliation.dart:421-422` are backend error-code detectors, not
  display text.
- **Design tokens**: palette is tokenized in `mobile/lib/theme/mf_theme.dart
:84-103`; no literal `#D92D20` — mobile's expense token is `0xFFE11D48`
  (intentional mobile palette, `test/mf_theme_test.dart`). Money does not
  rely on color alone (kind labels/icons throughout).
- **Empty/error states**: `EmptyStateCard` present on dashboard, activity,
  trash, timeline, inbox, voice gates, accounts, capture
  (`activity_page.dart:526-541`, `inbox_page.dart:416-461`,
  `timeline_page.dart:238-244`, `accounts_page.dart:180`); activity load
  failure shows "Không tải được…" + retry (`activity_page.dart:716-727`).
- **FAB overlap**: no FloatingActionButton — the capture affordance is an
  inline center button inside a `SafeArea`-wrapped bottom bar
  (`app/home_shell.dart:72,139`), so nothing floats over list content.
- **Retry storms**: `drainQueuedCaptures` stops the pass on the first
  transport fault (`offline_queue.dart:391-403`), drains only on
  session-restore/capture-submit/manual-retry triggers
  (`app.dart:342,411,723`), and the queue caps at 20 held intents.
  `test/offline_queue_test.dart`.
- **Biometric lock**: opt-in, fail-open on absent hardware, re-locks on
  `paused`/`hidden`/`detached` (not on `inactive`, so the prompt itself
  doesn't deadlock), blocks double-prompts
  (`app/biometric_lock.dart:116-146`). `test/biometric_lock_test.dart`.
- **Notification timezone correctness**: `flutter_local_notifications`
  scheduling uses device tz deliberately (alarms should fire at local
  19:00); the April→May `TZDateTime` overflow is regression-tested at
  `test/notifications_test.dart:21`. The +7-vs-device-local SPLIT on
  ledger dates is the finding (P1-6), not the scheduler itself.
- **Sign-out/wipe**: `wipeLocalData` removes `mf_*`/`neon.` keys,
  `clearSignOutResidue` drops unscoped residue, Kotlin pending queue is
  cleared via `unbind`→`clearPending`, account-scoped offline captures
  survive sign-out by design (`delete_data.dart`, `app.dart:1123-1152`).
  `test/delete_data_test.dart`.
- **Cold-start entry points**: share/quick-action intents are consumed
  once and sanitized via allowlist (`MainActivity.kt:191-237`,
  `QuickActionContract.kt`); OAuth callback can't push a stray route.
  `test/quick_action_test.dart`.

## Totals

- **P0: 0**
- **P1: 6**
- **P2: 7**

Top three:

1. **P1-1** — session verifier written to release logcat (security).
2. **P1-2** — `int.parse` throws on ≥20-digit tokens through the
   SMS-paste, notification-pipeline and CSV-import paths (silent hard
   failure on hostile/malformed input).
3. **P1-4/P1-3** — fresh idempotency keys per attempt on money-posting
   RPCs (double-post risk), and the int64 wrap-before-bound that prefills
   wrong money in the shared-text path. (P1-3 is arguably the sharpest
   single-line fix; P1-4 needs the RPC contract verified before
   severity is final.)

---

## Re-audit — Loop B feature surface (2026-10-17)

Second adversarial pass over the files touched since this audit
(`e637143a..HEAD` — 63 files, ~10k insertions: Loop A fixes, the
neon-green theme migration, and every D1–D24 Loop B feature). Scope and
method per the close-out brief: money correctness, leaked secrets,
unguarded writes, dead affordances — the Loop B feature files and their
new seams, not a whole-app re-read.

**Result: no new P0/P1/P2.** What was checked, and why it clears:

- **Money correctness**: every new money path is integer `*_minor`
  end-to-end (debts, event budgets, watchlist thresholds, history purge
  report parse — fail-closed `StateError` on shape drift in
  `domain/history_purge.dart:55`). Refund netting (D15) is applied
  consistently in month summary, month-close digest, watchlist and
  budget/event progress — never flipping `income` semantics. `double`
  appears only in display pace/percent stats (`eventPace`,
  `budgetPeriodPace`), never persisted. New `int.parse`/`DateTime.now()`
  sites all operate on self-formatted `yyyy-MM-dd` substrings, draft-age
  TTL, or date-picker bounds — no ledger date derives from the device
  clock (post-P1-6 rule holds: `vnToday()`/`vnNow()` in every new write
  path — debts_page, events_page, delete_history all comply).
- **Leaked secrets**: the only new `debugPrint` sites are the P1-1 fix
  itself (path-only callback log + `_redactedError` in
  `google_sign_in.dart`). No token/JWT/verifier reaches a log seam;
  widget snapshot JSON carries figures only
  (`data/widget_snapshot.dart:38-43`), stored under `mf_`-prefixed
  SharedPreferences inside the wipe/backup-exclusion contracts. Every
  new prefs key is `mf_`-scoped (`mf_watch_items`,
  `mf_rule_corrections.*`, `mf_register_running_balance`,
  `mf_month_digest_enabled`, `mf_reconcile_reminder_days`,
  `mf_capture_draft.<uid>`, `mf_quick_fills.<uid>`); the `recon:` alarm
  keys live inside the `mf_commitment_notif_ids` allocator map.
- **Unguarded writes**: posting RPCs carry per-dialog/per-operation
  `p_idempotency_key` (`apply_debt_repayment`, `create_event_budget`,
  plus the P1-4 `OperationIdempotencyKeys` on recurring ops). The
  intentionally key-less creates (`create_debt`,
  `create_financial_account`, `upsert_*`, `adjust_*`, `merge_categories`,
  `delete_transactions_before`) each sit behind a `submitting`/`_busy`
  dialog guard with cancel lockdown — the documented DECISIONS.md
  contract. Edits pin `p_expected_updated_at` where the RPC supports it
  (event budgets). `delete_transactions_before` is atomic server-side,
  discloses `locked` survivors, and the UI gates on typed-XÓA +
  vnToday-capped cutoff + source scopes (`app/delete_history.dart`).
- **Dead affordances**: every new surface is seam-gated — purge row
  hides in demo, watch-pin renders only with both read+write seams,
  register eye-toggle appears only after the pref loads with a writer,
  debts/events enter the menu only when the signed-in store supplies
  them, reconcile nudge re-resolves against the live account roster so a
  deleted wallet's alarm dies. Deep-link `quick=review` is allowlisted
  at `QuickActionContract.kt:29` — forged extras can't route.
- **Schema additions** (D1/D2/D12/D13/D14/D15/D21 migrations):
  SECURITY DEFINER RPCs keep `set search_path = ''` + `auth.uid()`
  tenancy, tables stay RLS select-only under `guard_oauth_mutation`,
  and each landed with pgTAP + `check:migrations`/`check:rls` green at
  its commit head. Migrations are committed but NOT applied to
  production Neon — owner approval gate per repo rules.

Minor observations below finding threshold (recorded, not filed):
`formatMonthDayLabel`-style helpers `int.parse` self-formatted date
substrings — same convention as existing `ymd` helpers; and the D24
hashtag qualifier is documented-substring, not token-boundary — a
deliberate recall-over-precision choice noted in
`transaction_query.dart`.
