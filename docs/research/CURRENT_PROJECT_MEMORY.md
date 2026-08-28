# MoneyFlow — current project memory

**Status:** single current implementation/trust-status authority when read from `main`; this branch carries a candidate post-merge projection only
**Last reconciled:** 2026-08-28
**Runtime/financial baseline:** `main@133fa462d3cd5f90b1f70cccb179547815c2ba2d` (PR #521 squash-merged)
**Post-merge projection:** PR #522
**Routing:** use `docs/context/README.md`; the owner-facing queue is `docs/plans/active/README.md` only after `npm run plan:resolve` passes.

## 1. Product and authority truth

MoneyFlow is a Vietnamese personal-finance product built around one trustworthy user-owned ledger. The product is functional but **not public-beta ready**.

Merged #432/#433 is the master product authority. Long-term acquisition law: a digital transaction MoneyFlow can acquire safely should not require permanent retyping. Manual capture remains first-class for cash, corrections and missing/off-system events.

Dependency order remains:

`source/evidence → candidates/provenance → normalization/dedup/matching → ledger → reconciliation/correction → understanding/review → planning → automation → selective providers → later wealth/together/intelligence when separately validated`.

Code, migrations and tests outrank this memory. Open PRs and this projection remain candidate evidence until merged.

## 2. Current execution projection

PR #522 completes #511 — exception-first Inbox grouped review — if and only if the owner squash-merges the exact final head after required checks pass.

**Projected current agent-executable slices after PR #522 merge: zero.**

No follow-on slice is selected in this PR. Issue #523 (`prove consumer bank-export compatibility before expanding capture`) is a candidate only. It may be considered only from fresh `main` after merge + `npm run plan:resolve`; selection requires a separate bounded authority change.

This projection deliberately does not promote provider/native/OCR/AI work or a bank-specific parser.

## 3. Ledger and financial invariants

- VND is stored as integer đồng; never floating point.
- Transfers are balanced movements and neutral to income/expense/net.
- Authenticated user-owned data is tenant-isolated through PostgreSQL/RLS; demo is explicit browser-local state.
- Missing balances, dates, commitments, source coverage, categories or financial intent are never guessed.
- Ledger facts support explicit correction and recoverable deletion where required.
- Reconciliation state is distinct from source evidence; source observations never establish `reconciled` by themselves.
- Full archive/restore is separate from scoped/report export.

## 4. Acquisition and provenance truth

Merged acquisition lineage:

- #435: Direct CSV persists source provenance and commits selected rows atomically.
- #437: later non-manual evidence can attach to one reviewed unprovenanced existing transaction without rewriting ledger facts.
- #439: deleted exact-source reimport can restore the same fact when evidence is unchanged.
- #441: changed same-ID observations are preserved for review without overwriting canonical ledger/reconciliation truth.
- #445: explicit predecessor/replacement lineage exists; no fuzzy lineage guessing.
- #449: reviewed exact `posted` evidence may advance one eligible leg `pending → cleared`; never `reconciled`, overwrite, delete or demote user/statement truth.
- #451: PWA Share Target persists one share action atomically into pending source batches/candidates.
- #453: explicit Inbox review can create a future candidate-stage rule.
- #455: Share candidates can reuse explicit deterministic rules; no auto-post.
- #459: failed Direct CSV approval with a retained batch id hands the user to Inbox/import history rather than encouraging blind retry.
- #461: user-confirmed Direct CSV column mappings can be remembered for the exact normalized header shape.
- #464: eligible Direct CSV dry-run rows may reuse exact explicit rules for normalization before unchanged review/approval.

The current file-import implementation remains generic/shallow relative to real consumer bank exports. Exact exported schemas must be proven with privacy-safe structural fixtures before bank-specific adapters are authorized.

## 5. #511 / PR #522 projected truth

#511 is **review/trust infrastructure**, not the primary answer to manual-entry/capture friction.

PR #522 adds one shared deterministic readiness classifier. A pending candidate is Ready only when it is income/expense, non-low-confidence, not duplicate/transfer-like, has valid amount/date, has explicit resolvable account/category evidence of the correct kind, and satisfies the existing ledger-post invariant.

Grouped posting remains explicit-confirmation-only. `Chọn Sẵn sàng` selects; it does not post. The page reclassifies immediately before posting. Low-confidence, duplicate, transfer, invalid or unresolved candidates stay pending.

The former desktop `A` shortcut no longer reaches grouped approval directly.

Do **not** claim `40% fewer clicks` or manual-entry reduction. The pre-#511 Inbox already had one-click `Chọn tất cả`; raw minimum grouped activations remain three. The proven change is fail-closed safety and lower row-by-row decision burden for mixed batches.

## 6. Verification truth

Code/evaluation head `20896ba3c7a9bee71893994fbf199bfd9ffc77eb` passed GitHub CI #3142 on 2026-08-28, including:

- policy/knowledge contracts;
- lint/typecheck/static quality;
- unit tests/static RLS;
- production build;
- cross-device UI audit;
- browser smoke and authenticated ownership browser smoke;
- E2E aggregate;
- CodeQL;
- secret-history scan.

Earlier browser failures were test-contract defects and were corrected rather than waived: an ambiguous text locator and a legacy test that tried to open grouped approval with zero Ready candidates.

This lifecycle convergence creates a newer branch head. **Final exact-head required checks on that newer head remain the owner-handoff merge gate.** No earlier SHA is treated as proof of a later one.

## 7. Current capability summary

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

## 8. Release/trust state

Release readiness is separate from #432 product development.

Closed by current evidence/owner decision: RRB-01, RRB-02 limitation path, RRB-05 contact path, RRB-07, RRB-08 one-device Android/Chrome observation.

Still external/open at their own boundaries: RRB-03 destructive recent-auth provider edge, RRB-04 provider/Auth/firewall read-back, RRB-06 Vietnam personal-data legal/privacy review, RRB-09 production deployment/provider identity.

No product PR may silently convert those external gaps into proof.

## 9. Next allowed action after #522 merge

1. fetch fresh `main`;
2. run `npm run plan:resolve` and `npm run agent:doctor -- --json`;
3. confirm projected zero-current state activated through the exact owner merge;
4. only then evaluate/select a new bounded #432 child.

Candidate #523 targets the strongest current product problem more directly: stop retyping transactions that already exist as digital bank records, measured as trusted rows acquired per user action plus correction burden. Phase A must first obtain/privacy-sanitize structural consumer export fixtures and benchmark the current parser. It does **not** pre-authorize a bank-specific parser, OCR engine, provider integration or native acquisition.

## 10. Explicit non-authority / superseded claims

- “#511 materially reduces manual-entry friction” — superseded.
- “#511 reduces the minimum grouped path by 40%” — superseded.
- “SMS is a primary acquisition bet” — unsupported; treat as fallback/legacy only unless new evidence changes that.
- “AI should position MoneyFlow” — unsupported by current evidence; AI may be used only where a bounded spec proves it reduces capture/reconcile friction safely.
- “open issue #523 is already selected work” — false; #523 is candidate only.
- “a provider/bank/native/OCR horizon item is authorized by master #432 alone” — false; each requires a bounded researched slice and owner authority.

## 11. Handoff boundary

PR #522 remains unmerged candidate evidence. Owner controls merge. No direct `main` write, force-push, provider/production mutation or next-slice promotion is authorized by this projection.
