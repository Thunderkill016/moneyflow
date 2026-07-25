# Configuration contract

MoneyFlow follows a configuration-first deployment model:

- source code defines behavior and validation;
- Vercel Project Settings owns values that vary by deployment;
- Supabase Authentication URL Configuration owns the auth allow-list;
- missing or malformed production configuration fails the build;
- application code must not invent a production hostname or project URL.

This follows the Twelve-Factor App config principle and the official Next.js, Vercel and Supabase deployment guidance.

## Required Vercel environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Development, Preview, Production | Supabase project API origin |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Development, Preview, Production | Browser-safe Supabase publishable key |
| `NEXT_PUBLIC_SITE_URL` | Development, Preview, Production | Exact application origin used for OAuth, signup and recovery callbacks |
| `LEGACY_SITE_HOSTS` | Environment-specific, optional | Comma-separated retired hostnames redirected to `NEXT_PUBLIC_SITE_URL` |

Rules:

1. `NEXT_PUBLIC_SITE_URL` is an origin only: no path, query string or hash.
2. Production URLs must use HTTPS.
3. `LEGACY_SITE_HOSTS` contains hostnames only, never protocols or paths.
4. The canonical hostname must not appear in `LEGACY_SITE_HOSTS`.
5. Do not add these values to `vercel.json`, TypeScript constants or checked-in `.env` files.

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

Fill every required value. The app intentionally has no production fallback. A missing site URL is a configuration error, not a reason to guess a hostname.

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
