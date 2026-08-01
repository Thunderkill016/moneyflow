# Auth CAPTCHA provider readiness

**Status:** ready_for_review  
**Execution state:** ready_for_review  
**Active role:** human owner  
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
- The branch was synchronized without force-push by reconciling the final #173 branch state, merging current `main`, and restoring only CAPTCHA-specific changes.
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
- [x] Synchronized implementation passed the complete repository CI matrix.
- [ ] Human owner reviews and approves the Cloudflare provider dependency before merge.

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
- [x] Run project knowledge, deployment, CSS, architecture, lint, typecheck, unit, build, database, E2E, and UI-audit gates.
- [x] Record synchronized evidence and hand off for human review.

## Evaluation

Evaluation is independent of implementation completion:

1. The final branch was compared directly with current `main`; duplicated #173 changes were removed from the PR diff.
2. Login, registration, and forgot-password require and forward the same token only when enabled.
3. Update-password and Google OAuth remain outside CAPTCHA scope.
4. Production CSP remains `frame-src 'none'` while CAPTCHA is disabled and permits only `https://challenges.cloudflare.com` when ready.
5. The dedicated 320px case verifies no horizontal document/body overflow.
6. Failed or expired challenges clear/reset before retry.
7. A fresh Supabase reset and all pgTAP suites pass, proving no database regression in this slice.
8. Provider enforcement and production Auth smoke remain separate owner-controlled work in #174.

## Verification

Synchronized implementation head `0d2346277a00635e236a4c68fa1b2b3373acfa1e` passed CI #798, run `30700613461`:

- project knowledge, deployment environment, CSS ownership, and architecture contracts;
- lint and typecheck;
- unit/static RLS tests;
- production build;
- fresh Supabase reset and all pgTAP suites;
- expense-path and Auth CAPTCHA browser smoke;
- production cross-device UI audit;
- Playwright evidence upload.

The browser smoke uses Cloudflare's documented CI-only dummy site key. It must never be copied to production.

This documentation handoff commit must pass the same exact-head CI before merge review is final.

## Rollback

Provider rollback order after any future publication:

1. Disable CAPTCHA enforcement in Supabase Auth.
2. Set `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=false` and redeploy if the widget itself causes failures.
3. Keep the production secret only in Supabase; never move it into Vercel public configuration.

Repository rollback is a normal revert of PR #175. With the feature flag off, the existing Auth flow remains active.

## Delivery state

- PR #175 targets current `main` and is ready for human review.
- Diff is reduced to 15 intended CAPTCHA/configuration/test files.
- No npm or runtime package was added; Cloudflare Turnstile is an optional external Auth service behind a disabled-by-default feature flag.
- Not merged or deployed.
- No Supabase, Cloudflare, Vercel environment, or Firewall setting changed.
- Human approval of the provider dependency is required before merge.
