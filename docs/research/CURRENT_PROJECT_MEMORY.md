# MoneyFlow — current project memory

**Status:** #527 is closed by merged PR #538. PR #539 is the fresh-main authority transition that selects #536; this selection becomes merged-main execution truth only when #539 is owner-merged.
**Last reconciled:** 2026-09-02
**Merged main baseline:** `aa82d47f70d48e1383140d5daa06be443cb08e5b` (PR #538)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a Vietnamese personal-finance product built around one trustworthy user-owned ledger. It remains **not public-beta ready**.

Merged #432/#433 remains the master product program. PR #538 completed performance slice #527, archived its packet and left `docs/plans/PLAN_AUTHORITY.json.current` as `null` on merged `main`.

Issue #536 is now the release-blocking candidate: patch the vulnerable Next.js runtime line, triage exact High/Critical dependency findings, preserve auth/tenant/financial guarantees, evaluate current Supabase security-advisor warnings against real RPC ownership tests, and enable leaked-password protection before public-beta acceptance when the owner authorizes the provider write.

PR #539 is the separate fresh-main selector required by lifecycle policy. It carries `current: null -> #536` and adds the refreshed Class 3 packet. It does **not** change runtime dependencies, database behavior, Supabase Auth configuration, deployment or production state.

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

The generic file importer remains shallow relative to real Vietnam consumer bank exports. Exact schemas still require privacy-safe structural fixtures. #523 remains candidate-only and is not selected by #539.

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

## 5. Security and delivery truth

Fresh merged `main` still pins:

- Next.js 16.2.11;
- `eslint-config-next` 16.2.12;
- React / React DOM 19.2.4;
- Node engine `>=22 <23`.

Official Next.js security guidance published 2026-08-25 places Next 16.2.11 inside two Critical advisory affected ranges and patches the 16.x line at 16.3.3. Existing Dependabot #524 targets only 16.3.1 and is insufficient for this blocker.

Prior CI install output reported one High severity npm vulnerability without the exact advisory/path. #536 must run `npm audit --json` on the exact post-upgrade tree rather than guess or blindly use `npm audit fix --force`.

## 6. Supabase security truth

Read-only production evidence on 2026-09-02:

- MoneyFlow Supabase project is healthy.
- Earlier audit found 21/21 audited public application tables with RLS enabled and no audited anonymous application-table CRUD.
- Earlier systematic privileged-RPC review found `auth.uid()` ownership checks and empty `search_path` on the authenticated-callable privileged functions inspected; no cross-tenant P0 was reproduced.
- Current Supabase Security Advisor reports **Leaked Password Protection Disabled**.
- Current Supabase Security Advisor also reports multiple `authenticated_security_definer_function_executable` WARN findings for authenticated-callable public RPCs.

Those `SECURITY DEFINER` warnings are not automatically defects: many RPCs are intentional financial authorities. #536 must compare advisor findings to function source, grants, ownership predicates, search path, pgTAP and browser tenant tests before changing execution mode or privileges. Bulk conversion to `SECURITY INVOKER` or broad revoke operations are out of scope without evidence of a real ownership/grant defect.

Official Supabase docs expose leaked-password protection as `password_hibp_enabled`, backed by HaveIBeenPwned Pwned Passwords, and list it as available on Pro and above. A provider write remains owner-controlled and reversible; repository planning does not imply it has happened.

## 7. Current capability inventory

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
| Public beta | blocked by #536 security/runtime/auth hardening |

## 8. Reconciled issue / PR status

- #432/#433: merged master product program.
- #511/#522: merged exception-first Inbox review.
- #527/#528/#531/#538: performance slice selected, governance-recovered and completed; `current:null` on merged main after #538.
- #532: closed unmerged detailed implementation/evidence predecessor for #538.
- #533/#534/#535: closed duplicate performance PRs.
- #536: open release-blocking Class 3 security/runtime/auth issue.
- #537: draft pre-#538 packet-preparation PR; historical candidate evidence only and superseded as the activation vehicle by fresh-main #539.
- #539: fresh-main non-draft selector for #536; no runtime/provider write.
- #523: candidate bank-export compatibility slice; unselected.
- #403: historical performance provenance only.

## 9. Durable PR memory

- PR #532: detailed #527 mechanism, analyzer, Lighthouse and accessibility-regression evidence.
- PR #538: actual merged #527 closure/replacement provenance.
- PR #537: pre-#538 #536 packet-preparation provenance; not authority.
- PR #539: fresh-main #536 selection provenance; exact-head checks and owner merge required.

## 10. True gaps

1. Require exact-head policy/CodeQL/secret checks for #539 and owner review before merge.
2. After #539 merges, run fresh `npm run plan:resolve` and `npm run agent:doctor -- --json` before implementation.
3. Upgrade Next to a vetted patched 16.3.x release at least 16.3.3 and align `eslint-config-next` with minimal lockfile churn.
4. Run exact `npm audit --json` and resolve or explicitly disposition every High/Critical finding.
5. Verify auth, Server Actions, image behavior, tenant/financial contracts, build, browser and relevant performance regression evidence.
6. Triage current Supabase `SECURITY DEFINER` advisor warnings against source/grants/tests; fix only evidence-backed defects.
7. Enable and verify leaked-password protection only through an authorized reversible provider change under active #536; public-beta remains blocked if plan/tooling cannot support it safely.
8. Reconsider #523 or other product work only after #536 is dispositioned.

## 11. Next allowed action

On PR #539, only #536 authority/planning reconciliation is allowed: active packet, manifest selection, project memory and PR memory. No dependency upgrade, migration/RPC change, Supabase Auth write, deployment or public-beta claim belongs in the selector PR.

After owner merge of #539, implementation starts from fresh main under the selected #536 packet and must begin with `plan:resolve` then `agent:doctor`.

## 12. Superseded-status register

- Markdown Current Work Board as executable authority — superseded by manifest authority.
- Hand-written post-merge SHA projection as authority — superseded by first-parent manifest resolution.
- #523 already selected — false; it remains candidate-only.
- Owner-observed Vercel score 39 fixed by #527 — false; repository lab cost improved but field score is not reproduced.
- #536 executable before #539 merge — false; selection requires the fresh-main owner-merged authority PR.
- Every authenticated `SECURITY DEFINER` advisor warning proves a vulnerability — false; each must be reconciled with source, grants and tenant tests.
- Master #432 alone authorizes provider/security writes — false; the bounded selected packet plus owner decision is required.
