# Multi-device write semantics — current truth

Status: observed current behavior, recorded 2026-09-23; optimistic-concurrency
preconditions added 2026-09-23 (`update_money_transaction`), 2026-10-06
(`update_account_transfer`, then the batch: `update_financial_account`,
`upsert_monthly_budget`, `upsert_recurring_commitment`, `upsert_savings_goal`,
`upsert_recurring_income_template`). This document describes what the
system does today; it is not a decision to change it.

## Model: last-write-wins per row, with optional version preconditions

Every mutation path funnels through a `security definer` RPC keyed by `auth.uid()`.
The update RPCs take the target row `for update`, so two concurrent calls
serialize — and the following now accept an optional
`p_expected_updated_at timestamptz` precondition:
`update_money_transaction`, `update_account_transfer`, `update_financial_account`,
`upsert_monthly_budget`, `upsert_recurring_commitment`, `upsert_savings_goal`,
`upsert_recurring_income_template`.

When the precondition is supplied, the RPC compares it against the row's
`updated_at` under the row lock **before any write**: a mismatch raises
`stale_write` and nothing lands (fail closed); a match writes normally. When the
precondition is omitted (`null`), the previous last-write-wins behavior is kept
for bulk tools and older clients that carry no version. The edit UIs forward the
`updated_at` they read when the edit dialog opened, and map `stale_write` to
"Dữ liệu đã được thay đổi ở nơi khác, hãy tải lại và thử lại."

Practical consequence: a tab left stale no longer silently discards the newer
edit — it fails with an honest conflict message instead. Rows never read by an
edit UI (archive toggles, `adjust_savings_goal` allocations, carry-forward
budget creation) still follow last-write-wins.

## What already limits the blast radius

- **Idempotency keys on create** (`create_money_transaction`, transfer, split) —
  retried submissions cannot duplicate rows.
- **Soft delete + audit events** — an overwritten/deleted row is recoverable in
  principle, and `financial_mutation_audit_events` records each mutation, so a silent
  overwrite is at least traceable after the fact.
- **Advisory locks** serialize the heavy paths (archive restore, reconciliation
  completion) per tenant.
- **Restore/replace semantics are explicit** — `restore_user_archive` refuses a
  non-empty tenant and records `archive_restore_batches`, so archive operations never
  merge into live state silently.

## What does not exist

- No `If-Unmodified-Since`/version field on the remaining RPCs (archive
  toggles, deletes, `adjust_savings_goal` allocations, payment/record flows) —
  those still serialize on row locks and fail with business-rule errors, not
  silent overwrites of editable fields.
- No conflict surface in the UI beyond the stale-write message — a stale tab
  cannot tell its model is outdated until it tries to save.
- No realtime channel; the other device learns only on next load/refetch.

## If this ever needs to change (Class 3 — owner decision required)

Smallest honest increment: add `expected_updated_at timestamptz` (optional) to the
update RPCs; when supplied and stale, reject with `stale_write` and let the client
surface "bản ghi đã đổi ở nơi khác — tải lại?" instead of overwriting. That is an
optimistic-concurrency check, not CRDT/merge — field-level merge for money rows is
deliberately out of scope unless a measured need appears.

Do not implement opportunistically: it changes the write contract (caller-visible
invariant) and needs the risk-class packet plus owner sign-off.

*Done 2026-10-06 (owner-approved batch, packet
`docs/plans/rpc-concurrency-batch-2026-10-06.md`): the increment above now covers
all seven editable-row RPCs — `update_money_transaction`, `update_account_transfer`,
`update_financial_account`, `upsert_monthly_budget`, `upsert_recurring_commitment`,
`upsert_savings_goal`, `upsert_recurring_income_template`.*
