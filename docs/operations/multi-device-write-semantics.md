# Multi-device write semantics — current truth

Status: observed current behavior, recorded 2026-09-23. This document describes what the
system does today; it is not a decision to change it.

## Model: last-write-wins per row

Every mutation path funnels through a `security definer` RPC keyed by `auth.uid()`.
Update RPCs (`update_money_transaction`, `upsert_monthly_budget`,
`upsert_savings_goal`, `upsert_recurring_commitment`, `upsert_recurring_income_template`,
`update_financial_account`, …) take the target row `for update`, so two concurrent
calls serialize — but **no RPC accepts a version/`updated_at` precondition**. Whichever
call commits last wins, and the loser is silently overwritten with no conflict signal
to either device.

Practical consequence: the same account open on phone + laptop (or a tab left stale)
can silently discard the earlier edit. The probability rises with session length, not
with concurrency.

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

- No `If-Unmodified-Since`/version field on any update RPC.
- No conflict surface in the UI — a stale tab cannot tell its model is outdated.
- No realtime channel; the other device learns only on next load/refetch.

## If this ever needs to change (Class 3 — owner decision required)

Smallest honest increment: add `expected_updated_at timestamptz` (optional) to the
update RPCs; when supplied and stale, reject with `stale_write` and let the client
surface "bản ghi đã đổi ở nơi khác — tải lại?" instead of overwriting. That is an
optimistic-concurrency check, not CRDT/merge — field-level merge for money rows is
deliberately out of scope unless a measured need appears.

Do not implement opportunistically: it changes the write contract (caller-visible
invariant) and needs the risk-class packet plus owner sign-off.
