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
