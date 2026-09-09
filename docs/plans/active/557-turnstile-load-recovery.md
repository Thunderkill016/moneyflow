# #557 — Turnstile script-load recovery

**Status:** selector candidate; executable only after owner merge
**Execution state:** planning
**Active role:** planner / evaluator
**Permission scope:** selector PR is documentation/authority only; implementation may use `branch_write` only after selector merge and fresh authority resolution
**Owner:** ThunderK
**Issue/PR:** GitHub #557 / selector PR pending
**Parent lane:** GitHub #174 — public-beta provider controls
**Selector base:** `main@ad0461514acaec1c9a8a100ba92592c83ece46b2`
**Last updated:** 2026-09-09

## Outcome

Make the email-auth CAPTCHA gate finite, truthful and recoverable when the external Cloudflare Turnstile script never becomes ready, while preserving the existing fail-closed security boundary.

A legitimate user must not be left indefinitely at `Đang tải xác minh bảo mật…`. MoneyFlow must explain that verification could not load and give a clear recovery action. It must never synthesize a token, bypass CAPTCHA, weaken provider enforcement or silently enable email-auth submission without a valid token.

This is a bounded public-beta reliability/security slice. It does not complete the provider-console work still tracked by #174.

## Research

### Fresh repository reconnaissance

Selector baseline is fresh post-MON-63 `main@ad0461514acaec1c9a8a100ba92592c83ece46b2`, where `PLAN_AUTHORITY.current` is `null`.

Current code already has the correct fail-closed core:

- `src/components/auth-form.tsx` enables the CAPTCHA only for login/register/forgot-password when public CAPTCHA config says it is enabled.
- The form remains blocked whenever CAPTCHA is enabled but config is not ready or `captchaToken` is empty.
- `src/components/auth-turnstile.tsx` starts with status `Đang tải xác minh bảo mật…`.
- The Next.js `<Script>` has `onReady` and `onError` handlers.
- Once the widget renders, Turnstile `callback`, `expired-callback` and `error-callback` are handled.
- There is no application-side deadline for the case where the top-level external script neither becomes ready nor reports an error promptly.
- Existing `e2e/auth-captcha.spec.ts` proves successful token acquisition on login/register/forgot-password and small-screen layout, but it does not simulate a stalled top-level script.

The unresolved failure was already observed during #174 production verification: when the script did not become ready, the UI remained in its loading message for more than 30 seconds with no explanation.

### Historical authority reconciliation

- #511 must not be selected as new work: merged PR #522 already implemented and tested deterministic exception-first Ready/Needs-attention review and its merge commit explicitly states that it completes #511.
- #426 must not be executed as originally written: PR #480 failed cross-device audit, removing the desktop capture entry would remove access to paste/upload capture, and the dashboard-planning deletion was superseded by later product direction. Its issue comment requires a fresh owner design decision rather than mechanical execution.
- #174 remains a separate provider-control lane. This packet selects only the code-testable Turnstile load-stall defect; Supabase/Vercel provider-console writes remain outside this packet.

### Current external references

Cloudflare Turnstile documentation reviewed for this decision:

1. Client-side errors: https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/
2. Widget configuration and callbacks: https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/
3. Challenge solve issues, including network/browser-extension interference: https://developers.cloudflare.com/cloudflare-challenges/troubleshooting/challenge-solve-issues/
4. Server-side validation: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

Next.js Script documentation reviewed for third-party script lifecycle behavior:

5. https://nextjs.org/docs/app/api-reference/components/script

Applicability:

- Cloudflare recommends explicit client error/timeout handling and documents network/browser conditions that can prevent challenge resources from loading.
- Turnstile widget `timeout-callback` concerns an interactive challenge after widget lifecycle exists; it does not replace an application-side deadline for a top-level script that never reaches the renderable state.
- Server-side verification remains mandatory; this slice does not change it.

### Research limits

- No evidence justifies disabling CAPTCHA as a recovery path.
- No evidence justifies changing provider site/secret keys, Supabase Auth settings, redirect allowlists, rate limits or WAF in this code slice.
- No single timeout duration is a security truth. Implementation should choose one bounded constant, document the UX rationale and test it deterministically rather than hiding an arbitrary provider SLA claim.

## Specification

### 1. Finite script-load state machine

The Turnstile surface must distinguish at least:

- `loading`: top-level script is not ready yet;
- `ready`: script/widget can proceed normally;
- `load_failed`: the script explicitly errors or exceeds the bounded application deadline.

The deadline starts only while CAPTCHA is mounted and the script has not become ready.

Requirements:

- clear the deadline when `onReady` succeeds;
- clear it when explicit script failure is handled;
- clear it on unmount;
- prevent a stale timer callback from overwriting a later success state;
- preserve existing widget callback / expiration / reset behavior after render.

### 2. Fail-closed recovery UX

When script loading fails or exceeds the deadline:

- clear any stale CAPTCHA token;
- stop claiming the system is still loading;
- show a short non-sensitive explanation that security verification could not load;
- provide a keyboard-accessible retry/reload action;
- keep the email-auth submit disabled until a real Turnstile token is obtained.

A full-page retry/reload is acceptable and preferred over inventing a second custom script-loader lifecycle unless implementation evidence proves a smaller safe retry mechanism.

Do not expose provider identifiers, keys, tokens, internal thresholds or diagnostics in user-visible copy or logs.

### 3. Race and lifecycle safety

The implementation must handle these races deterministically:

- timeout fires just as `onReady` occurs;
- explicit `onError` happens before the deadline;
- component unmounts before the deadline;
- a pending auth attempt finishes and the existing widget reset path runs;
- widget-level `error-callback` fires after successful top-level script loading.

Late callbacks must not weaken the submit gate. A valid token remains the only client condition that unblocks CAPTCHA-enabled email auth.

### 4. Browser acceptance

Add representative browser evidence that simulates the top-level Turnstile script remaining unresolved long enough to cross the app deadline without relying on a real provider outage.

The test must prove:

1. the initial loading state is visible;
2. the state becomes a finite failure message after the bounded deadline;
3. login/register/forgot-password submit remains disabled with no token;
4. the recovery action is reachable by role/name and keyboard-usable;
5. the test does not create a fake CAPTCHA token;
6. existing successful Turnstile browser tests remain green.

The test may use Playwright routing/clock controls or another deterministic harness already supported by the repository. Do not shorten production security behavior through test-only runtime branches unless the mechanism is explicit and safe.

### 5. No provider or financial mutation

This slice changes no:

- Supabase Auth provider settings;
- Turnstile site/secret configuration;
- Vercel/WAF configuration;
- environment secret values;
- database schema/RLS;
- ledger/import/provider semantics;
- production user data.

## Implementation plan

This is a Class 3 auth/security user-flow slice because it affects availability of login/register/password-reset entry points, even though it should require only a small client change and browser tests.

After owner merges the selector:

1. read fresh `main` and record the post-selector merge SHA;
2. run `npm run plan:resolve` and `npm run agent:doctor -- --json` in a fully materialized repository/toolchain environment;
3. inspect `auth-turnstile.tsx`, `auth-form.tsx`, `auth-captcha.spec.ts` and current auth action/server validation before code;
4. implement the smallest coherent watchdog/recovery seam without changing the existing token gate;
5. add deterministic browser evidence for a stalled top-level script;
6. run exact-head policy, static, unit, build and affected browser gates plus CodeQL/Secret History; DB gate is not expected unless the diff unexpectedly crosses a database boundary;
7. perform evaluator pass from issue/spec + exact diff, challenging fail-closed behavior and race handling;
8. if the PR completes #557, close lifecycle in the same PR: archive this packet, set `PLAN_AUTHORITY.current → null`, reconcile current memory and leave #174/provider-console follow-on work unselected.

## Acceptance matrix

- [ ] application deadline makes unresolved top-level script loading finite;
- [ ] user sees truthful actionable failure instead of indefinite loading;
- [ ] recovery control is keyboard-accessible;
- [ ] no fake/bypass token exists;
- [ ] email-auth submit remains disabled without a valid token;
- [ ] late-ready / timeout race cannot overwrite a successful state incorrectly;
- [ ] explicit script `onError` remains handled;
- [ ] widget callback / expiration / error / post-submit reset behavior remains intact;
- [ ] login, register and forgot-password successful CAPTCHA flows remain green;
- [ ] browser test proves stalled-script failure path deterministically;
- [ ] no Supabase/Vercel/Turnstile provider configuration is changed;
- [ ] no schema/RLS/financial/provider mutation is introduced;
- [ ] exact-head required checks and evaluator pass are clean;
- [ ] completing implementation PR performs same-PR lifecycle convergence to `current: null`.

## Evaluation

Evaluator must read #557, this packet and the exact implementation diff directly.

Challenge questions:

1. Can any failure path enable email auth without a real token?
2. Can a stale timer override a later successful script/widget state?
3. Can retry create duplicate script/widget lifecycle or leak callbacks?
4. Does user-visible failure reveal provider secrets/configuration?
5. Does the browser test really stall the top-level script, or merely exercise existing `onError`?
6. Is the chosen deadline a UX constant rather than an unsupported provider SLA claim?
7. Did the diff accidentally widen into provider-console, Auth policy, schema or unrelated UI work?

Success means a blocked/stalled Turnstile resource produces a finite, honest recovery state while the security gate remains closed.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| 557.1 | fresh-main reconnaissance | `main@ad046151...`, #174/#557, current auth code/tests | done |
| 557.2 | current Cloudflare/Next.js research | official docs listed above | done |
| 557.3 | selector packet + authority projection | selector PR | in_progress |
| 557.4 | implementation from fresh post-selector main | runtime branch | blocked |
| 557.5 | stalled-script browser evidence | Playwright affected-flow test | blocked |
| 557.6 | evaluator + exact-head verification | implementation PR checks/evidence | blocked |
| 557.7 | lifecycle closeout | same completing PR, `current → null` | blocked |

## Handoff record

| Date | From | To | State | Evidence | Remaining | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-09-09 | MON-63 closeout | planner | authority null | PR #556 merged; production READY; `PLAN_AUTHORITY.current = null` | choose one bounded follow-on | fresh-main audit |
| 2026-09-09 | planner | selector evaluation | planning | #511 already complete via #522; #426 stale as executable; #174 code defect confirmed; official Turnstile docs refreshed | owner merge decision after exact-head selector gates | create selector PR for #557 |

## Current permission boundary

Selector PR may only add/update planning authority, project memory and PR memory needed to select #557. It may not edit runtime/auth code, Supabase settings, Turnstile provider settings, Vercel/WAF, environment secrets, schema/RLS or production data.

If owner merges the selector, implementation permission is bounded to the client auth-resilience code/tests described above. Provider-console changes tracked by #174 still require their own explicit operational authorization and reversible verification.