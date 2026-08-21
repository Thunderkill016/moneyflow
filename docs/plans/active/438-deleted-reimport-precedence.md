# #438 — Deleted-source reimport precedence

**Status:** active
**Execution state:** implementing
**Change class:** Class 3 — financial import/deletion boundary
**Parent:** #432 P1 Acquisition Foundation
**Branch:** `feat/438-deleted-reimport-precedence`
**Base:** `main@1ae4c765af9789a6a7e34179a1d3a2733eb436fe`
**Owner:** human owner

## Outcome

When a source event with a stable external ID reappears after its previously imported transaction was soft-deleted, MoneyFlow must not hide that case inside ordinary duplicate handling. The user gets an explicit reviewed choice to keep the deletion or restore the same ledger fact. Restoration must preserve user corrections and must never create a second financial transaction.

This is the third bounded P1 Acquisition Foundation slice after #434/#435 and #436/#437.

## Repository reconnaissance

Current main after #437 has:

- persisted import batches and Inbox candidates with source, source external ID, versioned fingerprint, parser/mapping versions and match evidence;
- `transaction_import_provenance` with one canonical provenance row per transaction and a unique `(user_id, source, source_external_id)` constraint when an external ID exists;
- `plan_inbox_candidate()` exact source-ID precedence, transfer precedence, fingerprint duplicate checks and reviewed existing-ledger fallback;
- soft deletion on `financial_transactions.deleted_at` and an authenticated `restore_money_transaction()` RPC;
- structural financial mutation audit whose transaction trigger records `transaction_restored` whenever `deleted_at` transitions non-null → null;
- explicit review UI where hard source-ID duplicates do not expose the heuristic duplicate override.

Current gap: exact source-ID lookup in `plan_inbox_candidate()` returns generic `source_external_id_match` without considering whether the matched transaction is live or soft-deleted. Provenance survives soft deletion, so repeated source evidence for a deleted imported transaction is currently indistinguishable from an ordinary live duplicate.

The current provenance table permits one canonical provenance row per ledger transaction. This slice must not redesign that model. A repeated reviewed candidate can remain durable source evidence through the candidate row and approval linkage while the original canonical provenance row remains intact.

## Research

Actual Budget currently exposes deleted-import behavior as an explicit option rather than folding it into normal duplicate handling. Its API documents `reimportDeleted`; file-import behavior also exposes a deleted-reimport choice. This is useful evidence for making deletion precedence explicit. citeturn807855search0turn807855search1

MoneyFlow does not adopt Actual's imported-data-over-user-data behavior. An explicit restore in this slice restores the existing MoneyFlow transaction values; it does not copy the new source date/amount/payee/category into the ledger.

Source-update semantics are intentionally deferred. A repeated exact source ID whose current fingerprint materially differs from the canonical stored provenance is not treated as an ordinary deleted reimport. It remains unresolved for the next source-update-precedence slice rather than silently overwriting or restoring stale values.

External product behavior is design evidence only. Current MoneyFlow code/tests and #432 are authority.

## Specification

### Planning precedence

For a pending non-manual candidate with `source_external_id`:

1. locate canonical provenance by the same user + source + external ID;
2. if no provenance exists, continue current fingerprint/transfer/existing-ledger planning;
3. if provenance exists and target transaction is live, return the existing hard duplicate `source_external_id_match`;
4. if provenance exists and target transaction is soft-deleted:
   - if the candidate's current fingerprint and the stored canonical provenance fingerprint are both present and equal, return `duplicate` reason `source_external_id_deleted_match`, confidence `1`, target transaction ID;
   - if the fingerprints are missing or differ, return `duplicate` reason `source_external_id_deleted_changed`, confidence `1`, target transaction ID, with no restore action in this slice.

Exact source ID remains stronger than fingerprint/fallback matching. No deleted transaction is restored during planning.

### Explicit restore operation

Add one authenticated RPC/action for the reviewed `source_external_id_deleted_match` case. It must:

1. derive `auth.uid()` and lock the pending candidate;
2. reject manual/no-source-ID candidates;
3. lock canonical provenance and the owned target transaction;
4. require same user + source + external ID and require the target to be soft-deleted;
5. require the current plan to still be exactly `source_external_id_deleted_match` for that target;
6. clear only `financial_transactions.deleted_at`;
7. leave kind, date, note, review status, entries, account/category/amount and reconciliation fields unchanged;
8. leave canonical `transaction_import_provenance` payload unchanged;
9. mark the reviewed repeat candidate approved, link `approved_transaction_id` to the restored transaction, and record match reason/confidence on the candidate;
10. be replay-safe when the same candidate is already linked to the same restored transaction;
11. rely on the existing financial audit trigger to emit one `transaction_restored` event for the real deletion-state mutation.

If the source observation changed materially, the restore RPC must refuse it rather than converting that case into implicit source-update behavior.

### UX

Authenticated Inbox review loads the server plan as it already does after #437.

- `source_external_id_deleted_match` shows an explicit restore choice such as **“Khôi phục giao dịch đã xóa”** with copy that the original MoneyFlow ledger values are restored and the new source values will not overwrite them.
- `source_external_id_deleted_changed` shows a warning that the source event has the same stable ID but changed evidence; no restore button and no heuristic separate-transaction override are shown in this slice.
- live `source_external_id_match` remains a hard duplicate with no override.
- demo IDs make no server restore/provenance claim.

### Deferred boundary

The next P1 slice owns source-update observation semantics such as pending→cleared, provider corrections, changed amount/date/description under the same stable source ID, and whether one-to-many source observations require a dedicated table.

This slice must not become a provider sync implementation.

## Implementation plan

1. Add pgTAP counterexamples first for live exact-ID duplicate, deleted exact-ID match, changed repeated observation, replay, tenant isolation and unchanged ledger/reconciliation values.
2. Extend `plan_inbox_candidate()` to distinguish live, deleted-same-evidence and deleted-changed-evidence exact source-ID cases while preserving transfer/fallback order after the exact-ID decision.
3. Add an atomic reviewed restore RPC with least privilege and existing financial-audit behavior.
4. Update migration identity and SECURITY DEFINER inventory without weakening either checker.
5. Extend `InboxDryRunResult` messaging for the two deleted-source reasons.
6. Add authenticated server action with no blind mutation retry.
7. Add one explicit Inbox restore decision and block hard/changed source-ID override paths.
8. Add unit/static/UI safety contracts.
9. Run exact-head Class 3 CI: policy/knowledge, lint/typecheck/build, unit/static RLS, fresh Supabase + pgTAP, browser/auth ownership, cross-device/e2e, CodeQL and secret history.
10. Independent review challenges deletion resurrection, source-change overwrite, replay, tenant leakage, audit duplication and stale-plan races.

Rollback: revert #438. The merged #435 atomic Direct CSV path and #437 manual→source reconciliation remain intact.

## Tasks

| ID | Task | Status |
|---|---|---|
| 438.1 | close #436 lifecycle and inspect merged main | done |
| 438.2 | verify external deleted-reimport reference behavior | done |
| 438.3 | persist issue/branch/packet/board authority | implementing |
| 438.4 | add counterexample pgTAP | pending |
| 438.5 | implement deleted-source plan + reviewed restore RPC | pending |
| 438.6 | add server action + review UX | pending |
| 438.7 | unit/static/UI safety coverage | pending |
| 438.8 | exact-head Class 3 verification | pending |
| 438.9 | independent evaluation/fixes | pending |
| 438.10 | owner merge handoff | pending |

## Evaluation

Acceptance requires one final exact head proving:

- live exact source-ID matches remain hard duplicates;
- deleted exact source-ID + unchanged canonical fingerprint is a distinct reviewable restore plan;
- changed/missing fingerprint under the same deleted source ID remains unresolved and cannot restore in this slice;
- planning never changes deletion state;
- explicit restore reuses the same transaction ID and creates no second financial transaction/provenance row;
- restore changes only `deleted_at` plus repeat-candidate resolution/linkage;
- transaction/entry/reconciliation semantics remain unchanged;
- exactly the existing financial audit path records the restore mutation;
- replay is mutation-idempotent;
- another tenant cannot inspect or restore the target;
- no provider/native/AI capability is claimed;
- exact-head CI/database/security/browser and security scans are green before owner merge decision.

If the implementation requires overwriting ledger data from the repeated source observation, stop: that belongs to source-update precedence, not deleted-reimport restoration.
