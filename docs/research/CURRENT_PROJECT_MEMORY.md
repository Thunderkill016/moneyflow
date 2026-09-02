# MoneyFlow — current project memory

**Status:** #536 is the selected active Class 3 security/runtime/auth slice. Draft PR #540 advances repository-side dependency remediation but is not merged or deployed; production remains on the pre-#540 runtime until owner merge/deployment.
**Last reconciled:** 2026-09-02
**Merged main baseline:** `425af4508e547de28fb372eedbcb07ced226d522` (PR #539)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a Vietnamese personal-finance product built around one trustworthy user-owned ledger. It remains **not public-beta ready**.

Merged #432/#433 remains the master product program. PR #538 completed performance slice #527. PR #539 then selected `docs/plans/active/536-security-runtime-auth-hardening.md` as the single current executable slice on `main`.

#536 is release-blocking: patch the vulnerable Next.js runtime line, resolve or explicitly disposition exact High/Critical dependency findings, preserve auth/tenant/financial guarantees, classify current Supabase `SECURITY DEFINER` warnings against real ownership evidence, and enable leaked-password protection before public-beta acceptance only through an explicitly authorized reversible provider change.

Draft PR #540 is the current repository implementation candidate for the runtime dependency portion. It does **not** close #536, change database functions/grants, change Supabase Auth configuration, merge itself, or deploy production.

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

Merged acquisition lineage includes Direct CSV provenance/atomic approval, later-source attachment, deleted exact-source recovery, changed-observation preservation, predecessor/replacement lineage, clearing progression, Share Target persistence, explicit candidate rules and Direct CSV mapping/rule reuse through PR #464.

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
| Acquisition | batches/candidates/provenance, exact source matching, Direct CSV atomic approval, Share Target, deterministic rules |
| Review | exception-first Ready/Needs-attention grouped review from PR #522 |
| Ownership | versioned archive/export/validation/restore contract |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Performance | #527 completed with material dashboard client-cost reduction; field score 39 remains unresolved provenance |
| Public beta | blocked by active #536 security/runtime/auth hardening |

## 6. Security and delivery truth

Merged `main` at `425af450...` still pins Next.js 16.2.11 / `eslint-config-next` 16.2.12 and React / React DOM 19.2.4. Official Next.js security guidance published 2026-08-25 places Next 16.2.11 inside two Critical advisory affected ranges and patches the 16.x line at 16.3.3.

Draft PR #540 currently proposes:

- Next.js 16.3.4;
- `eslint-config-next` 16.3.4;
- React / React DOM unchanged at 19.2.4;
- `sharp` override 0.35.4;
- `browserslist` override 4.28.8.

A real GitHub-hosted Node 22.23.2 / npm 10.9.8 checkout regenerated the candidate lockfile. After the first Next/Sharp refresh, exact `npm audit --json` exposed one High Browserslist finding (`<=4.28.6`); pinning stable 4.28.8 cleared it. The restored exact candidate tree then reported 0 info / 0 low / 0 moderate / 0 high / 0 critical. This is branch evidence only: production is not patched until owner merge/deployment.

## 7. Supabase security truth

Read-only production evidence refreshed on 2026-09-02:

- MoneyFlow Supabase project is `ACTIVE_HEALTHY`.
- Current Security Advisor reports **Leaked Password Protection Disabled**.
- Current Security Advisor also reports multiple `authenticated_security_definer_function_executable` WARN findings.
- Live catalog reconciliation of the currently warned functions shows `anon` has no `EXECUTE`, `PUBLIC` has no `EXECUTE`, `authenticated` does have `EXECUTE`, owner is `postgres`, `search_path` is empty, and every warned function body references `auth.uid()`.
- Representative high-risk surfaces inspected live (`create_money_transaction`, `bulk_update_transaction_category`, `approve_inbox_candidate`, `restore_user_archive`) derive tenant identity from `auth.uid()` and constrain affected rows to it.
- `reconciliation_snapshot_for_user(p_user_id, ...)` explicitly rejects `p_user_id` when it differs from `auth.uid()` before returning tenant data.

Supabase's current lint guidance explicitly allows an authenticated `SECURITY DEFINER` function to remain intentional when it is a constrained per-user privileged operation; the fix is per function, not a bulk rewrite. The live evidence materially narrows the warning class but does **not** fully disposition every function. #536 must continue function-by-function source/test classification before any suppression or privilege change.

Leaked-password protection remains disabled. Any future Auth configuration write must record the current value and rollback, then receive explicit owner authorization. No provider write has occurred in #540.

## 8. Reconciled issue status

- #432/#433: merged master product program.
- #511/#522: merged exception-first Inbox review.
- #527/#528/#531/#538: performance slice selected, governance-recovered and completed.
- #532: closed unmerged detailed implementation/evidence predecessor for #538.
- #533/#534/#535: closed duplicate performance PRs.
- #536: selected active release-blocking Class 3 security/runtime/auth slice.
- #537: historical draft packet-preparation evidence; superseded as activation vehicle by merged #539.
- #539: merged selector for #536 at `425af450...`.
- #540: open draft dependency-remediation PR for #536; exact-head repository gates still govern readiness.
- #523: candidate bank-export compatibility slice; unselected.
- #403: historical performance provenance only.

## 9. Open pull-request memory

- PR #540 durable record: `docs/research/pr-memory/2026/Q3/PR-540.md`; dependency candidate plus read-only provider forensic, with #536 intentionally left active.
- PR #537 remains historical draft preparation evidence and is not authority.
- PR #532/#538 records remain historical #527 implementation/closure provenance rather than current executable work.

## 10. True gaps after this audit

1. Get exact-head policy/static/unit/build/browser/UI/CodeQL/secret evidence green for draft PR #540.
2. Complete function-by-function disposition of the live authenticated `SECURITY DEFINER` warnings against source, grants and tenant-boundary tests; change privileges only for evidence-backed defects.
3. Obtain explicit owner authorization before any Supabase Auth configuration write; enable and verify leaked-password protection with rollback evidence before public beta.
4. If owner merges #540, verify the patched runtime is actually deployed before describing production as patched.
5. Close/archive #536 only after repository, provider and deployment acceptance are all truthful; then set `PLAN_AUTHORITY.current` according to lifecycle policy.
6. Reconsider #523 or other product work only after #536 is dispositioned.

## 11. Next allowed action

Continue #540 exact-head verification and evidence-backed read-only Supabase classification. Repository fixes may be made on the #540 branch when gates expose defects.

Do not merge or deploy on behalf of the owner. Do not mutate Supabase Auth configuration, database privileges/functions, or tenant data without crossing the packet's explicit authorization boundary. Do not claim production patched from branch or CI evidence alone.

## 12. Superseded-status register

- Markdown Current Work Board as executable authority — superseded by manifest authority.
- Hand-written post-merge SHA projection as authority — superseded by first-parent manifest resolution.
- #523 already selected — false; it remains candidate-only.
- Owner-observed Vercel score 39 fixed by #527 — false; repository lab cost improved but field score is not reproduced.
- #536 executable before #539 merge — historical; #539 is now merged and #536 is active.
- Every authenticated `SECURITY DEFINER` advisor warning proves a vulnerability — false; each must be reconciled with source, grants and tenant tests.
- `anon` or `PUBLIC` currently has execute permission on the warned #536 function set — false in the 2026-09-02 live catalog read; the current warning is authenticated-only.
- Draft PR #540 means production is patched — false; owner merge/deployment plus provider verification are still required.
- Master #432 alone authorizes provider/security writes — false; the bounded selected packet plus the explicit owner decision is required.
