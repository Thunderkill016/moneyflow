# X1 — Offline read + install prompt (PWA polish)

**Status:** specified
**Execution state:** specified
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** agent pending owner review (Class 3)
**Issue/PR:** pending
**Last updated:** 2026-09-21

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. State labels describe evidence and next allowed actions, not percentage complete.

## Outcome

- A reader who opens `/dashboard` while offline sees the last successfully loaded render instead of a browser error page; other routes fall back to a calm offline notice that links back to the cached dashboard.
- A reader on an installable browser finds a calm "Cài đặt ứng dụng" entry in `/settings` that triggers the native install prompt (Chromium/Android) or shows the correct manual steps (iOS Safari). An already-installed app says so instead of prompting.
- Signing out or deleting the account wipes the offline copy — cached ledger HTML never outlives the session it belonged to.

## Repository reconnaissance

### Current behavior

- `src/app/manifest.ts` already ships a complete PWA manifest (icons, shortcuts, share_target) — installability prerequisites exist.
- `public/sw.js` is a **push-only** service worker (TASK-130): `install`/`activate`/`push`/`notificationclick` handlers, no `fetch` handler, no cache usage.
- `src/lib/push-client.ts:81` registers `sw.js` (scope `/`) **only when the user enables due-commitment notifications** — most sessions never register the SW, so even a future fetch handler would not run for them.
- No `beforeinstallprompt` handling exists anywhere (`grep beforeinstallprompt src/` → only nothing). No install UI exists.
- `src/proxy.ts` sets `private, no-store` on redirect responses only; page HTML is not explicitly no-store, but nothing persists it today.
- Sign-out paths: `src/components/user-chip.tsx:93` and `src/components/layout/app-shell.tsx:615` form-submit to the `signOut` server action, which redirects to `/login`. Expired sessions also land on `/login`. Authenticated deletion ends at `/login?deleted=1`; demo deletion ends at `/?deleted=1`.
- `clearLocalMoneyFlowStores()` (`src/lib/delete-account.ts`) is the established local-data wipe used by both deletion paths; it covers localStorage only.
- Loading boundaries: every route resolves a `loading.tsx` (own or nearest parent: `app/`, `accounts/`, `settings/`) — X2 "skeleton consistency" is already satisfied; this packet changes none of it.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `public/sw.js` | The only registered SW; gains a bounded `fetch` handler | change — add navigation caching, keep push handlers untouched |
| `src/lib/push-client.ts` | Registration helper exists but is push-scoped | reuse pattern; new registration is unconditional, separate function |
| `src/lib/pwa.ts` (new) | `OFFLINE_CACHE_NAME`, `clearOfflineCache()`, `registerAppServiceWorker()`, install-prompt helpers | new — one module, no second PWA layer |
| `src/app/(auth)/layout.tsx` | Passthrough layout wrapping login/register/recovery | change — mount `OfflineCacheReset` so every arrival wipes the cache |
| `src/components/delete-account-page.tsx` | Both deletion paths already wipe local stores | change — `await clearOfflineCache()` beside `clearLocalMoneyFlowStores` |
| `src/components/layout/app-shell.tsx` | Client shell every product page uses | change — one `useEffect` registering the SW |
| `src/components/settings-hub-page.tsx` + `src/app/settings/install/` | Settings hub row → new client page with install state | change — one hub row + one page |

### Existing tests and constraints

- `src/lib/service-worker-security.test.ts` loads `public/sw.js` in a `vm` sandbox with stubbed `self`/`addEventListener` — the harness to extend for fetch/message behavior.
- `src/lib/service-worker-*.test.ts` conventions pin source invariants; push-payload privacy tests must keep passing.
- Product rules: calm copy; never invent state; privacy-first push payloads (no amounts) — cached HTML is *response* data, stricter than payloads.

### Similar implementation and recent history

- `sw.js` safe-notification-path handling (`safeNotificationPath`) — the existing "untrusted input → safe default" pattern; the fetch handler follows the same defensive shape.
- S1 backup chip (#647): withhold-over-fabricate (`null` state → silent) — same posture applies to "no cached copy" → show the offline notice, never a fabricated ledger.

### Open questions

- [x] Cache which pages? → `/dashboard` only (the spec's "last-loaded dashboard"); other routes get the offline notice. Bounded on purpose.
- [x] Stale identity? → wipe on every auth-layout mount + both deletion paths; a signed-in change of viewer also lands on `/login` during transition → wipe.
- [x] Wrong-URL offline fallback? → never serve dashboard HTML under another URL; uncached navigations get a minimal offline page linking to `/dashboard`.
- [x] iOS? → `beforeinstallprompt` never fires; the install page shows Share → "Thêm vào màn hình chính" copy instead of pretending a button.

## Research

Not required — standard Service Worker Cache API + `beforeinstallprompt`; no dependency, provider or format decision. The security posture is decided internally (wipe-on-logout, dashboard-only scope).

## Specification

### Problem

MoneyFlow is installable on paper but invisible in practice: no install entry point exists, and offline opens die on the browser error page even though the last render was already on the device. For a product whose promise is "your ledger, yours", the ledger vanishing the moment connectivity does undercuts the trust story.

### User stories

- As a signed-in user on a dead metro connection, I reopen `/dashboard` and still see my last balance view, so the ledger feels mine even offline.
- As a user on an uncached route while offline, I see a calm notice pointing back to the dashboard — not a browser dinosaur.
- As an Android/Chrome user, I can install from a settings row that fires the native prompt; as an iOS user I get honest manual steps.
- As a user signing out (or a different person picking up the device), the cached ledger is gone before the next open.

### Acceptance criteria

- [ ] Successful `GET` navigations to `/dashboard` are cached under a versioned cache name; other methods/routes/origins are untouched.
- [ ] Offline navigation to `/dashboard` serves the cached copy; to any other path serves the generated offline notice (never dashboard HTML under a foreign URL).
- [ ] The SW registers for every product-page visit (not only push opt-ins); push registration still works unchanged.
- [ ] Mounting any `(auth)` route wipes the offline cache; both deletion paths wipe it too; `clearOfflineCache` no-ops without `caches`.
- [ ] `/settings` hub shows "Cài đặt ứng dụng"; the page fires the deferred prompt when captured, shows manual steps on iOS, and reports "đã cài" in standalone mode.
- [ ] Push handlers, notification path validation and payload stripping unchanged (existing tests still pass).

### Required states

- Loading: none new (install page renders instantly; SW update is silent).
- Empty: no cached copy → offline nav shows the notice, not a blank.
- Error: `caches`/`serviceWorker` APIs absent → every helper no-ops.
- Security: cache is single-entry `/dashboard`; wipe covers logout, login arrival and deletion.
- Accessibility: install page is a normal settings page; offline notice is a real heading + link.

### Financial and security constraints

- Cached content is the last **rendered** response — no data is re-interpreted client-side; integrity is the server's, staleness is admitted by the offline notice pattern.
- CacheStorage holds financial HTML → **must** be wiped on session end: `(auth)` layout mount wipe covers logout/expiry/deletion-redirect; deletion paths wipe explicitly (demo deletion never reaches `/login`).
- SW `fetch` handler is read-only: it never mutates requests, never caches POST/non-GET/foreign origins, never bypasses auth — it only replays what the server already sent.
- No new telemetry, no amounts in SW code, no cache of API/JSON responses (pages only — `/api/*` is untouched).

### Out of scope

- Offline *writes* (queued transactions while offline) — a much larger mutation-consistency problem.
- Precaching app shells or full site; multi-page offline set.
- Periodic background sync, push-driven updates.
- X2 — verified already satisfied by existing loading boundaries.

## Implementation plan

### Architecture fit

One SW owns both push and offline (already registered at scope `/`); a new `src/lib/pwa.ts` holds the cache name, wipe and registration helpers so `push-client` stays push-scoped. The wipe rides existing boundaries — `(auth)` layout mount and `clearLocalMoneyFlowStores` call sites — rather than inventing a session-lifecycle system.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `public/sw.js` | `OFFLINE_CACHE` name, `fetch` handler: network-first navigations, `cache.put("/dashboard", …)` on success for that path only, cached-copy then offline-notice on failure | minimal honest offline read; push handlers untouched |
| `src/lib/pwa.ts` (new) | `OFFLINE_CACHE_NAME`, `clearOfflineCache()` (`caches.delete`, SSR/restricted-safe), `registerAppServiceWorker()`, `InstallState` helpers (`beforeinstallprompt` capture, standalone/iOS detect) | one typed module; testable without a browser |
| `src/lib/pwa.test.ts` + `src/lib/service-worker-offline.test.ts` (new) | unit tests for helpers; vm-harness tests for fetch handler caching/offline/fallback rules | TDD per risk class |
| `src/components/layout/app-shell.tsx` | `useEffect` → `registerAppServiceWorker()` | unconditional registration on every product page |
| `src/app/(auth)/layout.tsx` + `src/components/offline-cache-reset.tsx` (new) | mount wipe | single point covering logout/expiry/deletion redirects |
| `src/components/delete-account-page.tsx` | `await clearOfflineCache()` beside `clearLocalMoneyFlowStores()` (both paths) | demo deletion bypasses `/login` |
| `src/app/settings/install/page.tsx` + `src/components/install-app-page.tsx` (new) | install UI: prompt button / iOS steps / installed state | the entry point |
| `src/components/settings-hub-page.tsx` | one hub row → `/settings/install` | progressive disclosure inside existing settings surface |

### Data and migration impact

- No schema, no RPC, no stored data format — CacheStorage entries are ephemeral by design and wiped at the boundaries above.
- Compatibility: browsers without SW/Cache APIs get zero behavior change (helpers no-op).
- Rollback: revert PR; cached entries are keyed under `moneyflow-offline-v1` and expire harmlessly when the old SW (no fetch handler) is reinstalled — no data cleanup needed server-side.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Cached ledger survives logout on a shared device | `(auth)` layout wipe + deletion wipes; vm test asserts `caches` interaction; login-visit test pins the wipe |
| Dashboard HTML served under `/transactions` URL | handler matches only the exact `/dashboard` key; vm test asserts foreign paths get the notice |
| SW update not picked up | existing `skipWaiting` + `clients.claim` retained |
| Push regressions | existing push/security tests unchanged and must stay green |
| `beforeinstallprompt` never fires (iOS/desktop-installed) | page detects standalone + absence of deferred prompt and renders honest copy |
| Registering SW breaks demo/static pages | registration is fire-and-forget inside `useEffect`; fetch handler only touches same-origin GET navigations |
| Cache poisoning via crafted response | only `response.ok` same-origin navigation responses for one path are stored |

### Verification plan

- Static: lint, typecheck, architecture, css-ownership, knowledge, ci-policy.
- Unit/domain: `npm test` — new helper tests + vm-harness SW tests.
- Browser: Browser smoke + Cross-device UI audit lanes; local Playwright `context.setOffline(true)` check on demo `/dashboard`.
- Database: not applicable — no schema/RPC change.
- Production/manual: post-merge owner check on a real device — install prompt fires on Android Chrome; offline reopen shows last dashboard.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | `src/lib/pwa.ts` helpers + unit tests (TDD) | none | focused tests | done |
| T2 | `public/sw.js` fetch handler + vm tests (TDD) | T1 | service-worker-offline tests | done |
| T3 | unconditional registration in app-shell | T1 | tests + typecheck | done |
| T4 | wipes: `(auth)` layout reset + deletion paths | T1 | tests + code review | done |
| T5 | `/settings/install` page + hub row | T1 | browser verify | done |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-21 | researcher | implementer | specified | this packet; plan entry X1 in ALL_SURFACES_UPGRADE_PLAN_2026.md | offline cache of authenticated HTML is a new persistence surface — wipe points must all hold | implement T1–T5 on a branch; owner reviews PR |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| SW registers unconditionally on product pages | `src/components/layout/app-shell.tsx` effect calls `registerServiceWorker()`; browser verify shows `registered: true`, scope `/` | pass |
| Last-loaded `/dashboard` readable offline | `public/sw.js` network-first navigation handler caches only `/dashboard` into `moneyflow-offline-v1`; browser verify: offline reload renders full cached dashboard (balances, accounts) | pass |
| Uncached routes offline → calm notice, not a crash | `offlineNoticeResponse` fallback; browser verify: offline `/transactions` renders "Bạn đang ngoại tuyến" + link to saved overview | pass |
| Financial cache wiped on sign-out surfaces and deletion | `OfflineCacheReset` mounted in `src/app/(auth)/layout.tsx` (login surface reached by every sign-out path); `performDeletion` clears the versioned cache in both deletion flows | pass |
| `/settings/install` page + hub row | `src/app/settings/install/page.tsx`, `src/components/install-app-page.tsx`, hub row with `download` icon; browser verify: hub row present, page renders honest unavailable-state copy | pass |
| No fake install button | `install-app-page.tsx` renders the button only when `beforeinstallprompt` was captured or state is `installed`; unavailable/iOS states render guidance copy only | pass |
| Push-notification security behavior unchanged | `src/lib/service-worker-offline.test.ts` vm tests + existing push tests all pass (22/22 focused) | pass |
| Gates | `npm test` 1484/1484; lint (1 pre-existing warning), typecheck, build, check:knowledge, check:architecture, check:deployment-env, check:css-ownership, test:ci-policy all pass | pass |

### Research and adoption evidence

- Selected sources still support the final implementation: internal — push-SW registration pattern, `(auth)` layout boundary, settings-hub row pattern.
- Important source limitations remain respected: `export`/financial pages not cached; push payload privacy untouched.
- New tool/dependency/pattern passed the adoption review, or not applicable: none added (platform Cache API + `beforeinstallprompt` only).

### Review findings

- First-load lifecycle verified honestly: the registering page is not yet controlled, so the cache populates on the next `/dashboard` visit; browser verification reloads once before going offline (`scripts/verify-offline-pwa.mjs`).
- A stale `next start` process on the verification port initially produced false negatives (404 on `/settings/install`, no SW registration); evidence was re-collected against the fresh build after killing the stale server.

### Remaining limitations

- `beforeinstallprompt` cannot fire in headless verification; the promptable path is covered by unit tests on the install-state store, not a real browser prompt.
- Only `/dashboard` is offline-readable per spec; other authenticated routes intentionally fall back to the offline notice.
- iOS install remains manual guidance (Share → Add to Home Screen); no prompt API exists on that platform.
