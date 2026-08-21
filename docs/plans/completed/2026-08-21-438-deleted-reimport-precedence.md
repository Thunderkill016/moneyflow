# #438 — Deleted-source reimport precedence

**Status:** completed
**Execution state:** merged
**Change class:** Class 3 — financial import/deletion boundary
**Parent:** #432 P1 Acquisition Foundation
**Branch:** `feat/438-deleted-reimport-precedence`
**PR:** #439
**Merged main:** `d5324c473c2453869dc45dcd4cf5634ecbf97ea3`

## Outcome

MoneyFlow now distinguishes a live exact-source duplicate from an exact-source match whose canonical transaction was soft-deleted. Deletion precedence is explicit: planning never restores; unchanged repeated source evidence can be reviewed to restore the same transaction; changed repeated evidence stays blocked rather than overwriting ledger truth.

## Repository reconnaissance

The slice preserved the existing canonical `transaction_import_provenance` identity anchor, Inbox candidate evidence, soft-delete ledger model, reconciliation state and financial audit path. It added no provider/native boundary.

## Research

Actual Budget's official import/API behavior was used only as design evidence that deleted reimport should be explicit:

- https://actualbudget.org/docs/transactions/importing/
- https://actualbudget.org/docs/api/reference/

MoneyFlow did not adopt imported-data-over-user-data precedence.

## Specification

- live same source ID remains hard `source_external_id_match`;
- deleted same source ID + same fingerprint/version becomes `source_external_id_deleted_match`;
- deleted same source ID + changed/missing fingerprint becomes `source_external_id_deleted_changed`;
- reviewed restore clears only `financial_transactions.deleted_at`, preserves canonical provenance/ledger/entries/reconciliation and resolves the repeat candidate to the same transaction;
- replay and tenant boundaries are enforced;
- hard source identity blocks heuristic separate approval.

## Implementation plan

Delivered through migration `20260821093500_deleted_source_reimport_precedence.sql`, server action and Inbox review UX, with pgTAP/unit/static/UI coverage and migration/security inventory updates.

## Tasks

| Task | Final status |
|---|---|
| Deleted exact-ID planning states | done |
| Reviewed restore RPC | done |
| Hard-source UI/approval veto | done |
| Tenant/replay/audit/reconciliation counterexamples | done |
| Migration identity + knowledge contracts | done |
| Exact-head Class 3 verification | done |
| Owner merge | done |

## Evaluation

Final PR head `003841723e9dc8d5528fa7aaf82a969d261f0239` passed CI #2766, CodeQL #1826 and Secret history #1826 before squash merge as `d5324c473c2453869dc45dcd4cf5634ecbf97ea3`.

Pre-merge evaluation also caught and fixed a pgTAP assertion-plan mismatch, hard-source heuristic override leakage, migration identity pinning and project-memory heading drift without weakening any checker.

Remaining source-update behavior is deliberately outside #438 and moves to #440.