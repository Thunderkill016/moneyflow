# MoneyFlow — current project memory

**Status:** #536 is the selected active Class 3 security/runtime/auth slice. Draft PR #540 advances repository-side dependency remediation and repairs a browser regression exposed by that patch, but is not merged or deployed; production remains on the pre-#540 runtime. Read-only provider reconciliation on 2026-09-03 also found production database migration/schema drift that must be resolved before #536 closure/public-beta acceptance.
**Last reconciled:** 2026-09-03
**Merged main baseline:** `425af4508e547de28fb372eedbcb07ced226d522` (PR #539)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a Vietnamese personal-finance product built around one trustworthy user-owned ledger. It remains **not public-beta ready**.

Merged #432/#433 remains the master product program. PR #538 completed performance slice #527. PR #539 then selected `docs/plans/active/536-security-runtime-auth-hardening.md` as the single current executable slice on `main`.

#536 is release-blocking: patch the vulnerable Next.js runtime line, resolve or explicitly disposition exact dependency findings, preserve auth/tenant/financial guarantees, classify current Supabase `SECURITY DEFINER` warnings against real ownership evidence, reconcile production database migration/schema state with repository contracts, and enable leaked-password protection before public-beta acceptance only through an explicitly authorized reversible provider change.

Draft PR #540 is the current repository implementation candidate. It does **not** close #536, change production database functions/grants/migration history, change Supabase Auth configuration, merge itself, or deploy production.

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

**Production database parity is currently behind that repository lineage.** Read-only reconciliation on 2026-09-03 found production migration history ending at `20260812043219`, while the repository contains 15 later migration versions from 2026-08-21 through 2026-08-25. At least seven privileged RPCs required by later authenticated acquisition/recovery flows are confirmed absent live, including Direct CSV batch/rule ingestion and source attachment/recovery/lifecycle functions. Do not describe those production capabilities as reconciled until database state is repaired and verified.

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
| Acquisition | repository supports batches/candidates/provenance, exact source matching, Direct CSV atomic approval, Share Target and deterministic rules; production DB parity for later Aug-21–25 acquisition/recovery migrations is not yet reconciled |
| Review | exception-first Ready/Needs-attention grouped review from PR #522 |
| Ownership | versioned archive/export/validation/restore contract |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Performance | #527 completed with material dashboard client-cost reduction; field score 39 remains unresolved provenance |
| Public beta | blocked by active #536 security/runtime/auth hardening plus provider/database parity acceptance |

## 6. Security and delivery truth

Merged `main` at `425af450...` still pins Next.js 16.2.11 / `eslint-config-next` 16.2.12 and React / React DOM 19.2.4. Official Next.js security guidance published 2026-08-25 places Next 16.2.11 inside two Critical advisory affected ranges and patches the 16.x line at 16.3.3.

Draft PR #540 currently proposes:

- Next.js 16.3.4 and `eslint-config-next` 16.3.4;
- React / React DOM unchanged at 19.2.4;
- `sharp` override 0.35.4;
- `browserslist` override 4.28.8;
- `qs` override 6.16.0;
- permanent dependency guards for patched floors.

A real GitHub-hosted Node 22.23.2 / npm 10.9.8 checkout regenerated the candidate lockfile. The first Next/Sharp refresh exposed one High Browserslist finding; pinning 4.28.8 cleared it and the audit was zero at that time. A later fresh audit on 2026-09-02 then surfaced newly published Moderate `qs` findings at 6.15.3 (GHSA-x5fp-wj9c-mxmx and GHSA-4mjr-xmp4-gh2g). Both existing parent ranges accepted 6.16.0, so #540 pins that patched release. After regenerating the lock again, exact `npm ci` and `npm audit --audit-level=low` completed successfully. This remains branch evidence only: production is not patched until owner merge/deployment.

The patched runtime also exposed a Share Target browser regression: the first full browser smoke passed 134/136 cases, with only desktop/mobile variants of the same `/capture/share` flow stuck on the loading state. Root cause was a one-shot ref consumed before `requestAnimationFrame`, while React development Strict Mode can run effect setup -> cleanup -> setup and cleanup cancelled the first frame. The first repair moved the one-shot into the RAF callback, but independent review found that removing RAF cleanup allowed abandoned work after unmount/navigation. Commit `91a93c3e80474f37f52f90405a91190d36b093e4` restores cleanup symmetry: cleanup cancels the frame, while `ranRef` is consumed only inside a frame that actually executes. Existing Share Playwright assertions remain intact.

The code-only `91a93c3...` head passed policy/static/unit/build/browser ownership, CodeQL and Gitleaks; its cross-device UI audit was still running when memory reconciliation began. Any later memory/docs commit requires fresh exact-head CI and must not reuse that earlier head as final merge evidence.

## 7. Supabase security and production-schema truth

Read-only production evidence refreshed on 2026-09-03:

- MoneyFlow Supabase project is `ACTIVE_HEALTHY`.
- Current Security Advisor reports **Leaked Password Protection Disabled**.
- Current Security Advisor also reports `authenticated_security_definer_function_executable` WARN findings.
- Live catalog reconciliation of the 36 authenticated-callable SECURITY DEFINER functions currently present shows `anon` has no `EXECUTE`, `PUBLIC` has no `EXECUTE`, `authenticated` does have `EXECUTE`, owner is `postgres`, `search_path` is empty, and every body references `auth.uid()`.
- Representative high-risk surfaces inspected live (`create_money_transaction`, `bulk_update_transaction_category`, `approve_inbox_candidate`, `restore_user_archive`) derive tenant identity from `auth.uid()` and constrain affected rows to it.
- `reconciliation_snapshot_for_user(p_user_id, ...)` explicitly rejects `p_user_id` when it differs from `auth.uid()` before returning tenant data.
- Repository `cross_tenant_rpc.test.sql` and `browser_role_privileges.test.sql` provide cross-tenant RPC and browser-role regression coverage.

Supabase's current lint guidance allows an authenticated `SECURITY DEFINER` function to remain intentional when it is a constrained per-user privileged operation; remediation is per function, not a bulk rewrite. The live evidence materially narrows the warning class but does **not** fully disposition every function. #536 must continue function-by-function source/test classification before any suppression or privilege change.

### Production migration/schema parity

Production migration history currently ends at `20260812043219_remove_atoryn_from_moneyflow_project`. The repository contains 15 later migration versions from `20260821014500_direct_csv_batch_atomic_approval` through `20260825090000_direct_csv_rule_atomic_ingestion`.

Migration-history absence does not by itself prove all 15 schema changes are absent because manual changes or history drift are possible. Concrete live probes do prove seven later privileged RPCs are absent:

1. `approve_inbox_candidates_batch(uuid,jsonb)`
2. `attach_inbox_candidate_to_existing_transaction(uuid,uuid)`
3. `restore_deleted_imported_transaction_from_candidate(uuid,uuid)`
4. `record_changed_source_observation_from_candidate(uuid,uuid)`
5. `record_source_replacement_observation_from_candidate(uuid,uuid)`
6. `review_source_lifecycle_observation_from_candidate(uuid,uuid)`
7. `prepare_direct_csv_candidates_with_rules(jsonb,jsonb)`

The repository SECURITY DEFINER contract expects 43 privileged routines after the later acquisition migrations; live production currently exposes 36 in the corresponding authenticated-callable class. Authenticated Direct CSV source code calls both `prepare_direct_csv_candidates_with_rules` and `approve_inbox_candidates_batch`; source-lineage actions call several of the other absent routines. Vercel production is READY on `main@425af450...`, so code containing these calls is already deployed. Seven-day runtime telemetry contains no matching error cluster, but low traffic is not evidence that the schema contract is satisfied.

This drift predates #540. Do **not** delay the known Critical Next runtime patch merely to bundle an unrelated database write into the same PR. Instead, treat production migration/schema parity as a separate required #536 acceptance item: reconcile local/remote migration state read-only, determine which later effects truly exist, then apply or repair migration state only through an explicit owner-authorized database operation with rollback and post-write tests. Do not blindly `supabase db push` or `migration repair`.

Leaked-password protection remains disabled. The MoneyFlow Supabase organization currently reports plan `free`, while Supabase documents leaked-password protection as Pro and above. Any future plan/Auth configuration write must record current value and rollback, then receive explicit owner authorization. No provider/database write has occurred in #540.

## 8. Reconciled issue status

- #432/#433: merged master product program.
- #511/#522: merged exception-first Inbox review.
- #527/#528/#531/#538: performance slice selected, governance-recovered and completed.
- #532: closed unmerged detailed implementation/evidence predecessor for #538.
- #533/#534/#535: closed duplicate performance PRs.
- #536: selected active release-blocking Class 3 security/runtime/auth slice; now also owns truthful provider/database parity acceptance discovered during its read-only forensic.
- #537: historical draft packet-preparation evidence; superseded as activation vehicle by merged #539.
- #539: merged selector for #536 at `425af450...`.
- #540: open draft repository remediation PR for #536; final exact-head repository/browser/UI/security gates still govern readiness; it performs no production database/provider write.
- #523: candidate bank-export compatibility slice; unselected.
- #403: historical performance provenance only.

## 9. Open pull-request memory

- PR #540 durable record: `docs/research/pr-memory/2026/Q3/PR-540.md`; dependency candidate, Share Target regression repair, read-only provider forensic and production schema-parity discovery, with #536 intentionally left active.
- PR #537 remains historical draft preparation evidence and is not authority.
- PR #532/#538 records remain historical #527 implementation/closure provenance rather than current executable work.

## 10. True gaps after this audit

1. Get final exact-head policy/static/unit/build/browser/UI/CodeQL/secret evidence green for draft PR #540 after all memory reconciliation commits.
2. Owner-merge/deploy the patched runtime only after #540 exact-head evidence is green, then verify production actually runs the patched tree before describing production as patched.
3. Complete function-by-function disposition of the live authenticated `SECURITY DEFINER` warnings against source, grants and tenant-boundary tests; change privileges only for evidence-backed defects.
4. Reconcile production migration history/schema with the 15 later repository migrations; prove the actual state of later acquisition/recovery contracts, then perform any required database/history write only with explicit owner authorization, rollback and post-write tenant/browser/pgTAP evidence.
5. Obtain explicit owner authorization before any Supabase plan/Auth configuration write; enable and verify leaked-password protection when plan eligibility exists, or record the plan limitation as a hard public-beta blocker.
6. Close/archive #536 only after repository, deployment, database and provider acceptance are all truthful; then set `PLAN_AUTHORITY.current` according to lifecycle policy.
7. Reconsider #523 or other product work only after #536 is dispositioned.

## 11. Next allowed action

Finish #540 exact-head verification after memory reconciliation and continue evidence-backed **read-only** production migration/schema classification. Repository fixes may be made on the #540 branch when gates expose defects.

Do not merge or deploy on behalf of the owner. Do not mutate Supabase Auth configuration, migration history, database privileges/functions/schema or tenant data without crossing the packet's explicit authorization boundary. Do not claim production patched from branch or CI evidence alone, and do not claim production acquisition/recovery parity from repository migrations alone.

## 12. Superseded-status register

- Markdown Current Work Board as executable authority — superseded by manifest authority.
- Hand-written post-merge SHA projection as authority — superseded by first-parent manifest resolution.
- #523 already selected — false; it remains candidate-only.
- Owner-observed Vercel score 39 fixed by #527 — false; repository lab cost improved but field score is not reproduced.
- #536 executable before #539 merge — historical; #539 is now merged and #536 is active.
- Every authenticated `SECURITY DEFINER` advisor warning proves a vulnerability — false; each must be reconciled with source, grants and tenant tests.
- `anon` or `PUBLIC` currently has execute permission on the live warned #536 function set — false in the 2026-09-03 live catalog read; the current warning class is authenticated-only.
- Repository acquisition lineage proves production database parity — false; production migration history ends at 20260812043219 and at least seven later privileged RPCs are absent live.
- Missing migration-history rows alone prove every later migration effect is absent — false; actual schema must be reconciled before any `db push` or history repair.
- An earlier zero-audit result means the dependency tree cannot acquire a new advisory later — false; fresh audit caught the new `qs` disclosure and #540 remediated it.
- Draft PR #540 means production is patched — false; owner merge/deployment plus production verification are still required.
- Production schema drift discovered during #540 means the Critical Next patch should wait for a bundled DB fix — false; the drift predates #540 and blocks #536 closure/public-beta acceptance, while the vulnerable runtime should be patched as soon as #540 exact-head evidence is acceptable.
- Master #432 alone authorizes provider/security writes — false; the bounded selected packet plus the explicit owner decision is required.
