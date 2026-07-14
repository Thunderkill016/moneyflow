# Security — Row Level Security (RLS) verification

MoneyFlow isolates every user-owned row with **PostgreSQL RLS** and `auth.uid()`. This doc explains how to verify that model **without requiring live production**.

Related: [supabase-setup.md](./supabase-setup.md) · migrations under `supabase/migrations/` · pgTAP suite `supabase/tests/database/schema_and_rls.test.sql`.

---

## Security model (expected)

| Layer | Rule |
|-------|------|
| Tables | Every user-owned table has `ENABLE ROW LEVEL SECURITY` |
| Policies | Own-row only: `(select auth.uid()) = user_id` (profiles: `= id`) |
| `anon` | No table grants on financial / inbox data |
| Ledger writes | `financial_transactions` / `transaction_entries` are **SELECT-only** via Data API |
| Mutations | `SECURITY DEFINER` RPCs; `user_id` from `auth.uid()` only; `SET search_path = ''` |
| Money | `bigint` minor units (VND đồng); never float in schema |
| Soft delete | `deleted_at` on transactions; restore via `restore_money_transaction` |

**Write path tables (RPC-only, select policies):** budgets, commitments, goals, ledger.  
**CRUD path tables (full policies + grants):** accounts, categories, `import_batches`, `inbox_candidates`.

---

## 1. Static check (no Docker, no cloud) — default CI path

Scans migration SQL for:

1. Every `create table public.*` has a matching `enable row level security`
2. Every user table has at least one `create policy … on public.<table>`
3. Every `security definer` function sets `search_path`

```bash
# Script (exit 0 = OK)
bash scripts/check-rls-migrations.sh

# Same assertions via unit test (runs with npm test)
npm run test -- --test-name-pattern='rls migrations'
# or simply:
npm run check:rls
```

This is the **primary** verification on machines without Docker. It does **not** prove policies are correct at runtime — only that migrations declare the expected surface.

---

## 2. Local Supabase pgTAP suite (Docker; optional)

Existing automated SQL tests:

| File | What it asserts |
|------|-----------------|
| `supabase/tests/database/schema_and_rls.test.sql` | Tables/views exist; **RLS enabled** on all user tables; key RPCs exist; money columns are `bigint`; named **policies** exist |

### Prerequisites

- Docker available and running
- CLI: `npx supabase` (dev dependency not required; uses npx)

### Commands

```bash
# Start local stack + apply migrations + seed
SUPABASE_TELEMETRY_DISABLED=1 npx supabase start
SUPABASE_TELEMETRY_DISABLED=1 npx supabase db reset

# Run database tests (pgTAP)
SUPABASE_TELEMETRY_DISABLED=1 npx supabase test db
# or:
npm run test:db
```

**Does not touch production.** Only the local Docker project from `supabase/config.toml`.

If Docker is unavailable, skip this section; static check + manual checklist still apply.

### Interpreting failures

| Failure pattern | Likely cause |
|-----------------|--------------|
| `… has RLS` failed | New table without `ENABLE ROW LEVEL SECURITY` |
| `has_policy …` failed | Policy renamed/missing; update migration or test |
| `has_function …` failed | RPC signature changed; update migration + test `array[…]` args |
| Connection / container errors | Docker not running; re-run `supabase start` |

---

## 3. Manual checklist (SQL editor or Studio)

Use **local** Studio (`http://127.0.0.1:54323`) or a **non-prod** project. Do **not** run destructive checks on production.

### A. Catalog

```sql
-- All public base tables should have RLS = true
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by 1;
```

Expected user-owned tables (all `rls_enabled = true`):

- `profiles`, `accounts`, `categories`
- `financial_transactions`, `transaction_entries`
- `monthly_budgets`
- `recurring_commitments`, `commitment_occurrences`
- `savings_goals`, `savings_goal_allocations`
- `import_batches`, `inbox_candidates`

### B. Policies present

```sql
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Spot-check:

- [ ] Each user table has at least a `SELECT` own-row policy
- [ ] Ledger tables have **no** insert/update/delete policies for `authenticated` (writes go through RPC)
- [ ] Inbox tables have select/insert/update/delete own-row policies

### C. Two-user isolation (manual, optional)

Requires two auth users (A, B) in the same non-prod project.

1. As user A, create an account / expense via the app (or RPC).
2. As user B (new JWT / second browser profile), query:

```sql
-- As authenticated user B (via client or set request.jwt.claim.sub)
select count(*) from public.accounts;
select count(*) from public.financial_transactions;
select count(*) from public.inbox_candidates;
```

Expect **0** rows belonging to A. Never paste service-role keys into the browser.

### D. RPC ownership

```sql
-- SECURITY DEFINER functions must not trust client-supplied user_id
select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
order by 1;
```

Code review each: body uses `auth.uid()`, filters `user_id = v_user_id` / `auth.uid()`, and has `SET search_path = ''`.

### E. Grants

- [ ] `anon` has no select on ledger / inbox tables
- [ ] `authenticated` select on ledger; no direct insert/update/delete on `financial_transactions` / `transaction_entries`
- [ ] Execute on money RPCs granted only to `authenticated`

---

## 4. App-layer reminders (not RLS, but related)

- Resolve session on the **server** (`getClaims` / server Supabase client); never trust client-only `user_id`.
- Demo mode uses browser storage only — no multi-tenant DB risk until Supabase env is configured.
- Service role must stay **server-only** (never `NEXT_PUBLIC_*`).
- Soft-delete restore needs migration applied; see [supabase-setup.md](./supabase-setup.md).

---

## 5. When adding a new user-owned table

1. `user_id uuid not null references auth.users(id) on delete cascade` (or profiles FK pattern).
2. `alter table … enable row level security;`
3. Policies for intended commands; prefer RPC for financial mutations.
4. `revoke all … from anon`; grant least privilege to `authenticated`.
5. Extend `supabase/tests/database/schema_and_rls.test.sql` (`has_table`, RLS `ok`, `has_policy`).
6. Re-run `bash scripts/check-rls-migrations.sh` and (if Docker) `npm run test:db`.

---

## 6. Known gaps (honest)

| Gap | Severity | Mitigation |
|-----|----------|------------|
| No automated two-JWT cross-user integration test | Medium | Manual §3.C; static + pgTAP schema checks |
| pgTAP does not execute RPC as forged `auth.uid()` | Medium | Code review RPC bodies; optional future test with `set local role` |
| Cloud project may lag migrations | Medium | `supabase db push` only after reviewing diff |
| Views (`account_balances`, `transaction_feed`, …) | Low | Underlying tables RLS + security invoker defaults; re-check if view security changes |

These are **not** blockers for demo mode. Before handling real money, run Docker pgTAP + manual two-user isolation on a staging project.

---

## Quick reference

```bash
npm run check:rls          # static migration scan (always)
npm run test               # includes rls-migrations unit tests
npm run test:db            # pgTAP via local Supabase (needs Docker)
```
