# #557 — Turnstile script-load recovery

**Status:** completed and archived by implementation PR #561
**Execution state:** completed
**Active role:** evaluator / lifecycle closeout
**Permission scope:** no further runtime work authorized by this packet
**Owner:** ThunderK
**Issue/PR:** GitHub #557 / implementation PR #561
**Selector:** GitHub PR #558 (merged)
**Parent lane:** GitHub #174 — public-beta provider controls
**Selector base:** `main@ad0461514acaec1c9a8a100ba92592c83ece46b2`
**Implementation base:** `main@60fdb1846e8cd8f9e6b48729ce1ff033778112e0`
**Accepted implementation head:** `e4a5dfd49c9529ed19f1338a8a24630b57a2ebb8`
**Last updated:** 2026-09-10

## Repository reconnaissance

Fresh implementation baseline was selector-merged `main@60fdb1846e8cd8f9e6b48729ce1ff033778112e0`, whose merged `PLAN_AUTHORITY.current` selected this packet through `selectedByPr: 558`.

Before PR #561, MoneyFlow already had the correct fail-closed core: email-auth submit stayed disabled whenever CAPTCHA was enabled but configuration was not ready or `captchaToken` was empty. `AuthTurnstile` handled Script `onReady`/`onError` plus widget success/expiration/error callbacks, but had no application deadline for a top-level Turnstile script that neither became ready nor reported an error promptly. Existing browser coverage proved successful token acquisition but not that unresolved-script state.

Queue reconciliation remains unchanged:

- #511 was already completed by merged PR #522.
- #426 is stale as originally written and requires a fresh owner design decision.
- #174 remains the provider-control lane; provider-console work is not selected by this completion.

## Research record

Official references refreshed around selector/implementation:

1. Cloudflare Turnstile client-side errors — https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/
2. Cloudflare Turnstile widget configuration/callbacks — https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/
3. Cloudflare challenge solve issues — https://developers.cloudflare.com/cloudflare-challenges/troubleshooting/challenge-solve-issues/
4. Cloudflare server-side validation — https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
5. Next.js Script — https://nextjs.org/docs/app/api-reference/components/script
6. Playwright Clock — https://playwright.dev/docs/clock

The implementation treats 15 seconds as a MoneyFlow product-level UX watchdog, not a Cloudflare SLA. No research supported bypassing CAPTCHA or changing provider keys, Supabase Auth settings, redirects, rate limits, WAF, schema/RLS or production data.

## Implemented contract

PR #561 adds a bounded `loading | ready | load_failed` lifecycle to the top-level Turnstile script. While the script remains unresolved, a 15-second watchdog can transition to a truthful finite failure state. Failure clears any stale CAPTCHA token, keeps the existing email-auth submit gate closed, and exposes a native keyboard-addressable full-page reload action.

The watchdog is race-safe: script state is mirrored synchronously in a ref, the timer acts only while that ref is still `loading`, successful readiness moves the ref to `ready`, and a late Script error after readiness cannot overwrite success. Existing widget success/expiration/error/reset behavior remains authoritative after render.

The recovery action does not invent a second script-loader lifecycle. It reloads the page and therefore preserves the existing token requirement rather than synthesizing or bypassing a token.

## Browser acceptance

Deterministic Playwright coverage now proves:

1. initial loading state;
2. finite failure after the bounded deadline for a deliberately held top-level Turnstile request;
3. login/register/forgot-password submit remains disabled without a token;
4. recovery action is role-addressable, focusable and keyboard-usable;
5. failure never creates a fake token;
6. successful script/token readiness before the deadline is not overwritten after the old deadline would have fired;
7. existing successful CAPTCHA entry-point coverage remains green;
8. authenticated ownership browser smoke remains green;
9. phone/cross-device production UI audit remains green.

During evaluation, an initial CI attempt exposed an ambiguous Playwright `getByRole("status")` locator because both the demo notice and CAPTCHA status use the status role. Runtime snapshots already showed the correct CAPTCHA states. PR #561 narrowed those assertions to the CAPTCHA status element without weakening the behavioral assertions or changing production code. The next exact implementation head `e4a5dfd49c9529ed19f1338a8a24630b57a2ebb8` passed the browser suite cleanly.

## Evaluation

Evaluator read #557, this packet and the exact PR #561 diff directly.

1. **Failure cannot enable email auth without a real token.** `AuthForm.captchaBlocked` remains unchanged; timeout/error clears the token and no production bypass was added.
2. **A stale timer cannot overwrite successful readiness.** The watchdog checks the synchronous `scriptStateRef` and only fails while it is still `loading`.
3. **Retry does not duplicate script/widget lifecycle.** Recovery is a full-page reload.
4. **Failure copy exposes no secret/provider configuration.** It is short user-facing network/reload guidance.
5. **The browser test stalls the top-level script itself.** It holds the Turnstile script route and advances the product timer with Playwright Clock.
6. **The deadline is explicitly a UX constant, not a provider SLA.** `TURNSTILE_SCRIPT_LOAD_DEADLINE_MS = 15_000` carries that source comment and packet rationale.
7. **Scope stayed bounded.** Runtime changes are limited to Turnstile client lifecycle/style/shared constant plus affected browser coverage; no provider-console, Auth policy, schema/RLS, financial or production-data mutation occurred.

Evaluator result: **PASS**.

## Exact-head evidence before lifecycle closeout

Accepted implementation head: `e4a5dfd49c9529ed19f1338a8a24630b57a2ebb8`.

- CI run #3475 / run id `34388492430`: terminal **success**.
- Browser smoke: terminal **success**, including `Expense and Auth CAPTCHA browser smoke` and `Authenticated ownership browser smoke`.
- Cross-device UI audit: production audit **success** and evidence upload completed as part of the successful CI run.
- CodeQL run #2493 / run id `34388492453`: terminal **success**.
- Secret history scan run #2493 / run id `34388492454`: terminal **success**.
- Production build, static quality, unit/static-RLS and policy-contract shards: **success**.
- Database mutation was outside scope; detailed database checks were correctly not selected.

Lifecycle-document commits after this implementation evidence create a new PR head and therefore must receive their own exact-head governance checks before PR #561 is handed off Ready.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| 557.1 | fresh-main reconnaissance | selector-merged `main@60fdb184...`, #174/#557, auth code/tests | done |
| 557.2 | official Cloudflare/Next.js/Playwright refresh | focused sources above | done |
| 557.3 | selector + authority projection | PR #558 merged as `60fdb184...` | done |
| 557.4 | implementation from fresh post-selector main | PR #561 runtime diff | done |
| 557.5 | stalled-script browser evidence | CI #3475 browser smoke | done |
| 557.6 | evaluator + exact-head gates | implementation head `e4a5dfd49...` | done |
| 557.7 | lifecycle closeout | archived packet + `current → null` + memory/PR-memory reconciliation | done |

## Handoff record

| Date | From | To | State | Evidence | Remaining | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-09 | MON-63 closeout | planner | authority null | #556 merged/deployed; current null | choose bounded follow-on | fresh audit |
| 2026-09-09 | planner | selector evaluation | candidate | #511 complete; #426 stale; #174 defect confirmed | exact-head selector gates + owner merge | PR #558 evaluation |
| 2026-09-10 | owner / merged #558 | implementer | active | `main@60fdb184...`; manifest current=#557 | implementation + browser evidence | PR #561 |
| 2026-09-10 | implementer | evaluator | acceptance proven | implementation head `e4a5dfd49...`; CI/Browser/CodeQL/secret scan green | lifecycle projection | archive + authority null |
| 2026-09-10 | evaluator | owner | completed / authority null | this archive + reconciled memory/PR memory | final exact-head governance checks | mark PR #561 Ready; owner merge only |

## Final boundary

#557 is complete. This archive grants no provider-console or production mutation permission. Parent #174 remains open but unselected; any follow-on requires fresh executable authority. Explicit owner authorization remains required to merge PR #561.
