# MoneyFlow — current project memory

**Status:** #536 is the selected active Class 3 security/runtime/auth slice. Draft PR #540 advances repository-side dependency remediation and fixes a browser regression exposed by that patch, but is not merged or deployed; production remains on the pre-#540 runtime until owner merge/deployment.
**Last reconciled:** 2026-09-02
**Merged main baseline:** `425af4508e547de28fb372eedbcb07ced226d522` (PR #539)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a Vietnamese personal-finance product built around one trustworthy user-owned ledger. It remains **not public-beta ready**.

Merged #432/#433 remains the master product program. PR #538 completed performance slice #527. PR #539 then selected `docs/plans/active/536-security-runtime-auth-hardening.md` as the single current executable slice on `main`.

#536 is release-blocking: patch the vulnerable Next.js runtime line, resolve or explicitly disposition exact dependency findings, preserve auth/tenant/financial guarantees, classify current Supabase `SECURITY DEFINER` warnings against real ownership evidence, and enable leaked-password protection before public-beta acceptance only through an explicitly authorized reversible provider change.

Draft PR #540 is the current repository implementation candidate. It does **not** close #536, change database functions/grants, change Supabase Auth configuration, merge itself, or deploy production.

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

- Next.js 16.3.4 and `eslint-config-next` 16.3.4;
- React / React DOM unchanged at 19.2.4;
- `sharp` override 0.35.4;
- `browserslist` override 4.28.8;
- `qs` override 6.16.0;
- permanent dependency guards for patched floors.

A real GitHub-hosted Node 22.23.2 / npm 10.9.8 checkout regenerated the candidate lockfile. The first Next/Sharp refresh exposed one High Browserslist finding; pinning 4.28.8 cleared it and the audit was zero at that time. A later fresh audit on 2026-09-02 then surfaced newly published Moderate `qs` findings at 6.15.3 (GHSA-x5fp-wj9c-mxmx and GHSA-4mjr-xmp4-gh2g). Both existing parent ranges accepted 6.16.0, so #540 pins that patched release. After regenerating the lock again, exact `npm ci` and `npm audit --audit-level=low` completed successfully. This remains branch evidence only: production is not patched until owner merge/deployment.

The patched runtime also exposed a Share Target browser regression: the first full browser smoke passed 134/136 cases, with only desktop/mobile variants of the same `/capture/share` flow stuck on the loading state. Root cause was a one-shot ref consumed before `requestAnimationFrame`, while React development Strict Mode can run effect setup -> cleanup -> setup and the cleanup cancelled the first frame. #540 now consumes the ref only when the frame actually starts; the exact previously failing shared-candidate Playwright case passed after the fix without weakening assertions.

## 7. Supabase security truth

Read-only production evidence refreshed on 2026-09-02:

- MoneyFlow Supabase project is `ACTIVE_HEALTHY`.
- Current Security Advisor reports **Leaked Password Protection Disabled**.
- Current Security Advisor also reports multiple `authenticated_security_definer_function_executable` WARN findings.
- Live catalog reconciliation of the currently warned functions shows `anon` has no `EXECUTE`, `PUBLIC` has no `EXECUTE`, `authenticated` does have `EXECUTE`, owner is `postgres`, `search_path` is empty, and every warned function body references `auth.uid()`.
- Representative high-risk surfaces inspected live (`create_money_transaction`, `bulk_update_transaction_category`, `approve_inbox_candidate`, `restore_user_archive`) derive tenant identity from `auth.uid()` and constrain affected rows to it.
- `reconciliation_snapshot_for_user(p_user_id, ...)` explicitly rejects `p_user_id` when it differs from `auth.uid()` before returning tenant data.
- Repository `cross_tenant_rpc.test.sql` and `browser_role_privileges.test.sql` provide cross-tenant RPC and browser-role regression coverage.

Supabase's current lint guidance allows an authenticated `SECURITY DEFINER` function to remain intentional when it is a constrained per-user privileged operation; remediation is per function, not a bulk rewrite. The live evidence materially narrows the warning class but does **not** fully disposition every function. #536 must continue function-by-function source/test classification before any suppression or privilege change.

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
- #540: open draft repository remediation PR for #536; final exact-head repository/browser/UI/security gates still govern readiness.
- #523: candidate bank-export compatibility slice; unselected.
- #403: historical performance provenance only.

## 9. Open pull-request memory

- PR #540 durable record: `docs/research/pr-memory/2026/Q3/PR-540.md`; dependency candidate, Share Target regression repair and read-only provider forensic, with #536 intentionally left active.
- PR #537 remains historical draft preparation evidence and is not authority.
- PR #532/#538 records remain historical #527 implementation/closure provenance rather than current executable work.

## 10. True gaps after this audit

1. Get final exact-head policy/static/unit/build/browser/UI/CodeQL/secret evidence green for draft PR #540.
2. Complete function-by-function disposition of the live authenticated `SECURITY DEFINER` warnings against source, grants and tenant-boundary tests; change privileges only for evidence-backed defects.
3. Obtain explicit owner authorization before any Supabase Auth configuration write; enable and verify leaked-password protection with rollback evidence before public beta.
4. If owner merges #540, verify the patched runtime is actually deployed before describing production as patched.
5. Close/archive #536 only after repository, provider and deployment acceptance are all truthful; then set `PLAN_AUTHORITY.current` according to lifecycle policy.
6. Reconsider #523 or other product work only after #536 is dispositioned.

## 11. Next allowed action

Finish #540 exact-head verification and evidence-backed read-only Supabase classification. Repository fixes may be made on the #540 branch when gates expose defects.

Do not merge or deploy on behalf of the owner. Do not mutate Supabase Auth configuration, database privileges/functions, or tenant data without crossing the packet's explicit authorization boundary. Do not claim production patched from branch or CI evidence alone.

## 12. Superseded-status register

- Markdown Current Work Board as executable authority — superseded by manifest authority.
- Hand-written post-merge SHA projection as authority — superseded by first-parent manifest resolution.
- #523 already selected — false; it remains candidate-only.
- Owner-observed Vercel score 39 fixed by #527 — false; repository lab cost improved but field score is not reproduced.
- #536 executable before #539 merge — historical; #539 is now merged and #536 is active.
- Every authenticated `SECURITY DEFINER` advisor warning proves a vulnerability — false; each must be reconciled with source, grants and tenant tests.
- `anon` or `PUBLIC` currently has execute permission on the warned #536 function set — false in the 2026-09-02 live catalog read; the current warning is authenticated-only.
- An earlier zero-audit result means the dependency tree cannot acquire a new advisory later — false; fresh audit caught the new `qs` disclosure and #540 remediated it.
- Draft PR #540 means production is patched — false; owner merge/deployment plus provider verification are still required.
- Master #432 alone authorizes provider/security writes — false; the bounded selected packet plus the explicit owner decision is required.
