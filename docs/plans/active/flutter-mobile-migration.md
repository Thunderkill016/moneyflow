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

## Appendix: competitor app walkthrough (2026-10-12, OPPO CPH2001)

8 reference apps installed via Play on the owner's device; all inspected first-hand.
Where signup was required, Google sign-in was used with an account already on the
device (Economy / hoangn36th3a@gmail.com). Screenshots in session only (not
committed). This appendix is evidence for UX decisions, not work authority.

### Per-app findings

| App | Account | Onboarding | Capture model | Notable surfaces |
|---|---|---|---|---|
| **Monefy** | none needed | 3 slides → notif ask → **paywall before first entry** (674kđ/yr) | EXPENSE/INCOME giant buttons → numpad w/ inline math (+−×÷) → category icon grid = **saves on tap** (~4 taps total) | Donut category wheel; simplest capture observed |
| **Money Manager** (Realbyte) | none needed | **asks SMS + storage permission on first open** (works if denied) | Segmented Thu/Chi/Chuyển khoản, date+time+**"Lặp lại" recurring inline on the form**, Thể loại/Tài khoản/Ghi chú, numpad w/ "làm xong" | Tabs Hàng ngày/Ngày/Tháng/Tổng/Ghi chú; Thống kê tab Thu/Chi + Hàng tháng period dropdown; ad banner in free tier |
| **Bluecoins** | none needed | language picker (VI preset) → straight in | FAB + on dashboard | **"Thử file mẫu" demo file** generates sample ledger (dialog stuck at 0% observed — their bug); dashboard = composable widget cards: 7-day bar chart w/ 7/30-day averages, budget pie + progress bar w/ **"HÔM NAY" pace marker**, monthly calendar w/ colored dots, net-worth line chart |
| **Money Lover** | Google/Apple/email | 6-slide carousel → signup → goal question → currency (VND preset) → 4-step coach marks ending on the + FAB | Segmented Chi/Thu/**Vay-Nợ**; wallet selector; **quick-amount chips** (100.0/1000.0/10000.0 → 100k/1tr/10tr); numpad w/ 000 key + math; **2-level category list** w/ search; camera attach; "THÊM CHI TIẾT" expander; Lưu gated until valid | Dashboard: Tổng số dư w/ eye-hide, wallets, "Chi tiêu nhiều nhất" Tuần/Tháng, recent list, **"Xem Dữ liệu mẫu"** card; **post-first-save upsell: free tier = 1 wallet**; Budget form: nhóm + số tiền + kỳ (Tháng này range) + ví + **"Lặp lại ngân sách" auto-rollover checkbox**; budget states rendered Còn lại / Sắp tới hạn mức (amber) / Vượt hạn mức (red border) |
| **MISA Sổ Thu Chi** | Google/FB/email | 3-slide (PDF bank import headline: "Nhập 1 lần - Cập nhật cả tháng"; dedup UI "10 ghi chép trùng nhau — Xóa ngay"; receipt OCR) → signup → **5-step wizard** (nghề nghiệp → intent multi-select → first wallet + starting balance → social proof "5 triệu người dùng") | "Ghi chép" center nav → dropdown Chi tiền + amount + **"Mục hay dùng" inline category grid** (Ăn uống, Đi lại, Con cái, Hiếu hỉ...) + Ví + Hôm nay+giờ + Diễn giải; **mic FAB (voice) + scan FAB (OCR) on the form** | Feature grid: Cho vay, Sổ tích lũy, Kết nối ngân hàng, voice capture; AI assistant FAB; **ad banner inside app**; period picker "Tháng này" + "báo cáo mẫu" |
| **Wallet** (BudgetBakers) | Google/FB/email | carousel → signup → VND preset → cash balance numpad | THU NHẬP/CHI TIÊU/CHUYỂN KHOẢN tabs; giant amount; TIỀN MẶT account selector; CHỌN DANH MỤC 2-level (Ăn uống → Nhà hàng/Quán bar/Đồ tạp hóa); **"MẪU" templates button**; calc numpad; ✓ save | Tabs Tài khoản / Ngân sách & Mục tiêu; account carousel; cross-sell "Wallet cho doanh nghiệp"; Premium club card; "Cơ cấu chi tiêu 30 ngày vs cùng kỳ"; post-save Google Pay connect card |
| **Spendee** | Google/FB/email | **quiz funnel 5+ questions** (feeling about money → spend for whom → saving for → habits) → notif guilt claim ("kiên trì gấp 2 lần") → with/without savings-growth chart → signup | Bottom sheet; giant 0 VND w/ currency picker; **tag chips** (Coffee, Vacation); camera; **icon-grid categories**; Chi phí/Thu nhập/Chuyển segmented | Primary CTA after signup is **"Kết nối TK Ngân hàng"**; manual entry is secondary |
| **YNAB** | email/Google | emotional chat-bubble story ("Am I going to be OK?") → **interactive zero-based demo**: Balance $5000 → "Tap to fill" Mortgage $2500 → "Ask: what is this money for?" → signup | (not reached — English-only, method-first) | Teaches the budgeting *method* interactively before the app; assign-dollars paradigm ≠ ledger-tracking paradigm |

### Cross-cutting lessons for MoneyFlow

Adopt:

1. **Default-account fast path** (Monefy): prefill last-used account + inline
   category grid so save is amount→category→done. MoneyFlow today requires
   account pick → category pick → Lưu; a last-used default keeps correctness
   and removes 1-2 taps.
2. **"Mục hay dùng" inline category row** (MISA): most-used categories directly
   on the capture form, "Chỉnh sửa" to customize — cuts the picker round-trip.
3. **Quick-amount chips** (Money Lover): 100k/1tr/10tr chips above the numpad
   fit VND magnitudes; cheaper than typing 6-7 digits.
4. **Budget pace marker** (Bluecoins "HÔM NAY" tick on the progress bar):
   shows position-in-month vs spend ratio — one glance answers "am I pacing?"
5. **3-state budget rows** (Money Lover): Còn lại / Sắp tới hạn mức / Vượt hạn
   mức with color + explicit text (not color alone — matches our a11y rule).
6. **"Lặp lại ngân sách" rollover** (Money Lover): budget auto-repeats next
   period — our `upsert_monthly_budget` currently re-creates per month; a
   rollover flag is a candidate contract addition (needs backend spec).
7. **"Lặp lại" inline on entry form** (Money Manager): recurring toggle at
   capture time, separate from the commitments surface.
8. **Demo/sample data inside the signed-in app** (Bluecoins "Thử file mẫu",
   Money Lover "Xem Dữ liệu mẫu", ML "Ví dụ" budget card): empty states show
   *rendered example data*, not just text. Our demo mode exists but requires
   logging out; an in-product preview would help onboarding.
9. **Coach-mark funnel ending on the + FAB** (Money Lover 4/4 → "Thêm giao
   dịch"): walkthrough terminates in the first action, not a description.
10. **Dedup review UI for imports** (MISA "10 ghi chép trùng nhau — Xóa ngay/
    Bỏ chọn tất cả"): directly applicable to our future inbox dedup surface.
11. **2-level categories w/ search** (Money Lover, Wallet): parent icons +
    indented children; our flat category list will not scale.
12. **Tag chips on capture** (Spendee): free-text tags alongside categories —
    note-augmentation without a second field.

Avoid / already avoided:

- **Paywall before first entry** (Monefy, Spendee funnel): paywalling an empty
  ledger burns trust; monetize after first saved month.
- **Quiz onboarding >3 questions** (Spendee): every extra question loses users;
  MISA's 2-question wizard is the sane bound.
- **SMS/storage permission on first open** (Money Manager): MoneyFlow's
  share-intent + explicit-review path is the right call (canon acquisition law).
- **Ads inside the app** (MISA, Money Manager free): conflicts with
  "trustworthy ledger" positioning.
- **Bank-connect as the primary CTA** (Spendee, Wallet upsell): fine as a
  capability, wrong as the front door for a manual-first product.
- **Currency picker on the amount field** (Spendee): VND-only product doesn't
  need per-transaction currency switching.

Open product questions raised (owner decisions, not implemented):

- Transaction **templates** (Wallet "MẪU") — we have income templates on web;
  expense templates on mobile are a candidate slice.
- **Vay/Nợ as a third kind** (Money Lover, MISA "Cho vay") — debt tracking is
  VN-common; currently modeled as transfers; needs a spec if promoted.
- **Voice + receipt scan capture** (MISA FABs) — matches our /capture/voice +
  /capture/upload web surfaces; mobile parity slice.
- **AI assistant FAB** (MISA robot) — canon requires spec + owner auth.

### Applied slice (this branch, post-P6)

Owner instruction 2026-10-12: "Build app đi" — apply the highest-value
reference findings to the Flutter client. Implemented:

- **Bottom nav shell** (`mobile/lib/app/home_shell.dart`): Tổng quan /
  Hoạt động / **Ghi** (center action, not a tab) / Kế hoạch / Báo cáo —
  replaces the overflow-menu navigation (MISA/Money Lover pattern). Tabs
  keep state via IndexedStack and build lazily; a saved capture reloads
  dashboard/activity/planning/report via public `reload()` on each state.
- **Fast capture** (`capture_page.dart`): quick-amount chips
  (50k/100k/200k/500k/1tr/5tr), inline "Mục hay dùng" category chips ranked
  from the transaction feed (`domain/frequency.dart`, pure), and
  last-used account/category prefill via `data/capture_prefs.dart`
  (SharedPreferences — device-local convenience, never server truth).
  `DropdownButtonFormField.initialValue` is non-reactive, so the dropdowns
  carry `ValueKey`s — async prefs actually display.
- **Budget 3-state + pace** (`domain/budget.dart` + `_PaceBar`): Còn lại /
  Sắp tới hạn mức (>=80%) / Vượt with explicit text + color (not color
  alone), and a "Hôm nay" tick marking position-in-month on the bar.

Verified on the OPPO device (debug APK): nav destinations switch tabs;
"Ghi" opens capture; 100k chip fills the field; "Ăn uống" chip selects the
category; a saved capture appears in Hoạt động and folds into the budget
row (170.000/2.000.000 → "Còn lại 1.830.000 ₫"); reopening capture
prefills Tiền mặt + Ăn uống. `flutter test` 101/101, analyze clean.

Deliberately not copied: paywall-before-entry, SMS permission, ads,
quiz onboarding >3 questions, bank-connect-as-CTA (see "Avoid" above).

Continuation (same owner instruction):

- **"Lặp lại hàng tháng" inline** (Money Manager): checkbox on the capture
  form for expense/income — saves the transaction, then creates the monthly
  commitment via the existing `upsert_commitment` contract (dueDay = the
  entry's day-of-month; name = note → payee → category). The submit
  orchestration lives in `capture_submit.dart` (store-agnostic, spy-tested);
  a commitment failure after a successful save surfaces as
  `CaptureResult.savedPartial` + an honest snackbar, never a silent drop.
- **Category search sheet** (`category_picker.dart`): the flat dropdown
  became a searchable bottom sheet — Money Lover/Wallet picker pattern,
  sized for growing user categories.

Verified on-device: checkbox creates a real commitment ("Ăn uống · ngày 13"
with Trả button in Kế hoạch); the sheet opens and filters; last-used
account + category prefill make a repeat save a 3-tap flow. 109/109 tests.

### Post-P6: Google sign-in + screen shield

- **Google sign-in** (`data/google_sign_in.dart` + `/sign-in/social` in
  `auth_client.dart`): native google_sign_in v7 sheet → id token → Better
  Auth token exchange (idToken as a nested object; a bare string gets a
  `redirect:true` browser-flow response this client refuses to follow).
  Requires `--dart-define=MF_GOOGLE_SERVER_CLIENT_ID=<web OAuth client id>`
  plus an Android OAuth client (package `app.moneyflow.moneyflow`, SHA-1 of
  the debug and upload keys) in the **same Google Cloud project** as Neon
  Auth's Google provider web client. Empty define → the login button is
  hidden entirely. Account seeding stays server-side
  (`on_auth_user_created`); unverifiable end-to-end until the owner
  configures the OAuth clients.
- **Screen shield** (`app/screen_shield.dart`, `screen_protector`):
  `FLAG_SECURE` applied app-wide at startup — ledger amounts stay out of
  screenshots, recordings and the recents thumbnail. Best-effort: an
  unsupported device degrades to no shield instead of crashing.
