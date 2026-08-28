# Inbox exception-first review without auto-posting

**Status:** active implementation under merged selection PR #521
**Execution state:** implementation / exact-head verification
**Active role:** current agent-executable
**Permission scope:** branch_write
**Owner:** MoneyFlow owner
**Issue/PR:** Issue #511; implementation PR #522
**Parent authority:** #432 P2 — Low-Maintenance Ingestion
**Baseline:** `main@133fa462d3cd5f90b1f70cccb179547815c2ba2d`
**Last updated:** 2026-08-28

## Outcome

Separate pending Inbox candidates into deterministic **Sẵn sàng** and **Cần xem lại** states so grouped review fails closed to candidates that already have enough explicit evidence to build a valid ledger post. Selection never posts by itself and explicit confirmation remains mandatory.

### Corrected product interpretation

#511 is **review/trust infrastructure**, not the primary solution to manual-entry/capture friction.

The pre-#511 Inbox already had a one-click `Chọn tất cả ... ứng viên đang hiển thị` control. Therefore the product must not claim that #511 generally reduces the minimum grouped path from five activations to three. `select all → review → confirm` was already three activations; `select Ready → review → confirm` is also three.

The actual value is safety and decision burden: the old grouped approval gate mainly excluded low-confidence rows and could still admit selected high/medium duplicate or transfer-like candidates. #511 derives one stricter Ready contract and keeps exceptions pending for explicit review.

The community corpus still ranks capture/maintenance friction as the stronger product problem. Follow-on acquisition work must be selected from that evidence rather than treating this safety slice as capture reduction.

## Repository truth before implementation

- `filterCandidates(..., "needs_review")` meant low confidence only.
- bulk approval partitioned by confidence rather than one deterministic Ready contract.
- `draftFromCandidate` could fall back to the first current account/category; that convenience is valid for manual review but cannot prove readiness.
- `buildLedgerPost` already enforced positive safe-integer VND amount, valid date, current account/category membership and transfer invariants.
- Inbox already owned explicit selection, review confirmation and the posting path.
- desktop keyboard shortcut `A` could reach grouped apply directly; #522 removes `A` from the shortcut map so grouped approval has no confirmation-bypassing shortcut.

## Readiness contract

One pure classifier shared by presentation and grouped selection returns `ready | needs_attention` plus machine-readable reasons.

A pending candidate is Ready only when all hold:

1. kind is `income` or `expense`;
2. confidence is not low;
3. `possibleDuplicate !== true`;
4. `possibleTransfer !== true`;
5. amount is a positive safe integer;
6. date satisfies the existing ledger-date format;
7. explicit candidate account evidence resolves to a current account without fallback-to-first;
8. explicit candidate category evidence resolves to a current same-kind category without fallback-to-first;
9. the existing `buildLedgerPost` validation succeeds.

Attention reasons cover:

- `low_confidence`;
- `possible_duplicate`;
- `possible_transfer`;
- `transfer_kind`;
- `invalid_amount`;
- `invalid_date`;
- `account_missing_or_unresolved`;
- `category_missing_or_unresolved`;
- `category_kind_mismatch`;
- `invalid_posting_draft`.

Non-pending rows never enter the pending partition.

## UX contract

- textual Sẵn sàng / Cần xem lại counts and row state;
- direct `Chọn Sẵn sàng` action selects only; it never posts;
- existing visible grouped confirmation remains mandatory;
- grouped approve payload contains only candidates classified Ready from current facts;
- page handler reclassifies again immediately before posting;
- low-confidence, duplicate, transfer, missing/invalid account/category/date/amount remain pending;
- manual single review, reject, category, duplicate and transfer workflows remain available;
- state is not color-only.

## Financial/security boundaries

- readiness is derived workflow state, not persisted financial truth;
- no auto-posting or auto-approval;
- no behavior learning or AI mutation;
- no fuzzy/semantic duplicate or transfer expansion;
- no provider/bank/native integration;
- no OCR/document parser change;
- no schema/RLS/Auth/deployment change;
- source evidence never establishes `reconciled`;
- candidate idempotency/recovery remains unchanged.

## Implementation

PR #522 currently changes the bounded Inbox path only:

- `src/lib/inbox/readiness.ts` — pure strict classifier and pending partition;
- `src/components/inbox/inbox-page.tsx` — counts, filters, Ready selection and defense-in-depth reclassification before posting;
- `src/components/inbox/inbox-bulk-bar.tsx` — fail-closed confirmation payload;
- `src/lib/inbox/keyboard.ts` — no direct grouped-approval shortcut;
- unit tests for inclusion/exclusion and keyboard behavior;
- Playwright mixed-batch proof and compatibility update for the existing Phase 8 Inbox safety test.

## Verification state

On superseded head `412888c8fcd9d9267a873c3c2ef5e76c451f05f0`:

- classify: PASS;
- static quality / lint / typecheck: PASS;
- production build: PASS;
- database shard: PASS / not required;
- policy contracts including project knowledge: PASS;
- unit tests/static RLS: PASS;
- aggregate verify: PASS;
- cross-device UI audit: PASS;
- CodeQL: PASS;
- secret-history scan: PASS;
- Browser smoke: FAIL (132 passed, four failures across two tests/projects).

The browser failures were diagnosed rather than waived:

1. the new mixed-batch fixture used `Vietcombank` for two supposed Ready rows even though demo accounts are `MB Bank`, `Tiền mặt`, `MoMo`, and `USD du lịch`; strict readiness correctly rejected the invented account. The fixture now uses explicit real demo account/category IDs.
2. the existing Phase 8 test used an unscoped `getByRole("button", { name: "Xem lại" })`; after the new Cần-xem-lại labels, the locator became ambiguous. It now scopes the exact `Xem lại` button to `[data-slot="inbox-bulk-review"]` and asserts fail-closed Ready/Attention semantics.

Any branch mutation invalidates superseded-head browser acceptance; the latest exact-head CI must pass before handoff.

## Acceptance matrix

- [x] one classifier owns readiness for UI and grouped selection;
- [x] pending rows partition into Ready / Needs attention with reason codes;
- [x] specified exclusions have unit coverage;
- [x] first-option fallback is never readiness evidence;
- [x] Ready count and direct selection exist;
- [x] selecting Ready never posts;
- [x] grouped confirmation remains mandatory;
- [x] direct `A` grouped-approval shortcut removed/pinned by unit test;
- [x] page reclassifies current facts immediately before posting;
- [x] no auto-post/provider/OCR/AI/schema/RLS expansion;
- [ ] exact-head mixed-batch browser proof passes on desktop and mobile after fixture correction;
- [ ] existing Phase 8 browser safety test passes after selector/semantic correction;
- [ ] exact-head required checks all green;
- [ ] independent final diff/spec review;
- [ ] same-PR completion projection (board + current memory + packet archive) before owner handoff.

## Metric statement

Do **not** publish a `40% fewer clicks` claim for #511.

What can be measured on the representative mixed batch is:

- raw minimum grouped activations: unchanged at three (`select → review → confirm`);
- safety: attention-required rows are excluded from grouped posting and remain pending;
- decision burden: the user can select the deterministic Ready set without manually classifying every row.

Real user maintenance/capture impact remains unproven and is not an acceptance claim for this slice.

## Tasks

| ID | Task | Status |
|---|---|---|
| P1 | Verify #511 against code/tests | done |
| P2 | Research trust/review applicability | done |
| P3 | Specify readiness/safety/rollback contract | done |
| P4 | Select #511 via PR #521 | done — merged |
| I1 | Implement strict classifier | done |
| I2 | Wire exception-first UI and confirmation | done |
| I3 | Unit/static/build/policy verification | done on superseded head; latest exact head pending |
| I4 | Browser mixed-batch + regression verification | in progress after evidence-driven test corrections |
| I5 | Same-PR lifecycle convergence and owner handoff | pending exact-head green |

## Remaining limitations

- Real Ready proportion in actual imported batches is unknown.
- No claim that #511 reduces manual entry or total user maintenance.
- Corpus evidence is tech-community-skewed and not Vietnam-wide prevalence.
- Browser CI is not physical-device evidence.
- Follow-on capture/import work requires separate authority after this current slice converges.

## Handoff / permission boundary

PR #522 remains draft until exact-head checks and lifecycle convergence complete. No direct `main` write, merge, provider/production write or widened financial scope is authorized. Owner controls merge.

## Delivery record

- Selection PR: #521 — merged into main as `133fa462d3cd5f90b1f70cccb179547815c2ba2d`.
- Implementation branch: `feat/511-inbox-exception-first-review`.
- Implementation PR: #522 — draft.
- Production/provider evidence: none expected.
- Packet archive: must occur in this same PR when #511 reaches completion projection.
