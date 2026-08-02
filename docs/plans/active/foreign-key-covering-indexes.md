# Cover public foreign keys with indexes

**Status:** implementing  
**Execution state:** implementing  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** OpenAI agent  
**Issue/PR:** #53  
**Last updated:** 2026-08-02

## Outcome

Every foreign key in the public MoneyFlow schema has a valid left-prefix B-tree index on its referencing columns, so referential checks and join paths do not degrade into avoidable table scans as tenant data grows.

## Repository reconnaissance

### Current behavior

- Supabase's production performance advisor reports 13 unindexed foreign keys.
- Catalog inspection confirmed the exact 13 constraints and their column order.
- Existing indexes mostly begin with `user_id`; they support tenant queries but do not cover foreign keys whose declared order begins with the referenced entity ID.
- No production DDL has been applied. This task changes only a focused branch and relies on fresh-reset CI before any human merge decision.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `supabase/migrations/` | Versioned schema and index ownership | Add one additive migration |
| `supabase/tests/database/` | pgTAP database contracts | Add one catalog-level invariant |
| `docs/security-rls-check.md` | Database verification model | Reuse existing catalog-test approach; no documentation change required |

### Existing tests and constraints

- Database/RLS tests run through `npm run test:db` and `npx supabase test db`.
- Financial schema and RLS behavior must remain unchanged.
- No index is removed in this task; unused-index findings require separate workload evidence.
- Production writes require separate explicit approval and are forbidden in this packet.

### Similar implementation and recent history

- `supabase/tests/database/security_catalog.test.sql` uses catalog queries to enforce database-wide invariants.
- Issue #53 PR E calls for inspecting RLS/index coverage and benchmarking database paths.

### Open questions

- [x] Are the advisor findings real rather than duplicate-index false positives? Yes. The existing indexes use the opposite leading-column order and do not cover the declared FK left prefix.

## Research

### Research scope and source selection

- Decision question: Should MoneyFlow add dedicated indexes in exact FK column order, or rely on existing tenant-first indexes?
- Reference map consulted: not required; this is a narrow PostgreSQL/Supabase decision.
- Source budget: two primary official sources.

### Sources

| Source | Authority/type | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|---|
| Supabase Performance and Security Advisors, lint `0001_unindexed_foreign_keys` | Official Supabase documentation and live advisor | 2026-08-02 | Flags foreign keys without a covering index and explains the query/performance risk | Advisor does not choose names or justify removing other indexes |
| PostgreSQL constraints documentation | Official PostgreSQL documentation | 2026-08-02 | Foreign keys do not automatically create indexes on referencing columns; referential actions may benefit from them | Index value still depends on workload and schema size |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Do nothing and rely on tenant-first indexes | No extra write/storage overhead | Existing indexes do not match the FK left prefix; advisor remains open | Rejected |
| Reorder or replace existing indexes | Avoids some duplicate storage | Could regress tenant-filtered reads and requires workload measurement | Rejected for this focused task |
| Add dedicated FK-order indexes | Additive, explicit, rollback-safe, closes the catalog gap | Additional write/storage overhead | Selected |

### Research decision

Add one ordinary B-tree index per uncovered composite foreign key, in the exact referencing-column order. Preserve current tenant-first and partial indexes because this task has no workload evidence authorizing removal. Add a generic pgTAP catalog invariant so future foreign keys cannot silently ship without coverage.

### Adoption review

Not applicable. No dependency, provider, service, framework, or architecture pattern is added.

## Specification

### Problem

MoneyFlow has 13 public foreign keys whose referencing columns lack a matching left-prefix index. Referential updates/deletes and related joins can therefore scan entire tenant tables as data grows.

### User stories

- As the system owner, I can grow ledger and planning data without avoidable FK-check table scans.
- As a maintainer, CI rejects a future public foreign key that lacks a covering index.

### Acceptance criteria

- [ ] All 13 advisor-reported foreign keys receive valid indexes in exact FK column order.
- [ ] A generic pgTAP test proves every public foreign key has a valid, ready left-prefix index.
- [ ] No table, constraint, policy, RPC, grant, data row, or existing index is changed or removed.
- [ ] Fresh local migration replay and pgTAP pass in CI.
- [ ] Supabase performance advisor no longer reports `unindexed_foreign_keys` after an approved deployment.

### Required states

- Loading/empty/populated/UI/accessibility: not applicable; database-only change.
- Validation/error: migration fails on an unexpected name conflict rather than silently accepting a different index definition.
- Recovery/undo: rollback is `drop index` for the 13 new indexes.
- Long data: indexes are intended to keep FK checks bounded as rows grow.

### Financial and security constraints

- No financial rows or calculations change.
- RLS, grants, RPCs and tenant ownership remain untouched.
- Production database writes are forbidden until human merge/deployment approval.

### Out of scope

- Removing indexes reported as unused.
- Changing FK definitions or column order.
- Provider Auth settings, CAPTCHA, firewall, UI/UX or application code.
- Running load tests against production.

## Implementation plan

### Architecture fit

Indexes belong to the existing `supabase/migrations/` schema boundary. The invariant belongs to the existing catalog-level pgTAP suite under `supabase/tests/database/`.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `supabase/migrations/20260802060004_cover_foreign_key_indexes.sql` | Add 13 B-tree indexes in FK column order | Close live advisor findings additively |
| `supabase/tests/database/foreign_key_indexes.test.sql` | Assert every public FK has a valid left-prefix index | Prevent recurrence |
| This packet | Record evidence, scope, permissions and rollback | Durable handoff |

### Data and migration impact

- Schema/migration: additive indexes only.
- Backfill: PostgreSQL builds indexes from existing rows.
- Compatibility: no query/API shape changes.
- Rollback: drop only the 13 named indexes.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Existing reversed-order index is mistaken for FK coverage | Test compares ordered catalog attribute numbers and left prefix |
| Included columns or invalid indexes falsely pass | Require `indisvalid`, `indisready`, and enough key attributes |
| Excessive scope removes useful indexes | No existing index removal |
| Production lock/write cost | Human-controlled deployment; current tables are small; ordinary migration remains rollback-safe |

### Verification plan

- Static: `check:knowledge`, lint/typecheck/build through CI.
- Unit/domain: no application behavior changed; existing suite must remain green.
- Database: fresh reset plus all pgTAP, including new generic invariant.
- Browser/responsive: existing CI may run; no UI-specific evidence required.
- Production/manual: after approved deployment, rerun Supabase performance advisor and confirm zero `unindexed_foreign_keys` findings.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Confirm exact uncovered FKs and current indexes | None | Production catalog query + advisor | done |
| T2 | Add additive index migration | T1 | Migration diff | in_progress |
| T3 | Add generic pgTAP FK-index invariant | T1 | Catalog test | in_progress |
| T4 | Open PR and run exact-head CI | T2, T3 | CI runs | todo |
| T5 | Human merge and production advisor verification | T4 | Merge/deployment/advisor | blocked on owner |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-02 | researcher | planner | specified | Live advisor, FK/index catalog, official docs | CI not yet run | Finalize migration/test plan |
| 2026-08-02 | planner | implementer | implementing | This packet, branch `perf/cover-foreign-key-indexes` | Supabase CLI unavailable locally; migration timestamp sourced from DB UTC clock | Add migration and pgTAP test |

### Current permission boundary

- Granted scope: branch writes for this focused database performance task.
- Exact resources: `Thunderkill016/moneyflow`, branch `perf/cover-foreign-key-indexes`; Supabase production read-only metadata/advisors.
- Forbidden writes: `main`, production schema/data, Auth provider settings, Vercel/Cloudflare configuration.
- Human approval required before: merge or any production migration.
- Rollback or stop condition: stop if CI reveals a schema conflict or if any index duplicates an existing exact left prefix.

## Evaluation

Pending exact-head CI and independent diff review.

## Delivery record

- Branch: `perf/cover-foreign-key-indexes`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: forbidden/pending owner
- Production flow verified: not applicable yet
- Work packet moved to `docs/plans/completed/`: no
