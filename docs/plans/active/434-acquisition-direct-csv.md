# #434 — Direct CSV acquisition boundary

**Status:** active
**Execution state:** implementing
**Change class:** Class 3 — financial mutation/import boundary
**Parent:** #432 P1 Acquisition Foundation
**Branch:** `feat/434-acquisition-direct-csv`
**Base:** `main@a35d6f96960e889cf988d9d37d4320a8f674cd85`
**Owner:** human owner

## Outcome

Authenticated Direct CSV keeps its current power-user preview experience, but ready rows stop bypassing the persisted acquisition contract. A commit must create provenance-backed candidate evidence and ledger facts through one batch-atomic database boundary, so a failed row cannot leave a partly committed financial batch.

This slice is deliberately narrower than all of P1. It establishes one real source path end-to-end before other sources are migrated.

## Repository reconnaissance

Current `/imports/direct` explicitly says it bypasses Inbox. `DirectCsvImportPage.runImport()` converts the ready plan into ordinary `CreateTransactionInput` values and awaits `addTransaction()` once per row. Authenticated `addTransaction()` without an Inbox candidate calls `createTransactionAction()` / `create_money_transaction`, so each row is committed independently.

Consequences of the current runtime path:

- the UI dry-run is client planning, not a database batch transaction;
- a later network/validation failure can occur after earlier rows are already posted;
- successful direct rows do not use the existing `approve_inbox_candidate` provenance insert;
- retry keys are newly generated for each run, while durable source identity belongs in candidate/provenance data;
- the direct path and Inbox path therefore have different financial mutation semantics.

Existing repository foundation to reuse:

- `import_batches` already stores source plus parser/mapping version;
- `inbox_candidates` already stores source row, external ID, versioned fingerprint, parser/mapping version, match status/reason/confidence, transfer signals and approval linkage;
- `transaction_import_provenance` links approved ledger transactions to candidate, batch, source identity and matching decision;
- candidate fingerprinting is database-owned;
- `plan_inbox_candidate()` prioritizes approved/exact-source evidence before fingerprint matching and transfer suspicion;
- `approve_inbox_candidate()` locks the candidate and atomically validates ownership/category/account/money, writes transaction entries, provenance and approval linkage;
- existing reconciliation state is independent from import evidence and must remain so.

No new generic acquisition schema is justified by this reconnaissance.

## Research

External references are implementation evidence only; MoneyFlow code/tests remain authority.

Actual Budget currently distinguishes raw `addTransactions` from `importTransactions`. Its import path runs reconciliation/rules, supports dry-run, uses a source `imported_id` when available, and warns that fallback matching without a source ID needs review. This supports converging MoneyFlow source paths on one import contract rather than preserving raw-add shortcuts.

Actual also documents that a manually entered transaction can later be matched by an import. That is useful as a future P1 requirement, but this slice will not expand MoneyFlow's heuristic auto-merge behavior.

Firefly III Data Importer's 2026 changelog records duplicate-detection bugs caused by unstable/session-scoped `external_id` values and repeatedly warns that data-handling changes can create duplicate transactions. The applicable lesson is that retry identity must be durable and source-scoped; random per-attempt identifiers cannot substitute for source identity.

Research constraint for #434: preserve conservative matching. Exact durable source identity is stronger than fingerprints; fingerprints remain matching aids, not proof that two economically identical-looking transactions are the same event.

## Specification

### Runtime contract

For authenticated Direct CSV:

1. Parse/map/preview remains local and deterministic.
2. Ready rows are converted to persisted acquisition candidates under one import batch.
3. Candidate evidence preserves source `csv`, source row index, parser version, mapping version and original description/raw snippet. Direct CSV has no bank-provided external transaction ID, so this slice must not fabricate one.
4. Database candidate fingerprinting remains canonical for persisted evidence.
5. The commit operation approves the selected candidate set inside one database transaction by reusing `approve_inbox_candidate` semantics.
6. Any approval error rolls back every ledger/provenance/approval mutation in that batch commit.
7. Candidate/import evidence may remain pending if ledger approval fails; a failed attempt must not leave some ledger facts posted and others absent.
8. On success, the import batch is marked committed and every created transaction has provenance.
9. Replaying evidence already approved must not create a second fact.

### Financial invariants

- integer VND only;
- no zero/negative/non-safe amount accepted as transaction magnitude;
- expense/income category kind and ownership are checked server-side;
- archived categories cannot be used;
- transfer rows remain skipped by Direct CSV and require the existing reviewed transfer path;
- no client-provided user ID is trusted;
- RLS/security-definer boundaries remain least-privilege;
- import evidence does not change account reconciliation state by itself.

### UX contract

Keep the current map/preview/review UI unless implementation requires truthful copy changes. Remove any copy that becomes false, especially claims that imply per-row posting or lack of batch atomicity after the new contract lands.

Demo mode remains browser-local. It may preserve the current sequential local behavior, but UI/tests must not imply it proves authenticated provenance or database atomicity.

### Failure contract

Counterexamples must include:

- second/late row invalid after an earlier row is valid: no ledger/provenance/approval rows from the batch commit survive;
- wrong-account/cross-tenant candidate cannot be approved;
- archived or kind-mismatched category rejects the whole approval batch;
- duplicate/existing approved evidence does not silently create another fact;
- two legitimate same-date/same-amount rows are not newly collapsed by an expanded heuristic;
- source rows have transaction provenance after success;
- import/reconciliation remain separate.

## Implementation plan

1. Add database batch-approval RPC as a narrow wrapper over existing `approve_inbox_candidate`, with bounded input size and authenticated ownership.
2. Add pgTAP tests for atomic rollback, replay/duplicate behavior, provenance, ownership and financial invariants.
3. Add a server action for authenticated Direct CSV commit that:
   - validates a bounded batch payload;
   - creates import batch + persisted candidates with provenance fields;
   - invokes the batch approval RPC;
   - returns created transaction IDs/rows only after success;
   - reports calm errors without exposing provider/raw payloads.
4. Reuse/extract pure Direct CSV mapping helpers only where needed to build candidate inputs; do not introduce a second fingerprint authority.
5. Change `DirectCsvImportPage` authenticated `runImport()` to one server-side commit call instead of looping ordinary `addTransaction()` calls. Keep demo behavior explicitly separate.
6. Update direct-import copy and product analytics counts to reflect batch success/failure truthfully.
7. Run risk-selected exact-head Class 3 CI, including unit/static/database/RLS/security gates and any browser gate selected by policy.
8. Independent review must challenge silent dedupe, partial commits, tenant leakage, stale UI copy and divergence from #432.

Rollback: revert this slice. Existing Inbox and ordinary transaction paths remain intact; no provider state is changed.

## Tasks

| ID | Task | Status |
|---|---|---|
| 434.1 | inspect current Direct CSV, Inbox approval, provenance, finance and reconciliation paths | done |
| 434.2 | research mature import identity/atomicity failure modes | done |
| 434.3 | persist bounded child issue/packet/board authority | implementing |
| 434.4 | add batch-atomic database approval contract + pgTAP | pending |
| 434.5 | add authenticated Direct CSV server commit action | pending |
| 434.6 | migrate authenticated Direct CSV UI off per-row ordinary transaction writes | pending |
| 434.7 | unit/static/counterexample coverage | pending |
| 434.8 | exact-head Class 3 verification | pending |
| 434.9 | independent evaluation and fixes | pending |
| 434.10 | PR handoff for owner merge decision | pending |

## Evaluation

Acceptance requires all of the following on one final exact head:

- no authenticated Direct CSV ready-row loop through ordinary `createTransactionAction` remains;
- database evidence proves all-or-nothing ledger/provenance/approval behavior for a batch approval failure;
- successful rows have inspectable provenance back to candidate/import batch/source row;
- exact source identity precedence remains intact and no broader silent fuzzy merge is introduced;
- tenant/category/account/money/transfer invariants remain green;
- current reconciliation tests remain green and import does not falsely reconcile entries;
- UI copy matches the implementation;
- risk-selected CI/CodeQL/secret checks required by repo policy are green;
- no bank/provider/native/AI capability is claimed.

If the only safe implementation would require replacing the existing Inbox candidate/provenance model, stop and respecify rather than creating a parallel acquisition system.
