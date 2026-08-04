# Financial mutation audit and performance correctness

**Status:** verified
**Execution state:** ready_for_owner_merge
**Active role:** evaluator
**Permission scope:** branch_write + external_read
**Owner:** Thunderkill016
**Issue/PR:** #268 / #270
**Parent roadmap:** #53 PR E
**Baseline:** `main@cdbc0579c551366c33519b13bc2c9c22548c0af7`
**Verified implementation head:** `06b6760714ef40525364cb05a307532e32704fff`
**Last updated:** 2026-08-04

Follow `docs/engineering/AGENT_OPERATING_MODEL.md`. This packet owns roadmap #53 PR E. It does not authorize merge, production DDL, production-data mutation, provider changes, production load or production smoke.

## Outcome

MoneyFlow records privacy-safe, append-only metadata for financial mutations inside the same PostgreSQL transaction as the mutation, explicitly scopes high-volume authenticated reads by tenant in addition to RLS, and has reproducible plan-regression gates for transaction, budget, report and dashboard reads without speculative caching or another runtime.

## Repository reconnaissance

- `financial_transactions` and `transaction_entries` remain the ledger authority; audit metadata never changes ledger facts.
- Existing financial browser writes already use narrow ownership-safe `SECURITY DEFINER` RPCs.
- PR #206 owns the bounded dashboard bundle, PR #209 owns staged k6 profiles, and PR #236 owns catalog-wide foreign-key index coverage.
- `account_reconciliation_events` is reconciliation-domain history, not a generic actor/request audit for every financial mutation.
- The prior tenant purge predated provenance, reconciliation, rules and audit tables and required a complete-current-schema replacement.
- `finance`, `budgets` and `reports` depended on RLS/view ownership without repeating the tenant predicate in their Data API queries.
- No measured evidence justified a private financial-data cache.

## Research

- Supabase RLS guidance supports repeating ownership predicates in queries while retaining RLS as the authorization authority.
- Supabase Auth audit logs cover authentication events, not MoneyFlow ledger mutations.
- PostgreSQL plan evidence is stable when assertions focus on predicates/index shape rather than exact machine timings.
- Public-schema tables require RLS, narrow grants and explicit `SECURITY DEFINER` review.

### Adoption review

No dependency, service, queue, cache, telemetry provider or runtime was adopted. PostgreSQL triggers and the existing Supabase/PostgREST boundary provide the smallest transaction-atomic solution.

## Specification

### Audit event contract

`public.financial_mutation_audit_events` stores only bounded structural metadata:

- immutable event ID and tenant ID;
- actor ID/kind derived from `auth.uid()`;
- constrained action and entity type;
- entity ID and optional related transaction ID;
- server timestamp;
- optional opaque request token;
- optional transaction idempotency key.

It contains no note, merchant, raw import snippet, account/category label, amount, request body or arbitrary JSON payload. Request correlation accepts only `[A-Za-z0-9._:-]{1,128}`; other text is discarded.

### Ownership, immutability and atomicity

- RLS allows authenticated users to select only their rows.
- Authenticated and anonymous roles cannot insert, update or delete audit rows.
- Service role receives SELECT only for post-purge verification; audit writes remain trigger-owned.
- Internal helpers are not browser executable.
- Trigger failure aborts the financial mutation in the same PostgreSQL transaction.
- Normal product operation is append-only; account deletion removes rows through the service-role-only atomic purge.

### Mutation coverage

The database audits:

1. transaction creation, fact edit, review change, soft delete and restore;
2. entry creation, amount/account change, category correction and reconciliation-state change;
3. reconciliation start, completion and reopen.

Idempotent retries and no-op/timestamp-only writes do not create duplicate evidence.

### Read and performance correctness

- Finance, budget and report loaders repeat `user_id = viewer.id`; RLS/security-invoker views remain authoritative.
- A catalog guard adds `(user_id, month_start, category_id)` only when no equivalent monthly-budget index prefix exists.
- Rollback-only fixtures cover 4,000 transactions/entries and 600 budget months.
- `EXPLAIN (FORMAT JSON)` checks tenant/date/month predicates, index-aware plan shape and dashboard bounds without timing thresholds.
- No cache was added.

### Account deletion

The atomic purge and Edge Function independently cover and verify the complete 19-table tenant inventory, including audit, provenance, rules and reconciliation tables, before Auth identity deletion.

## Acceptance criteria

- [x] Audit table is tenant-owned, RLS-protected and browser mutation is impossible.
- [x] Audit rows contain no sensitive/free-text payload field or amount.
- [x] Request IDs are opaque tokens; free text is discarded.
- [x] Transaction creation records one header event and entry events.
- [x] Idempotent retry creates no duplicate audit evidence.
- [x] Edit, review, soft delete and restore actions are audited.
- [x] Entry category and reconciliation-state mutations are audited.
- [x] Reconciliation start/complete/reopen are audited structurally.
- [x] Cross-tenant reads and forged audit writes fail.
- [x] Audit failure rolls back the financial mutation.
- [x] Service role is read-only on audit rows and can verify cleanup.
- [x] Account deletion purges/verifies current tenant tables before Auth deletion.
- [x] Finance, budgets and reports repeat explicit viewer filters.
- [x] Realistic plan regressions cover transaction, report, budget and dashboard reads.
- [x] No cache, provider, dependency or new runtime is introduced.
- [x] Exact-head Class 3 CI, fresh database replay, pgTAP, browser smoke, CodeQL, secret scan and independent review pass.

## Implementation plan

1. Define typed privacy-safe audit events and internal trigger writers.
2. Attach transaction, entry and reconciliation mutation coverage.
3. Harden request correlation and audit privileges.
4. Replace tenant purge and update Edge Function verification inventory.
5. Add explicit tenant predicates to high-volume loaders.
6. Add the measured monthly-budget index and realistic plan regressions.
7. Prove privacy, idempotency, tenant isolation, atomic rollback, deletion and planner behavior with permanent tests.
8. Run independent review and exact-head Class 3 gates.
9. Hand off for a separate owner merge decision; keep production actions separately blocked.

## Evaluation

### Final findings

1. Generic audit rows remain structural and do not create a second financial data store.
2. Header and entry triggers cover mutation paths that would be invisible if only transactions were audited.
3. Actor identity is derived, tenant mismatches fail, and trigger failure leaves no unaudited ledger row.
4. Browser roles cannot forge or edit audit history; service role can only read it for deletion verification.
5. Unsafe request-ID free text is discarded instead of becoming a logging side channel.
6. Tenant deletion now uses the complete current table inventory and preserves retry-safe Auth deletion ordering.
7. Explicit read filters improve planner visibility without replacing RLS.
8. The measured budget access path justified one catalog-guarded index; no cache was justified.
9. No blocking financial, tenant-isolation, privacy, deletion-lifecycle or plan-correctness finding remains.

### Exact-head evidence

Verified implementation head: `06b6760714ef40525364cb05a307532e32704fff`.

- CI #1423 policy, architecture, lint, typecheck, unit/static RLS and production build: passed.
- CI #1423 fresh Supabase reset and full pgTAP, including 34 financial-audit assertions, atomicity/service-role tests and realistic EXPLAIN regressions: passed.
- CI #1423 browser smoke: passed; cross-device UI audit correctly skipped because no UI changed.
- CodeQL #559: passed.
- Secret-history scan #559: passed.
- Pull request review threads: none.
- Independent review: no remaining blocker.

The final branch commits change documentation only. Repository policy must rerun applicable gates on the resulting exact PR head before owner handoff.

## Risks and defenses

| Risk | Defense |
|---|---|
| finance text leaks into audit | fixed typed columns; no amount/free-text/JSON payload |
| request ID becomes a logging channel | strict opaque-token regex; invalid text becomes null |
| audit can be forged or edited | browser read-only own-row grants; internal trigger writers |
| mutation succeeds without audit | same-transaction trigger and rollback regression |
| entry-only correction is invisible | transaction-entry triggers cover category and reconciliation changes |
| service role becomes a write bypass | SELECT-only grant with privilege regression |
| deletion leaves newer tenant rows | complete 19-table purge and independent zero-row inventory |
| performance tests become hardware-flaky | plan shape/predicate assertions, no milliseconds |
| speculative cache leaks or goes stale | no cache without measured need |
| explicit filter is mistaken for authorization | RLS/security-invoker remain separately tested authorities |

## Tasks

| ID | Task | Status | Evidence |
|---|---|---|---|
| T1 | issue and branch from current main | done | #268, branch from `cdbc0579` |
| T2 | repository/performance reconnaissance | done | PRs #206, #209, #236 and current loaders/RPCs |
| T3 | packet and PR | done | this packet, PR #270 |
| T4 | audit schema/triggers | verified | audit migrations and pgTAP |
| T5 | deletion lifecycle integration | verified | current purge, Edge Function and contracts |
| T6 | explicit tenant filters | verified | finance/budgets/reports source contracts |
| T7 | audit and plan regressions | verified | CI #1423 database |
| T8 | exact-head CI and independent review | verified | CI #1423, CodeQL/secret #559 |
| T9 | final documentation-only rerun | in_progress | resulting PR head |
| T10 | owner merge decision | blocked | separate explicit command |
| T11 | production migration and smoke | blocked | separate explicit command |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-04 | owner | implementer | implementing | explicit `tiếp theo`, roadmap #53 PR E | audit/plan contract absent | implement focused branch and PR |
| 2026-08-04 | implementer | evaluator | candidate | schema, lifecycle, filters and tests | exact-head evidence incomplete | evaluate and fix findings |
| 2026-08-04 | evaluator | owner | verified | implementation head `06b6760`, CI #1423, CodeQL/secret #559 | final docs-only rerun | hand off only after final exact-head checks |

## Permission boundary

Granted: focused branch writes, issue/PR metadata, public official documentation reads, tests and CI.

Forbidden without separate owner command: merge, production migration, production data access/mutation, provider/configuration writes, deployment acceptance and production load/smoke tests.

## Delivery record

- Branch: `feat/financial-audit-performance-correctness`
- Issue: #268
- PR: #270
- Baseline: `cdbc0579c551366c33519b13bc2c9c22548c0af7`
- Verified implementation head: `06b6760714ef40525364cb05a307532e32704fff`
- Production DDL/data/provider writes: none
