# Cover public foreign keys with indexes on current main

**Status:** implementing  
**Execution state:** current-main replacement  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** OpenAI agent  
**Issue/PR:** #53 / replacement for #211  
**Last updated:** 2026-08-03

## Outcome

Every foreign key in MoneyFlow's `public` schema has a valid, ready, live, non-partial index whose leftmost key columns match the foreign-key referencing columns in declared order.

## Current-main reconnaissance

- Source baseline: `main@29b24617d80b1329072ad681086ce3656a5ab790`.
- PR #211 was built from `main@60af140a90238b96d5ac8c0ec6b8f6a731b4d762` and is no longer mergeable.
- Comparing that old base with current `main` shows no changes under `supabase/migrations/` or `supabase/tests/database/`; the schema/test surface relevant to this slice has not drifted.
- The migration path and all 13 index names are absent from current `main`.
- Production was not queried or modified during this refresh. Historical read-only reconnaissance from PR #211 remains provenance, not fresh production evidence.

## Research refresh

Official Supabase guidance still identifies `0001_unindexed_foreign_keys` as a performance-advisor finding and recommends indexing foreign-key columns. Current index guidance also notes that indexes add write/storage overhead and that ordinary `create index` can lock writes while building.

Relevant official sources checked on 2026-08-03:

- https://supabase.com/docs/guides/database/database-advisors?lint=0001_unindexed_foreign_keys
- https://supabase.com/docs/guides/database/postgres/indexes
- https://supabase.com/changelog?tags=breaking-change

No current breaking change affects ordinary PostgreSQL B-tree index creation or pgTAP catalog inspection in this packet. Postgres-version and extension-version announcements are unrelated because this migration creates no extension, table, view, function, grant or API exposure.

## Scope

### Changed

- Add 13 ordinary B-tree indexes in exact foreign-key column order.
- Add one generic pgTAP catalog invariant for all public foreign keys.
- Record current-main delivery and verification evidence.

### Explicitly unchanged

- Rows, tables, columns, constraints and foreign-key definitions.
- RLS policies, grants, functions, RPCs and ownership.
- Existing tenant-first indexes.
- Application code, UI, dependencies and workflows.
- Provider configuration, deployment settings and production data.

## Migration

`supabase/migrations/20260802060004_cover_foreign_key_indexes.sql` adds indexes for:

1. `commitment_occurrences (commitment_id, user_id)`
2. `commitment_occurrences (transaction_id, user_id)`
3. `inbox_candidates (approved_transaction_id, user_id)`
4. `inbox_candidates (import_batch_id, user_id)`
5. `inbox_candidates (transfer_pair_id, user_id)`
6. `income_template_occurrences (template_id, user_id)`
7. `income_template_occurrences (transaction_id, user_id)`
8. `monthly_budgets (category_id, user_id)`
9. `savings_goal_allocations (goal_id, user_id)`
10. `transaction_entries (account_id, user_id)`
11. `transaction_entries (category_id, user_id)`
12. `transaction_entries (transaction_id, user_id)`
13. `transaction_import_provenance (import_batch_id, user_id)`

The timestamp is retained from the already verified PR #211 migration because the file never entered `main`, no database migration has been added since its original base, and changing the version would create needless provenance drift.

## Catalog invariant

`supabase/tests/database/foreign_key_indexes.test.sql` requires an index to be:

- on the referencing table;
- valid, ready and live;
- non-partial, so it covers every referencing row;
- long enough in key attributes;
- ordered with the foreign-key columns as its exact left prefix.

The current-main refresh tightens the old PR #211 test by rejecting partial indexes. A partial index can share the right leading columns while failing to cover all rows participating in referential checks and joins.

## Risks and controls

| Risk | Control |
|---|---|
| Existing tenant-first index is incorrectly counted | Ordered left-prefix catalog comparison |
| Partial index falsely satisfies the invariant | Require `indpred is null` |
| Invalid/unready index falsely passes | Require `indisvalid`, `indisready`, `indislive` |
| Index build blocks writes during deployment | Owner-controlled deployment window; no production apply in this PR |
| Additive indexes increase write/storage cost | Limit scope to advisor-confirmed foreign keys; do not add speculative indexes |
| Migration conflicts with current schema | Fresh reset and complete pgTAP suite required on exact head |

## Verification contract

- Diff hygiene and project knowledge contract.
- CI classification must select database verification.
- Lint, typecheck, unit/static RLS and production build according to repository policy.
- Fresh local Supabase reset and complete pgTAP suite, including the new invariant.
- Protected CodeQL with real initialize/analyze.
- Secret-history scan.
- Browser checks only if selected by the current classifier; no UI behavior is changed.

## Rollback

Drop only the 13 named indexes introduced by `20260802060004_cover_foreign_key_indexes.sql`. No row or schema-shape rollback is required.

## Permission boundary

- Allowed: focused branch, migration, pgTAP test, work packet, PR memory and candidate-status reconciliation.
- Forbidden: direct `main` writes, merge without owner instruction, production migration, production data access, RLS/grant/function changes and provider writes.
- Stop if fresh migration replay fails, a new public foreign key is discovered without coverage, or the migration requires destructive changes.

## Delivery state

- Branch: `perf/cover-foreign-key-indexes-current-main`
- Replacement PR: pending number
- Old PR #211: remains open until the replacement exists, then closes unmerged as superseded
- Production migration/advisor verification: not performed
