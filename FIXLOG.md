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
