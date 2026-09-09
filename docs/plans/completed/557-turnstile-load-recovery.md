# #557 — Turnstile script-load recovery

**Status:** completed by implementation PR #561
**Execution state:** completed
**Active role:** evaluator / lifecycle closeout
**Permission scope:** no further runtime work authorized by this packet
**Owner:** ThunderK
**Issue/PR:** GitHub #557 / PR #561
**Selector:** GitHub PR #558 (merged)
**Parent lane:** GitHub #174 — public-beta provider controls
**Implementation base:** `main@60fdb1846e8cd8f9e6b48729ce1ff033778112e0`
**Accepted implementation head:** `e4a5dfd49c9529ed19f1338a8a24630b57a2ebb8`
**Last updated:** 2026-09-10

## Outcome

PR #561 completes #557 by adding a bounded MoneyFlow watchdog for a top-level Cloudflare Turnstile script that remains unresolved. The email-auth CAPTCHA gate remains fail-closed: timeout/error clears any stale token, no token is synthesized, and login/register/forgot-password submit remains disabled until a real Turnstile token exists.

The recovery surface distinguishes `loading`, `ready` and `load_failed`. The 15-second deadline is a MoneyFlow UX constant, not a Cloudflare SLA. Recovery is a native full-page reload button, avoiding a second custom script-loader/widget lifecycle.

Race handling is bounded: script state is mirrored synchronously; the watchdog acts only while authoritative state is `loading`; successful readiness cannot be overwritten by the stale timer; a late Script error after `ready` does not clobber success.

No Supabase Auth provider setting, Turnstile site/secret configuration, redirect/rate-limit/WAF setting, environment secret, schema/RLS, financial behavior or production user data was changed.

## Research record

Official references refreshed for this slice:

1. Cloudflare Turnstile client-side errors.
2. Cloudflare Turnstile widget configuration/callbacks.
3. Cloudflare challenge troubleshooting.
4. Cloudflare server-side validation.
5. Next.js Script lifecycle documentation.
6. Playwright Clock documentation.

These references support explicit finite client recovery and deterministic timer testing, but do not justify CAPTCHA bypass or establish a provider availability SLA.

## Browser acceptance

Deterministic Playwright coverage proves:

1. initial loading state;
2. finite failure after the bounded deadline while the top-level Turnstile request is deliberately held;
3. login/register/forgot-password submit remains disabled without a token;
4. retry is role-addressable, focusable and keyboard-usable;
5. failure never creates a fake token;
6. successful readiness before the deadline remains valid after the old deadline would have fired;
7. existing successful CAPTCHA browser coverage remains green;
8. authenticated ownership browser smoke remains green;
9. cross-device production UI audit remains green.

An earlier CI attempt exposed an ambiguous Playwright `getByRole("status")` locator because the demo notice and CAPTCHA status both use the status role. Runtime snapshots already showed the correct CAPTCHA failure/verified states. PR #561 narrowed the test to the CAPTCHA live-status element without weakening assertions or changing production behavior. The next exact implementation head passed cleanly.

## Evaluation

Evaluator read #557, the packet and exact PR diff directly.

- Failure cannot enable email auth without a real token.
- A stale watchdog cannot overwrite successful readiness.
- Retry does not duplicate a custom loader/widget lifecycle.
- Failure copy exposes no secret/provider configuration.
- The browser test stalls the top-level script itself rather than merely exercising existing `onError`.
- The deadline is explicitly product UX policy rather than a provider SLA.
- Scope stayed within Turnstile client resilience, affected style/shared constant, browser evidence and lifecycle artifacts.

Evaluator result: **PASS**.

## Exact implementation-head evidence

Accepted implementation head: `e4a5dfd49c9529ed19f1338a8a24630b57a2ebb8`.

- CI run #3475 / `34388492430`: terminal **success**.
- Browser smoke: terminal **success**, including CAPTCHA and authenticated ownership smoke.
- Cross-device UI audit: production audit **success**.
- CodeQL #2493 / `34388492453`: terminal **success**.
- Secret History #2493 / `34388492454`: terminal **success**.
- Production build, static quality, unit/static-RLS and policy-contract shards: **success**.

Lifecycle-closeout commits create a later PR head, so final exact-head governance checks remain mandatory before Ready handoff.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| 557.1 | fresh-main reconnaissance | selector-merged `main@60fdb184...` | done |
| 557.2 | official Cloudflare/Next.js/Playwright refresh | focused references | done |
| 557.3 | selector + authority projection | PR #558 merged | done |
| 557.4 | implementation | PR #561 runtime diff | done |
| 557.5 | stalled-script browser evidence | CI #3475 | done |
| 557.6 | evaluator + implementation-head gates | `e4a5dfd49...` | done |
| 557.7 | lifecycle closeout | completed packet + `current → null` + memory reconciliation | done |

## Handoff

#557 is complete and no longer executable. `PLAN_AUTHORITY.current` returns to null in PR #561. Parent #174 remains open but unselected; provider-console work requires fresh authority. PR #561 may be marked Ready only after final lifecycle-head checks are green, and merge remains an explicit owner action.
