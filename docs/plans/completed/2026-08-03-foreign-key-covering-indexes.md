# Public foreign-key covering indexes

- **Status:** completed
- **Execution state:** accepted_and_archived
- **Active role:** none
- **Permission scope:** read_only
- **Owner:** Thunderkill016
- **Implementation PR:** #236
- **Merge commit:** `5971ba0cfc587e2482be81f955f4fdf3cb14b45c`
- **Completed:** 2026-08-03

## Outcome

MoneyFlow now carries complete tested left-prefix index coverage for every foreign key in the `public` schema. The merged migration adds fourteen additive B-tree indexes: thirteen paths retained from superseded PR #211 and one additional `transaction_import_provenance(user_id)` index discovered by strict current-main catalog testing.

Two existing partial indexes remain valid explicit exceptions because their first foreign-key columns are nullable and their predicates are exactly `account_id IS NOT NULL` and `category_id IS NOT NULL`. A focused pgTAP file independently protects those definitions.

## Repository reconnaissance

PR #211 was built from an obsolete baseline and became non-mergeable. Before recreating the work, the database migration and pgTAP paths were compared with current `main`; no relevant schema/test drift existed.

The first strict catalog run on PR #236 correctly named three apparently uncovered constraints. Review showed:

- `inbox_candidates_account_id_user_id_fkey` is safely covered by `inbox_candidates_account_owner_idx`;
- `inbox_candidates_category_id_user_id_fkey` is safely covered by `inbox_candidates_category_owner_idx`;
- `transaction_import_provenance_user_id_fkey` had only accidental coverage from unrelated partial indexes and required a real `user_id` index.

No production database, provider configuration or production data was read or modified during this repository refresh.

## Accepted change

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
14. `transaction_import_provenance (user_id)`

The catalog recurrence gate:

- requires an index on the referencing table;
- requires valid, ready and live catalog state;
- verifies exact foreign-key left-prefix ordering;
- rejects partial indexes by default;
- permits only the two separately tested nullable-FK partial indexes;
- emits schema, table and constraint diagnostics for every uncovered path.

## Explicitly unchanged

- Rows, tables, columns, constraints and foreign-key definitions.
- RLS policies, grants, functions, RPCs and ownership.
- Existing indexes.
- Application and UI behavior.
- Dependencies and workflows.
- Provider settings, deployment configuration and production data.

## Verification

Final PR head: `443d30d7537af3c758659658a530be35677c6cf5`.

- CI #1175: success.
- Diff hygiene, project knowledge and CI classification: success.
- Fresh local Supabase reset: success.
- Complete database suite: all 281 pgTAP tests passed.
- Browser checks: correctly not required for the database/docs-only scope.
- CodeQL #326: success, including completed `Initialize CodeQL` and `Analyze` steps.
- Secret history scan #326: success.
- Review threads: none.
- Owner-authorized squash merge: `5971ba0cfc587e2482be81f955f4fdf3cb14b45c`.

## Risks and rollback

Ordinary index creation can add write latency, storage cost and deployment-time locking. Deployment remains owner controlled. Rollback is limited to dropping the fourteen indexes introduced by `20260802060004_cover_foreign_key_indexes.sql`; no row or schema-shape rollback is required.

## Evidence boundary

Merged repository evidence proves migration replay and catalog coverage on the tested schema. It does not prove that the migration has been applied in production or that the production performance advisor is clean. Those claims require an owner-controlled deployment and a fresh production advisor rerun.

## Remaining work

- Deploy the merged migration through the approved production process.
- Rerun the production performance advisor before claiming `unindexed_foreign_keys` closure.
- Continue realistic large-ledger and staging-load acceptance separately.

## Delivery record

- Superseded PR: #211, closed unmerged.
- Implementation PR: #236.
- Merge method: squash.
- Merge commit: `5971ba0cfc587e2482be81f955f4fdf3cb14b45c`.
- Active packet archived to this completed record.
