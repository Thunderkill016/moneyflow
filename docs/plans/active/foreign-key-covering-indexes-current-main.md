# Cover public foreign keys with indexes on current main

**Status:** evaluating
**Execution state:** current-main replacement PR open
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** OpenAI agent
**Issue/PR:** #53 / #236
**Last updated:** 2026-08-03

## Outcome

Every foreign key in MoneyFlow's `public` schema has valid, ready and live left-prefix index coverage. Non-partial indexes are the default. Two existing partial indexes are accepted only because their nullable first FK column is the exact `IS NOT NULL` predicate and a separate pgTAP suite proves those definitions.

## Repository reconnaissance

- Baseline: `main@29b24617d80b1329072ad681086ce3656a5ab790`.
- PR #211 was based on `60af140a90238b96d5ac8c0ec6b8f6a731b4d762` and became non-mergeable.
- No migration or database-test path changed between that old base and current main.
- The 13 PR #211 indexes are absent from current main.
- Fresh current-main pgTAP exposed one additional false-positive coverage case: `transaction_import_provenance_user_id_fkey` was only matched by unrelated partial indexes whose leading column happened to be `user_id`.
- Existing `inbox_candidates_account_owner_idx` and `inbox_candidates_category_owner_idx` are safe partial coverage because their first FK columns are nullable and their predicates are exactly `account_id IS NOT NULL` / `category_id IS NOT NULL`. `foreign_key_access_indexes.test.sql` independently enforces those definitions.
- No production query, migration or data write occurred during this refresh.

## Research

Official Supabase guidance still reports unindexed foreign keys as a performance-advisor finding. Current index guidance also notes that indexes add write/storage cost and ordinary `create index` can block writes while building.

Sources checked on 2026-08-03:

- https://supabase.com/docs/guides/database/database-advisors?lint=0001_unindexed_foreign_keys
- https://supabase.com/docs/guides/database/postgres/indexes
- https://supabase.com/changelog?tags=breaking-change

No relevant breaking change affects ordinary PostgreSQL B-tree indexes or pgTAP catalog inspection in this slice.

## Specification

### Changed

- Add 14 ordinary B-tree indexes:
  - the 13 advisor-derived indexes retained from PR #211;
  - one additional `transaction_import_provenance(user_id)` index discovered by fresh complete-coverage testing.
- Add a diagnostic catalog-wide pgTAP invariant.
- Permit only the two separately proven nullable-FK partial indexes as explicit exceptions.
- Update candidate memory and delivery provenance.

### Explicitly unchanged

- Rows, tables, columns, constraints and foreign-key definitions.
- RLS policies, grants, functions, RPCs and ownership.
- Existing indexes.
- Application/UI code, dependencies and workflows.
- Provider configuration, deployment settings and production data.

### Acceptance criteria

- [x] Migration contains 14 additive indexes in correct FK order.
- [x] Catalog gate requires valid, ready and live indexes with exact left-prefix ordering.
- [x] Any uncovered constraint is printed as schema/table/constraint diagnostic output.
- [x] Partial coverage is rejected except for the two existing definitions already protected by focused pgTAP assertions.
- [x] Current memory treats PR #236 as candidate-only and PR #211 as superseded.
- [ ] Fresh reset and all pgTAP files pass on final exact head.
- [ ] CodeQL and secret-history gates pass on final exact head.
- [ ] Production advisor closure is claimed only after owner-controlled deployment and rerun.

## Implementation plan

### Migration

`supabase/migrations/20260802060004_cover_foreign_key_indexes.sql` adds:

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

The original migration timestamp is retained because the file never entered main and no database migration was added between the old PR base and current main.

### Catalog invariant

`foreign_key_indexes.test.sql`:

- verifies exact left-prefix FK column order;
- requires `indisvalid`, `indisready` and `indislive`;
- accepts non-partial indexes by default;
- permits only `inbox_candidates_account_owner_idx` and `inbox_candidates_category_owner_idx` as partial exceptions;
- emits all uncovered constraints before failing.

The focused `foreign_key_access_indexes.test.sql` remains responsible for proving those two exception indexes have the correct key order and exact nullable-column predicates.

### Risks and controls

| Risk | Control |
|---|---|
| Owner-first index counted incorrectly | Exact left-prefix catalog comparison |
| Unsafe partial index counted | Explicit two-index allowlist plus focused predicate tests |
| Unrelated partial index hides a missing owner FK | Add provenance `user_id` index; generic gate rejects all other partials |
| Invalid/unready index passes | Require valid, ready and live catalog flags |
| Deployment blocks writes | Owner-controlled deployment window; no production apply in this PR |
| Excess write/storage cost | Add only evidence-backed coverage indexes; preserve two safe partial indexes instead of duplicating them |

## Tasks

| ID | Task | Status | Evidence |
|---|---|---|---|
| T1 | Compare PR #211 database surface with current main | done | no migration/test drift |
| T2 | Recreate 13 original indexes on current main | done | additive migration |
| T3 | Add diagnostic complete-coverage gate | done | constraint-level pgTAP output |
| T4 | Classify three diagnostic findings | done | two safe nullable partials; one false coverage case |
| T5 | Add provenance owner index and precise partial exceptions | done | migration + catalog gate |
| T6 | Run final exact-head reset/full pgTAP and security gates | in progress | current CI cycle |
| T7 | Owner merge decision | blocked | explicit owner instruction required |
| T8 | Owner-controlled production deployment and advisor rerun | blocked | post-merge evidence required |

## Verification contract

- Diff hygiene, project knowledge and CI classification.
- Fresh local Supabase reset and complete pgTAP suite.
- Protected CodeQL with real Initialize/Analyze.
- Secret-history scan.
- Browser checks only if selected; no UI behavior changes.

## Evaluation

### Current findings

- First strict run correctly failed and named three constraints.
- Two findings are valid nullable-FK partial coverage already enforced by focused tests.
- One finding is a real missing complete index on `transaction_import_provenance.user_id` and is now addressed.
- Final acceptance still depends on a fresh exact-head reset and all pgTAP files passing.

### Rollback

Drop only the 14 named indexes introduced by `20260802060004_cover_foreign_key_indexes.sql`. No row or schema-shape rollback is required.

### Evidence boundary

Repository checks cannot prove production deployment or a clean production advisor. Historical PR #211 reconnaissance is provenance only.

## Permission boundary

- Allowed: focused branch, migration, pgTAP test, work packet, PR memory and candidate-status reconciliation.
- Forbidden: direct main writes, merge without owner instruction, production migration/data access, RLS/grant/function changes and provider writes.
- Stop if final migration replay fails, another uncovered FK remains, or destructive changes become necessary.

## Delivery state

- Branch: `perf/cover-foreign-key-indexes-current-main`
- Replacement PR: #236
- Old PR #211: closed unmerged as superseded
- Exact-head verification: pending
- Production migration/advisor verification: not performed
