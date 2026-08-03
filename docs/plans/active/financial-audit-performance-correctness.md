# Financial mutation audit and performance correctness

**Status:** implementing
**Execution state:** candidate
**Active role:** implementer
**Permission scope:** branch_write + external_read
**Owner:** Thunderkill016
**Issue/PR:** #268 / #270
**Parent roadmap:** #53 PR E
**Baseline:** `main@cdbc0579c551366c33519b13bc2c9c22548c0af7`
**Last updated:** 2026-08-04

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet owns roadmap #53 PR E. It does not authorize merge, production DDL, production-data mutation, provider changes or production smoke.

## Outcome

MoneyFlow records privacy-safe, append-only metadata for every financial mutation inside the same PostgreSQL transaction as the mutation, explicitly scopes high-volume authenticated reads by tenant in addition to RLS, and gains reproducible database plan-regression gates for the transaction feed, budgets, reports and dashboard bundle without introducing speculative caches or another runtime.

## Repository reconnaissance

### Existing foundations to reuse

- `financial_transactions` and `transaction_entries` remain the ledger authority; integer VND, transfer neutrality, split exactness, soft delete/restore and idempotency are already permanent database contracts.
- Financial browser writes use narrow `SECURITY DEFINER` RPCs with `auth.uid()`, pinned empty `search_path`, explicit grants and pgTAP attack tests.
- PR #206 collapsed the authenticated dashboard from about 17 Data API reads to the bounded `get_dashboard_bundle` RPC.
- PR #209 added owner-controlled staged k6 profiles; capacity is not inferred from repository tests.
- PR #236 added catalog-wide left-prefix foreign-key index coverage.
- `account_reconciliation_events` already provides reconciliation-domain history, but it does not replace generic actor/request metadata for all financial mutations.
- Account deletion uses service-role-only `purge_user_tenant_data(uuid)` and an Edge Function inventory; any audit table must participate in both.

### Missing correctness

- There is no append-only generic mutation audit for transaction creation, edits, soft delete/restore, review changes, entry category corrections or reconciliation state changes.
- Auditing only `financial_transactions` would miss `transaction_entries` mutations such as bulk category correction and account-leg reconciliation.
- `src/server/finance.ts`, `src/server/budgets.ts` and `src/server/reports.ts` rely on RLS/view ownership without repeating the tenant predicate in the Data API query.
- There is no realistic-row-count EXPLAIN regression suite for the transaction feed, monthly budget progress and report windows.
- No current evidence justifies a private financial-data cache; adding one would create invalidation and cross-user leakage risk.

## Research

### Sources and decisions

- Supabase RLS guidance recommends repeating ownership predicates in queries even when RLS remains authoritative, allowing PostgreSQL to build a better plan from the explicit tenant filter.
- Supabase Auth audit logs cover authentication events, not application-ledger mutations; MoneyFlow therefore needs its own database audit metadata.
- PostgreSQL `EXPLAIN` costs and timings vary by hardware and statistics. Repository gates must assert bounded predicates and stable plan shape rather than exact milliseconds.
- Supabase security guidance requires RLS for exposed public tables, narrow grants, and explicit review of every `SECURITY DEFINER` function.

### Adoption review

No dependency, service, queue, cache, telemetry provider or new runtime is adopted. PostgreSQL triggers and existing Supabase/PostgREST boundaries solve the observed problem with the smallest transactional surface.

## Specification

### Audit event contract

Create `public.financial_mutation_audit_events` with only bounded structural metadata:

- immutable event ID;
- tenant `user_id`;
- actor user ID and actor kind (`user` or `system`);
- constrained action and entity type;
- entity ID and optional related transaction ID;
- server timestamp;
- optional bounded request ID;
- optional transaction idempotency key.

The table must never contain raw notes, merchant names, import snippets, category/account names, request bodies or arbitrary JSON/free text.

### Audit ownership and immutability

- RLS is enabled; authenticated users may select only their own rows.
- Browser roles receive no insert, update or delete privilege.
- Trigger functions are not browser-callable.
- Audit rows are append-only during normal product operation.
- Tenant deletion may remove audit rows through the service-role purge before deleting the Auth identity.

### Mutation coverage

Audit within the same transaction:

1. `financial_transactions` insert;
2. meaningful transaction updates: fact edit, review change, soft delete and restore;
3. `transaction_entries` insert;
4. meaningful entry updates: amount/account/category and reconciliation-state changes;
5. account reconciliation start, complete and reopen.

No-op/timestamp-only writes must not emit events. Trigger failure must roll back the financial mutation rather than create unaudited divergence.

### Explicit tenant filters

Authenticated high-volume reads repeat `user_id = viewer.id` in:

- full and fallback transaction feeds and review feed;
- accounts, categories and balances used by finance workspaces;
- monthly budget progress and budget-category reads;
- report transaction windows.

RLS and security-invoker views remain authoritative; explicit filters are a performance and defense-in-depth contract, not a replacement for RLS.

### Performance gates

- seed realistic but bounded synthetic tenants in a rollback-only pgTAP transaction;
- run `ANALYZE` on affected tables;
- inspect `EXPLAIN (FORMAT JSON)` for tenant/date/month-scoped transaction feed, reports and budget progress queries;
- assert bounded tenant predicates and index-aware plan shape without exact runtime thresholds;
- preserve existing dashboard input bounds and explicit tenant predicates;
- add no cache unless a measured plan/load result proves one is necessary; this slice expects no cache.

### Account deletion

- add the audit table to the Edge Function tenant inventory;
- update `purge_user_tenant_data` to delete and verify audit rows atomically;
- extend source and pgTAP deletion contracts.

## Acceptance criteria

- [x] Audit table is tenant-owned, RLS-protected and browser append/update/delete is impossible.
- [x] Audit rows contain no sensitive/free-text payload field.
- [x] Transaction creation records exactly one transaction-created event per created transaction.
- [x] Idempotent retry does not create another transaction or audit event.
- [x] Edit, soft delete, restore and review changes record bounded actions.
- [x] Entry category and reconciliation-state mutations are audited.
- [x] Reconciliation start/complete/reopen are audited without duplicating sensitive statement metadata.
- [x] Cross-tenant reads and forged audit writes fail through RLS/grants.
- [x] Trigger failure is transaction-atomic by PostgreSQL trigger ownership.
- [x] Account deletion purges and verifies audit rows before Auth deletion.
- [x] Finance, budgets and reports repeat explicit viewer filters.
- [x] Plan-regression tests cover transaction feed, reports and budget history with realistic row counts.
- [x] No cache or new dependency is introduced.
- [ ] Exact-head Class 3 CI, database replay, pgTAP, CodeQL, secret scan and independent review pass.

## Implementation plan

1. Add audit enums/table, RLS/grants, request-ID helper and internal trigger functions.
2. Attach triggers to transactions, entries and reconciliations.
3. Update atomic tenant purge and Edge Function inventory.
4. Add privacy, immutability, idempotency, tenant-isolation, reconciliation and deletion pgTAP.
5. Add explicit tenant predicates to finance, budget and report loaders.
6. Add source contracts and realistic EXPLAIN regression tests.
7. Open a PR, run exact-head Class 3 gates and fix findings.
8. Complete independent evaluation and hand off for owner merge decision.

## Evaluation

### Current findings

1. Generic audit rows are structural only and deliberately omit finance text, amount and arbitrary payload fields.
2. Transaction header, entry-only and reconciliation mutations are covered separately so bulk category correction and account-leg clearing are not invisible.
3. Audit writes are trigger-owned and share the mutation transaction; authenticated clients receive own-row SELECT only.
4. Account deletion inventory had drifted behind newer provenance, reconciliation and rules tables; this candidate replaces the service-role purge with the complete current table set and independently verifies it in the Edge Function.
5. Explicit tenant predicates are repeated on finance, budget and report reads while RLS/security-invoker views remain authoritative.
6. The only new read index is catalog-guarded and follows the observed budget loader predicate `(user_id, month_start)`.
7. Plan evidence uses realistic rollback-only fixtures and `EXPLAIN (FORMAT JSON)` without `ANALYZE` timing thresholds.
8. No cache, telemetry provider, dependency or runtime layer was introduced.

### Evidence state

Class 3 CI #1413 is in progress. The first policy run found only document-schema omissions (`## Evaluation` and `- Verified:`), which this commit corrects. Database, static, unit, build and security results must rerun on the resulting exact head. The EXPLAIN pgTAP plan declaration is known to require reconciliation with the assertion count before final evidence.

## Risks and defenses

| Risk | Defense |
|---|---|
| sensitive finance text leaks into audit | fixed typed columns only; no payload/JSON/free-text metadata |
| audit can be forged or edited | no browser mutation grants; internal triggers only; append-only pgTAP |
| mutation succeeds without audit | trigger executes in the same transaction and failures abort the write |
| duplicate retry creates duplicate evidence | event follows actual inserted/changed rows; idempotent no-op emits nothing |
| entry-only correction is invisible | audit `transaction_entries` as well as transaction headers |
| actor is guessed | actor derives from `auth.uid()`; system actor is explicit only when no JWT actor exists |
| account deletion leaves audit data | atomic purge plus Edge Function inventory and zero-row verification |
| performance test becomes hardware-flaky | assert predicates/plan shape, not milliseconds |
| speculative index/cache adds write or invalidation cost | reuse catalog evidence; add only measured indexes; no cache by default |
| explicit filter is mistaken for authorization | RLS/security-invoker remain required and independently tested |

## Tasks

| ID | Task | Status | Evidence |
|---|---|---|---|
| T1 | issue and branch from current main | done | #268, branch from `cdbc0579` |
| T2 | repository and prior-performance reconnaissance | done | PRs #206, #209, #236; current loaders/RPCs |
| T3 | work packet and PR | done | packet, PR #270 |
| T4 | audit schema/triggers | candidate | `20260804160000_financial_mutation_audit.sql` |
| T5 | deletion lifecycle integration | candidate | purge replacement, Edge Function and tests |
| T6 | explicit tenant filters | candidate | finance/budgets/reports + source contract |
| T7 | audit/plan pgTAP | candidate | database audit and EXPLAIN suites |
| T8 | exact-head CI and independent review | in_progress | CI #1413 and follow-ups |
| T9 | owner merge decision | blocked | separate explicit command |
| T10 | production migration and smoke | blocked | separate explicit command |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-04 | owner | implementer | implementing | explicit `tiếp theo`, roadmap #53 PR E | audit/plan contract absent | implement focused branch and PR |
| 2026-08-04 | implementer | CI/evaluator | candidate | audit schema, lifecycle, filters and tests | exact-head SQL/application evidence incomplete | fix CI findings and complete independent review |

## Permission boundary

Granted: focused repository branch writes, issue/PR metadata, public official documentation reads, tests and CI.

Forbidden without separate owner command: merge, production migration, production data access/mutation, provider/configuration writes, deployment acceptance and production load/smoke tests.

## Delivery record

- Branch: `feat/financial-audit-performance-correctness`
- Issue: #268
- PR: #270
- Baseline: `cdbc0579c551366c33519b13bc2c9c22548c0af7`
- Production DDL/data/provider writes: none
