# Dashboard schema compatibility incident

**Status:** in progress
**Execution state:** ready for CI
**Active role:** implementer/evaluator
**Permission scope:** branch_write + provider_read + owner-requested production migration repair
**Owner:** human owner
**Branch:** `hotfix/dashboard-schema-compatibility`
**Last updated:** 2026-08-02

## Outcome

A production deployment must never render a false empty ledger when application code and the production database are temporarily on different schema versions. The healthy dashboard keeps its single bounded RPC; migration or response failures fall back to the existing tenant-safe focused loaders and emit a searchable server log.

## Repository reconnaissance

### Incident evidence

- Production deployment `dpl_DA1iQV64Qkr3V9uo76r3uBYKeTs4` published commit `31ff1ded44c76422861c9a994f75d05420559d71` at 2026-08-02 02:18 UTC.
- That commit changed the authenticated dashboard to call `public.get_dashboard_bundle`.
- Supabase production API logs immediately returned HTTP 404 for `/rest/v1/rpc/get_dashboard_bundle`.
- Production migration history did not contain the dashboard bundle migration and the function did not exist.
- User-owned data was intact: the affected owner still had 35 ledger transactions, one account and eleven categories.
- The loader converted the RPC failure into an empty workspace, making intact data look reset.
- The migration was applied to production as version `20260802022923`; an authenticated-role smoke query then returned 34 dashboard-window transactions, one account and eleven categories.

### Affected system boundaries

- `src/server/dashboard.ts` owns the authenticated dashboard read model and its error behavior.
- `src/server/finance.ts`, planning workspace loaders and `src/server/inbox.ts` provide the previous tenant-safe focused read path.
- `supabase/migrations/` owns the versioned RPC definition and grants.
- Supabase production migration history is the runtime database truth.
- Vercel production deployment metadata identifies the exact application commit that introduced the dependency.

### Root cause

The release violated expand/contract deployment compatibility: application code requiring a new RPC reached production before the additive database migration. The dashboard error path swallowed the schema error and returned zero-value collections instead of the previous read path, creating a false data-loss signal.

## Research

### Decision question

How should MoneyFlow remain correct and available when an application deployment and an additive database migration are temporarily out of order?

### Evidence and decision

Repository architecture already requires thin route composition, RLS-bound server loaders, versioned migrations and separate production verification. Provider logs established that the failure was schema skew rather than deleted data. No new service or dependency is required.

Use an expand/contract-compatible release shape:

1. Keep the additive RPC as the optimized healthy path.
2. Preserve the previous focused loaders as a temporary compatibility path whenever the RPC is absent, errors or returns an invalid payload.
3. Emit stable, non-sensitive server log codes so migration skew is observable instead of silently presented as zero financial data.
4. Keep migration filenames aligned with actual production migration history.
5. Require exact-head database, code, build and browser gates before merge, followed by exact production verification.

The compatibility path may use more API calls during failure, but financial correctness and truthful presentation take priority over the optimization until the database catches up.

## Specification

### Acceptance criteria

- [x] Production RPC exists and is executable only by the intended authenticated role.
- [x] Authenticated smoke query returns the owner's real dashboard data under RLS.
- [x] Repository migration version matches production migration history.
- [x] RPC absence or invalid payload uses focused authenticated loaders rather than an empty dashboard.
- [x] Failure paths emit non-sensitive searchable server log codes.
- [x] Source-contract tests lock the compatibility fallback.
- [ ] Required CI gates pass on the exact branch head.
- [ ] Human owner reviews and merges the PR.
- [ ] Exact production deployment is verified after merge.

### Non-goals

- Do not reset, truncate, rewrite or reseed production ledger data.
- Do not add a second database, queue, cache or runtime service.
- Do not weaken RLS, RPC grants or tenant ownership checks.
- Do not make the multi-query fallback the normal healthy path.

### Risks and rollback

- The fallback temporarily restores the former multi-query dashboard path only during failure; it can increase database calls but preserves correctness and availability.
- The fallback remains RLS-bound because it reuses the existing authenticated workspace loaders.
- Stable error logging must not include user identifiers, transaction content or financial values.
- Rollback is reverting the hotfix branch; the additive production function can remain safely deployed.

## Tasks

- [x] Confirm whether rows, users or schema were actually deleted.
- [x] Correlate the incident with the exact Vercel production deployment.
- [x] Prove the missing RPC through production migration state and Supabase API 404 logs.
- [x] Apply the missing additive migration to production.
- [x] Verify the RPC under the authenticated role with RLS enabled.
- [x] Add an authenticated compatibility fallback to the previous focused loaders.
- [x] Add non-sensitive failure log codes.
- [x] Add regression assertions for both RPC failure paths.
- [x] Align the repository migration version with production history.
- [x] Open PR #207 and trigger full CI.
- [ ] Resolve all exact-head CI findings.
- [ ] Obtain human-owner review and merge.
- [ ] Verify the merged commit on the canonical production deployment.

## Evaluation

### Provider verification completed

- Supabase project health: active/healthy.
- Core row counts: intact.
- Affected owner data before repair: 35 total ledger transactions, one account and eleven categories.
- Pre-fix RPC existence: false.
- Pre-fix API evidence: repeated HTTP 404.
- Migration application: success as version `20260802022923`.
- Post-fix authenticated database smoke: 34 dashboard-window transactions, one account and eleven categories.
- Security advisor after DDL: no new warning for `get_dashboard_bundle`; the function remains `SECURITY INVOKER`.

### Repository verification

The first ready-for-review CI run correctly rejected this packet because the required lifecycle headings were absent. This revision adds the required repository reconnaissance, research, specification, tasks and evaluation sections. A new exact-head CI run must complete before review.

No local gate is claimed: the current execution environment did not provide a local repository checkout with network access. GitHub CI owns the required code, database, build and browser evidence for this branch.
