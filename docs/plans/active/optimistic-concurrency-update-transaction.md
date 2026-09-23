# Optimistic concurrency on `update_money_transaction`

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer (owner delegated: "mày chính là người phát triển sản phẩm này")
**Permission scope:** branch_write
**Owner:** agent (Devin)
**Issue/PR:** #432 (multi-device correctness); spec: `docs/operations/multi-device-write-semantics.md`
**Last updated:** 2026-09-23

## Context

`docs/operations/multi-device-write-semantics.md` records the current truth:
every update RPC takes the row `for update` but accepts **no version
precondition** — last write wins silently. The same document names the
smallest honest increment: an optional `expected_updated_at` on update RPCs
that rejects stale writes with `stale_write` so the client can surface
"bản ghi đã đổi ở nơi khác — tải lại?".

This packet implements that increment on **one** RPC —
`update_money_transaction` — the most-edited entity. Transfers, splits,
budgets, goals, commitments and templates are explicitly out of scope for this
slice; the pattern is proven on one path first.

## Specification

### Behavior

- `transaction_feed` exposes `updated_at` so the client model carries the
  version it read.
- `update_money_transaction` gains `p_expected_updated_at timestamptz
default null` (new signature; the old 9-arg signature is dropped — named-arg
  RPC calls with 9 params still resolve via the default).
- When supplied and the row's `updated_at` differs, the function raises
  `stale_write` — after the existing `for update` lock, so the check is
  serialized and race-free.
- `null` means "no precondition" — identical semantics to today (LWW). Bulk
  tools and older clients keep working.
- `updateTransactionAction` accepts optional `expectedUpdatedAt`, forwards it,
  and maps `stale_write` to a truthful message telling the user to reload.
- `use-transactions` attaches `existing.updatedAt` when submitting an edit, so
  the check is active wherever the edited row was loaded from the feed.

### Financial and security constraints

- `security definer` + `set search_path = ''` + identical grants; only
  `authenticated` may execute.
- The check compares the stored `updated_at` (maintained by
  `transactions_set_updated_at` trigger) — server time, never client time.
- A stale write must fail closed: no partial update, no force flag.
- VND integer, RLS scoping and the recurring/reconciled locks are unchanged.

### Out of scope

- Other update RPCs (`update_account_transfer`, budget/goal/commitment/
  template upserts) — same pattern, later slice if the need is measured.
- Conflict-resolution UI beyond the honest error message (no field merge,
  no CRDT — the ops doc already rules this out).
- Realtime invalidation.

## Tasks

| ID  | Task                                                                                                                                        | Dependency | Evidence                                  | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------- | ------ |
| T1  | Migration: feed view `updated_at` + 10-arg function + drop old signature + grants                                                           | none       | migration file, contract test             | done   |
| T2  | Client wire: feed schema/columns → `Transaction.updatedAt` → action schema/args → `stale_write` message → `use-transactions` passes version | T1         | typecheck, unit tests                     | done   |
| T3  | Contract test pinning signature, ordering (lock→check→update), grants, client mapping                                                       | T1,T2      | `optimistic-concurrency-contract.test.ts` | done   |

## Evaluation

| Criterion                                   | Evidence                             | Result        |
| ------------------------------------------- | ------------------------------------ | ------------- |
| Stale write rejected server-side            | migration review + contract test     | pending merge |
| Backward compat (9-arg callers)             | default param + named-arg resolution | pending merge |
| Client surfaces honest message              | `stale_write` mapping + code         | pending merge |
| No ledger behavior change when param absent | `null` → identical path              | pending merge |

## Handoff record

| Date       | From        | To          | State       | Artifacts/evidence                   | Open risks                                                                                                    | Next allowed action                      |
| ---------- | ----------- | ----------- | ----------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 2026-09-23 | implementer | human_owner | implemented | branch `feat/optimistic-concurrency` | `test:db` against a live DB not run locally; rolling-deploy window relies on PostgREST default-arg resolution | PR review → merge → `test:db` on preview |
