# #557 — Turnstile script-load recovery

**Status:** active — selected by owner-merged PR #558
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** `branch_write` limited to the client auth-resilience and browser-test surface below; no provider-console or production mutation
**Owner:** ThunderK
**Issue/PR:** GitHub #557 / implementation PR #561
**Selector:** GitHub PR #558 (merged)
**Parent lane:** GitHub #174 — public-beta provider controls
**Selector base:** `main@ad0461514acaec1c9a8a100ba92592c83ece46b2`
**Implementation base:** `main@60fdb1846e8cd8f9e6b48729ce1ff033778112e0`
**Last updated:** 2026-09-10

## Repository reconnaissance

Fresh implementation baseline is selector-merged `main@60fdb1846e8cd8f9e6b48729ce1ff033778112e0`, whose merged `PLAN_AUTHORITY.current` points to this packet through `selectedByPr: 558`.

Current code before PR #561 already had the correct fail-closed core:

- `src/components/auth-form.tsx` enables CAPTCHA only for login/register/forgot-password when public CAPTCHA config says it is enabled.
- Email-auth submit remains blocked whenever CAPTCHA is enabled but config is not ready or `captchaToken` is empty.
- `src/components/auth-turnstile.tsx` started at `Đang tải xác minh bảo mật…`, handled Next.js Script `onReady`/`onError`, then widget success/expiration/error callbacks.
- There was no app-side deadline for a top-level Turnstile script that neither became ready nor reported an error promptly.
- `e2e/auth-captcha.spec.ts` proved successful token acquisition for all three email-auth entry points and phone-width containment, but not a stalled top-level script.
- #174 production verification had already observed this unresolved state for more than 30 seconds.

Queue reconciliation prevents duplicated/stale work:

- #511 was already completed by merged PR #522; current classifier/UI/E2E still prove exception-first Ready/Needs-attention behavior.
- #426 cannot execute as originally written: PR #480 proved desktop capture deletion removes paste/upload access, while later product direction superseded the dashboard-planning deletion. A fresh owner design decision is required before replacement work.
- #174 remains a provider-control lane; #557 isolates one code-testable reliability defect and authorizes no provider-console write.

## Research

Current official references refreshed around selector/implementation:

1. Cloudflare Turnstile client-side errors — https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/
2. Cloudflare Turnstile widget configuration/callbacks — https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/
3. Cloudflare challenge solve issues — https://developers.cloudflare.com/cloudflare-challenges/troubleshooting/challenge-solve-issues/
4. Cloudflare server-side validation — https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
5. Next.js Script — https://nextjs.org/docs/app/api-reference/components/script
6. Playwright Clock — https://playwright.dev/docs/clock

What they establish:

- network/browser-extension conditions can prevent challenge resources from loading;
- explicit client error/timeout handling is expected;
- widget `timeout-callback` belongs to widget/challenge lifecycle and does not prove a top-level script stall will always resolve;
- server-side token verification remains mandatory;
- third-party Script lifecycle hooks do not replace MoneyFlow's product-level finite recovery contract;
- Playwright Clock can deterministically advance application timers without wall-clock sleeps.

Research limits:

- no evidence supports disabling/bypassing CAPTCHA after timeout;
- no evidence supports changing site/secret keys, Supabase Auth settings, redirect allowlists, rate limits or WAF in this slice;
- no single timeout duration is a provider SLA. PR #561 uses a 15-second bounded MoneyFlow UX constant, not a platform guarantee.

## Specification

### Outcome

Make CAPTCHA script-load failure finite, truthful and recoverable while preserving the existing real-token gate.

### State contract

The Turnstile surface must distinguish at least `loading`, `ready` and `load_failed`.

The application deadline exists only while CAPTCHA is mounted and the top-level script is not ready. It must be cleared or rendered harmless on successful `onReady`, explicit script failure and unmount. A stale timer must not overwrite later success.

Existing widget success, expiration, error and post-submit reset behavior remains authoritative after render.

### Fail-closed recovery

When top-level script loading errors or exceeds the bounded deadline:

- clear any stale CAPTCHA token;
- stop claiming the app is still loading;
- show a short non-sensitive explanation;
- expose a keyboard-accessible retry/reload action;
- keep email-auth submit disabled until a real Turnstile token exists.

A full-page retry is preferred over inventing a second custom script-loader lifecycle unless implementation evidence proves a smaller safe retry mechanism.

Never log or expose CAPTCHA tokens, keys, provider identifiers, internal thresholds or sensitive auth payloads.

### Race safety

Implementation must challenge:

- deadline and `onReady` occurring close together;
- explicit `onError` before deadline;
- unmount before deadline;
- auth completion triggering existing widget reset;
- widget `error-callback` after successful top-level script load.

Late callbacks must never weaken the submit gate.

### Browser acceptance

Add deterministic browser evidence for a top-level Turnstile script that remains unresolved long enough to cross the app deadline without relying on a real outage.

The affected-flow test must prove:

1. initial loading state appears;
2. finite failure state replaces it after the bounded deadline;
3. login/register/forgot-password submit stays disabled with no token;
4. recovery action is role-addressable and keyboard-usable;
5. no fake token is created on failure;
6. successful readiness before the deadline is not overwritten by a stale timer;
7. existing successful CAPTCHA browser tests stay green.

Playwright route/clock controls or another existing deterministic harness may be used. Do not add hidden production bypasses just to make the test fast.

### Boundaries

This slice changes no Supabase Auth provider settings, Turnstile provider configuration, Vercel/WAF configuration, environment secrets, database schema/RLS, financial behavior or production user data.

## Implementation plan

This is a Class 3 auth/security user-flow slice because it affects availability of login/register/password-reset entry points, despite the code diff being small.

PR #561 implementation sequence:

1. start from exact selector-merged `main@60fdb1846e8cd8f9e6b48729ce1ff033778112e0`;
2. preserve `AuthForm.captchaBlocked` and server token validation unchanged;
3. add the smallest coherent `loading | ready | load_failed` watchdog/recovery seam in `AuthTurnstile`;
4. use a full-page reload native button for recovery rather than inventing a second loader lifecycle;
5. add deterministic stalled-script and stale-timer browser evidence using Playwright route/clock controls;
6. run exact-head project-knowledge/policy, lint/typecheck, unit/static-RLS, build, browser/e2e, CodeQL and Secret History; DB is not expected unless the implementation crosses that boundary;
7. evaluator reads #557 + this packet + exact diff directly and challenges fail-closed/race behavior;
8. if implementation completes #557, archive this packet, set `PLAN_AUTHORITY.current → null`, reconcile memory and leave #174 provider-console follow-on unselected in the same PR.

`npm run agent:doctor -- --json` is not claimed READY from the current connector-only environment because a fully materialized local repository/toolchain is unavailable here. Exact-head CI/browser evidence remains mandatory and cannot be substituted by this note.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| 557.1 | fresh-main reconnaissance | selector-merged `main@60fdb184...`, #174/#557, auth code/tests | done |
| 557.2 | official Cloudflare/Next.js/Playwright refresh | focused sources above | done |
| 557.3 | selector + authority projection | PR #558 merged as `60fdb184...` | done |
| 557.4 | implementation from fresh post-selector main | PR #561 runtime diff | in_progress |
| 557.5 | stalled-script browser evidence | PR #561 `e2e/auth-captcha.spec.ts` | in_progress |
| 557.6 | evaluator + exact-head gates | PR #561 evidence | blocked_on_ci |
| 557.7 | lifecycle closeout | same completing PR, `current → null` | blocked_on_evaluation |

## Evaluation

Evaluator must answer from #557, this packet and the exact implementation diff rather than implementer summary:

1. Can any failure path enable email auth without a real token?
2. Can a stale timer overwrite a later successful script/widget state?
3. Can retry duplicate script/widget lifecycle or leak callbacks?
4. Does failure copy expose provider secrets/configuration?
5. Does the browser test really stall the top-level script rather than merely exercise existing `onError`?
6. Is the deadline represented as a UX constant, not an unsupported provider SLA?
7. Did the diff widen into provider-console, Auth policy, schema or unrelated UI work?

Success means a blocked/stalled Turnstile resource produces a finite honest recovery state while the security gate remains closed.

## Handoff record

| Date | From | To | State | Evidence | Remaining | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-09 | MON-63 closeout | planner | authority null | #556 merged/deployed; current null | choose bounded follow-on | fresh audit |
| 2026-09-09 | planner | selector evaluation | candidate | #511 already complete; #426 stale; #174 defect confirmed; official docs refreshed | exact-head selector gates + owner merge | PR #558 evaluation |
| 2026-09-10 | owner / merged #558 | implementer | active | `main@60fdb184...`; manifest current=#557 | implementation + browser evidence | PR #561 |

## Current permission boundary

PR #561 may change only the client auth-resilience, affected browser tests and lifecycle/memory artifacts required to complete #557. It may not edit Supabase Auth/provider settings, Turnstile site/secret configuration, redirect allowlists/rate limits, Vercel/WAF configuration, environment secrets, schema/RLS, financial behavior or production data.

If #557 completes, the same PR must archive this packet, set `PLAN_AUTHORITY.current` to `null`, reconcile `CURRENT_PROJECT_MEMORY.md` and leave parent-lane #174 provider-console work unselected.
