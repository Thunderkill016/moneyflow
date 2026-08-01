# Auth CAPTCHA provider readiness

**Status:** completed  
**Execution state:** completed  
**Active role:** human owner  
**Permission scope:** branch_write  
**Owner:** GPT-5.6 Thinking; human owner controlled merge, provider publication, deployment, and acceptance  
**Issue:** #174  
**PR:** #175  
**Merged commit:** `d2ed92f46944851884d069581632a725ff5d2af4`  
**Completed:** 2026-08-01

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`.

## Outcome

MoneyFlow can optionally render Cloudflare Turnstile for Supabase email/password sign-up, sign-in, and password-reset requests. The implementation was merged and deployed with CAPTCHA disabled, so existing production Auth behavior remained unchanged. Repository code prepares token transport and safe rollout; it does not itself enable Supabase enforcement or publish provider secrets.

## Delivered scope

- explicit Cloudflare Turnstile rendering for email login, registration, and password reset;
- disabled-by-default feature flag;
- deployment validation requiring a public site key when enabled;
- shared CAPTCHA token forwarding through Server Actions to Supabase Auth;
- server-side rejection of missing tokens while enabled;
- reset of used, expired, or failed challenges after non-redirecting attempts;
- compact narrow-phone widget behavior;
- dependency-free component implementation;
- conditional exact-origin CSP allowance;
- unit, static, deployment, database, browser, and cross-device coverage.

Google OAuth and update-password remained outside this slice.

## Acceptance criteria

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
- [x] The synchronized PR diff contained only the intended 15 files.
- [x] Exact-head CI passed the complete repository matrix.
- [x] Human owner accepted Cloudflare Turnstile as the optional external Auth dependency and authorized merge.
- [x] Production deployment completed with CAPTCHA still disabled.

## Verification

Exact PR head `f497a664943d3843b3f154d5c63f13ce93ccd5fb` passed CI #799, run `30701041328`:

- project knowledge, deployment environment, CSS ownership, and architecture contracts;
- lint and typecheck;
- unit tests and static RLS checks;
- production build;
- fresh Supabase reset and all pgTAP suites;
- expense-path and Auth CAPTCHA browser smoke;
- production cross-device UI audit;
- Playwright evidence upload.

The browser smoke used Cloudflare's documented CI-only dummy site key. It is not production configuration.

## Merge and production evidence

- PR #175 was squash-merged on 2026-08-01.
- Merge commit: `d2ed92f46944851884d069581632a725ff5d2af4`.
- Vercel production deployment: `dpl_DMWzezgWgWWrbXupEEAVe1xt4xMe`.
- Deployment state: `READY`.
- Production alias: `mfvn.vercel.app`.
- `/`, `/login`, `/register`, and `/forgot-password` returned HTTP 200.
- Login and registration retained the 12-character password guidance.
- CAPTCHA remained disabled and no Turnstile widget rendered.
- Production CSP retained `frame-src 'none'` and did not allow `https://challenges.cloudflare.com`.
- No deployment-scoped error or fatal runtime logs were found during the post-deploy smoke window.

## Provider state at completion

- Supabase CAPTCHA enforcement remained disabled.
- No Cloudflare production widget or secret was created or stored.
- No Vercel environment variable was changed.
- No Vercel Firewall rule was published.
- No production database schema or financial data was changed.

Provider publication and production Auth controls remain tracked in issue #174.

## Rollback

Provider rollback order after any future publication:

1. Disable CAPTCHA enforcement in Supabase Auth.
2. Set `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=false` and redeploy if the widget itself causes failures.
3. Keep the production secret only in Supabase; never move it into Vercel public configuration.

Repository rollback is a normal revert of PR #175. With the feature flag off, the existing Auth flow remains active.
