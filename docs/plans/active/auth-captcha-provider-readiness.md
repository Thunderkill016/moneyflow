# Auth CAPTCHA provider readiness

**Status:** evaluating  
**Execution state:** evaluating  
**Active role:** GPT-5.6 Thinking  
**Permission scope:** branch_write  
**Owner:** GPT-5.6 Thinking; human owner controls merge, provider publication, deployment, and acceptance  
**Issue:** #174  
**PR:** #175  
**Base:** `main@43e4d845ea3464202d85a6ab8ce2bebfd44ca54b`  
**Last updated:** 2026-08-01

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Outcome

MoneyFlow can optionally render Cloudflare Turnstile for Supabase email/password sign-up, sign-in, and password-reset requests. When CAPTCHA is disabled or unconfigured, the existing Auth flow remains unchanged. Repository code prepares token transport and safe rollout; it does not enable Supabase enforcement or publish provider settings.

## Repository reconnaissance

- Auth UI is owned by `src/components/auth-form.tsx` and component CSS modules.
- Public Auth Server Actions are owned by `src/app/(auth)/actions.ts`.
- Browser policy is owned by `src/lib/security-headers.ts` and applied through `next.config.ts`.
- PR #173 is merged and deployed; its security boundaries are now part of `main`.
- PR #175 was retargeted from the old #173 branch to `main`.
- The branch was synchronized without force-push by first reconciling the final #173 branch state, then merging current `main`, then restoring only CAPTCHA-specific changes.
- The resulting `main...agent/auth-captcha-provider-readiness` diff contains exactly 15 intended CAPTCHA/configuration/test files.

## Research

- Supabase Auth accepts CAPTCHA tokens for sign-up, password sign-in, and password-reset requests.
- Cloudflare Turnstile supports explicit rendering, token expiry/reset, and compact/flexible sizing.
- Turnstile requires its exact challenge origin in CSP only when configured.
- CAPTCHA tokens are short-lived and single-use; a non-redirecting attempt must clear/reset the token before retry.
- The site key is browser-safe public configuration; the secret belongs only in Supabase Auth provider settings.

## Specification

### Acceptance criteria

- [x] `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=true` enables the widget; false or absent preserves the existing flow.
- [x] Login, registration, and password-reset forms submit a shared CAPTCHA token field.
- [x] Supabase Auth calls receive the token through documented options.
- [x] Missing tokens are rejected server-side when CAPTCHA is enabled.
- [x] Used, expired, or failed challenges reset after non-redirecting attempts.
- [x] Submit remains disabled until configured CAPTCHA produces a token.
- [x] The widget exposes accessible loading, failure, and expiry state.
- [x] CSP allows only the exact Turnstile origin while CAPTCHA is configured.
- [x] CAPTCHA-enabled deployment validation fails without a site key.
- [x] No Turnstile secret enters source, Vercel public variables, or browser code.
- [x] The synchronized PR diff contains only the intended 15 files.
- [ ] Final exact-head repository CI passes against current `main`.
- [ ] Human owner reviews and approves the provider dependency before merge.

### Out of scope

- Enabling CAPTCHA in Supabase.
- Creating, storing, or exposing a Turnstile secret.
- Changing Supabase Auth password/rate-limit settings.
- Publishing Vercel Firewall rules.
- Applying CAPTCHA to Google OAuth.
- Merging or deploying PR #175 autonomously.

## Implementation plan

| Area | Change |
|---|---|
| `src/lib/auth-captcha.ts` | Pure configuration and token normalization contract |
| `src/components/auth-turnstile.tsx` | Dependency-free explicit Turnstile lifecycle |
| `src/components/auth-form.tsx` | Hidden token, accessible state, and submit gating |
| `src/app/(auth)/actions.ts` | Server-side requirement and Supabase token forwarding |
| `src/lib/security-headers.ts` | Conditional exact-origin CSP allowance |
| `.env.example`, deployment guard, docs | Safe public configuration, activation, and rollback order |
| tests | Configuration, token forwarding, CSP, browser, and narrow-viewport coverage |

## Tasks

- [x] Retarget PR #175 to `main`.
- [x] Synchronize final #173 state and current `main` without force-push.
- [x] Resolve squash-history conflicts without retaining duplicated #173 changes.
- [x] Restore only the original CAPTCHA-specific changes after synchronization.
- [x] Confirm exactly 15 intended changed files remain.
- [x] Keep CAPTCHA disabled by default.
- [x] Keep the implementation dependency-free at runtime.
- [x] Preserve provider secrets outside repository and public environment variables.
- [ ] Run final project knowledge, deployment, CSS, architecture, lint, typecheck, unit, build, database, E2E, and UI-audit gates.
- [ ] Record exact-head evidence and hand off for human review.

## Evaluation

Evaluation is independent of implementation completion:

1. Compare the final branch directly with current `main` and reject duplicated #173 files.
2. Verify login, registration, and forgot-password all require and forward the same token only when enabled.
3. Verify the update-password and Google OAuth flows remain outside CAPTCHA scope.
4. Verify production CSP remains `frame-src 'none'` while CAPTCHA is disabled and permits only `https://challenges.cloudflare.com` when ready.
5. Verify the 320px case does not create horizontal document/body overflow.
6. Verify failed or expired challenges clear/reset before retry.
7. Run a fresh Supabase reset and all pgTAP suites to prove no database regression.
8. Treat provider enforcement and production Auth smoke as separate owner-controlled work in #174.

## Verification

Previous stacked-head CI proved the original implementation, but it is stale after `main` synchronization and is not final acceptance evidence.

Final exact-head CI is pending on the synchronized branch. Required gates:

- project knowledge, deployment environment, CSS ownership, and architecture contracts;
- lint and typecheck;
- unit/static RLS tests;
- production build;
- fresh Supabase reset and all pgTAP suites;
- expense-path and Auth CAPTCHA browser smoke;
- production cross-device UI audit and evidence upload.

The browser smoke uses Cloudflare's documented CI-only dummy site key. It must never be copied to production.

## Rollback

Provider rollback order after any future publication:

1. Disable CAPTCHA enforcement in Supabase Auth.
2. Set `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=false` and redeploy if the widget itself causes failures.
3. Keep the production secret only in Supabase; never move it into Vercel public configuration.

Repository rollback is a normal revert of PR #175. With the feature flag off, the existing Auth flow remains active.

## Delivery state

- PR #175 targets current `main`.
- Diff is reduced to 15 intended CAPTCHA/configuration/test files.
- Not merged or deployed.
- No Supabase, Cloudflare, Vercel environment, or Firewall setting changed.
- Final exact-head CI and human acceptance remain pending.
