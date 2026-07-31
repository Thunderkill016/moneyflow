# Security — Row Level Security (RLS) verification

MoneyFlow isolates every user-owned row with **PostgreSQL RLS** and `auth.uid()`. Verification is layered: migration scans prove declared structure, catalog tests prove effective grants/configuration, and forged-user pgTAP tests execute real reads and financial RPCs.

Related: [supabase-setup.md](./supabase-setup.md) · migrations under `supabase/migrations/` · tests under `supabase/tests/database/`.

---

## Security model

| Layer | Required rule |
|---|---|
| Tables | Every user-owned table has `ENABLE ROW LEVEL SECURITY` |
| Policies | Own-row only: `auth.uid() = user_id` (profiles: `= id`) |
| `anon` | No grants on public financial tables or views |
| Ledger writes | `financial_transactions` and `transaction_entries` are SELECT-only through the Data API |
| Mutations | `SECURITY DEFINER` RPCs derive identity from `auth.uid()` and set `search_path = ''` |
| Views | Exposed finance views use `security_invoker=true` |
| Money | Signed `bigint` minor units; never floating-point schema money |
| Destructive actions | Transaction deletion is soft and owner-scoped; restore is owner-scoped |

**RPC-only/select-policy tables:** ledger, budgets, commitments, occurrences, income templates, goals and allocations.  
**Direct CRUD tables:** accounts, categories, `import_batches`, `inbox_candidates`, subject to own-row RLS.

---

## 1. Static migration checks

The no-Docker path scans versioned SQL for:

1. every `create table public.*` receiving RLS;
2. every public user table having at least one policy;
3. every `SECURITY DEFINER` function setting `search_path`;
4. ledger tables remaining free of direct insert policies.

```bash
npm run check:rls
npm run test
```

Static checks prove declarations only. They do not execute policies or RPC ownership behavior.

---

## 2. Runtime pgTAP suite

```bash
SUPABASE_TELEMETRY_DISABLED=1 npx supabase start
SUPABASE_TELEMETRY_DISABLED=1 npx supabase db reset
npm run test:db
```

The local stack is disposable and does not touch production.

| Test file | What it proves |
|---|---|
| `schema_and_rls.test.sql` | Required tables/views/functions exist, RLS is enabled, named policies exist and money columns use `bigint` |
| `security_catalog.test.sql` | `anon` has no public relation grants; `public`/`anon` cannot execute definer RPCs; authenticated definer RPCs pin `search_path` and reference `auth.uid()`; finance views are security invokers |
| `cross_tenant_rpc.test.sql` | Creates two transaction-scoped Auth identities, builds real tenant A objects, switches to tenant B and attacks 25 read/mutation paths across RLS, views, accounts, transactions, transfers, split expenses, budgets, commitments, recurring income and savings goals |

The cross-tenant suite runs inside `begin`/`rollback`. Its deterministic `.invalid` identities and all generated tenant rows disappear at the end of the test.

### Interpreting failures

| Failure | Likely cause |
|---|---|
| `… has RLS` | New table lacks `ENABLE ROW LEVEL SECURITY` |
| named policy assertion | Policy missing/renamed or test not updated |
| catalog grant assertion | `anon`/`public` gained an unintended grant |
| `search_path`/`auth.uid()` assertion | New exposed definer RPC is not following the ownership contract |
| cross-tenant test | A policy/view/RPC can see or mutate an object owned by another JWT subject |
| connection/container error | Docker/local Supabase is unavailable rather than a security assertion failure |

---

## 3. Manual and production-safe verification

Automated local tests are the normal gate. Manual review remains useful after provider or migration changes.

### Catalog checks

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p')
order by 1;

select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Expected tenant tables:

- `profiles`, `accounts`, `categories`;
- `financial_transactions`, `transaction_entries`;
- `monthly_budgets`;
- `recurring_commitments`, `commitment_occurrences`;
- `recurring_income_templates`, `income_template_occurrences`;
- `savings_goals`, `savings_goal_allocations`;
- `import_batches`, `inbox_candidates`.

### Two-browser confirmation

For staging or a controlled production-safe check:

1. User A creates an account and transaction.
2. User B uses a separate browser profile/session.
3. Query through the normal client and attempt owner-scoped mutations using A's UUIDs.
4. Expect no visible rows, `false`, or a neutral not-found domain error.

Never paste a service-role key into a browser. Never perform destructive or availability testing against production. When SQL-level production verification is justified, wrap deterministic test identities and every mutation in one transaction and finish with `rollback`.

### RPC review

```sql
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef,
  p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by 1, 2;
```

For each externally executable financial RPC, confirm:

- `auth.uid()` is the identity source;
- client input never supplies `user_id`;
- selected/updated object queries include the current user's ownership filter;
- `search_path` is pinned;
- `public` and `anon` cannot execute it;
- expected failure does not reveal another tenant's data.

---

## 4. Application and provider reminders

RLS protects database rows; it does not replace the surrounding controls.

- Resolve sessions on the server and treat Server Actions as public entrypoints.
- Keep service-role credentials server/Edge-Function only, never `NEXT_PUBLIC_*`.
- Demo mode remains browser-local and must never be a fallback for authenticated failure.
- Match the application password policy in Supabase Auth settings; otherwise direct Auth API callers can bypass an app-only minimum.
- Enable CAPTCHA and provider rate limits before broad public signup.
- Leaked-password protection is a paid-provider hardening layer, not a substitute for RLS, generic auth errors or rate limiting.
- Review the `delete-account` Edge Function whenever a new tenant table is added.

---

## 5. Adding a user-owned table or RPC

For a table:

1. Add `user_id uuid not null` referencing the identity/owner boundary.
2. Enable RLS in the same migration.
3. Add only the required own-row policies and least-privilege grants.
4. Extend `schema_and_rls.test.sql` and the catalog expectations.
5. Add the table to account-deletion cleanup and verification.

For an exposed RPC:

1. Derive the caller from `auth.uid()`.
2. Pin `search_path` and schema-qualify referenced objects.
3. Filter every input UUID by caller ownership before mutation.
4. Revoke execution from `public` and `anon`; grant only the intended role.
5. Add a user-B-against-user-A counterexample to `cross_tenant_rpc.test.sql`.

---

## 6. Remaining limitations

| Gap | Severity | Mitigation |
|---|---|---|
| Cloud database may lag repository migrations | Medium | Review migration diff, deploy deliberately, then run catalog verification |
| Local forged-claim tests do not exercise the full external HTTP/JWT gateway | Medium | Add staged two-session integration checks and retain controlled production-safe verification |
| Provider Auth controls are outside migrations | Medium | Maintain a paid-beta checklist for password minimum, CAPTCHA, redirect allow-list and rate limits |
| New views can change security behavior | Medium | Require `security_invoker=true` and extend `security_catalog.test.sql` |

No single layer proves the full system. A green build does not prove RLS; static SQL does not prove runtime isolation; local pgTAP does not prove provider configuration.

---

## Quick reference

```bash
npm run check:rls          # static migration scan
npm run test               # unit tests + static RLS contracts
npm run test:db            # catalog + forged-user pgTAP attacks
```
