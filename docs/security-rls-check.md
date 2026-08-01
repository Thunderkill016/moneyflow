# Security — Row Level Security (RLS) verification

MoneyFlow isolates user-owned rows with PostgreSQL RLS and `auth.uid()`. Verification is layered: migration scans prove declarations, catalog tests prove effective grants and function configuration, and pgTAP attack suites execute real ownership boundaries.

Related: [supabase-setup.md](./supabase-setup.md), migrations under `supabase/migrations/`, and tests under `supabase/tests/database/`.

## Security model

| Layer | Required rule |
|---|---|
| Tables | Every user-owned table has `ENABLE ROW LEVEL SECURITY` |
| Policies | Own-row only: `(select auth.uid()) = user_id` (profiles use `id`) |
| Anonymous access | `anon` has no grants on public financial tables or views |
| Ledger writes | `financial_transactions` and `transaction_entries` are SELECT-only through the Data API |
| Mutations | Exposed `SECURITY DEFINER` RPCs derive identity from `auth.uid()` and pin `search_path = ''` |
| Views | Exposed finance views use `security_invoker=true` |
| Money | Signed `bigint` minor units; never floating-point schema money |
| Destructive actions | Transaction deletion is soft and owner-scoped; restore is owner-scoped |

**RPC-owned/select-policy tables:** ledger, budgets, commitments and occurrences, recurring-income templates and occurrences, savings goals and allocations, and `transaction_import_provenance`.

**Direct CRUD tables:** accounts, categories, `import_batches`, and `inbox_candidates`, all subject to own-row RLS. Authenticated Inbox approval is not direct CRUD: `plan_inbox_candidate` and `approve_inbox_candidate` own classification, atomic ledger creation, candidate linkage, and provenance insertion.

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

Static checks prove declarations only. They do not execute policies, grants, triggers, views, or RPC ownership behavior.

## 2. Runtime pgTAP suite

```bash
SUPABASE_TELEMETRY_DISABLED=1 npx supabase start
SUPABASE_TELEMETRY_DISABLED=1 npx supabase db reset
npm run test:db
```

The local stack is disposable and does not touch production.

| Test file | What it proves |
|---|---|
| `schema_and_rls.test.sql` | Required tables, views, functions, RLS, policies, and `bigint` money columns |
| `security_catalog.test.sql` | No `anon` relation grants; no `public`/`anon` definer execution; authenticated definer RPCs pin `search_path` and reference `auth.uid()`; finance views are security invokers |
| `security_definer_contract.test.sql` | The maintained exposed RPC set has the expected least-privilege grants and configuration |
| `cross_tenant_rpc.test.sql` | Two transaction-scoped users exercise 25 foreign-object reads and mutations across accounts, ledger, transfers, splits, budgets, commitments, recurring income, and goals |
| `import_provenance_schema.test.sql` | Provenance table, RLS, ownership keys, indexes, functions, and grants |
| `import_provenance_invariants.test.sql` | Atomic approval, idempotency, duplicate handling, tenant rejection, candidate linkage, and immutable provenance |
| `import_provenance_review_resolution.test.sql` | Reviewed transfer resolution remains balanced and cannot bypass invalid-state guards |

The forged-user and provenance suites run inside `begin`/`rollback`; deterministic identities and generated tenant rows disappear at the end.

### Interpreting failures

| Failure | Likely cause |
|---|---|
| `… has RLS` | A user-owned table lacks `ENABLE ROW LEVEL SECURITY` |
| named policy assertion | A policy is missing/renamed or the test is stale |
| catalog grant assertion | `anon`/`public` gained unintended access |
| `search_path` or `auth.uid()` assertion | A new definer RPC violates the ownership contract |
| cross-tenant assertion | A policy, view, or RPC can observe or mutate another tenant |
| provenance assertion | Inbox approval, dedupe, linkage, or transfer neutrality regressed |
| connection/container error | Docker or local Supabase failed before assertions ran |

## 3. Manual and production-safe verification

Automated local tests are the normal gate. Manual review remains useful after provider, migration, or Edge Function changes.

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

Expected user-owned tables include:

- `profiles`, `accounts`, `categories`;
- `financial_transactions`, `transaction_entries`;
- `monthly_budgets`;
- `recurring_commitments`, `commitment_occurrences`;
- `recurring_income_templates`, `income_template_occurrences`;
- `savings_goals`, `savings_goal_allocations`;
- `import_batches`, `inbox_candidates`;
- `transaction_import_provenance`.

### Two-session confirmation

For staging or a controlled rollback-safe production check:

1. User A creates an account and transaction.
2. User B uses a separate browser profile/session.
3. Query through the normal client and attempt owner-scoped mutations using A's UUIDs.
4. Expect no visible rows, `false`, or a neutral not-found domain error.

For imported candidates, also verify that B cannot plan or approve A's candidate and cannot reference A's account/category during approval.

Never paste a service-role key into a browser. Never perform destructive, brute-force, or availability testing against production. SQL-level production verification must use deterministic synthetic data in one transaction and finish with `rollback`.

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

For each externally executable definer RPC, confirm:

- `auth.uid()` is the identity source;
- client input never supplies `user_id`;
- every selected or mutated UUID is filtered by caller ownership;
- `search_path` is pinned and referenced objects are schema-qualified;
- `public` and `anon` cannot execute it;
- failure does not reveal another tenant's data.

## 4. Application and provider boundaries

RLS protects database rows; it does not replace surrounding controls.

- Resolve sessions on the server and treat Server Actions as public entrypoints.
- Keep service-role credentials server/Edge-Function only, never `NEXT_PUBLIC_*`.
- Demo mode remains browser-local and never becomes a fallback for authenticated failure.
- Match the application password policy in Supabase Auth settings; direct Auth API calls bypass app-only validation.
- Enable CAPTCHA and review provider rate limits before broad public signup.
- Use Vercel Firewall for network-edge rate limiting; an in-memory serverless counter is not shared reliably across instances or regions.
- Review the `delete-account` Edge Function whenever a tenant table is added. `transaction_import_provenance` currently has an owner foreign key with `on delete cascade`, but cleanup still requires regression verification.

## 5. Adding a user-owned table or RPC

For a table:

1. Add an explicit owner key and ownership-safe foreign keys.
2. Enable RLS in the same migration.
3. Add only the required own-row policies and least-privilege grants.
4. Extend schema, catalog, deletion, and forged-tenant tests.
5. Verify any view or RPC that exposes the table.

For an exposed RPC:

1. Derive the caller from `auth.uid()`.
2. Pin `search_path` and schema-qualify objects.
3. Filter every input UUID by caller ownership before mutation.
4. Revoke execution from `public` and `anon`; grant only the intended role.
5. Add a user-B-against-user-A counterexample in the relevant pgTAP suite.

## 6. Remaining limitations

| Gap | Severity | Mitigation |
|---|---|---|
| Cloud database may lag repository migrations | Medium | Review and apply migrations deliberately, then inspect the live catalog |
| Local forged-claim tests do not exercise the full external HTTP/JWT gateway | Medium | Retain controlled two-session or rollback-safe production verification |
| Provider Auth controls are outside migrations | Medium | Track password minimum, CAPTCHA, redirect allow-list, and rate limits separately |
| New views or Edge Functions can change ownership behavior | Medium | Require security-invoker/catalog tests and update deletion verification |

No single layer proves the full system. A green build does not prove RLS; static SQL does not prove runtime isolation; local pgTAP does not prove provider configuration.

## Quick reference

```bash
npm run check:rls
npm run test
npm run test:db
```
