# Configuration contract

MoneyFlow follows a configuration-first deployment model:

- source code defines behavior and validation;
- Vercel Project Settings owns values that vary by deployment;
- Supabase Authentication settings own the auth allow-list and provider controls;
- Vercel Firewall owns network-edge rate-limit rules;
- missing or malformed production configuration fails validation;
- application code must not invent a production hostname, project URL or runtime mode.

The Vietnamese [provider security controls runbook](operations/provider-security-controls.vi.md) defines the owner-operated activation, verification, evidence-redaction and rollback sequence for issue #174. Exact provider identifiers, hostnames, rule values and request evidence belong in a private operational record, not this repository.

## Required Vercel environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_MODE` | Development, Preview, Production | Explicitly `demo` or `authenticated` |
| `NEXT_PUBLIC_SITE_URL` | Development, Preview, Production | Exact application origin used for OAuth, signup and recovery callbacks |
| `NEXT_PUBLIC_SUPABASE_URL` | Required in authenticated mode | Supabase project API origin |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Required in authenticated mode | Browser-safe Supabase publishable key |
| `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED` | Optional, explicit boolean | Renders and requires the Auth Turnstile token when `true` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Required when Auth CAPTCHA is enabled | Browser-safe Cloudflare Turnstile site key |
| `LEGACY_SITE_HOSTS` | Environment-specific, optional | Comma-separated retired hostnames redirected to `NEXT_PUBLIC_SITE_URL` |

Rules:

1. Production uses `NEXT_PUBLIC_APP_MODE=authenticated`; demo is an explicit local or intentional non-production mode.
2. `NEXT_PUBLIC_SITE_URL` is an origin only: no path, query string or hash.
3. Hosted and production URLs use HTTPS.
4. `LEGACY_SITE_HOSTS` contains hostnames only, never protocols, ports or paths.
5. The canonical hostname must not appear in `LEGACY_SITE_HOSTS`.
6. Deployment values do not belong in `vercel.json`, TypeScript constants or checked-in `.env` files.
7. Missing credentials never imply demo mode.
8. Service-role/secret keys are never named `NEXT_PUBLIC_*` and never enter browser or normal Next.js application code.
9. The Turnstile **site key** is public; the Turnstile **secret key** belongs only in Supabase Auth provider settings.
10. `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=true` without a site key fails deployment validation.

## Supabase Auth URL configuration

In **Authentication → URL Configuration**:

- set **Site URL** to the exact production `NEXT_PUBLIC_SITE_URL`;
- add `${NEXT_PUBLIC_SITE_URL}/auth/callback`;
- add local/preview callback patterns only for environments that are intentionally used;
- remove retired domains after the migration window.

The application `redirectTo` value and Supabase redirect allow-list must agree. Broad wildcard callbacks are not a production convenience.

## Auth security configuration

The application requires 12–72 characters for registration and password update. This boundary improves the MoneyFlow UI, but direct calls to Supabase Auth bypass application validation. Provider settings must match it.

Before public or paid beta, verify in Supabase Auth:

- [ ] minimum password length is **12**;
- [ ] email confirmation is enabled unless a reviewed alternative flow exists;
- [ ] CAPTCHA is enabled and the site/secret values are configured in the correct environments;
- [ ] signup, token, verification and password-reset rate limits have been reviewed;
- [ ] Site URL and redirect URLs contain only active trusted origins;
- [ ] Google OAuth redirect configuration matches the production origin;
- [ ] generic application responses do not reveal whether an email exists;
- [ ] leaked-password protection is enabled after moving to a plan that supports it.

Leaked-password protection is defense in depth. It does not replace a strong minimum, CAPTCHA, rate limits, neutral errors, short reset-token lifetime or RLS.

### Safe CAPTCHA activation order

Do not enable Supabase CAPTCHA before the deployed application sends a token. The safe sequence is:

1. Create a Cloudflare Turnstile widget restricted to the exact production and intentional preview hostnames.
2. Store only its public site key as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel.
3. Set `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=true` and deploy while Supabase CAPTCHA enforcement is still off.
4. Verify the widget loads on login, registration and forgot-password pages, produces a token and resets after a failed attempt.
5. Enter the Turnstile secret in **Supabase Auth → Bot and Abuse Protection**, select Cloudflare Turnstile and enable enforcement.
6. Immediately verify successful and failed login, registration and password-reset requests on the canonical production domain.
7. Check Auth and Vercel logs for `captcha_failed`, 4xx spikes or client CSP errors.

Rollback order:

1. Disable CAPTCHA enforcement in Supabase Auth.
2. Set `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=false` and redeploy if the widget itself is causing failures.
3. Keep the site key present during diagnosis; never expose or copy the secret into Vercel public variables.

## Public route and firewall configuration

The application bounds and validates Web Share Target bodies in code, including chunked requests. Network-edge controls are still required because application code runs only after traffic reaches the deployment.

Before broad public traffic, create and verify Vercel Firewall rules for:

- `/capture/share` and `/api/share-target`: conservative request-rate limit per source;
- auth-facing routes: bot/abuse controls that do not lock out normal users;
- temporary Attack Mode only during an active incident, not as a permanent product state.

Do not implement an in-memory per-instance limiter and call it production protection. Serverless instances and regions do not share that state reliably.

## Local development

```bash
cp .env.example .env.local
```

The example starts in explicit `demo` mode. To test real accounts, set `NEXT_PUBLIC_APP_MODE=authenticated` and provide both public Supabase values. The app intentionally has no production fallback.

CAPTCHA remains disabled locally by default. Cloudflare testing site keys may be used for browser verification, but production hostname restrictions and the real secret must be configured separately before enforcement.

## Verification

Repository gates:

```bash
npm run check:deployment-env
npm run lint
npm run typecheck
npm test
npm run build
npm run test:db
```

Provider verification after configuration or deployment:

1. register with an 11-character password and confirm rejection;
2. register/update with a valid 12+ character password;
3. verify email confirmation, callback, login, refresh, logout and password reset on the exact production domain;
4. confirm login, signup and password reset cannot submit before Turnstile produces a token;
5. force an expired/failed challenge and confirm the widget resets without revealing whether an email exists;
6. submit repeated invalid auth requests and confirm provider throttling/CAPTCHA behavior without locking out normal use;
7. inspect production headers and exercise the protected share route below/above its size limit;
8. confirm no secret/service-role/Turnstile-secret value appears in browser assets or public environment output.

CI can prove repository behavior. It cannot prove dashboard values, firewall publication or the currently deployed environment.

## Domain migration procedure

1. Add the new hostname to Vercel and verify TLS.
2. Change production `NEXT_PUBLIC_SITE_URL` in Vercel.
3. Change Supabase Site URL and add the exact callback URL.
4. Add the new hostname to the Cloudflare Turnstile widget before switching traffic.
5. Put retired hostnames in `LEGACY_SITE_HOSTS`.
6. Redeploy; environment changes do not affect old deployments.
7. Verify login, callback, refresh, logout, password reset, Turnstile and security headers on the canonical hostname.
8. Remove retired redirects, Turnstile hostnames and `LEGACY_SITE_HOSTS` entries after the migration window.

## References

- https://www.12factor.net/config
- https://nextjs.org/docs/pages/guides/environment-variables
- https://vercel.com/docs/environment-variables
- https://vercel.com/docs/vercel-firewall
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/password-security
- https://supabase.com/docs/guides/auth/rate-limits
- https://supabase.com/docs/guides/auth/auth-captcha
- https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
- https://developers.cloudflare.com/turnstile/reference/content-security-policy/
