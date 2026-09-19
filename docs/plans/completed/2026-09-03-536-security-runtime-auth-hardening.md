# #536 — Security runtime and authentication hardening — completed

**Status:** completed production/security slice; effective when lifecycle PR #544 merges
**Issue:** #536
**Selected by:** PR #539
**Runtime implementation:** PR #540
**Lifecycle closeout:** PR #544
**Merged runtime baseline:** `10c832aaaf27a6bf5406578871708789f4b1b14d`
**Completed evidence date:** 2026-09-03
**Owner:** human owner

## Outcome

The #536 slice removed the release-blocking runtime dependency exposure, independently dispositioned Supabase privileged-RPC warnings, reconciled the production database to the repository acquisition/source-lineage contract, and recorded the remaining Supabase leaked-password capability as an explicit owner-accepted Free-plan limitation rather than a false remediation claim.

This packet closes the executable slice only. It does not select follow-on product work. `PLAN_AUTHORITY.current` must be `null` after this closeout merges.

## Runtime result

PR #540 merged and production is verified on exact `main@10c832aaaf27a6bf5406578871708789f4b1b14d`.

The shipped dependency tree includes:

- Next.js / `eslint-config-next` 16.3.4, outside the August 2026 Critical patched floor of 16.3.3;
- React / React DOM 19.2.4 unchanged;
- Sharp 0.35.4;
- Browserslist 4.28.8;
- qs 6.16.0;
- fast-uri 3.1.6;
- repository dependency-floor guards.

The Next upgrade exposed a Share Target Strict Mode one-shot lifecycle regression. Existing browser assertions reproduced it. Commit `91a93c3e80474f37f52f90405a91190d36b093e4` keeps both guarantees: cleanup cancels abandoned `requestAnimationFrame` work and the one-shot ref is consumed only when a scheduled frame actually executes.

Vercel production deployment `dpl_Ch4Vfpdxw8mbUJ5ynjozZRTGLhYw` is READY from the exact merge commit. Fresh post-database `/api/health` returned HTTP 200 and that full commit; no runtime errors were reported in the inspected post-rollout hour.

## Repository verification

Merged-main CI #3260 (`33735497335`) ran the complete repository migration chain and passed:

- fresh local Supabase reset;
- **39 pgTAP files / 747 tests**;
- archive producer round trip;
- archive restore round trip;
- selected authenticated ownership/browser smoke;
- policy/static/unit/build/UI/e2e aggregation gates.

PR #540 exact-head CodeQL and Secret-history evidence was green before merge. PR #544 carries only evidence/lifecycle reconciliation and must use its own exact-head checks before owner merge.

## Production database reconciliation

Before the production write, the operation established:

- a verified private/off-repository logical backup;
- a linked migration list with 41 existing local/remote versions plus exactly 15 pending repository versions;
- `supabase db push --dry-run` listing exactly those 15 versions in timestamp order;
- explicit owner authorization for the bounded production operation.

The linked CLI then forward-applied these repository migrations without seed, linked reset, MCP-generated migration timestamp or migration-history repair:

1. `20260821014500_direct_csv_batch_atomic_approval`
2. `20260821062000_manual_import_reconciliation`
3. `20260821093500_deleted_source_reimport_precedence`
4. `20260821184500_source_observation_precedence`
5. `20260821190000_source_observation_guard_compat`
6. `20260821203000_import_batch_owner_preserving_fk`
7. `20260822094400_source_identity_consistency_preflight`
8. `20260822094500_source_lineage_lifecycle`
9. `20260822094600_source_lineage_archive_compat`
10. `20260822094700_source_lineage_archive_mode_guard`
11. `20260823124000_source_lifecycle_reconciliation_policy`
12. `20260823124500_source_lifecycle_reconciliation_lock_order`
13. `20260824083000_share_target_atomic_ingestion`
14. `20260824170000_share_target_rule_atomic_ingestion`
15. `20260825090000_direct_csv_rule_atomic_ingestion`

Fresh remote history after the write contains **56 exact repository migration versions** and ends at `20260825090000_direct_csv_rule_atomic_ingestion`; no orphan MCP timestamp exists.

## Production contract verification

Fresh live catalog/data verification passed all **14 durable later contracts**:

1. batch atomic approval;
2. manual attachment to an existing transaction;
3. deleted exact-source recovery;
4. changed-source observation;
5. approved-evidence immutability plus authenticated DELETE restriction;
6. owner-preserving import-batch composite foreign key;
7. source-lineage columns plus replacement observation;
8. source-aware archive producer/restore generation;
9. archive-mode updated-at owner guard;
10. source-lifecycle review RPC;
11. reconciliation lock-order hardening;
12. Share Target atomic ingestion;
13. Share Target rule-aware ingestion;
14. Direct CSV rule-aware preparation.

The source-identity postflight remained zero-conflict for both approved candidate/candidate and candidate/provenance mappings. PostgreSQL logs showed the expected DDL/function/grant statements executing on project `fwpldsdkpzhswpuctbke` with no migration-adjacent ERROR/PANIC/FATAL evidence in the inspected window.

## SECURITY DEFINER disposition

Authenticated-callable SECURITY DEFINER count increased from 36 to the repository-expected **43** after the later migrations.

The seven new privileged RPCs were individually inspected after rollout and retain the intended boundary:

- owner `postgres`;
- empty/hardened `search_path`;
- authenticated execute granted;
- anon/PUBLIC execute denied;
- `auth.uid()` and explicit authentication/tenant binding present;
- no dynamic SQL, role switching, `service_role` or row-security switching pattern found.

The Share Target ingestion RPCs are SECURITY INVOKER and authenticated-only. Fresh Security Advisor still emits its broad authenticated SECURITY DEFINER warning class, but no evidence-backed ownership defect was reproduced. The advisor warning is therefore dispositioned, not silenced by weakening the financial API.

## Auth/provider decision

Supabase organization `aqnjchplxbyrucgofsep` remains on plan `free`. Fresh Security Advisor still reports **Leaked Password Protection Disabled**.

The owner explicitly decided for the current M0 closure to:

- remain on Supabase Free;
- not upgrade solely for leaked-password protection;
- authorize no SQL workaround or Auth/provider mutation;
- accept the provider-plan limitation explicitly.

This is an accepted limitation, **not** an enabled or remediated control. Any future public-beta policy that requires leaked-password protection must reopen that provider decision rather than treating this record as remediation.

## Rollback and safety record

The verified pre-write logical backup remains private/off-repository. Its keys/plaintext are not repository evidence and must never be exposed.

The production migration safety model remains: stop and forward-fix a bounded schema/privilege defect where safe; reserve backup restoration for catastrophic integrity/availability recovery. `migration repair` is not a rollback mechanism for missing SQL.

## Final lifecycle decision

All technical/runtime/database evidence required for the bounded M0 #536 work is complete. The Free-plan leaked-password limitation is explicitly accepted by the owner for this M0 closure.

PR #544 performs the repository lifecycle convergence:

- preserve this completion evidence under `docs/plans/completed/`;
- remove the active #536 packet;
- update current project memory;
- set `PLAN_AUTHORITY.current` to `null`;
- select **no** follow-on work in the same PR.

M1 or any other executable slice may be selected only from fresh main after this closeout merges and current authority is confirmed `null`.
