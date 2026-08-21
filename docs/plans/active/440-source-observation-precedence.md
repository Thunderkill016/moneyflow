# #440 — Source observation precedence

**Status:** active
**Execution state:** planned
**Change class:** Class 3 — financial import/provenance boundary
**Parent:** #432 P1 Acquisition Foundation
**Active role:** planner / implementer
**Permission scope:** focused `branch_write` only; no provider, production-data, deployment or main writes
**Branch:** `feat/440-source-observation-precedence`
**Base:** `main@d5324c473c2453869dc45dcd4cf5634ecbf97ea3`
**Owner:** human owner

## Outcome

When a live canonical imported transaction is observed again under the same stable source ID but the source evidence changed, MoneyFlow must preserve that later observation without silently overwriting the user-owned ledger. The reviewed result links the observation to the same ledger fact while keeping the original canonical provenance anchor and all ledger/reconciliation values unchanged.

This is the fourth bounded P1 Acquisition Foundation slice after #435, #437 and #439.

## Repository reconnaissance

Current main after #439 proves:

- `transaction_import_provenance` is one canonical identity/provenance row per financial transaction, with a unique `(user_id, source, source_external_id)` identity when an external ID exists;
- `inbox_candidates` already persists each source observation with source/external ID, versioned fingerprint, parser/mapping provenance, match decision and `approved_transaction_id`;
- multiple candidates can resolve to the same transaction without adding a second canonical provenance row; #439 already does this for reviewed deleted-source restoration;
- the full archive already serializes all Inbox candidates and their approval/provenance fields;
- `plan_inbox_candidate()` currently distinguishes deleted unchanged/changed evidence but still returns generic `source_external_id_match` for every live same-ID observation;
- user transaction edits mutate ledger rows/entries without rewriting canonical source provenance;
- financial audit records structural financial mutations only, so an observation-only resolution should create no fake financial audit event;
- authenticated candidate mutation is currently broad enough that approved evidence could be rewritten, which matters if approved candidates are the durable observation history;
- deleting an import batch intentionally nulls candidate `import_batch_id`, so evidence hardening must preserve that FK cleanup path.

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

Applicability: these sources establish that source transaction data evolves and identity/update lifecycle must be explicit. They do **not** select a MoneyFlow provider or authorize provider connectivity. MoneyFlow keeps user-correction precedence and does not adopt Actual's imported-data-over-user-data rule.

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

Add one authenticated RPC that:

1. derives `auth.uid()` and locks the pending candidate;
2. rejects manual/no-external-ID candidates;
3. locks canonical provenance and the owned target transaction;
4. requires same user + source + source external ID and a live target;
5. requires evidence to differ/be unknown relative to canonical fingerprint/version;
6. recomputes planning and requires `source_external_id_changed` for the reviewed target;
7. performs **no update** to financial transaction, transaction entries, reconciliation rows or canonical `transaction_import_provenance`;
8. marks only the repeat candidate approved/linked to the same transaction with match reason `source_external_id_changed_observation`;
9. is replay-safe when that candidate is already resolved to that target;
10. creates no financial mutation audit record because no financial mutation occurred.

### Durable observation evidence

Once an Inbox candidate is approved as source evidence, its source/financial observation and approval fields become immutable.

A database guard must reject direct DELETE of approved candidates and reject evidence-changing UPDATEs. It may allow the existing referential cleanup that changes only `import_batch_id` from non-null to null when an import batch is deleted, plus trigger-managed `updated_at`. Pending candidates remain reviewable through existing flows.

### UX

- `source_external_id_changed` is a hard server duplicate; ordinary “Duyệt vào sổ” and heuristic duplicate override remain blocked.
- Review copy states that the source sent the same transaction ID with changed evidence and MoneyFlow will not overwrite the ledger automatically.
- Explicit action: **“Ghi nhận cập nhật nguồn”**.
- The action explains that it links the newer source observation to the existing transaction while keeping MoneyFlow amount/date/account/category/note/reconciliation unchanged.
- Demo mode makes no server provenance claim.

### Deferred boundary

This slice does not model provider-specific predecessor/replacement identity, pending→posted across different IDs, sync cursors, source lifecycle state, or automatic clearing/reconciliation changes. A future adapter may carry explicit provider predecessor linkage when the provider supplies it; MoneyFlow must not infer different-ID lineage through fuzzy similarity.

## Implementation plan

1. Add database counterexamples for live same-ID unchanged vs changed evidence and observation-only resolution.
2. Extend the latest `plan_inbox_candidate()` without disturbing #439 deleted precedence.
3. Add reviewed changed-observation resolution RPC with tenant/replay/target/evidence checks.
4. Add an approved-candidate evidence immutability guard while preserving batch-delete FK nulling.
5. Update migration identity and SECURITY DEFINER inventory without weakening checkers.
6. Add dry-run messaging, authenticated server action and explicit Inbox review CTA.
7. Add unit/static/UI contracts for hard-source blocking and source-observation copy.
8. Verify archive/batch cleanup compatibility and no financial-audit mutation for observation-only resolution.
9. Open a focused PR, add its mandatory PR-memory record, run exact-head Class 3 CI + CodeQL + secret scan, and independently evaluate source overwrite, replay, tenant leakage, evidence mutability and stale-plan races.

Rollback: revert the #440 PR. #435/#437/#439 acquisition semantics remain intact.

## Tasks

| ID | Task | Status |
|---|---|---|
| 440.1 | close/archive #438 and inspect merged main | done |
| 440.2 | focused official source-update research | done |
| 440.3 | choose observation-history architecture | done — reuse candidates |
| 440.4 | persist #440 issue/branch/packet/board | implementing |
| 440.5 | add database counterexamples | pending |
| 440.6 | implement changed-source planning + reviewed resolution | pending |
| 440.7 | harden approved observation evidence | pending |
| 440.8 | add server/UI review path | pending |
| 440.9 | unit/static/archive compatibility coverage | pending |
| 440.10 | exact-head Class 3 evaluation | pending |
| 440.11 | owner merge handoff | pending |

## Evaluation

Required counterexamples before owner handoff:

- live same-ID + same fingerprint/version stays ordinary hard duplicate;
- live same-ID + changed or missing fingerprint becomes `source_external_id_changed`;
- deleted same-ID behavior remains exactly #439;
- observation resolution changes candidate resolution/linkage only;
- canonical provenance, transaction/entries and reconciliation snapshots are unchanged;
- no financial audit event is created by the observation-only operation;
- replay returns the same transaction without another mutation;
- cross-tenant, wrong target/source/ID, manual candidate, deleted target and unchanged evidence are rejected;
- approved candidate source/evidence fields cannot be rewritten or deleted;
- import-batch deletion can still null the approved candidate's batch FK without altering source evidence;
- hard source identity cannot escape through heuristic override or ordinary approval;
- no provider/native capability is claimed.

Stop and return to specification if preserving changed observations requires rewriting ledger values, adding provider assumptions, or creating a second source of financial truth.