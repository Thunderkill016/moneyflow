# Configuration contract

**Authority scope:** this document owns the application environment-variable and
provider-setting contract. `docs/deployment.md` owns branch/deployment workflow;
`.env.example`, `vercel.json` and `scripts/check-deployment-env.mjs` are the supporting
executable surfaces. Do not create a second variable contract in setup/runbook docs.

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
| `MF_BACKEND_PROVIDER` | Development, Preview, Production | Backend provider in authenticated mode: `supabase` or `neon`. Default/omitted = `supabase`. Production currently runs `neon` |
| `NEON_AUTH_BASE_URL` | Required when `MF_BACKEND_PROVIDER=neon` | Managed Neon Auth (Better Auth) service base URL |
| `NEON_DATA_API_URL` | Required when `MF_BACKEND_PROVIDER=neon` | Neon Data API PostgREST base (`…/rest/v1`) |
| `NEON_AUTH_COOKIE_SECRET` | Required when `MF_BACKEND_PROVIDER=neon` | >=32-char secret signing the `session_data` cache cookie |
| `NEON_JWKS_URL` | Optional when `MF_BACKEND_PROVIDER=neon` | Override JWKS endpoint; derived from `NEON_AUTH_BASE_URL` when unset |
| `NEXT_PUBLIC_SUPABASE_URL` | Required in authenticated mode when provider is `supabase` | Supabase project API origin |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Required in authenticated mode when provider is `supabase` | Browser-safe Supabase publishable key |
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
9. The Turnstile **site key** is public; the Turnstile **secret key** belongs only in the auth provider's bot-protection settings (Supabase Auth when provider is `supabase`).
10. `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=true` without a site key fails deployment validation.
11. Under `MF_BACKEND_PROVIDER=neon`, Neon Production env values are the only place `NEON_*` secrets live; Preview/Development have no Neon variables unless a deliberate provider test exists.

## Backend provider seam (#774/#779)

`MF_BACKEND_PROVIDER` selects the authenticated backend:

- `supabase` — Supabase Auth + PostgREST. The Supabase sections below apply.
- `neon` — managed Neon Auth (Better Auth) + Neon Data API. The managed auth console owns URL allow-lists, password policy and provider settings; Google sign-in links to an existing user only when the stored account's email is verified.

Session-cookie semantics differ per provider but the viewer contract in `src/server/auth.ts` is identical; loaders never branch on provider.

## Third-party OAuth proposal authorization

`candidates.propose` creates a pending agent Inbox candidate, never a posted ledger fact. A third-party client must be approved in **both** controls:

| Control | Owner | Required value |
| --- | --- | --- |
| `CAPABILITY_WRITE_CLIENT_IDS` | Private application environment, never `NEXT_PUBLIC_*` | Comma-separated approved OAuth client IDs |
| `moneyflow.oauth_proposal_client_ids` | PostgreSQL database setting | The same approved IDs, enforced by migration `20261002120000_oauth_mutation_boundary.sql` |

Missing/empty database configuration denies third-party proposals even when the application allowlist contains the client. First-party sessions without `client_id` retain their existing ownership checks. An allowed OAuth client can insert only its own pending `source=agent` candidate; approval, ledger mutation and other owned-table writes remain denied.

Owner-operated activation (requires separate provider/production approval):

1. Verify the deployed application commit, the actual target database and the applied migration. Keep the selected client IDs in a private operational record.
2. Set the application allowlist and the persistent database setting to those approved IDs. Read the database identity with `SELECT current_database()`; use that verified identifier in `ALTER DATABASE <verified_database> SET moneyflow.oauth_proposal_client_ids = '<approved_client_ids>'`. Placeholders must be replaced by reviewed private values; this is not an executable repository default.
3. Redeploy the environment-dependent application and ensure fresh database/API connections use the updated database setting. A transaction-local `set_config(..., true)` is only a test fixture, not durable configuration. Read back the setting from a fresh connection, without publishing client IDs or tokens.
4. Using synthetic data and approved test identities, verify an allowed client creates one pending candidate and replay creates no second candidate. Verify a non-allowlisted client is denied, and both clients cannot approve candidates, write ledger facts or touch another tenant. Verify the first-party path still works.
5. Record redacted status and read-back evidence. SQL/CI success does not prove hosted configuration or the live OAuth flow.

Rollback: remove the client from the application allowlist and persistent database allowlist, redeploy/recycle affected connections and verify denial. Clearing either control denies new proposals once the affected runtime observes the setting; do not remove mutation guards or broaden permissions to repair availability.

Current provider configuration is not established by this document. [Supabase OAuth token security](https://supabase.com/docs/guides/auth/oauth-server/token-security) explains why database authorization must enforce `client_id` regardless of requested OAuth scopes.

## Supabase Auth URL configuration

Applies when `MF_BACKEND_PROVIDER=supabase` only. Under `neon`, redirect/origin allow-lists live in the managed Neon Auth console.

In **Authentication → URL Configuration**:

- set **Site URL** to the exact production `NEXT_PUBLIC_SITE_URL`;
- add `${NEXT_PUBLIC_SITE_URL}/auth/callback`;
- add local/preview callback patterns only for environments that are intentionally used;
- remove retired domains after the migration window.

The application `redirectTo` value and Supabase redirect allow-list must agree. Broad wildcard callbacks are not a production convenience.

## Auth security configuration

Applies when `MF_BACKEND_PROVIDER=supabase`. Under `neon` the managed auth console owns the equivalent controls (password policy, email verification, rate limits); the same checklist intent applies.

The application requires 12–72 characters for registration and password update. This boundary improves the MoneyFlow UI, but direct calls to the auth provider bypass application validation. Provider settings must match it.

Before public or paid beta, verify in the auth provider settings:

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

The example starts in explicit `demo` mode. To test real accounts locally, set `NEXT_PUBLIC_APP_MODE=authenticated` plus either the Supabase public values (provider `supabase`) or the `NEON_*` values (provider `neon`). The app intentionally has no production fallback.

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
3. Change the auth provider's Site URL and add the exact callback URL (Supabase Auth URL configuration, or the managed Neon Auth console under `neon`).
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
