# #434 — Direct CSV acquisition boundary

**Status:** completed
**Completed:** 2026-08-21
**Change class:** Class 3 — financial mutation/import boundary
**Parent:** #432 P1 Acquisition Foundation
**Implementation branch:** `feat/434-acquisition-direct-csv`
**Merged PR:** #435
**Merged main:** `38ae8f8694554d8d69508f86bcc66b2bdfe68b95`

## Outcome

Authenticated Direct CSV no longer posts ready rows through ordinary per-row transaction creation. It now persists one import batch plus candidate evidence and commits selected rows through one batch-atomic database approval boundary that reuses the canonical Inbox acquisition/provenance contract.

The merged slice preserves the product's existing preview flow while making authenticated ledger mutation all-or-nothing for a selected batch. Each successful ledger fact is linked back to its candidate/import batch/source row through `transaction_import_provenance`; retries use persisted acquisition identity rather than treating a new client attempt as a new financial event.

## Preserved invariants

- integer VND and safe-integer bounds remain server-enforced;
- account/category ownership and category-kind/archive checks remain server-enforced;
- transfer-like rows remain review-first rather than silently converted;
- exact source identity remains stronger than fingerprint/heuristic matching;
- Direct CSV did not gain a fabricated provider transaction ID;
- import evidence does not change reconciliation state;
- demo/local behavior is not claimed as evidence for authenticated database atomicity.

## Verification accepted before merge

- exact-head CI #2738 green;
- exact-head CodeQL #1800 green;
- exact-head Secret history #1800 green;
- database counterexamples covered rollback, replay, provenance, ownership and money/category invariants.

## Follow-on

The next P1 slice is #436: reconcile a later source candidate with one reviewed existing unprovenanced money transaction without overwriting user corrections or guessing among ambiguous matches.

Historical implementation detail remains available in PR #435 and issue #434. This completed packet is durable closeout only and is no longer execution authority.
