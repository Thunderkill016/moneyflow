# MoneyFlow — current project memory

**Status:** current implementation/trust snapshot; this branch carries the #529 governance recovery candidate in PR #531 until merge
**Last reconciled:** 2026-09-02
**Merged main baseline:** `dea07378fe00030c3fee1a3f4be52831ece959f0` (PR #528)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a Vietnamese personal-finance product built around one trustworthy user-owned ledger. It is functional but **not public-beta ready**.

Merged #432/#433 remains the master product program. PR #528 selected #527 production-load performance ahead of candidate #523. The merge exposed duplicated plan authority: main CI #3162 failed because the old Markdown Current Work Board still carried a pre-merge SHA baseline.

Issue #529 removes that duplicate model. Draft PR #530 reached exact-head green but could not be marked ready because the connected GitHub mutation is broken upstream; GitHub correctly refused to merge a Draft PR. #530 was closed unmerged and replaced by non-draft PR #531. After #531 merges, `docs/plans/PLAN_AUTHORITY.json` is the single executable selector: master #432 + current #527.

## 2. Current runtime and financial truth

- VND is integer đồng; never floating point.
- Transfers are balanced and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories or financial intent are never guessed.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence.
- Full archive/restore is separate from scoped/report export.

## 3. Acquisition and reconciliation truth

Merged acquisition lineage includes Direct CSV provenance/atomic approval, later-source attachment, deleted exact-source recovery, changed-observation preservation, predecessor/replacement lineage, clearing progression, Share Target persistence, explicit candidate rules and Direct CSV mapping/rule reuse through PR #464.

The generic file importer remains shallow relative to real Vietnam consumer bank exports. Exact schemas still require privacy-safe structural fixtures. #523 remains candidate-only while #527 is current.

## 4. Current execution state

Owner observed a Vercel performance/load score of **39** on 2026-09-02. Fresh production reconnaissance found:

- anonymous `/` is prerendered and served as Vercel cache HIT;
- public anonymous routing skips Supabase auth without an auth cookie;
- `/dashboard` remains the first authenticated route to benchmark;
- historical #403 evidence attributes the main repository-controlled cost to client JS/main-thread work rather than server response;
- current `MoneyFlowDashboard` and `AppShell` are broad client roots, but a naive Server Component rewrite would risk stale optimistic financial UI;
- landing currently marks the first below-fold story image as priority, causing an eager preload;
- AppShell always renders closed MoreSheet internals; dashboard dynamic capture dialogs are also mounted even when closed.

Official Next guidance supports lazy-loading below-fold images and conditionally rendering dynamically imported modal/client UI so its JavaScript is requested only when needed. These are the first bounded #527 mechanisms after authority recovery.

No runtime performance code belongs in #529/#531. After #531 merge and fresh-main authority resolution, #527 resumes immediately.

## 5. Current capability inventory

| Capability | Current merged truth |
|---|---|
| Core ledger | multiple accounts; income, expense, balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, create/edit/archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | reports, drill-downs, controlled import/export |
| Acquisition | batches/candidates/provenance, exact source matching, Direct CSV atomic approval, Share Target, deterministic rules |
| Review | exception-first Ready/Needs-attention grouped review from PR #522 |
| Ownership | versioned archive/export/validation/restore contract |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Public beta | not approved |

## 6. Performance truth

The owner-reported score 39 has **not** been independently reproduced by the repository harness yet.

Historical #403 lab evidence recorded roughly 195.8 KB script transfer on `/` and 311.6 KB on `/dashboard`, with dashboard main-thread work around 1.72–1.75 s and JS bootup around 766–814 ms. These are provenance, not current acceptance values.

#527 requires same-methodology before/after evidence: score, LCP/FCP/CLS/TBT, transfer/script bytes, main-thread/bootup, LCP attribution, analyzer output and available Vercel field evidence. A score-only improvement is insufficient.

## 7. Security and delivery truth

- `docs/configuration.md` owns environment/provider settings.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns change classes/gates.
- `docs/engineering/AGENT_OPERATING_MODEL.md` owns permission/handoff boundaries.
- `docs/plans/PLAN_AUTHORITY.json` owns executable master/current selection.
- `plan:resolve` blocks candidate/unmerged current selection.
- Current selection activation is proven by the selecting PR in merged manifest first-parent history.
- Completing current work must set manifest `current` to `null`, archive the packet and update this memory in the same PR; it cannot preselect follow-on work.
- Code, migrations and tests outrank prose.

## 8. Reconciled issue status

- #432/#433: merged master acquisition-first program.
- #511/#522: merged exception-first Inbox review; safety improvement, not manual-entry reduction.
- #527/#528: performance slice selected; activation recovery is #529/#531.
- #529 / PR #531: governance recovery; replacement for closed unmerged draft #530.
- #523: candidate bank-export compatibility evidence slice; not current while #527 executes.
- #403: historical performance measurement provenance only.
- #426: further simplification held to avoid overlap with #527.

## 9. Open pull-request memory

PR #531 durable record: `docs/research/pr-memory/2026/Q3/PR-531.md`.

Its lifecycle impact is an **authority transition/recovery**, not completion of #527. PR #530 remains historical evidence of the connector draft-state failure and its green predecessor head; it does not merge or activate authority.

## 10. True gaps after this audit

1. Merge exact-head-green PR #531 and verify fresh-main authority resolves #527 active.
2. Establish current `/` and `/dashboard` baseline measurements where tooling permits; keep score 39 explicitly owner-observed until reproduced.
3. Implement the smallest proven critical-path reductions: remove below-fold image preload; defer closed MoreSheet; defer closed capture-dialog chunks.
4. Re-measure same methodology and separate synthetic gains from Vercel field evidence.
5. Only if those bounded changes are insufficient, split dashboard client ownership while preserving optimistic mutation correctness.
6. After #527 completes to zero-current, reconsider #523 separately.

## 11. Next allowed action

PR #531 may change only governance scripts/tests/docs required to retire the Markdown board and activate merged #528 intent safely.

After PR #531 merges:

1. fetch fresh `main` and confirm #527 active;
2. create a focused #527 runtime branch/PR;
3. establish current route/bundle evidence available in the environment;
4. remove unnecessary below-fold image priority and defer closed secondary client UI;
5. verify exact-head CI + browser/UI + preview behavior;
6. claim performance improvement only from measured before/after evidence.

## 12. Superseded-status register

- Markdown Current Work Board as executable authority — superseded by #529/#531.
- Hand-written Current main SHA / Post-merge projection activation — superseded.
- #511 materially reducing manual-entry friction or 40% grouped clicks — superseded.
- SMS as a primary acquisition bet — unsupported.
- AI as MoneyFlow positioning — unsupported; use only where safely reducing capture/reconcile friction.
- #523 already selected — false; #527 is the intended current slice after #531 authority convergence.
- Master #432 alone authorizes provider/bank/native/OCR work — false; each needs a bounded researched slice.
