# MoneyFlow — current project memory

**Status:** #570 production Supabase reconciliation is production-verified. The four canonical September migrations were applied exactly once by owner-authorized GitHub Actions run `34545907924`; bounded S3/S4 hosted verification passed. The closeout branch removes the temporary runner and projects `PLAN_AUTHORITY.current` to `null`, pending owner merge.
**Last reconciled:** 2026-09-11
**Application production baseline:** Vercel production deployment for `main@c3be075abc67ec2169c0c6fc4a99d5c10bdc5b9d` is `READY`; recent runtime-error inspection found no runtime error cluster in the checked window.
**Hosted database baseline:** Supabase PostgreSQL 17.6; all four #570 target migrations are present exactly once and post-rollout catalog/security checks match the selected model.
**Master program:** `docs/plans/active/432-vietnam-long-term-product-strategy.md`.
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named PR provenance.

## 1. Current decision

MoneyFlow remains centered on one trustworthy user-owned ledger and progressively lower maintenance effort. Financial truth, ownership and recoverability outrank novelty.

#570 has completed its production operation. No further production migration apply belongs to this slice. The remaining repository action is lifecycle closeout only: remove the temporary production runner, archive the #570 packet, reconcile memory, and return executable authority to `null`. That projection becomes canonical only if the owner merges the closeout PR after exact-head checks.

Provider/Auth/WAF/UI work remains outside #570. Runtime UI redesign remains separate.

## 2. Financial and ownership truth

- VND is integer đồng.
- Transfers are equal/opposite and neutral to income/expense/net.
- Authenticated data is tenant-isolated by database policy; demo truth is separate browser-local state.
- Source/provider observations are evidence and never silently overwrite ledger facts.
- Corrections remain explicit and auditable.
- Completed reconciliation snapshots are historical facts.
- Sensitive financial mutations remain invariant-preserving and ownership-enforced.

## 3. Acquisition and reconciliation truth

MON-62 established versioned source adapters, strict source identity/date/amount evidence, non-truncating persistence and provenance.

MON-63 atomic preview→Inbox commit and bounded maintenance measurement are now durable production capabilities. Production S3 verification proved first commit, exact replay without duplication, changed-intent fail-closed behavior, cross-tenant denial, no ledger mutation by the staging commit, bounded measurement counters and mapping evidence. The smoke used synthetic identities inside a transaction and rolled back with zero residual synthetic users/batches/candidates.

Exception-first Inbox review remains implemented. Ready classification never auto-posts. Reconciliation remains statement-oriented and account-leg based; production S4 verification proved owner snapshot access under SECURITY INVOKER, cross-tenant denial, start/clear/complete/reopen behavior and historical completed-snapshot stability. That smoke also rolled back with zero residual synthetic users/transactions/reconciliations.

## 4. #567 production truth

PR #571's selected security changes are now live in hosted Supabase through #570:

- postgres global future-function defaults no longer automatically grant EXECUTE to PUBLIC/anon/authenticated;
- `reconciliation_snapshot_for_user(uuid,uuid,date)` is `STABLE` + `SECURITY INVOKER`, authenticated executable and denied to anon/PUBLIC;
- authenticated-callable SECURITY DEFINER Advisor/catalog count moved from the expected 43 to **42**;
- reconciliation owner/cross-tenant/lifecycle/history behavior passed production S4 verification;
- no direct browser write privilege was found on the sensitive financial/reconciliation tables checked by #570.

The separate leaked-password-protection Advisor warning remains #174/provider-control scope. #570 intentionally did not broaden into that provider setting.

## 5. Current capability inventory

| Capability | Current truth |
| --- | --- |
| Core ledger | accounts; income/expense; balanced transfers; edit; recoverable deletion |
| Reconciliation | statement/account-leg lifecycle, historical completed snapshots, production-verified invoker snapshot helper |
| Acquisition | generic CSV/XLSX/PDF, Direct CSV, Share Target, provenance-safe adapters |
| Import integrity | replay-safe atomic preview→Inbox commit is production-live and S3-verified |
| Maintenance evidence | bounded batch attempt/replay/mapping evidence is production-live and S3-verified; broader maintenance KPI semantics remain THU-44 work |
| Review/rules | deterministic Ready/Needs-attention; explicit approval; tenant-owned rules |
| Auth | authenticated/Supabase-RLS mode plus explicit demo-local mode |
| Privileged RPCs | hosted Advisor/catalog now reports the expected 42 authenticated SECURITY DEFINER endpoints after #567 |
| Production migration executor | temporary #570 runner has served its one bounded rollout and is removed by the closeout projection |
| Executable authority | closeout branch projects `PLAN_AUTHORITY.current` to `null`; merged main remains #570 until owner merge |

## 6. #570 production reconciliation truth

Owner-merged PR #572 selected #570. Owner-merged PR #573 introduced the temporary fail-closed executor. Before apply, the merged runner proved protected-main authority, four frozen canonical Git blobs, intended production-project fingerprint, no remote-only migration drift, exactly four local-only pending versions and an exact dry-run.

After explicit owner confirmation `APPLY-570-FOUR-MIGRATIONS`, Actions run `34545907924` applied exactly:

1. `20260909090000_import_batch_atomic_commit.sql`;
2. `20260909120000_import_batch_measurement.sql`;
3. `20260910181500_function_default_acl_hardening.sql`;
4. `20260910182000_reconciliation_snapshot_security_invoker.sql`.

The run completed successfully and its post-apply migration list converged. Independent hosted verification found every version exactly once. No retry, migration repair, manual history insert, remote reset, seed, direct replacement migration or MCP-generated timestamp was used.

Post-rollout catalog checks found RLS still enabled on affected import tables, target invoker/authenticated-only RPCs live, expected measurement columns live, zero blocked locks, no non-idle transaction older than 30 seconds at verification, and no direct browser write grant on the sensitive financial/reconciliation table set checked.

## 7. Production behavioral verification

### S3 import/measurement

A rollback-isolated synthetic production smoke passed first commit, exact idempotent replay, changed-intent rejection, cross-tenant rejection, no ledger-transaction creation, bounded attempt/replay counters, allowlisted mapping evidence and cross-tenant measurement rejection. Residual synthetic row counts were zero after rollback.

### S4 reconciliation/security

A rollback-isolated synthetic production smoke passed owner snapshot access, cross-tenant snapshot and entry-mutation denial, start→clear→complete, later completion/reopen, and earlier historical snapshot stability. Residual synthetic row counts were zero after rollback.

### Security and app health

Supabase Security Advisor reports the expected 42 authenticated-callable SECURITY DEFINER functions after the one reviewed invoker reduction. Vercel reports the exact-main production deployment `READY`, with no runtime error cluster in the checked recent production window.

## 8. Reconciled issue status

- #432/#433: merged master Vietnam long-term product program.
- MON-62 / PR #552: completed and production-verified.
- MON-63 / PRs #553–#556: repository implementation complete; #570 has now made atomic commit and bounded batch measurement durable production truth.
- #511 / PR #522: completed.
- #557 / PR #561: completed.
- #559 / PRs #562–#566: design foundation completed; runtime UI deferred.
- #567 / PR #571: implementation merged and now production-verified by #570 S4.
- #570 / PRs #572–#573: production rollout and behavioral verification complete; lifecycle closeout PR pending owner merge.
- #569: open lifecycle/project-memory hardening lane; not selected by the closeout projection.
- #174: open provider-control lane; separate from #570.

## 9. Open pull-request memory

### PR #574 — #570 production reconciliation lifecycle closeout

The #570 temporary workflow was intentionally single-purpose. Once production history converged and S3/S4 passed, retaining that production apply surface would add operational risk without value. PR #574 removes `.github/workflows/production-supabase-migrations.yml`, moves the #570 packet to `docs/plans/completed/2026-09-11-570-production-migration-reconciliation.md`, reconciles this memory and sets `PLAN_AUTHORITY.current` to `null`.

PR #574 performs no DDL and no production write. Its lifecycle impact is `completes current slice`; merge remains an explicit owner action.

## 10. True gaps after this audit

1. THU-44 still owns broader privacy-safe maintenance-effort semantics such as interventions/100 observed transactions, maintenance time, Ready vs Needs-attention, duplicate/correction rate, reconciliation completion and source coverage; #570 only makes the bounded batch measurement substrate durable.
2. Exact Vietnamese bank export identity/layout evidence remains incomplete for bank-specific automation.
3. #174 provider-console controls, including leaked-password-protection configuration, remain a separate unresolved lane.
4. #569 may further harden lifecycle tooling so repository completion claims cannot outrun required hosted evidence.
5. Runtime UI redesign remains deferred under its own future authority.

## 11. Next allowed action

Run exact-head CI/knowledge/security validation on the #570 closeout PR. The PR should contain only lifecycle/evidence changes and temporary-runner removal. Do not merge automatically.

If required checks are green and independent review finds no contradiction, hand the closeout PR to the owner. Owner merge would make `PLAN_AUTHORITY.current = null` canonical and permit GitHub #570 / THU-53 closure.

After that merge, select future executable work through the normal authority process; do not reuse the removed #570 runner or issue apply command.

## 12. Superseded-status register

- Hosted Supabase is still four migrations behind repo — **false**; all four #570 versions are live exactly once.
- #567 security changes are repository-only — **false**; #570 S4 and Advisor/catalog now production-verify them.
- MON-63 atomic commit/measurement schema is not production-live — **false**; #570 S3 verifies it live.
- The #570 production runner should remain permanent infrastructure — **false**; it was explicitly temporary and is removed by lifecycle closeout.
- Merge of the closeout PR would perform production DDL — **false**; production rollout already completed in Actions run `34545907924`.
- `PLAN_AUTHORITY.current` is already null on merged main — **false until owner merge of the closeout PR**; only the closeout branch projects null.
- #570 may broaden into #174 provider/Auth work or THU-44's wider metric program — **false**.
- Plate priority or generic chat continuation overrides repository authority/merge gates — **false**.
