# Flutter native client for MoneyFlow

**Status:** specified  
**Execution state:** specified  
**Active role:** planner  
**Permission scope:** read_only  
**Owner:** human owner (explicit direction: "chuyển toàn bộ sang flutter", 2026-10-12)  
**Issue/PR:** TBD — create tracking issue before implementation  
**Last updated:** 2026-10-12

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

MoneyFlow runs as a native Android/iOS application built with Flutter, against the
existing production backend (managed auth + Neon Data API/PostgREST with RLS),
while preserving every product invariant of the web product: integer-đồng money,
transfers-never-income, soft delete, tenant isolation, and honest "not yet"
capability labels. The web product remains live through migration; sunsetting it
is a separate owner decision.

## Repository reconnaissance

### Current behavior

- Shipped product is a Next.js web app (`src/`), responsive, installable PWA:
  `src/app/manifest.ts` (standalone, portrait, VI locale, shortcuts,
  `share_target`), `public/sw.js` (notification click handling + offline
  session cache), `src/components/install-app-page.tsx`.
- Auth: `MF_BACKEND_PROVIDER` selects `neon` (production) or `supabase`.
  Neon path: `__Secure-neon-auth.session_token` cookie →
  `{authBaseUrl}/get-session` → `set-auth-jwt` response header →
  PostgREST-bound JWT for the Neon Data API. Bearer JWT is also verified for
  API/MCP callers (`verifyNeonBearerJwt` in `src/lib/neon/server.ts`).
- Demo mode: browser-local storage (`NEXT_PUBLIC_APP_MODE=demo`).
- Domain truth lives in `src/lib/**` (417 TS modules): money, ledger,
  matching, budgets, commitments, goals, reports.
- Server loaders/actions in `src/server/**` (45 modules) and `src/app/actions`.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/lib/**` | Domain rules to port to Dart | Port subset by phase; never duplicate financial truth |
| `src/server/auth.ts`, `src/lib/neon/**` | Auth + JWT contract the Flutter client must satisfy | Reuse as contract reference |
| `db/migrations/**` | Schema + RLS the Data API enforces | Reuse unchanged — backend stays |
| `docs/product/CANON.md` | Stage gates; line ~198 defers "native mobile" until Stage 0/1 proven | Owner override recorded in this packet (explicit authorization) |
| `docs/product/PRINCIPLES.md` | Product law (trust, honest capability) | Applies unchanged to the Flutter client |
| `public/sw.js`, `src/app/manifest.ts` | PWA capabilities Flutter must match or exceed | Parity checklist source |

### Existing tests and constraints

- Ledger/domain unit tests in `src/lib/*.test.ts` define expected behavior;
  the Dart port must reproduce these cases as its contract suite.
- RLS/tenant isolation tests (`npm run test:db`) protect the shared backend —
  unchanged by adding a client.
- Product rules: VND integer-only, transfers never income/expense, soft delete,
  no invented balances/dates, RLS isolation, progressive disclosure.

### Similar implementation and recent history

- The Neon seam (`src/lib/neon/**`, `src/lib/backend/provider.ts`) already
  proves the backend is client-agnostic HTTP: cookie session OR bearer JWT.
- PWA share_target (`src/app/api/share-target/route.ts` +
  `src/lib/inbox/share-target-security.ts`) defines the intake contract a
  native share receiver must honor.

### Open questions

- [ ] Web product end-state after Flutter parity: coexist (recommended —
      PWA already covers web) or sunset? Owner decision, not blocking.
- [ ] SMS/notification-listener acquisition: separate privacy-scoped
      authorization required before any implementation — excluded from this
      packet's implementation scope.
- [ ] iOS: no Apple developer account confirmed; Android-first until confirmed.
- [ ] Package/repo placement: `mobile/` inside this monorepo (proposed) —
      keeps one PR-record system and the domain spec in-tree.

## Research

### Research scope and source selection

- Decision question: which native stack and which auth/data transport can a
  non-browser client use without changing the backend?
- Source budget: 4 focused sources used.
- Expected decision: stack choice + transport proof for managed auth.

### Questions researched

1. **Backend portability.** `src/lib/neon/server.ts` shows auth and data are
   plain HTTP: `POST {authBaseUrl}/sign-in/email` (Better Auth REST) sets the
   session token; `/get-session` exchanges it for a PostgREST JWT via the
   `set-auth-jwt` header; the Data API then enforces RLS. A Dart `http` client
   with a cookie jar reproduces this verbatim. **Backend needs zero changes.**

2. **Stack options.** Evaluated Capacitor wrap (keeps web code, ~days, but is
   still a webview — device APIs only via plugins, remote-URL apps draw store
   scrutiny), Flutter (full rewrite but real native UX, strongest VN Android
   coverage, owner-directed), React Native/Expo (reuses React paradigm but
   still rewrites all UI and adds a second JS toolchain). Owner selected
   **Flutter**; analysis agrees it maximizes the device-capability ceiling
   that motivated the authorization (SMS/notification capture, biometric,
   widgets).

3. **Domain portability.** `src/lib/**` is framework-free TypeScript — pure
   functions over plain data. Dart `int` is 64-bit native: integer-đồng maps
   safely (đồng magnitudes never approach 2^63). Rule: ported modules carry
   the same behavior, verified by porting the existing unit-test cases first
   (contract tests before screens).

4. **Offline.** Flutter app stores session JWT + a per-user local cache; the
   web's `sw.js` offline-session pattern (show last truth, never fabricate)
   is the behavioral contract to mirror — no invented balances offline.

## Specification

### Architecture

```text
mobile/                          Flutter app (Dart)
  lib/
    domain/                      ported src/lib modules (pure Dart, no Flutter)
    data/                        postgrest client, auth client, secure storage
    features/<feature>/          screens + view models (dashboard, capture, ...)
    app/                         router, theme, mode flag (demo/auth)
  test/                          contract tests mirrored from src/lib

backend (unchanged)
  Better Auth REST  ── session token ──►  /get-session ──► PostgREST JWT
  Neon Data API (PostgREST + RLS)  ◄── bearer JWT per request
```

- `demo` mode on device-local storage mirrors web demo semantics.
- No second source of financial truth: all reads/writes go through the Data
  API (authenticated) or local demo store (demo mode) — same seam rule as web.
- Design system ports as tokens, not screenshots; VI locale first.

### Phases

- **P1 (this packet's first implementation):** Flutter scaffold in `mobile/`;
  auth flow verified against managed auth (sign-in → session → JWT → one RLS
  read) with a headless Dart smoke test; demo mode with local seed.
- **P2:** Domain port tranche 1: money, account, transaction kinds, balance
  math — with mirrored unit tests.
- **P3:** MVP surfaces: dashboard, accounts, capture (income/expense/transfer),
  activity feed — authenticated mode.
- **P4:** budgets, commitments, goals, reports.
- **P5:** device capabilities: share receiver (parity with share_target),
  local notifications, biometric lock, offline cache.
- **P6:** parity review, store release mechanics, web end-state decision.

### Explicit non-goals

- No SMS/notification-listener capture (separate authorization required).
- No household/wealth/AI mutation features — canon gates unchanged.
- No backend schema, RLS or provider changes.
- No changes to the web app's features or screens in this packet.

## Plan

1. Land this packet (PR) + open tracking issue.
2. Verify auth transport in isolation: Dart script exercising
   sign-in → `/get-session` → `set-auth-jwt` → one RLS-scoped Data API read
   against the dev fixture DB. Fail here = stop, do not scaffold.
3. Scaffold `mobile/` (Flutter stable), mode flag, demo seed, router/theme.
4. Port domain tranche 1 + mirrored tests.
5. Build MVP surfaces behind demo mode first; wire authenticated mode second.
6. Each phase lands as its own focused PR; this packet is updated, not
   bypassed, when a phase reveals a boundary violation.

## Tasks

- [ ] Tracking issue opened; packet linked.
- [x] Auth transport proof (headless Dart or curl-equivalent) — 2026-10-12,
      verified on `moneyflow-acceptance-sandbox` (project
      `nameless-wind-29591132`): `sign-up/email` + `Origin` header → signed
      `__Secure-neon-auth.session_token` cookie → `get-session` →
      `set-auth-jwt` → Data API RLS-scoped reads (`accounts`,
      `account_balances`, `transaction_feed`) all pass; anonymous gets 400/RLS
      deny. Dart client mirrors this contract (`mobile/lib/data/neon/`).
- [x] `mobile/` scaffold + CI-adjacent check decided (flutter not in repo CI —
      keep gates local until owner approves CI change).
- [x] Domain tranche 1 ported with mirrored tests (money.dart, 17 tests).
- [x] MVP surfaces demo-mode-complete.
- [x] Authenticated mode end-to-end on physical device — 2026-10-12 on
      OPPO CPH2001 (USB `UKMBCUTWIFYTOVDQ`): sign-in → dashboard renders
      RLS-scoped balances/feed → capture expense 30k → balance updated →
      session persisted across reinstall.
- [x] Activity + Accounts surfaces verified on-device 2026-10-12:
      transaction list + soft-delete (`deleted_at` set, feed excludes row),
      account create (`Vi Momo`, `e_wallet`) + archive (`is_archived=true`).
      Both confirmed via direct DB query on the sandbox.
- [x] Planning + Reports surfaces verified on-device 2026-10-12:
      `budget_progress` read (spent computed view-side), commitments with
      paid-this-month state, `pay_recurring_commitment` posts a real ledger
      expense (−3.5tr, verified via DB) + occurrence, savings goal progress,
      month report (thu/chi/net/savings-rate + category shares) mirroring
      `src/lib/reports.ts` contract. Widget tests cover both pages.
- Known behavior: Neon Data API read-after-write lag — writes commit
  immediately but list reads can serve a stale snapshot for ~seconds–minutes;
  post-write refresh may show the old row until a later fetch. Documented,
  not an app defect; a short post-mutation delay or optimistic update is a
  candidate follow-up.

## Verification criteria

- Auth proof: a Dart HTTP client obtains a PostgREST JWT and performs one
  RLS-scoped read/write round-trip; failure modes fail closed.
- Ported domain modules pass the mirrored cases of their `src/lib`
  counterparts (same inputs → same outputs, integer đồng exact).
- Demo mode works fully offline after first run; no network dependency.
- Authenticated mode on-device: sign-in, dashboard truth, one capture
  round-trip visible in web UI.
- Product invariants unchanged: integer đồng, transfers not income, soft
  delete, no invented data.
- [x] P5 device features verified on-device 2026-10-12 (OPPO CPH2001):
      - **Share receive**: `MainActivity` (native, `FlutterFragmentActivity`)
        exposes ACTION_SEND text via `app.moneyflow/share_text` MethodChannel
        (cold start) + `app.moneyflow/share_stream` EventChannel (warm).
        `share_text_parser.dart` (pure Dart) extracts amount/kind/note from
        VN bank SMS → `SharedTextPrefill` pre-fills the capture form under a
        review banner; user still picks account/category and taps Lưu —
        a share never posts a transaction. Verified cold-start
        (`GD -1.250.000d tai Circle K` → Chi, 1250000, "Circle K luc 14:20")
        and warm (`Nhan duoc 500k luong` → Thu, 500000). Shares arriving
        pre-sign-in stash and drain after `_Gate.signedIn`.
      - **Biometric lock**: opt-in via ⋮ menu → `BiometricGate` wraps the
        signed-in dashboard; fail-open when hardware unavailable; auto-prompt
        + retry. Enable path requires one successful `authenticate()` before
        arming — `isDeviceSupported()` can report true with no credential
        enrolled and would otherwise strand the user (verified on this
        OPPO: `canAuthenticate` = NONE_ENROLLED → snackbar "Không xác thực
        được — chưa bật khóa", lock not armed).
      - **Offline**: `OfflineCache` persists a `DashboardSnapshot` to
        SharedPreferences on every successful load; on loader failure the
        dashboard renders the snapshot under an explicit "Ngoại tuyến — dữ
        liệu đã lưu · Cập nhật lúc HH:mm" banner — never as fresh. Verified
        in airplane mode. Root-cause fix along the way: `HttpClient` had no
        `connectionTimeout` and session restore blocked forever → added
        10s bound + offline restore path trusting the stored token (JWT
        re-validates lazily; upstream 401 still signs out).
      - **Notifications**: `NotificationService` schedules one local
        reminder per active commitment at 09:00 on its due day
        (`matchDateTimeComponents: dayOfMonthAndTime`), archived → cancelled.
        Verified via `dumpsys alarm`: `ScheduledNotificationReceiver` for
        Tiền nhà at 2026-11-05 09:00 local. Init required
        `tzdata.initializeTimeZones()` + `tz.setLocalLocation`
        (`flutter_timezone`) — without them `tz.local` is UTC/throws.
      - Deps added: `local_auth`, `flutter_local_notifications`, `timezone`,
        `flutter_timezone`, `shared_preferences`. `receive_sharing_intent`
        was evaluated then dropped — its iOS side is Swift-PM-only and broke
        Flutter tooling on Linux; the ~60-line native MainActivity bridge
        covers the Android scope with zero plugin risk.
      - Android: `USE_BIOMETRIC`, `POST_NOTIFICATIONS`, SEND text/plain
        intent-filter, `FlutterFragmentActivity` (BiometricPrompt host),
        core-library desugaring (java.time in flutter_local_notifications).
- Test totals after P5: 74/74 (`money` 9, `neon_client` 8, `report` 4,
  `planning_reports` 5, `share_text_parser` 27, `offline_cache` 9,
  `biometric_lock` 7, `device_features` 5); `flutter analyze` clean.

## P6 — parity review and release decision (2026-10-12)

Status: **implemented and device-verified through P5; not release-ready.**
Nothing below was pushed, published, signed or submitted to a store.

### Parity matrix (web routes in `src/app/**` vs `mobile/`)

| Area | Web | Mobile | Verdict |
|---|---|---|---|
| Auth: sign-in / sign-up | `(auth)/login,register` | `login_page.dart` (toggle) | Parity |
| Auth: forgot / update password | `(auth)/forgot-password,update-password` | none | **Gap** (store-relevant) |
| Dashboard | `/dashboard` | `dashboard_page.dart` (+ offline snapshot) | Parity (no insights widgets) |
| Accounts create / archive | `/accounts` | `accounts_page.dart` | Parity |
| Account detail + reconcile | `/accounts/[id]`, `/reconcile` | none | Gap |
| Manual capture exp/inc/transfer | `/capture`, `/capture/quick` | `capture_page.dart` | Parity |
| Activity + soft delete | `/activity`, `/transactions` | `activity_page.dart` | Parity |
| Trash / recovery | `/transactions/trash` | none | **Gap** (soft-delete is write-only on mobile) |
| Budgets, commitments, goals | `/budgets,/commitments,/goals` | `planning_page.dart` | Parity (create/pay/adjust/archive) |
| Reports | `/reports` | `reports_page.dart` | Parity (month only) |
| Share receive | `/capture/share` + inbox pipeline | text prefill, manual review | **Partial by design** (no inbox/provenance/rate limits) |
| Paste / upload / voice capture, imports, inbox, rules, income templates, categories CRUD, timeline | yes | none | Gap |
| Notifications | SW notification | local due-day reminders | Parity (local only; no push backend exists on web either) |
| Biometric lock | none | opt-in | Mobile-only |
| Settings: export, backup, delete-account, privacy, appearance | yes | none | **Gap** (delete-account is a store requirement) |

Mobile covers the daily loop (see balances, capture, review, plan, report). It
does not cover correction/recovery, ingestion pipelines or account lifecycle.

### Store-release blockers (Google Play)

1. **In-app account deletion path + privacy policy link** — the app creates
   accounts, so Play requires both. Web has `/settings/delete-account` and
   `/privacy`; mobile has neither (a link-out to the web pages would be the
   smallest slice, owner/legal to confirm).
2. **Password reset** missing.
3. **Release signing**: `build.gradle.kts` signs release with the *debug* key;
   no upload keystore exists. Owner must create/hold the key.
4. **Identity/branding**: label is lowercase `moneyflow`, launcher icon is the
   Flutter default, `applicationId` `app.moneyflow.moneyflow` not yet confirmed
   as the permanent store id.
5. **Backend target**: `MF_AUTH_BASE_URL`/`MF_DATA_API_URL` default to the
   acceptance sandbox. Everything on-device was verified against the sandbox
   only; **production Data API/auth has not been exercised from mobile**.
   Release builds must pass prod values via `--dart-define` and be re-verified.
6. **Read-after-write lag** (Known behavior above) makes post-mutation lists
   look stale; acceptable for internal testing, a visible quality issue for
   public release (optimistic update / delayed refetch is the candidate fix).
7. **Data-safety form, target API level, 12-testers/14-day closed-test rule**
   (new personal Play accounts) — owner/process items, not code.
8. **CI**: Flutter checks run locally only; no CI gate (owner approval needed
   to change CI policy). `flutter test` 74/74 and `analyze` clean at P5.
9. iOS: unverified. No Apple account confirmed; Linux cannot build iOS.

### Decision (recommendation — owner approves)

- **Do not submit to a public store track yet.**
- **Proceed to an internal/closed-testing track** after: (a) a production-backend
  smoke test on the device, (b) blockers 1–5 above, (c) trash/recovery on mobile
  (financial-invariant parity: soft delete must be recoverable), (d) CI gate
  decision. These are separate focused slices, not part of this commit.
- **Web end-state: coexist.** The PWA already covers web/desktop, and mobile
  lacks imports/inbox/rules/exports. Sunsetting the PWA is not supported by the
  parity evidence.
- SMS/notification-listener acquisition remains out of scope; it needs its own
  privacy-scoped specification and owner authorization (canon acquisition law).
- Merge/PR/issue status: no tracking issue or PR was opened by this work;
  branch `feat/mobile-flutter` is local. Opening them is an owner action.

Open questions updated: web end-state → recommended *coexist* (owner to
confirm); iOS → still blocked on account + macOS; placement → `mobile/` kept.
