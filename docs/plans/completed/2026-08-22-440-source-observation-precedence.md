# #440 — Source observation precedence — completed

**Status:** completed and merged
**Parent:** #432 P1 Acquisition Foundation
**Issue / PR:** #440 / #441
**Final implementation head:** `237aac8d771dd5f8ba57db5fa44d7309ce571245`
**Merged main:** `6123d263c60fba98bd67b5c935a7179477ad7fcb`
**Completed:** 2026-08-22

## Outcome

MoneyFlow now distinguishes an unchanged exact-source replay from changed/unknown evidence received under the same stable `source_external_id`. A reviewed changed observation can be linked to the same canonical financial transaction without rewriting transaction values, entries, reconciliation state or canonical `transaction_import_provenance`.

Persisted `inbox_candidates` remain the source-observation history for this slice. Approved observations are protected from browser fabrication/rewrite/delete while the bounded import-batch FK cleanup and privileged archive reconstruction paths remain supported.

## Durable invariants

- exact source identity remains stronger than fingerprint/heuristic matching;
- live same-ID unchanged evidence stays `source_external_id_match`;
- live same-ID changed/unknown evidence becomes a hard `source_external_id_changed` decision;
- reviewed resolution changes observation linkage only;
- deleted exact-source semantics from #439 remain intact;
- heuristic duplicate override cannot escape hard exact-source decisions;
- browser callers cannot INSERT or UPDATE already-approved observation evidence;
- no provider/native/source-lifecycle/different-ID lineage behavior was introduced;
- user-owned ledger and reconciliation truth remain authoritative.

## Verification

Final exact head `237aac8d771dd5f8ba57db5fa44d7309ce571245`:

- CI #2792: success, including policy/knowledge/diff hygiene, migration identity, lint/typecheck/static RLS/unit, production build, fresh Supabase reset + pgTAP, archive producer/restore, Browser smoke, authenticated ownership smoke, Cross-device UI audit, aggregate `verify` and `e2e`;
- CodeQL #1851: success;
- Secret history #1851: success;
- no retry required on the final exact-head run.

A post-ready evaluator found the earlier guard covered UPDATE but not direct INSERT. The final head expanded the guard to `BEFORE INSERT OR UPDATE`, added the direct-INSERT pgTAP counterexample and updated migration identity before the final green run.

## Deferred boundary

Provider-supplied predecessor/replacement identity, pending→posted across different IDs, removed/modified lifecycle semantics and any source-driven clearing/reconciliation behavior remain later #432 work. Different-ID lineage must not be inferred by fuzzy similarity.

## Lifecycle note

The active copy became stale after #441 merged because the Current Work Board and active-packet registry were not reconciled in the merge. #443 exists specifically to make that class of stale authority mechanically visible before future task selection.
