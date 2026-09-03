# MoneyFlow — current project memory

**Status:** #536 is the selected active Class 3 security/runtime/auth slice. PR #540 is Ready for review and carries the repository-side dependency remediation plus a Share Target lifecycle repair; it is not merged or deployed, so production remains on the pre-#540 runtime. Read-only provider/database reconciliation on 2026-09-03 fully classified the current live SECURITY DEFINER warning set and proved the Aug-21–25 production migration/schema gap at contract level. Production database/Auth writes remain owner-gated.
**Last reconciled:** 2026-09-03
**Merged main baseline:** `425af4508e547de28fb372eedbcb07ced226d522` (PR #539)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a Vietnamese personal-finance product built around one trustworthy user-owned ledger. It remains **not public-beta ready**.

Merged #432/#433 remains the master product program. PR #538 completed performance slice #527. PR #539 then selected `docs/plans/active/536-security-runtime-auth-hardening.md` as the single current executable slice on `main`.

#536 is release-blocking: patch the vulnerable Next.js runtime line, preserve auth/tenant/financial guarantees, reconcile production database migration/schema state with repository contracts, and resolve leaked-password protection before public-beta acceptance through an explicitly authorized reversible provider decision.

PR #540 is the current Ready-for-review repository implementation candidate. It does **not** close #536, change production database functions/grants/migration history, change Supabase Auth configuration, merge itself, or deploy production.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories or financial intent are never guessed.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence.
- Full archive/restore is separate from scoped/report export.
- Performance work from #532/#538 changed loading ownership only and did not add a second financial authority.

## 3. Acquisition and reconciliation truth

Repository/main lineage includes Direct CSV provenance/atomic approval, later-source attachment, deleted exact-source recovery, changed-observation preservation, predecessor/replacement lineage, clearing progression, Share Target persistence, explicit candidate rules and Direct CSV mapping/rule reuse through PR #464.

**Production database parity is behind that repository lineage.** Production migration history ends at `20260812043219`, while the repository contains 15 later migration versions from 2026-08-21 through 2026-08-25. A 15-version read-only contract matrix found all 14 durable postconditions absent; the one non-durable preflight migration currently passes against live data. This strongly supports a forward application of the 15 repository migrations in timestamp order after explicit owner authorization, rather than migration-history repair. Do not describe later Direct CSV, source-lineage or Share Target database capabilities as reconciled until the forward operation and live verification complete.

The generic file importer remains shallow relative to real Vietnam consumer bank exports. Exact schemas still require privacy-safe structural fixtures. #523 remains candidate-only and is not selected while #536 is active.

## 4. Performance truth after #527

PR #538 merged the #527 performance slice. Same-methodology `/dashboard` medians versus the pre-#527 main baseline were:

- performance score 86 -> 87;
- LCP 4009.7 -> 3793.9 ms (-5.4%);
- TBT 140.0 -> 77.9 ms (-44.4%);
- script transfer 319,931 -> 303,886 B (-5.0%);
- total transfer 553,643 -> 534,785 B (-3.4%);
- main-thread 1735 -> 1585 ms (-8.7%);
- JS bootup 805 -> 630 ms (-21.7%);
- CLS remained 0.

`/` remained effectively flat and served as the regression/control route. Dashboard LCP still exceeds 2.5 s; the named remaining debt is render-blocking CSS plus residual client/main-thread work. Owner-observed Vercel score 39 remains field provenance and is **not** claimed fixed.

## 5. Current capability inventory

| Capability | Current truth |
|---|---|
| Core ledger | multiple accounts; income, expense, balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, create/edit/archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | reports, drill-downs, controlled import/export |
| Acquisition | repository supports batches/candidates/provenance, exact source matching, Direct CSV atomic approval, Share Target and deterministic rules; production DB lacks the later Aug-21–25 contracts |
| Review | exception-first Ready/Needs-attention grouped review from PR #522 |
| Ownership | versioned archive/export/validation/restore contract |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Performance | #527 completed with material dashboard client-cost reduction; field score 39 remains unresolved provenance |
| Public beta | blocked by active #536 runtime deployment, production DB parity and provider/Auth acceptance |

## 6. Security and delivery truth

Merged `main` at `425af450...` still pins Next.js 16.2.11 / `eslint-config-next` 16.2.12 and React / React DOM 19.2.4. Official Next.js security guidance published 2026-08-25 places Next 16.2.11 inside two Critical advisory affected ranges and patches the 16.x line at 16.3.3.

Ready-for-review PR #540 proposes:

- Next.js 16.3.4 and `eslint-config-next` 16.3.4;
- React / React DOM unchanged at 19.2.4;
- `sharp` override 0.35.4;
- `browserslist` override 4.28.8;
- `qs` override 6.16.0;
- `fast-uri` override 3.1.6;
- permanent dependency guards for patched floors.

A real GitHub-hosted Node 22.23.2 / npm 10.9.8 checkout regenerated the candidate lockfile. The first Next/Sharp refresh exposed a High Browserslist finding; pinning 4.28.8 cleared it. A later fresh audit exposed Moderate `qs` findings at 6.15.3, so #540 pins 6.16.0. The exact candidate also pins `fast-uri` 3.1.6 at the patched 3.x floor for the August 23 host-confusion/SSRF advisory set. Exact `npm ci` and `npm audit --audit-level=low` completed successfully after lock regeneration. This remains branch evidence only: production is not patched until owner merge/deployment.

The patched runtime exposed a Share Target browser regression: the first full browser smoke passed 134/136 cases, with only desktop/mobile variants of `/capture/share` stuck on loading. Root cause was a one-shot ref consumed before `requestAnimationFrame` while development Strict Mode can run effect setup -> cleanup -> setup. Commit `91a93c3e80474f37f52f90405a91190d36b093e4` preserves both required guarantees: cleanup cancels abandoned RAF work, while `ranRef` is consumed only inside a frame that actually executes. Existing Share Playwright assertions remain intact.

PR head `90941c2b86f972f97d01fd197688d85a92aeb773` passed CI #3255 and the duplicate Ready-for-review CI #3256, including policy/knowledge, static quality, unit/static-RLS, production build, browser smoke, authenticated ownership smoke, cross-device UI audit and e2e aggregation. CodeQL #2290 and Secret history scan #2290 also passed on that SHA. Any later branch commit, including evidence-only reconciliation, must use the current PR head/check suite as merge evidence; older exact-head checks are provenance, not permission to merge a changed head.

## 7. Supabase security and production-schema truth

Read-only production evidence refreshed on 2026-09-03:

- MoneyFlow Supabase project is `ACTIVE_HEALTHY`.
- Current Security Advisor reports **Leaked Password Protection Disabled**.
- Current Security Advisor reports `authenticated_security_definer_function_executable` WARN findings.
- All 36 currently live authenticated-callable SECURITY DEFINER functions are now classified as intentional tenant-bound privileged API surfaces: owner `postgres`; empty `search_path`; authenticated execute retained; no anon/PUBLIC execute; `auth.uid()` present; explicit `authentication_required`; direct tenant predicate tied to the authenticated user; and no dynamic SQL, role/row-security switching, `service_role`, `auth.role()` or user-editable metadata trust pattern detected.
- Repository `cross_tenant_rpc.test.sql` exercises foreign-tenant rejection across core account, transaction, transfer, split, budget, recurring and savings RPC families; `browser_role_privileges.test.sql` verifies browser-role least privilege and no anon public-function execution.

The current live advisor class is therefore **evidence-dispositioned as intentional privileged access with controls**, not a reproduced ownership defect. Do not bulk-convert these functions to SECURITY INVOKER, revoke authenticated execution, or move them merely to silence static advisor output. This disposition applies to the current 36-function live set; future/new functions require their own classification.

### Production migration/schema parity

Production migration history ends at `20260812043219_remove_atoryn_from_moneyflow_project`. The repository contains these 15 later versions:

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

The final read-only contract matrix maps each migration to a surviving expected postcondition. Fourteen durable postconditions are absent live: batch approval; later-source attachment; deleted-source restore; changed-source observation; approved-evidence guard; owner-preserving import-batch FK; source-lineage columns/replacement RPC; source-aware archive producer/restore; archive-mode updated-at owner guard; lifecycle review RPC and lock order; both Share Target ingestion RPCs; and Direct CSV rule preparation. The only `present=true` row is the non-durable source-identity preflight because current production data passes it.

The source-identity preflight currently sees 7 Inbox candidates, 6 approved, no source-ID candidates, and zero candidate/candidate or candidate/provenance identity conflicts. This reduces forward-migration risk but does not authorize a write.

Authenticated Direct CSV/source-lineage code already calls several absent RPCs while Vercel production remains on `main@425af450...`. Low-volume telemetry is not proof that the contract is satisfied. The combined migration-history + final-contract evidence strongly supports **forward-applying all 15 migrations in timestamp order**, not marking them applied with `migration repair`.

Owner-authorized database handoff must use this sequence:

1. verify fresh local reset + pgTAP/DB regression on the repository migration chain;
2. immediately re-read remote migration list and the 15-row live contract matrix;
3. because the organization is Free and has no automatic database backups/PITR, create privacy-safe off-repository logical schema and data dumps before the write; never commit production data to git;
4. run `supabase db push --dry-run` and require the pending list to be exactly the expected 15 migrations, in order; dry-run is a list preview, not SQL validation;
5. only with explicit owner authorization, apply the pending migrations; do not include seed data and never use remote reset;
6. immediately re-read migration history and all 15 postconditions, then run pgTAP/tenant/browser acquisition/recovery verification and Security Advisor read-back;
7. on failure, stop further mutations. Prefer a forward corrective migration for bounded schema/privilege defects; use the pre-write logical backup only for catastrophic integrity/availability recovery. Do not use history repair to disguise missing SQL and do not roll back to a known ownership/runtime-contract defect merely to make old tests pass.

Leaked-password protection remains disabled. The MoneyFlow Supabase organization reports plan `free`, while Supabase documents leaked-password protection as Pro and above. Any plan/Auth configuration write must record current value immediately before mutation and receive explicit owner authorization. No provider/database write has occurred in #540.

## 8. Reconciled issue status

- #432/#433: merged master product program.
- #511/#522: merged exception-first Inbox review.
- #527/#528/#531/#538: performance slice selected, governance-recovered and completed.
- #532: closed unmerged detailed implementation/evidence predecessor for #538.
- #533/#534/#535: closed duplicate performance PRs.
- #536: selected active release-blocking Class 3 security/runtime/auth slice; owns runtime deployment, production database parity and provider/Auth acceptance.
- #537: historical draft packet-preparation evidence; superseded as activation vehicle by merged #539.
- #539: merged selector for #536 at `425af450...`.
- #540: open Ready-for-review repository remediation PR for #536; performs no production database/provider write and does not itself close #536.
- #523: candidate bank-export compatibility slice; unselected.
- #403: historical performance provenance only.

## 9. Open pull-request memory

- PR #540 durable record: `docs/research/pr-memory/2026/Q3/PR-540.md`; dependency candidate, Share Target regression repair, exact-head repository evidence, read-only provider classification and production schema-parity handoff, with #536 intentionally left active.
- PR #537 remains historical draft preparation evidence and is not authority.
- PR #532/#538 records remain historical #527 implementation/closure provenance rather than current executable work.

## 10. True gaps after this audit

1. Use the current PR head/check suite as final merge evidence after any evidence-only reconciliation commit; do not reuse an older head as merge authority.
2. Owner-merge/deploy the patched runtime, then verify production actually runs the patched tree before describing production as patched.
3. Under a separate explicit owner authorization, perform the prepared 15-migration forward reconciliation with pre-write logical backup and post-write pgTAP/tenant/browser/provider verification.
4. Obtain explicit owner authorization for any Supabase plan/Auth configuration change; enable and verify leaked-password protection when plan eligibility exists, or keep the Free-plan limitation as a hard public-beta blocker.
5. Close/archive #536 only after repository, deployment, database and provider acceptance are all truthful; then set `PLAN_AUTHORITY.current` according to lifecycle policy.
6. Reconsider #523 or other product work only after #536 is dispositioned.

## 11. Next allowed action

Finish current-head PR verification after this evidence reconciliation, then hand #540 to the owner for merge/deployment decision. The database reconciliation plan is prepared but remains read-only until the owner explicitly authorizes the bounded production operation.

Do not merge or deploy on behalf of the owner. Do not mutate Supabase Auth configuration, migration history, database privileges/functions/schema or tenant data without crossing the packet's explicit authorization boundary. Do not claim production patched from branch/CI evidence alone, and do not claim production acquisition/recovery parity until the forward migration and live postconditions are verified.
