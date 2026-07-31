# Auth CAPTCHA provider readiness

**Status:** evaluating  
**Owner:** GPT-5.6 Thinking + human owner  
**Issue:** #174  
**PR:** #175  
**Base:** PR #173 head `01a34f39c1a630e1bccb7dfa0981e4cf3c4d4400`  
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
- [ ] Exact-head repository CI passes.
- [ ] Browser smoke passes with a Cloudflare testing site key before provider enforcement.

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
- [ ] Pass project knowledge, deployment, architecture, lint, typecheck, tests and production build.
- [ ] Pass database and cross-device browser gates.
- [ ] Verify the rendered widget with Cloudflare testing keys.
- [ ] Keep Supabase CAPTCHA disabled until the deployed client proof exists.

## Evaluation

Evaluation is independent of implementation completion:

1. Repository CI must run on the exact head SHA, not a previous stacked snapshot.
2. Static tests must prove all three email-auth paths forward `captchaToken` and that missing tokens are rejected server-side when enabled.
3. Production build headers must keep `frame-src 'none'` when CAPTCHA is off and allow only `https://challenges.cloudflare.com` when it is configured.
4. Phone-width browser evidence must show no horizontal overflow; <=380px uses the compact widget.
5. A failed or expired challenge must clear the hidden token and permit a fresh challenge.
6. Provider enforcement is evaluated separately in issue #174 and cannot be claimed by repository CI.
7. Any provider publication requires a rollback path and immediate production auth smoke.

## Verification

- `npm run check:knowledge`
- `npm run check:deployment-env`
- `npm run check:css-ownership`
- `npm run check:architecture`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:db`
- Auth browser smoke with Cloudflare testing site key before provider enforcement.

## Rollback

Disable CAPTCHA enforcement in Supabase first, then set `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=false` and redeploy. The form follows the previous auth path without rendering a widget or requiring a token. Keep the Turnstile secret only in Supabase.

## Delivery state

- Stacked implementation packet on PR #173
- PR #175 open and not merged
- Not deployed
- Provider enforcement remains disabled until browser verification passes
