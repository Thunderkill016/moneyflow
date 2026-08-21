# #436 — Reconcile manual transactions with later source evidence

**Status:** completed
**Execution state:** merged
**Change class:** Class 3 — financial import/reconciliation boundary
**Parent:** #432 P1 Acquisition Foundation
**Branch:** `feat/436-manual-import-reconciliation`
**Merged PR:** #437
**Verified head:** `83957701cf38647729d35956d6b5af132641a5dd`
**Main merge:** `1ae4c765af9789a6a7e34179a1d3a2733eb436fe`
**Owner:** human owner

## Outcome

When a user already recorded a digital income/expense and later source evidence for the same event arrives, MoneyFlow can attach that evidence to the reviewed existing ledger fact instead of creating a duplicate. Linking source evidence does not silently rewrite the existing fact or its reconciliation state.

This was the second bounded P1 slice after #434/#435. It added no provider and did not broaden fuzzy matching.

## Repository reconnaissance

Main after #435 already had a neutral persisted acquisition foundation: import batches, candidates, source/external identity, versioned fingerprints, match status/reason/confidence, transaction provenance, atomic candidate approval, deterministic rules, reconciliation and privacy-safe financial mutation audit.

Before #436, `plan_inbox_candidate()` checked prior imported provenance/candidates but did not search existing non-deleted ledger transactions without import provenance. Later source evidence could therefore duplicate an earlier user-created fact.

`transaction_import_provenance.transaction_id` remains unique/primary, so #436 deliberately attached only the first source evidence to an unprovenanced existing transaction and did not redesign provenance into a one-to-many evidence model.

## Research

Actual Budget documents manual→later-import matching and explicit deleted-reimport behavior. MoneyFlow adopted the reconcile-rather-than-duplicate principle but intentionally did not adopt imported-data-over-user-data precedence.

Independent concurrency review constrained the implementation: the reviewed target row is locked and the narrow match is recomputed before provenance insert, but this review-only fallback is not a safe primitive for future automatic linking without a stronger concurrency/idempotency contract.

## Specification

After exact source/provenance and transfer checks, a pending non-manual income/expense candidate can identify one existing owned, non-deleted, one-entry, unprovenanced, non-generated transaction with the same kind, account, date and exact signed amount.

- exactly one eligible fact → `existing_transaction_match` with reviewed target ID;
- more than one → `existing_transaction_ambiguous`, no target;
- exact source ID remains stronger;
- transfer suspicion remains stronger than the fallback;
- manual candidates do not self-reconcile through this path.

`attach_inbox_candidate_to_existing_transaction(candidate_id, transaction_id)` derives `auth.uid()`, locks candidate and target, recomputes the narrow plan, writes provenance + candidate approval linkage, and leaves target transaction/entries/reconciliation unchanged.

Authenticated review exposes **“Gắn nguồn, giữ nguyên sổ”** only for the reviewed existing-transaction reason. Hard source-ID duplicates do not expose a fake separate-transaction override. UI plan state is keyed by candidate identity to prevent stale-target leakage.

## Implementation plan

Completed implementation included:

1. conservative existing-ledger matcher and reviewed attachment RPC;
2. exact source-ID and transfer precedence;
3. server action and Inbox review choice;
4. pgTAP counterexamples for correction precedence, replay, ambiguity, deletion, existing provenance, manual-source exclusion, transfer target, transfer-precedence and tenant isolation;
5. security-definer inventory/migration identity updates without weakening checks;
6. unit/static/UI safety coverage and candidate-keyed async plan state;
7. independent review fixes for hard-duplicate override and transfer-precedence ordering.

## Tasks

| ID | Task | Status |
|---|---|---|
| 436.1 | reconcile #434 lifecycle and inspect current main | done |
| 436.2 | research manual→later-import reconciliation behavior | done |
| 436.3 | persist issue/branch/packet/board authority | done |
| 436.4 | add DB match/link contract + counterexample pgTAP | done |
| 436.5 | add authenticated server action | done |
| 436.6 | add explicit Inbox review decision | done |
| 436.7 | unit/static/UI safety coverage | done |
| 436.8 | exact-head Class 3 verification | done |
| 436.9 | independent evaluation/fixes | done |
| 436.10 | owner merge handoff | done |

## Evaluation

Final exact head `83957701cf38647729d35956d6b5af132641a5dd` passed:

- CI #2758, including diff hygiene, migration identity, project knowledge, CI policy, lint, typecheck, production build, unit/static RLS, fresh Supabase reset + pgTAP, archive round-trip, browser smoke, authenticated ownership smoke, cross-device Chromium/WebKit audit and aggregate e2e;
- CodeQL #1819;
- Secret history #1819.

Independent review found and fixed stale async plan state, hard-duplicate override leakage and transfer-suspicion precedence before final verification. No silent ledger overwrite or tenant-leak path remained in the reviewed boundary.

Residual limitation: review-only attachment is not an automatic-link primitive. Future automatic attachment requires a stronger concurrency/idempotency contract.

Owner authorized merge and PR #437 was squash-merged as `1ae4c765af9789a6a7e34179a1d3a2733eb436fe`.
