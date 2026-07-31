# Configuration contract

MoneyFlow follows a configuration-first deployment model:

- source code defines behavior and validation;
- Vercel Project Settings owns values that vary by deployment;
- Supabase Authentication settings own the auth allow-list and provider controls;
- Vercel Firewall owns network-edge rate-limit rules;
- missing or malformed production configuration fails validation;
- application code must not invent a production hostname, project URL or runtime mode.

## Required Vercel environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_MODE` | Development, Preview, Production | Explicitly `demo` or `authenticated` |
| `NEXT_PUBLIC_SITE_URL` | Development, Preview, Production | Exact application origin used for OAuth, signup and recovery callbacks |
| `NEXT_PUBLIC_SUPABASE_URL` | Required in authenticated mode | Supabase project API origin |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Required in authenticated mode | Browser-safe Supabase publishable key |
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
4. submit repeated invalid auth requests and confirm provider throttling/CAPTCHA behavior without revealing account existence;
5. inspect production headers and exercise the protected share route below/above its size limit;
6. confirm no secret/service-role value appears in browser assets or public environment output.

CI can prove repository behavior. It cannot prove dashboard values, firewall publication or the currently deployed environment.

## Domain migration procedure

1. Add the new hostname to Vercel and verify TLS.
2. Change production `NEXT_PUBLIC_SITE_URL` in Vercel.
3. Change Supabase Site URL and add the exact callback URL.
4. Put retired hostnames in `LEGACY_SITE_HOSTS`.
5. Redeploy; environment changes do not affect old deployments.
6. Verify login, callback, refresh, logout, password reset and security headers on the canonical hostname.
7. Remove retired redirects and `LEGACY_SITE_HOSTS` entries after the migration window.

## References

- https://www.12factor.net/config
- https://nextjs.org/docs/pages/guides/environment-variables
- https://vercel.com/docs/environment-variables
- https://vercel.com/docs/vercel-firewall
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/password-security
- https://supabase.com/docs/guides/auth/rate-limits
- https://supabase.com/docs/guides/auth/auth-captcha
