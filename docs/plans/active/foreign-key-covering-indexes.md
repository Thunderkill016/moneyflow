# Cover public foreign keys with indexes

**Status:** ready_for_review  
**Execution state:** ready_for_review  
**Active role:** human_owner  
**Permission scope:** branch_write  
**Owner:** OpenAI agent  
**Issue/PR:** #53 / #211  
**Last updated:** 2026-08-02

## Outcome

Every foreign key in MoneyFlow's public schema receives a valid left-prefix B-tree index on its referencing columns, preventing avoidable scans during referential checks and related joins as tenant data grows.

## Repository reconnaissance

### Current behavior

- The live Supabase performance advisor reported 13 unindexed public foreign keys.
- Catalog inspection confirmed the exact constraints and column order.
- Existing tenant-first indexes support common `user_id` reads but do not cover foreign keys whose declared order starts with the referenced entity ID.
- Production was inspected read-only. No production DDL or financial data write was performed.

### Relevant repository areas

| Area | Responsibility |
|---|---|
| `supabase/migrations/` | Versioned indexes and schema changes |
| `supabase/tests/database/` | pgTAP catalog and database invariants |
| `docs/security-rls-check.md` | Existing database verification model |

### Existing tests and constraints

- `npm run test:db` performs a fresh migration replay and pgTAP run.
- RLS, grants, functions, constraints and financial behavior must remain unchanged.
- Existing indexes are not removed because unused-index findings require separate workload evidence.
- Human owner controls merge and production migration deployment.

### Similar implementation and history

- `security_catalog.test.sql` already enforces schema-wide catalog invariants.
- Issue #53 PR E calls for database index and RLS performance review.

## Research

### Decision question

Should MoneyFlow rely on existing tenant-first indexes, or add indexes matching the exact referencing-column order of each uncovered foreign key?

### Sources

| Source | Authority | Date | Decision support | Limit |
|---|---|---|---|---|
| Supabase advisor lint `0001_unindexed_foreign_keys` | Official Supabase advisor/docs | 2026-08-02 | Identifies live foreign keys without covering indexes | Does not authorize removing other indexes |
| PostgreSQL constraint documentation | Official PostgreSQL docs | 2026-08-02 | Referencing-side FK indexes are not created automatically and may be needed for efficient referential operations | Workload still determines broader index value |

### Alternatives

| Option | Decision |
|---|---|
| Keep only tenant-first indexes | Rejected: opposite leading-column order does not cover these FKs |
| Replace/reorder existing indexes | Rejected: could regress tenant reads without workload evidence |
| Add exact FK-order indexes | Selected: additive, explicit and rollback-safe |

### Adoption review

Not applicable. No dependency, provider, service, tool or architecture layer is added.

## Specification

### Problem

Thirteen public composite foreign keys lacked a valid left-prefix index. Referential updates/deletes and joins could therefore scan growing tables unnecessarily.

### Acceptance criteria

- [x] Add valid indexes for all 13 advisor-reported foreign keys in exact FK column order.
- [x] Add a generic pgTAP invariant requiring every public FK to have a valid, ready left-prefix index.
- [x] Preserve all tables, rows, constraints, policies, grants, RPCs and existing indexes.
- [x] Pass fresh migration replay and all pgTAP tests in CI.
- [ ] After an owner-approved production deployment, confirm the advisor reports no `unindexed_foreign_keys` findings.

### Financial and security constraints

- No financial values, calculations or transaction behavior change.
- RLS, tenant ownership and RPC permissions remain unchanged.
- No production database write is authorized by this packet.

### Out of scope

- Removing unused indexes.
- Changing foreign keys or application queries.
- Auth/CAPTCHA/firewall/provider configuration.
- UI/UX or application code.
- Production load testing.

## Implementation plan

### Planned changes

| File | Change |
|---|---|
| `supabase/migrations/20260802060004_cover_foreign_key_indexes.sql` | Add 13 ordinary B-tree indexes in exact FK column order |
| `supabase/tests/database/foreign_key_indexes.test.sql` | Enforce database-wide FK left-prefix index coverage |
| This packet | Preserve scope, evidence, rollback and handoff |

### Migration impact

- Additive indexes only; no backfill semantics or API compatibility change.
- PostgreSQL builds each index from existing rows during migration replay/deployment.
- Rollback drops only the 13 named indexes introduced by this migration.

### Risks and counterexamples

| Risk | Control |
|---|---|
| Reversed tenant-first index falsely treated as FK coverage | Catalog test compares ordered FK attribute numbers to the index left prefix |
| Invalid, unready or INCLUDE-only index falsely passes | Test requires `indisvalid`, `indisready` and sufficient key attributes |
| Scope expands into index deletion | No existing index is changed or removed |
| Production write/lock cost | Deployment remains owner-controlled and reversible |

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Confirm uncovered foreign keys and existing indexes | Live advisor and catalog queries | done |
| T2 | Add additive index migration | Migration diff | done |
| T3 | Add generic pgTAP gate | Database test | done |
| T4 | Open PR and run exact-head CI | PR #211, CI #893 | done |
| T5 | Human merge and production advisor verification | Merge/deployment/advisor | blocked on owner |

## Handoff record

| Date | From | To | State | Evidence | Open item | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-02 | researcher | planner | specified | Live advisor, catalog inspection, official docs | CI not run | Plan focused migration and invariant |
| 2026-08-02 | planner | implementer | implementing | Branch and work packet | Local Supabase CLI unavailable | Add migration/test and open PR |
| 2026-08-02 | implementer | evaluator | evaluating | PR #211, head `2353feb4f13e04d8a0f213a194efcabe8bf40d1c` | Exact-head gates pending | Run CI and inspect diff |
| 2026-08-02 | evaluator | human_owner | ready_for_review | CI #893: verify, build, database/pgTAP and browser regression green; CodeQL and secret scan green | Production advisor cannot be rechecked before deployment | Review and decide merge |

### Current permission boundary

- Allowed: branch and PR updates for #211; read-only production metadata/advisors.
- Forbidden: `main`, merge, production schema/data, Auth settings and Vercel/Cloudflare configuration.
- Human approval required before merge or migration deployment.
- Stop if final-head CI fails or the base branch changes materially.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| 13 exact FK-order indexes | Migration diff and catalog reconnaissance | pass |
| Generic recurrence gate | `foreign_key_indexes.test.sql` | pass |
| No unrelated schema/behavior change | Three-file diff from `main` | pass |
| Fresh migration replay and pgTAP | CI #893 database job | pass |
| Static/build/regression | CI #893 verify and e2e jobs | pass |
| Security scanning | CodeQL #59 and secret history scan #59 | pass |
| Production advisor clean | Requires deployment | pending |

### Review findings

- Correctness: the index order matches each declared FK column order.
- Security/ownership: no RLS, grants, functions or ownership rules changed.
- Maintainability: one generic catalog invariant prevents recurrence.
- Scope compliance: database performance only; no application or UI work.

### Remaining limitation

The migration has not been applied to production. Advisor closure and production catalog confirmation remain post-merge owner-controlled work.

## Delivery record

- Branch: `perf/cover-foreign-key-indexes`
- PR: #211
- Current head before final packet commit: `2353feb4f13e04d8a0f213a194efcabe8bf40d1c`
- CI run: #893 success
- Squash commit: pending owner
- Production migration: not applied
- Production advisor verification: pending deployment
- Work packet moved to `docs/plans/completed/`: no
