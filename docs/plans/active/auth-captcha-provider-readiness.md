# Auth CAPTCHA provider readiness

**Status:** evaluated  
**Owner:** GPT-5.6 Thinking + human owner  
**Issue:** #174  
**PR:** #175  
**Base:** PR #173 head `01a34f39c1a630e1bccb7dfa0981e4cf3c4d4400`  
**Evaluated head:** `cbe9aff173fb085c44b68f430d320640296c8981`  
**Last updated:** 2026-07-31

## Outcome

MoneyFlow can send a Cloudflare Turnstile token with Supabase email/password sign-up, sign-in and password-reset requests before CAPTCHA enforcement is enabled in the Supabase dashboard. Missing provider configuration keeps the existing auth flow unchanged.

## Repository reconnaissance

- Auth UI is owned by `src/components/auth-form.tsx` and `auth-form.module.css`.
- Public Auth Server Actions are owned by `src/app/(auth)/actions.ts`.
- PR #173 already centralizes CSP in `src/lib/security-headers.ts` and strengthens password/error behavior.
- Supabase CAPTCHA enforcement is a provider setting and must not be enabled until the client sends a valid token.
- The production site key is public configuration; the Turnstile secret remains only in Supabase.

## Research

- Supabase supports CAPTCHA tokens on sign-up, password sign-in and password-reset endpoints.
- Supabase supports hCaptcha and Cloudflare Turnstile.
- Cloudflare Turnstile supports explicit rendering, token reset and responsive `flexible` size.
- Turnstile requires `https://challenges.cloudflare.com` in CSP `script-src` and `frame-src`.
- A CAPTCHA token is single-use and short-lived; failed Server Action attempts must reset the widget before retry.

## Specification

### Acceptance criteria

- [x] `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=true` enables the widget; false or absent preserves the current flow.
- [x] Login, registration and password-reset forms submit a `captchaToken` hidden field.
- [x] Supabase Auth calls pass the token through their documented options.
- [x] Failed/non-redirecting submissions reset the used or expired token.
- [x] Submit stays disabled while configured CAPTCHA has no valid token.
- [x] The widget reports loading, failure and expiry accessibly.
- [x] CSP permits only the required Turnstile script and frame origin while configured.
- [x] An explicit CAPTCHA-enabled deployment cannot pass validation without a site key.
- [x] No CAPTCHA secret is added to source, Vercel public env or browser code.
- [x] Unit/static tests cover configuration, token normalization, CSP and auth token forwarding.
- [x] Exact-head repository CI passes.
- [x] Browser smoke passes with Cloudflare's documented testing site key before provider enforcement.

### Out of scope

- Enabling CAPTCHA in the Supabase dashboard.
- Creating or storing a Cloudflare Turnstile secret.
- Vercel Firewall publication.
- Applying CAPTCHA to Google OAuth.
- Merging or deploying PR #173 or this packet.

## Implementation plan

| Area | Change |
|---|---|
| `src/lib/auth-captcha.ts` | Pure configuration and token normalization contract |
| `src/components/auth-turnstile.tsx` | Dependency-free explicit Turnstile widget lifecycle |
| `src/components/auth-form.tsx` | Hidden token, accessible state and submit gating |
| `src/app/(auth)/actions.ts` | Forward token to Supabase auth methods |
| `src/lib/security-headers.ts` | Allow the exact Turnstile script and frame origin |
| `.env.example`, deployment guard, docs | Provider activation sequence and safe public env |
| tests | Red/green coverage for config, CSP and auth surface |

## Tasks

- [x] Create a stacked branch from the exact PR #173 head.
- [x] Add a pure CAPTCHA configuration/token contract.
- [x] Implement dependency-free explicit Turnstile rendering.
- [x] Gate email auth submit until a token exists.
- [x] Enforce and forward tokens in Server Actions.
- [x] Add conditional CSP and deployment validation.
- [x] Document safe activation and rollback order.
- [x] Add unit/static regression tests.
- [x] Pass project knowledge, deployment, architecture, CSS ownership, lint, typecheck, tests and production build.
- [x] Pass database and cross-device browser gates.
- [x] Verify the rendered widget with Cloudflare's testing site key on login, registration, forgot-password and a 320px viewport.
- [x] Keep Supabase CAPTCHA disabled until the deployed client proof exists.

## Evaluation

Evaluation is independent of implementation completion:

1. Repository CI ran on exact head `cbe9aff173fb085c44b68f430d320640296c8981`.
2. Static tests prove all three email-auth paths forward `captchaToken` and that missing tokens are rejected server-side when enabled.
3. Production build headers keep `frame-src 'none'` when CAPTCHA is off and allow only `https://challenges.cloudflare.com` when it is configured.
4. Browser evidence shows the dummy Turnstile challenge produces a token for login, registration and forgot-password; the submit control becomes enabled only after a token exists.
5. A dedicated 320px browser case proves no horizontal document/body overflow; the widget uses compact mode at <=380px.
6. The widget clears and resets a used or expired token after a non-redirecting attempt.
7. Provider enforcement is evaluated separately in issue #174 and cannot be claimed by repository CI.
8. Any provider publication requires a rollback path and immediate production auth smoke.

## Verification

CI #681, run ID `30638965740`, completed successfully on the evaluated head:

- project knowledge contract;
- deployment configuration contract;
- CSS ownership and debt budgets;
- architecture boundary contract;
- lint and typecheck;
- unit/static RLS tests;
- production build;
- fresh local Supabase reset and all pgTAP;
- expense-path and Auth CAPTCHA browser smoke;
- production cross-device UI audit;
- Playwright evidence upload.

The Auth CAPTCHA smoke used Cloudflare's documented dummy site key `1x00000000000000000000AA`, which is CI-only and must not be copied to production.

## Rollback

Disable CAPTCHA enforcement in Supabase first, then set `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=false` and redeploy. The form follows the previous auth path without rendering a widget or requiring a token. Keep the Turnstile secret only in Supabase.

## Delivery state

- PR #175 is stacked on PR #173 and ready for review.
- Not merged.
- Not deployed.
- Supabase CAPTCHA enforcement remains disabled.
- Production provider publication and verification remain tracked in issue #174.
