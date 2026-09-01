# MoneyFlow — current project memory

**Status:** current implementation/trust snapshot; this branch carries the #529 governance recovery candidate until owner merge
**Last reconciled:** 2026-09-02
**Merged main baseline:** `dea07378fe00030c3fee1a3f4be52831ece959f0` (PR #528)
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs.

## 1. Current decision

MoneyFlow is a Vietnamese personal-finance product built around one trustworthy user-owned ledger. It is functional but **not public-beta ready**.

Merged #432/#433 remains the master product program. A digital transaction MoneyFlow can acquire safely should not require permanent retyping. Manual capture remains first-class for cash, corrections and missing/off-system events.

PR #528 was owner-merged to select #527 production-load performance ahead of candidate #523. The merge exposed a governance defect: main CI #3162 failed because the old Markdown Current Work Board still duplicated a pre-merge SHA baseline. Issue #529 removes that duplicated authority model.

After #529 merges, `docs/plans/PLAN_AUTHORITY.json` is the single executable plan selector: master #432 and current #527. GitHub Issues/PRs hold human backlog/status. The retired `docs/plans/active/README.md` is a compatibility pointer only.

## 2. Current runtime and financial truth

- VND is stored as integer đồng; never floating point.
- Transfers are balanced movements and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories or financial intent are never guessed.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence; source observations never establish `reconciled` by themselves.
- Full archive/restore is separate from scoped/report export.

## 3. Acquisition and reconciliation truth

Merged acquisition lineage includes Direct CSV provenance/atomic approval, later-source attachment, deleted exact-source recovery, changed observation preservation, predecessor/replacement lineage, clearing progression, PWA Share Target persistence, explicit candidate rules and Direct CSV mapping/rule reuse through PR #464.

The generic file-import implementation remains shallow relative to real Vietnam consumer bank exports. Exact exported schemas still require privacy-safe structural fixtures before bank-specific adapters are authorized.

Issue #523 remains a candidate only while #527 is current.

## 4. Current execution state

Merged PR #528 selected **#527 — recover production page-load performance**. Owner observed a Vercel performance/load score of 39 on 2026-09-02.

Fresh production reconnaissance before #529 found:

- anonymous `/` is prerendered and served as a Vercel cache HIT;
- anonymous public routing skips Supabase auth when no auth cookie exists;
- `/dashboard` is dynamic/cache MISS and is the first route to benchmark;
- historical #403 evidence measured client JS/main-thread cost as the dominant repository-controlled performance burden;
- current `MoneyFlowDashboard` and `AppShell` are broad client roots, but mutation freshness means a naive full Server Component rewrite would risk stale financial UI.

No runtime performance change is authorized inside #529. #529 repairs plan authority only. After that owner merge, #527 resumes from fresh main with measurement-first attribution.

## 5. Current capability inventory

| Capability | Current merged truth |
|---|---|
| Core ledger | multiple accounts; income, expense, balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, create/edit/archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | weekly/monthly/yearly reports, drill-downs, controlled import/export |
| Acquisition | persisted batches/candidates/provenance, exact source matching, Direct CSV atomic approval, Share Target persistence, deterministic candidate rules |
| Review | exception-first Ready/Needs-attention grouped review from PR #522; explicit confirmation; fail-closed exceptions |
| Ownership | versioned archive/export/validation/restore contract |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Public beta | not approved |

## 6. Performance truth

The owner's Vercel score 39 is field observation, not yet independently reproduced by the repository harness.

Historical #403 lab evidence recorded roughly 195.8 KB script transfer on `/` and 311.6 KB on `/dashboard`, with dashboard main-thread work around 1.72–1.75 s and JS bootup around 766–814 ms. Those values are provenance, not current acceptance numbers.

#527 requires same-methodology current-main before/after evidence: Lighthouse score, LCP/FCP/CLS/TBT, transfer/script bytes, main-thread/bootup, LCP attribution, analyzer output and available Vercel field evidence. A score-only improvement is insufficient.

## 7. Security and delivery truth

- `docs/configuration.md` owns environment/provider settings; provider values never belong in source.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns change classes/gates.
- `docs/engineering/AGENT_OPERATING_MODEL.md` owns permission/handoff boundaries.
- `docs/plans/PLAN_AUTHORITY.json` owns executable master/current plan selection.
- `plan:resolve` blocks candidate/unmerged authority.
- Completing current work must set manifest `current` to `null`, archive the packet and update this memory in the same PR; it cannot preselect follow-on work.
- Code, migrations and tests outrank prose.

## 8. Reconciled issue status

- #432/#433: merged master acquisition-first program.
- #511/#522: merged exception-first Inbox grouped review; safety/review improvement only, not manual-entry reduction.
- #527/#528: performance slice selected by merged planning PR #528.
- #529: governance recovery; retires Markdown board authority after main CI #3162 exposed the duplicate-state bug.
- #523: candidate bank-export compatibility evidence slice; not current while #527 executes.
- #403: historical performance measurement/attribution provenance; not current authority.
- #426: further simplification work held and must not overlap current #527.
- Release/provider/legal issues remain independent owner/provider/legal boundaries.

## 9. Open pull-request memory

#529 recovery will create one bounded record under `docs/research/pr-memory/2026/Q3/PR-<number>.md` after its PR number exists.

Its intended lifecycle impact is an **authority transition/recovery**, not completion of #527. It changes governance truth from duplicated board+manifest state to manifest-only current selection and keeps #527 current.

No runtime performance claim is produced by #529.

## 10. True gaps after this audit

1. Restore green main plan-authority/knowledge checks through #529 without reintroducing duplicated state.
2. From post-#529 fresh main, run `plan:resolve` and `agent:doctor -- --json` and record current #527 baseline measurements.
3. Attribute current `/dashboard` critical-path JS/main-thread cost before selecting any implementation mechanism.
4. Apply proven Next/Vercel patterns only where analyzer/Lighthouse evidence shows a material critical-path contribution.
5. Re-measure same methodology and separate synthetic gains from Vercel field evidence.
6. After #527 is completed and current authority returns to zero, separately reconsider #523 from fresh main.
7. Release/provider/legal gaps remain separate from performance/product work.

## 11. Next allowed action

#529 may change only governance scripts/tests/docs required to retire the Markdown board as executable authority and activate merged #528 intent safely.

After owner merges #529:

1. fetch fresh `main`;
2. run `npm run plan:resolve` and confirm master #432 + current #527 are active;
3. run `npm run agent:doctor -- --json`;
4. create the focused #527 implementation branch/PR;
5. establish current `/` and `/dashboard` analyzer + Lighthouse baseline before runtime edits;
6. implement only the smallest measured performance mechanism.

## 12. Superseded-status register

- “The Markdown Current Work Board is executable plan authority” — superseded by #529; manifest-only authority is the target.
- “Every merge must maintain a hand-written Current main baseline SHA in Markdown” — superseded; this caused main CI #3162.
- “Post-merge projection markers are required to activate current work” — superseded; merged `introducedByPr` history activates manifest authority.
- “#511 materially reduces manual-entry friction” — superseded.
- “#511 reduces the minimum grouped path by 40%” — superseded.
- “SMS is a primary acquisition bet” — unsupported; fallback/legacy only unless new evidence changes that.
- “AI should position MoneyFlow” — unsupported; AI is acceptable only where bounded evidence shows it safely reduces capture/reconcile friction.
- “Open issue #523 is already selected work” — false; #527 is current after #528/#529 authority convergence.
- “A provider/bank/native/OCR horizon item is authorized by master #432 alone” — false; each requires a bounded researched slice and owner authority.
