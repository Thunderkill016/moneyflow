# Auth CAPTCHA provider readiness

**Status:** implementing  
**Owner:** GPT-5.6 Thinking + human owner  
**Issue:** #174  
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

- [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY` enables the widget; absence preserves the current flow.
- [ ] Login, registration and password-reset forms submit a `captchaToken` hidden field.
- [ ] Supabase Auth calls pass the token through their documented options.
- [ ] Failed/non-redirecting submissions reset the used or expired token.
- [ ] Submit stays disabled while configured CAPTCHA has no valid token.
- [ ] The widget reports loading, failure and expiry accessibly.
- [ ] CSP permits only the required Turnstile script and frame origin.
- [ ] An explicit CAPTCHA-enabled deployment cannot pass validation without a site key.
- [ ] No CAPTCHA secret is added to source, Vercel public env or browser code.
- [ ] Unit/static tests cover configuration, token normalization, CSP and auth token forwarding.

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

## Verification

- `npm run check:knowledge`
- `npm run check:deployment-env`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- Auth browser smoke with Cloudflare testing site key before provider enforcement.

## Rollback

Remove `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and keep Supabase CAPTCHA disabled. The form then follows the previous auth path without rendering a widget or requiring a token.

## Delivery state

- Stacked implementation packet on PR #173
- Not merged
- Not deployed
- Provider enforcement remains disabled until browser verification passes
