# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority when read from `main`; this branch carries a candidate post-merge projection only
**Last reconciled:** 2026-08-28
**Runtime/financial baseline:** `main@133fa462d3cd5f90b1f70cccb179547815c2ba2d` (PR #521 squash-merged)
**Post-merge projection:** PR #522
**Routing:** use `docs/context/README.md`; open `docs/research/pr-memory/YYYY/QN/` only for named provenance needs. The owner-facing queue is `docs/plans/active/README.md` only after `npm run plan:resolve` passes.

## 1. Current decision

MoneyFlow is a Vietnamese personal-finance product built around one trustworthy user-owned ledger. The product is functional but **not public-beta ready**.

Merged #432/#433 is the master product authority. A digital transaction MoneyFlow can acquire safely should not require permanent retyping. Manual capture remains first-class for cash, corrections and missing/off-system events.

Dependency order remains:

`source/evidence → candidates/provenance → normalization/dedup/matching → ledger → reconciliation/correction → understanding/review → planning → automation → selective providers → later wealth/together/intelligence when separately validated`.

Code, migrations and tests outrank this memory. Open PRs and this projection remain candidate evidence until merged.

## 2. Current runtime and financial truth

- VND is stored as integer đồng; never floating point.
- Transfers are balanced movements and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories or financial intent are never guessed.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence; source observations never establish `reconciled` by themselves.
- Full archive/restore is separate from scoped/report export.

## 3. Acquisition and reconciliation truth

Merged acquisition lineage:

- #435: Direct CSV persists source provenance and commits selected rows atomically.
- #437: later non-manual evidence can attach to one reviewed unprovenanced transaction without rewriting ledger facts.
- #439: deleted exact-source reimport can restore the same fact when evidence is unchanged.
- #441: changed same-ID observations are preserved for review without overwriting canonical ledger/reconciliation truth.
- #445: explicit predecessor/replacement lineage exists; no fuzzy lineage guessing.
- #449: reviewed exact `posted` evidence may advance one eligible leg `pending → cleared`; never `reconciled`, overwrite, delete or demote user/statement truth.
- #451: PWA Share Target persists one share action atomically into pending source batches/candidates.
- #453: explicit Inbox review can create a future candidate-stage rule.
- #455: Share candidates can reuse explicit deterministic rules; no auto-post.
- #459: failed Direct CSV approval with retained batch id hands the user to Inbox/import history rather than encouraging blind retry.
- #461: user-confirmed Direct CSV column mappings can be remembered for the exact normalized header shape.
- #464: eligible Direct CSV dry-run rows may reuse exact explicit rules for normalization before unchanged review/approval.

The current file-import implementation remains generic/shallow relative to real consumer bank exports. Exact exported schemas must be proven with privacy-safe structural fixtures before bank-specific adapters are authorized.

## 4. Current execution state

PR #522 completes #511 — exception-first Inbox grouped review — only if the owner squash-merges the exact final head after required checks pass.

**Projected current agent-executable slices after PR #522 merge: zero.**

No follow-on slice is selected in this PR. Issue #523 (`prove consumer bank-export compatibility before expanding capture`) is a candidate only. It may be considered only from fresh `main` after merge + `npm run plan:resolve`; selection requires a separate bounded authority change.

#511 is **review/trust infrastructure**, not the primary answer to manual-entry/capture friction. PR #522 adds one shared deterministic readiness classifier; grouped posting remains explicit-confirmation-only; low-confidence, duplicate, transfer, invalid or unresolved candidates stay pending. The former desktop `A` shortcut no longer reaches grouped approval directly.

Do **not** claim `40% fewer clicks` or manual-entry reduction. The pre-#511 Inbox already had one-click `Chọn tất cả`; raw minimum grouped activations remain three. The proven change is fail-closed safety and lower row-by-row decision burden for mixed batches.

## 5. Current capability inventory

| Capability | Current merged truth / projected change |
|---|---|
| Core ledger | multiple accounts; income, expense, balanced transfers; edit; recoverable deletion |
| Accounts | balances, register/history, create/edit/archive/restore, statement reconciliation |
| Planning | category budgets, recurring commitments/income, savings goals |
| Understanding | weekly/monthly/yearly reports, drill-downs, controlled import/export |
| Acquisition | persisted batches/candidates/provenance, exact source matching, Direct CSV atomic approval, Share Target persistence, explicit deterministic candidate rules |
| Review | current merged review plus **projected PR #522 Ready/Needs-attention fail-closed grouped review** |
| Ownership | versioned archive/export/validation/restore contract |
| Runtime modes | explicit demo and authenticated/Supabase-RLS modes |
| Public beta | not approved |

## 6. Release/trust state

Release readiness is separate from #432 product development.

Closed by current evidence/owner decision: RRB-01, RRB-02 limitation path, RRB-05 contact path, RRB-07, RRB-08 one-device Android/Chrome observation.

Still external/open at their own boundaries: RRB-03 destructive recent-auth provider edge, RRB-04 provider/Auth/firewall read-back, RRB-06 Vietnam personal-data legal/privacy review, RRB-09 production deployment/provider identity.

No product PR may silently convert those external gaps into proof.

## 7. Security and delivery truth

- `docs/configuration.md` owns environment/provider settings; provider values never belong in source.
- `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md` owns change classes/gates and `docs/engineering/AGENT_OPERATING_MODEL.md` owns permission/handoff boundaries.
- `docs/plans/PLAN_AUTHORITY.json` + the active board registry own task selection.
- `plan:resolve` blocks stale/ambiguous authority and unactivated projections.
- `scripts/lifecycle-projection.mjs` requires a completing PR to archive its active packet, project board/current memory and leave zero follow-on current slices in the same PR.
- Code/evaluation head `20896ba3c7a9bee71893994fbf199bfd9ffc77eb` passed CI #3142, browser/E2E, cross-device UI audit, CodeQL and secret-history scan. Lifecycle convergence creates a newer head, so **final exact-head required checks remain the merge gate**.

## 8. Reconciled issue status

- #432/#433: merged master acquisition-first program.
- #434/#435 through #464: merged acquisition/provenance/rule lineage described above.
- #511/#522: current slice completion projection; not merged yet.
- #523: candidate follow-on evidence slice only; not authority.
- #403 performance: held.
- #426 simplification Slice 2: owner decision/held.
- Release-readiness issues remain on their independent owner/provider/legal boundaries.

## 9. Open pull-request memory

PR #522 durable record: `docs/research/pr-memory/2026/Q3/PR-522.md`.

PR #522 projects completion of #511 with zero current agent-executable slice after merge. The completed packet projection is `docs/plans/completed/2026-08-28-511-inbox-exception-first-review.md`.

A final branch mutation invalidates older-head verification evidence. GitHub required checks on the exact final PR head are authoritative. Merge remains owner-authorized only.

## 10. True gaps after this audit

1. Prove whether real consumer Vietnam bank exports can be acquired with materially less user work than retyping.
2. Obtain privacy-safe structure-preserving fixtures before claiming bank-specific file compatibility.
3. Measure parser output by rows detected, exact amount/date/kind, reference/source identity preserved and correction burden.
4. Keep OCR/provider/native acquisition unselected until structured-source evidence shows the need.
5. Validate capture/maintenance conclusions beyond the current tech-community-skewed corpus before market-wide claims.
6. Release/provider/legal gaps remain separate from product acquisition work.

## 11. Next allowed action

After PR #522 is owner-merged:

1. fetch fresh `main`;
2. run `npm run plan:resolve` and `npm run agent:doctor -- --json`;
3. confirm the projected zero-current state activated through the exact merge;
4. only then evaluate/select a new bounded #432 child.

Candidate #523 targets the strongest current product problem more directly: stop retyping transactions that already exist as digital bank records, measured as trusted rows acquired per user action plus correction burden. Phase A must first benchmark privacy-safe structural consumer export fixtures against the current parser. It does **not** pre-authorize a bank-specific parser, OCR engine, provider integration or native acquisition.

## 12. Superseded-status register

- “#511 materially reduces manual-entry friction” — superseded.
- “#511 reduces the minimum grouped path by 40%” — superseded.
- “SMS is a primary acquisition bet” — unsupported; fallback/legacy only unless new evidence changes that.
- “AI should position MoneyFlow” — unsupported; AI may be used only where a bounded spec proves it reduces capture/reconcile friction safely.
- “open issue #523 is already selected work” — false; #523 is candidate only.
- “a provider/bank/native/OCR horizon item is authorized by master #432 alone” — false; each requires a bounded researched slice and owner authority.

PR #522 remains unmerged candidate evidence. Owner controls merge. No direct `main` write, force-push, provider/production mutation or next-slice promotion is authorized by this projection.
