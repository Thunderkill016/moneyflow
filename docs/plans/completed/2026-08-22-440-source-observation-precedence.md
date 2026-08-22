# #440 — Source observation precedence

**Status:** merged  
**Merged:** PR #441 → `main@6123d263c60fba98bd67b5c935a7179477ad7fcb`  
**Final candidate head:** `237aac8d771dd5f8ba57db5fa44d7309ce571245`  
**Change class:** Class 3 — financial import/provenance boundary

## Outcome

MoneyFlow now distinguishes unchanged exact-source replay from changed/unknown evidence under the same stable `source_external_id`. A reviewed changed observation can be linked to the same canonical transaction without rewriting ledger values, entries, reconciliation state or the canonical `transaction_import_provenance` row.

Approved Inbox observations are durable evidence. Browser-role direct DELETE is revoked and browser callers cannot fabricate approved evidence by direct UPDATE or direct INSERT; narrow import-batch FK cleanup and privileged archive reconstruction remain compatible.

## Durable contracts

- live same source ID + same canonical fingerprint/version → hard `source_external_id_match`;
- live same source ID + changed/missing evidence → hard `source_external_id_changed`;
- reviewed changed-observation resolution changes candidate resolution/linkage only;
- exact-source reasons cannot escape through heuristic duplicate override;
- candidate history remains the source-observation history; canonical provenance remains one row per financial transaction;
- no financial mutation audit event is created for an observation-only resolution;
- tenant isolation, replay safety, archive restore and import-batch cleanup remain enforced.

## Evaluation and fixes

Independent review found and fixed: pgTAP plan mismatch; direct heuristic-override escape; stale-plan UI fail-open; archive restore incompatibility; browser fabricated approved UPDATE; and, after the first green ready head, a direct browser INSERT path that could fabricate an approved observation. The final guard runs on `BEFORE INSERT OR UPDATE` and has a direct-insert pgTAP counterexample.

## Final verification

Exact candidate head `237aac8d771dd5f8ba57db5fa44d7309ce571245`:

- CI #2792: success — policy/knowledge/diff hygiene, migration identity, lint/typecheck/unit/static RLS, production build, fresh Supabase reset + pgTAP, archive producer/restore round trips, browser smoke, authenticated ownership smoke, cross-device UI audit, aggregate `verify` and `e2e`;
- CodeQL #1851: success;
- Secret history #1851: success;
- no retry required.

## Deferred next boundary

Different-ID source replacement/predecessor identity, source lifecycle state and any source-to-ledger clearing/reconciliation policy were intentionally deferred. Those require explicit source-supplied lineage; MoneyFlow must not infer successor identity heuristically.
