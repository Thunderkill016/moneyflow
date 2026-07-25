# Configuration contract

MoneyFlow follows a configuration-first deployment model:

- source code defines behavior and validation;
- Vercel Project Settings owns values that vary by deployment;
- Supabase Authentication URL Configuration owns the auth allow-list;
- missing or malformed production configuration fails the build;
- application code must not invent a production hostname, project URL or runtime mode.

This follows the Twelve-Factor App config principle and the official Next.js, Vercel and Supabase deployment guidance.

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
3. Hosted and production URLs must use HTTPS.
4. `LEGACY_SITE_HOSTS` contains hostnames only, never protocols, ports or paths.
5. The canonical hostname must not appear in `LEGACY_SITE_HOSTS`.
6. Do not add deployment values to `vercel.json`, TypeScript constants or checked-in `.env` files.
7. Do not infer demo mode from missing credentials, `placeholder`, `replace_me` or other magic strings.

## Supabase Auth configuration

In **Authentication → URL Configuration**:

- set **Site URL** to the same value as production `NEXT_PUBLIC_SITE_URL`;
- add the exact production callback `${NEXT_PUBLIC_SITE_URL}/auth/callback`;
- add local/preview callback patterns only for environments that are actually used;
- keep retired domains only during a deliberate migration window, then remove them.

The application `redirectTo` value and the Supabase Redirect URLs allow-list must agree.

## Local development

```bash
cp .env.example .env.local
```

The example starts in explicit `demo` mode. To test real accounts, change `NEXT_PUBLIC_APP_MODE` to `authenticated` and provide both Supabase values. The app intentionally has no production fallback. Missing configuration is an error, not a reason to guess a mode, project or hostname.

## Verification

```bash
npm run check:deployment-env
npm run lint
npm run typecheck
npm test
npm run build
```

CI runs the same configuration contract with non-production test values.

## Domain migration procedure

1. Add the new hostname to Vercel and verify TLS.
2. Change production `NEXT_PUBLIC_SITE_URL` in Vercel.
3. Change Supabase Site URL and add the exact new callback URL.
4. Put retired hostnames in `LEGACY_SITE_HOSTS`.
5. Redeploy; environment changes do not affect old deployments.
6. Verify login, callback, refresh and logout on the canonical hostname.
7. Remove retired redirect URLs and `LEGACY_SITE_HOSTS` entries after the migration window.

## References

- https://www.12factor.net/config
- https://nextjs.org/docs/pages/guides/environment-variables
- https://vercel.com/docs/environment-variables
- https://supabase.com/docs/guides/auth/redirect-urls
