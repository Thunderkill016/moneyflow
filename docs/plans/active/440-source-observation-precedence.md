# #440 — Source observation precedence

**Status:** active
**Execution state:** evaluating
**Change class:** Class 3 — financial import/provenance boundary
**Parent:** #432 P1 Acquisition Foundation
**Active role:** implementer / evaluator
**Permission scope:** focused `branch_write` only; no provider, production-data, deployment or main writes
**Branch:** `feat/440-source-observation-precedence`
**PR:** #441
**Base:** `main@d5324c473c2453869dc45dcd4cf5634ecbf97ea3`
**Owner:** human owner

## Outcome

When a live canonical imported transaction is observed again under the same stable source ID but the source evidence changed, MoneyFlow preserves that later observation without silently overwriting the user-owned ledger. The reviewed result links the observation to the same ledger fact while keeping the original canonical provenance anchor and all ledger/reconciliation values unchanged.

This is the fourth bounded P1 Acquisition Foundation slice after #435, #437 and #439.

## Repository reconnaissance

Current main after #439 proves:

- `transaction_import_provenance` is one canonical identity/provenance row per financial transaction, with a unique `(user_id, source, source_external_id)` identity when an external ID exists;
- `inbox_candidates` already persists each source observation with source/external ID, versioned fingerprint, parser/mapping provenance, match decision and `approved_transaction_id`;
- multiple candidates can resolve to the same transaction without adding a second canonical provenance row; #439 already does this for reviewed deleted-source restoration;
- the full archive already serializes all Inbox candidates and their approval/provenance fields;
- `plan_inbox_candidate()` distinguishes deleted unchanged/changed evidence but, before this slice, returned generic `source_external_id_match` for every live same-ID observation;
- authenticated Inbox financial approval already runs through `approve_inbox_candidate()`; client persistence reads the server-approved candidate before considering any direct candidate patch;
- financial audit records structural financial mutations only, so an observation-only resolution must create no fake financial audit event;
- deleting an import batch intentionally nulls candidate `import_batch_id` through FK `ON DELETE SET NULL`;
- archive restore inserts candidates before self-referential `transfer_pair_id` links exist, then performs one privileged phase-two UPDATE to restore those links.

Architecture decision: **reuse `inbox_candidates` as the source-observation history in this slice.** Do not create a new observation table unless implementation/testing disproves that fit. `transaction_import_provenance` remains the canonical identity anchor.

## Research

Focused official references:

1. Plaid transaction states — https://plaid.com/docs/transactions/transactions-data/
   - pending→posted can remove one ID and add another posted transaction;
   - amount/name can change and pending transactions can disappear;
   - posted transactions are not guaranteed immutable.
2. Plaid Transactions Sync — https://plaid.com/docs/transactions/sync-migration/
   - source streams expose added/modified/removed patches behind a cursor;
   - incremental source observations must be applied in order by an adapter, not treated as immutable rows.
3. Actual Budget API — https://actualbudget.org/docs/api/reference/
   - stable `imported_id` prevents duplicate creation;
   - import supports reconciliation/dry-run/reimport and can report updated transactions.
4. PostgreSQL trigger/constraint behavior — official `CREATE TRIGGER` and referential-action documentation:
   - `ON DELETE SET NULL` is implemented as an UPDATE of the referencing row and fires row triggers;
   - `SECURITY DEFINER` changes `current_user` to the function owner while the function executes.

Applicability: source transaction data evolves and identity/update lifecycle must be explicit. Those sources do **not** select a MoneyFlow provider or authorize provider connectivity. MoneyFlow keeps user-correction precedence and does not adopt imported-data-over-user-data precedence.

Rejected design for this slice: a new `source_observations` table. Existing candidates already carry the needed observation payload/linkage and are included in archive/restore. A new table would duplicate identity, enlarge purge/archive/restore/RLS surface and create another source representation before evidence requires it.

## Specification

### Planning precedence

For a pending non-manual candidate with `source_external_id` and canonical provenance on a **live** target:

1. if candidate fingerprint/version and canonical fingerprint/version are both present and equal, return existing hard duplicate `source_external_id_match`;
2. otherwise return hard duplicate `source_external_id_changed`, confidence `1`, with the canonical transaction ID;
3. preserve #439 deleted precedence unchanged: `source_external_id_deleted_match` and `source_external_id_deleted_changed`;
4. exact source identity remains stronger than fingerprint fallback, transfer heuristics and existing-ledger fallback.

Missing fingerprint on either side is treated as changed/unknown evidence, never proof of an unchanged replay.

### Reviewed changed-observation resolution

`record_changed_source_observation_from_candidate(candidate_id, transaction_id)` must:

1. derive `auth.uid()` and lock the pending candidate;
2. reject manual/no-external-ID candidates;
3. lock canonical provenance and the owned target transaction;
4. require same user + source + source external ID and a live target;
5. require evidence to differ/be unknown relative to canonical fingerprint/version;
6. recompute planning and require `source_external_id_changed` for the reviewed target;
7. perform **no update** to financial transaction, transaction entries, reconciliation rows or canonical `transaction_import_provenance`;
8. mark only the repeat candidate approved/linked to the same transaction with match reason `source_external_id_changed_observation`;
9. be replay-safe when that candidate is already resolved to that target;
10. create no financial mutation audit record because no financial mutation occurred.

### Durable observation evidence

Approved Inbox candidates are durable acquisition observations.

- authenticated browser role cannot rewrite an approved row and cannot directly DELETE candidate evidence;
- browser-role `pending/rejected → approved` UPDATE is rejected; legitimate financial/source resolution transitions happen inside reviewed SECURITY DEFINER RPCs;
- import-batch deletion remains compatible: the guard permits only `import_batch_id` non-null→null while all other approved evidence stays identical (apart from trigger-managed `updated_at`);
- archive restore remains compatible: after approved candidates are inserted, exactly one phase-two `transfer_pair_id` null→non-null repair is permitted only when `current_user` is the actual owner of `restore_user_archive(jsonb)` and every other evidence field is unchanged;
- that archive exception does not trust `authenticated`, `service_role`, or an arbitrary caller-provided flag.

Pending candidates remain reviewable through existing flows.

### Server approval hardening

`p_allow_heuristic_duplicate=true` is only a heuristic escape hatch. `approve_inbox_candidate()` must hard-reject all exact-source identity reasons (`source_external_id_match`, `source_external_id_changed`, and both deleted-source reasons) rather than relying on UI controls alone.

### UX

- `source_external_id_changed` is a hard server duplicate; ordinary “Duyệt vào sổ” and heuristic duplicate override remain blocked.
- Review copy states that the source sent the same transaction ID with changed evidence and MoneyFlow will not overwrite the ledger automatically.
- Explicit action: **“Ghi nhận cập nhật nguồn”**.
- The action explains that it links the newer source observation to the existing transaction while keeping MoneyFlow amount/date/account/category/note/reconciliation unchanged.
- after attach/restore/source-resolution errors, the UI refetches the server plan; if that read fails it keeps the prior hard plan rather than dropping the block and exposing ordinary approval.
- Demo mode makes no server provenance claim.

### Deferred boundary

This slice does not model provider-specific predecessor/replacement identity, pending→posted across different IDs, sync cursors, source lifecycle state, or automatic clearing/reconciliation changes. A future adapter may carry explicit provider predecessor linkage when the provider supplies it; MoneyFlow must not infer different-ID lineage through fuzzy similarity.

## Implementation plan

1. Add database counterexamples for live same-ID unchanged vs changed evidence and observation-only resolution.
2. Extend `plan_inbox_candidate()` without disturbing #439 deleted precedence.
3. Add reviewed changed-observation resolution RPC with tenant/replay/target/evidence checks.
4. Add approved-candidate evidence hardening while preserving batch-delete and archive-restore reconstruction.
5. Harden the server approval RPC against exact-source heuristic override.
6. Update migration identity and SECURITY DEFINER inventory without weakening checkers.
7. Add dry-run messaging, authenticated server action and explicit Inbox review CTA.
8. Add unit/static/UI contracts for hard-source blocking and stale-plan safety.
9. Run exact-head Class 3 CI + CodeQL + secret scan and independently evaluate source overwrite, replay, tenant leakage, evidence mutability, archive compatibility and stale-plan races.

Rollback: revert PR #441. #435/#437/#439 acquisition semantics remain intact.

## Tasks

| ID | Task | Status |
|---|---|---|
| 440.1 | close/archive #438 and inspect merged main | done |
| 440.2 | focused official source-update research | done |
| 440.3 | choose observation-history architecture | done — reuse candidates |
| 440.4 | persist #440 issue/branch/packet/board | done |
| 440.5 | add database counterexamples | done |
| 440.6 | implement changed-source planning + reviewed resolution | done |
| 440.7 | harden approved observation evidence + exact-source server override | done |
| 440.8 | add server/UI review path + stale-plan safety | done |
| 440.9 | unit/static/archive compatibility coverage | done — draft checks skipped heavy shards |
| 440.10 | exact-head Class 3 evaluation | implementing |
| 440.11 | owner merge handoff | pending |

## Evaluation

Pre-ready independent review found and fixed four defects without weakening a checker:

1. pgTAP source-observation suite declared 23 tests while containing 24 assertions;
2. direct RPC callers could otherwise use `p_allow_heuristic_duplicate=true` to escape some hard exact-source decisions;
3. attach/restore action failure could clear a hard server plan and accidentally expose ordinary approval in the client;
4. initial approved-evidence immutability blocked archive restore's legitimate phase-two `transfer_pair_id` reconstruction; a narrow function-owner exception plus separate pgTAP compatibility suite now covers that path. The same review also blocks browser fabrication of `approved` status while keeping the real SECURITY DEFINER approval path.

Draft CI #2772 is **not** final evidence: classify ran but unit/build/policy/database/browser/e2e shards were skipped because PR #441 was still draft.

Required counterexamples before owner handoff:

- live same-ID + same fingerprint/version stays ordinary hard duplicate;
- live same-ID + changed or missing fingerprint becomes `source_external_id_changed`;
- deleted same-ID behavior remains exactly #439;
- observation resolution changes candidate resolution/linkage only;
- canonical provenance, transaction/entries and reconciliation snapshots are unchanged;
- no financial audit event is created by the observation-only operation;
- replay returns the same transaction without another mutation;
- cross-tenant, wrong target/source/ID, manual candidate, deleted target and unchanged evidence are rejected;
- approved candidate source/evidence fields cannot be rewritten/deleted by browser role;
- browser cannot fabricate approved status;
- import-batch deletion can still null the approved candidate's batch FK without altering source evidence;
- archive restore can perform only its exact privileged transfer-pair reconstruction and browser role cannot mimic or undo it;
- hard source identity cannot escape through heuristic override or ordinary approval;
- no provider/native capability is claimed.

Stop and return to specification if preserving changed observations requires rewriting ledger values, adding provider assumptions, or creating a second source of financial truth.
