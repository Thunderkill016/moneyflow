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

## Incident evidence

- Production deployment `dpl_DA1iQV64Qkr3V9uo76r3uBYKeTs4` published commit `31ff1ded44c76422861c9a994f75d05420559d71` at 2026-08-02 02:18 UTC.
- That commit changed the authenticated dashboard to call `public.get_dashboard_bundle`.
- Supabase production API logs immediately returned HTTP 404 for `/rest/v1/rpc/get_dashboard_bundle`.
- Production migration history did not contain the dashboard bundle migration and the function did not exist.
- User-owned data was intact: the affected owner still had 35 ledger transactions, one account and eleven categories.
- The loader converted the RPC failure into an empty workspace, making intact data look reset.
- The migration was applied to production as version `20260802022923`; an authenticated-role smoke query then returned 34 dashboard-window transactions, one account and eleven categories.

## Root cause

The release violated expand/contract deployment compatibility: application code requiring a new RPC reached production before the additive database migration. The dashboard error path swallowed the schema error and returned zero-value collections instead of the previous read path, creating a false data-loss signal.

## Acceptance criteria

- [x] Production RPC exists and is executable only by the intended authenticated role.
- [x] Authenticated smoke query returns the owner's real dashboard data under RLS.
- [x] Repository migration version matches production migration history.
- [x] RPC absence or invalid payload uses focused authenticated loaders rather than an empty dashboard.
- [x] Failure paths emit non-sensitive searchable server log codes.
- [x] Source-contract tests lock the compatibility fallback.
- [ ] Required CI gates pass on the exact branch head.
- [ ] Human owner reviews and merges the PR.
- [ ] Exact production deployment is verified after merge.

## Implementation plan

1. Repair the missing production migration and verify it under the authenticated role.
2. Keep the one-RPC healthy path.
3. Add a backward-compatible focused-loader fallback for RPC and payload failures.
4. Log stable incident codes without user or financial data.
5. Align the migration filename/version with production history.
6. Add regression assertions and run CI.

## Risks and rollback

- The fallback temporarily restores the former multi-query dashboard path only during failure; it can increase database calls but preserves correctness and availability.
- The fallback remains RLS-bound because it reuses the existing authenticated workspace loaders.
- Rollback is reverting the hotfix branch; the additive production function can remain safely deployed.
- Do not delete, truncate, reset or rewrite ledger data during this incident.

## Verification record

Provider checks completed:

- Supabase project health: active/healthy.
- Core row counts: intact.
- Pre-fix RPC existence: false.
- Pre-fix API evidence: repeated HTTP 404.
- Migration application: success.
- Post-fix authenticated database smoke: 34 transactions, 1 account, 11 categories.

Repository gates are pending GitHub CI; no local checkout/network was available in the current execution environment.
