# Inbox exception-first review without auto-posting

**Status:** post-merge completion projection; activates only if PR #522 is squash-merged by the owner
**Execution state:** implementation/evaluation complete; lifecycle convergence in PR #522
**Active role:** completed current slice in post-merge projection
**Permission scope:** branch_write only
**Owner:** MoneyFlow owner
**Issue/PR:** Issue #511; PR #522
**Parent authority:** #432 P2 — Low-Maintenance Ingestion
**Baseline:** `main@133fa462d3cd5f90b1f70cccb179547815c2ba2d`
**Last updated:** 2026-08-28

## Outcome

PR #522 adds one deterministic Inbox readiness contract that separates pending candidates into **Sẵn sàng** and **Cần xem lại**. Grouped posting now fails closed to candidates that already have enough explicit account/category/date/amount/kind evidence to build a valid ledger post. Selection never posts by itself; visible confirmation remains mandatory.

This slice is **review/trust infrastructure**. It is not claimed as the primary solution to manual-entry/capture friction and it does not claim a general click-count reduction.

## Repository reconnaissance

Before #522:

- `needs_review` largely meant low-confidence rather than one shared readiness contract;
- grouped approval could admit selected high/medium duplicate or transfer-like candidates;
- `draftFromCandidate` could fall back to the first current account/category, which is useful in manual review but is not valid evidence that a candidate is Ready;
- `buildLedgerPost` already owned positive safe-integer VND amount, date, account/category membership and transfer invariants;
- Inbox already owned explicit selection, confirmation and posting;
- desktop shortcut `A` could reach grouped apply directly and therefore bypass the visible grouped confirmation path.

The bounded implementation stayed inside Inbox/domain/UI/tests. No migration, RPC, RLS, provider, native, deployment or production-data boundary changed.

## Research

The MoneyFlow research corpus says capture/maintenance friction is the stronger product problem. That evidence corrected the interpretation of #511: exception-first review is a safety layer for batch acquisition, not the main answer to retyping.

Applicable external patterns were limited to trust behavior: uncertain imported rows remain reviewable/correctable, exact source identity outranks fuzzy similarity, and saving review effort must not silently lower correctness. No provider/OCR/AI direction was authorized by this slice.

## Specification

A pending candidate is Ready only when all of the following hold:

1. kind is `income` or `expense`;
2. confidence is not low;
3. no possible-duplicate signal;
4. no possible-transfer signal and kind is not transfer;
5. amount is a positive safe integer;
6. date satisfies the existing ledger-date contract;
7. explicit candidate account evidence resolves to a current account without first-option fallback;
8. explicit candidate category evidence resolves to a current same-kind category without first-option fallback;
9. `buildLedgerPost` succeeds as the final posting-invariant check.

Machine-readable attention reasons cover low confidence, duplicate, transfer, invalid amount/date, unresolved account/category, category-kind mismatch and invalid posting draft. Non-pending rows never enter the pending partition.

UX contract:

- textual Ready/Needs-attention counts and row state;
- `Chọn Sẵn sàng` selects only and never posts;
- grouped confirmation remains mandatory;
- grouped approve payload contains only currently Ready candidates;
- the page reclassifies immediately before posting;
- exceptions remain pending for manual review;
- status is not color-only.

## Implementation plan

Implemented in PR #522:

1. `src/lib/inbox/readiness.ts` owns the pure classifier and pending partition.
2. `src/components/inbox/inbox-page.tsx` uses the same partition for counts, filters, Ready selection and defense-in-depth reclassification before posting.
3. `src/components/inbox/inbox-bulk-bar.tsx` derives the selected Ready subset and sends only Ready IDs into grouped approval confirmation.
4. `src/lib/inbox/keyboard.ts` removes the direct `A` grouped-approval shortcut.
5. Unit tests cover valid high/medium rows and every specified exclusion.
6. Playwright covers a mixed batch and asserts only Ready candidates post after explicit confirmation while low-confidence/duplicate/transfer exceptions remain pending.
7. Existing Phase 8 browser coverage was updated to assert the new fail-closed semantics instead of trying to open approval with zero Ready rows.

## Verification state

Exact code/evaluation head `20896ba3c7a9bee71893994fbf199bfd9ffc77eb` passed GitHub CI run #3142 on 2026-08-28:

- classify: PASS;
- policy/knowledge contracts: PASS;
- lint/typecheck/static quality: PASS;
- unit tests/static RLS: PASS;
- production build: PASS;
- database shard: PASS / database checks not required for this diff;
- cross-device UI audit: PASS;
- browser smoke: PASS;
- authenticated ownership browser smoke: PASS;
- E2E aggregate: PASS;
- CodeQL: PASS;
- secret-history scan: PASS.

Earlier browser failures were diagnosed and corrected rather than waived: one ambiguous Playwright text locator and one legacy test that attempted grouped approval when the selected set contained zero Ready candidates. The latter behavior was already correctly disabled by the product.

This lifecycle projection changes documentation after that verified code head. Therefore the **final PR head must pass the repository's exact-head checks again** before owner handoff; GitHub required checks on that final head are authoritative and this packet intentionally does not pretend an earlier SHA proves a later one.

## Evaluation

Acceptance result before lifecycle-only convergence:

- [x] one shared deterministic readiness classifier;
- [x] machine-readable attention reasons;
- [x] every specified inclusion/exclusion has unit coverage;
- [x] fallback account/category choices are never readiness evidence;
- [x] direct Ready-set selection exists and does not post;
- [x] visible confirmation remains mandatory;
- [x] `A` cannot directly trigger grouped ledger approval;
- [x] current facts are reclassified immediately before posting;
- [x] mixed desktop/mobile browser fixture proves Ready-only posting and pending exceptions;
- [x] existing Phase 8 safety flow reflects zero-Ready fail-closed behavior;
- [x] no auto-post/provider/OCR/AI/schema/RLS expansion;
- [x] independent failure diagnosis found no product-safety waiver;
- [ ] final lifecycle-converged exact-head required checks — merge gate, not yet claimed in this packet.

### Metric statement

Do **not** publish a `40% fewer clicks` claim. The pre-#511 Inbox already had a one-click `Chọn tất cả`, so the raw minimum grouped path remains three activations (`select → review → confirm`).

What #511 proves is narrower: attention-required rows are excluded from grouped posting, remain pending, and the user can select the deterministic Ready set without manually deciding each row's safety. Real-user manual-entry or total-maintenance reduction remains unproven.

## Tasks

| ID | Task | Status |
|---|---|---|
| P1 | Verify #511 against code/tests | done |
| P2 | Research review/trust applicability | done |
| P3 | Specify readiness/safety/rollback contract | done |
| P4 | Select #511 via PR #521 | done — merged |
| I1 | Implement strict classifier | done |
| I2 | Wire exception-first UI and explicit confirmation | done |
| I3 | Unit/static/build/policy verification | done on code/evaluation head |
| I4 | Browser mixed-batch + regression verification | done on code/evaluation head |
| I5 | Same-PR lifecycle convergence | projected in PR #522; final exact-head checks still required |

## Handoff / permission boundary

PR #522 remains candidate evidence until the owner squash-merges it. This completion projection deliberately leaves **zero current agent-executable slices** and does not select #523 or any other follow-on work. After merge, task selection requires a fresh `main`, `npm run plan:resolve`, and a separate bounded authority change.

No direct `main` write, merge, provider/production write or widened financial scope is authorized. Owner controls merge.

## Delivery record

- Selection PR: #521 — merged as `133fa462d3cd5f90b1f70cccb179547815c2ba2d`.
- Implementation branch: `feat/511-inbox-exception-first-review`.
- Implementation PR: #522.
- Last fully green code/evaluation head before lifecycle-only docs convergence: `20896ba3c7a9bee71893994fbf199bfd9ffc77eb`, CI #3142.
- Completed packet projection: `docs/plans/completed/2026-08-28-511-inbox-exception-first-review.md`.
- Production/provider evidence: none expected or authorized.
- Rollback: revert PR #522; readiness is derived state, so no migration/backfill/data rollback is required.
