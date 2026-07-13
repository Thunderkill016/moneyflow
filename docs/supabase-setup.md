# Supabase setup

MoneyFlow runs in local demo mode when Supabase environment variables are absent. To enable real accounts and the protected database:

## 1. Create a project

Create a Supabase project and copy the Project URL and publishable key from **Dashboard → Connect**.

Never use the secret/service-role key in browser code.

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

For production, set `NEXT_PUBLIC_SITE_URL` to the HTTPS production origin.

## 3. Configure Auth redirects

In **Authentication → URL Configuration**, add:

```text
http://localhost:3000/auth/callback
https://your-production-domain.example/auth/callback
```

Enable Google in **Authentication → Providers** before testing Google login. Email/password works independently.

## 4. Apply database migrations

With Docker installed:

```bash
SUPABASE_TELEMETRY_DISABLED=1 npx supabase start
SUPABASE_TELEMETRY_DISABLED=1 npx supabase db reset
SUPABASE_TELEMETRY_DISABLED=1 npx supabase test db
```

For a cloud project:

```bash
SUPABASE_TELEMETRY_DISABLED=1 npx supabase login
SUPABASE_TELEMETRY_DISABLED=1 npx supabase link --project-ref YOUR_PROJECT_REF
SUPABASE_TELEMETRY_DISABLED=1 npx supabase db push
```

Review the SQL diff before pushing to any production project.

## Security model

- Proxy refreshes Auth cookies and performs an optimistic redirect.
- Server pages call `getClaims()` again before rendering protected data.
- Every user-owned table has Row Level Security.
- Financial transaction rows are read-only through the Data API.
- Creation and soft deletion use narrowly scoped RPC functions.
- RPC functions derive `user_id` from `auth.uid()` and never accept it from the browser.
- Money is stored as signed `bigint` minor units in ledger entries.
- Idempotency keys prevent duplicate transaction creation during retries.
