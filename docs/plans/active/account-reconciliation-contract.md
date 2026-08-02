# Account reconciliation contract

- **Execution state:** implementing
- **Active role:** database/domain implementer
- **Permission scope:** branch write + production read-only introspection
- **Owner:** Thunderkill016
- **Branch:** `feat/account-reconciliation-contract`
- **Base:** `main@923fc7b80ada67e548628ef2e85b0837780f9ed3`
- **Risk class:** Class 3 — financial/data/security
- **UI scope:** none in this PR

## Outcome

Define the database contract and permanent invariants for account reconciliation without building the user interface. The contract must preserve MoneyFlow's derived-balance ledger, tenant isolation, transfer neutrality, integer money and recoverable mutation rules.

## Repository reconnaissance

Verified against the live schema and merged repository:

- account balances are `initial_balance_minor + active transaction_entries`;
- transfers are one transaction with two account entries;
- transaction mutations use SECURITY DEFINER RPCs;
- browser roles have read-only access to ledger facts and cannot directly mutate entries;
- existing pgTAP locks transfer, split, idempotency and soft-delete invariants;
- reconciliation tables and states do not exist;
- tenant purge currently enumerates every persisted user-owned table;
- update/delete RPCs can currently mutate any active non-recurring transaction.

## Domain decisions

### State belongs to an account entry

Reconciliation state is attached to `transaction_entries`, not the parent transaction. A transfer has two account legs and each account can receive a different statement on a different date.

States:

- `pending`: not cleared by the user;
- `cleared`: selected for a statement but not locked;
- `reconciled`: included in a completed zero-difference session.

Only completion may create `reconciled` state. Manual state changes are limited to pending ↔ cleared.

### Session and difference

A session belongs to one account and records:

- statement date;
- statement balance in integer minor units;
- open/completed state;
- calculated balance snapshot at completion;
- timestamps.

The live cleared balance is:

`initial account balance + active cleared/reconciled entry amounts through the statement date`

The difference is:

`statement balance - cleared balance`

Completion fails unless the difference is exactly zero.

### Lock and reopen

- A reconciled transaction cannot be edited or soft-deleted.
- A transfer is locked when either account leg is reconciled.
- Initial account balance cannot be changed after any reconciliation starts; corrections must be real financial transactions.
- The latest completed session may reopen.
- Reopening converts only that session's entries from reconciled back to cleared.
- Older sessions cannot reopen after a later completed session.
- Started, completed and reopened events are append-only history.

### Adjustment contract

This PR does not add a direct balance-adjustment API. A non-zero difference must be corrected through an income/expense transaction using the existing financial mutation path, then that entry can be cleared. Direct balance overwrite is explicitly rejected.

## Security contract

- reconciliation sessions and events are user-owned;
- composite ownership foreign keys prevent cross-tenant account/session links;
- RLS exposes only own rows;
- direct browser writes are revoked;
- SECURITY DEFINER RPCs derive `auth.uid()` and use an empty search path;
- helper and trigger functions are not executable through the Data API;
- tenant purge deletes and verifies reconciliation data;
- no production DDL is applied by this branch.

## Acceptance criteria

1. New entries default to pending.
2. A source and destination transfer leg can hold different states.
3. One account has at most one open reconciliation.
4. Statement dates increase after completed sessions.
5. Summary exposes cleared balance, exact difference and entry counts.
6. Completion rejects non-zero difference.
7. Completion links only eligible cleared entries through the statement date.
8. Reconciled transactions reject edit and delete.
9. Initial balance changes reject after reconciliation begins.
10. Latest completion can reopen; older completion cannot.
11. Every transition creates durable event history.
12. Tenant B cannot read or mutate tenant A reconciliation data.
13. Tenant purge leaves no reconciliation rows.
14. Fresh migration replay and pgTAP pass.

## Implementation

- [x] Introspect production schema, views, RLS, functions and migration history read-only.
- [x] Specify per-entry state and session semantics.
- [x] Add versioned migration.
- [x] Add permanent pgTAP contract.
- [ ] Add mandatory PR memory record after draft PR number exists.
- [ ] Update current project memory as candidate evidence only.
- [ ] Run exact-head CI, fresh reset and pgTAP.
- [ ] Independent review of SQL ownership, locks, grants and mutation guards.

## Scope boundaries

Included:

- enums, tables, entry metadata, indexes and ownership constraints;
- RLS/select grants;
- start/state/complete/reopen RPCs;
- transaction/account mutation guards;
- tenant purge integration;
- summary view and append-only events;
- pgTAP.

Excluded:

- account register UI;
- reconciliation screen or Server Actions;
- automatic transaction matching;
- reminders;
- bank import/bank sync;
- direct balance write;
- production migration or deployment.

## Rollback

Before production deployment, rollback is branch deletion. After deployment, this migration is additive and must not be reversed by dropping reconciliation history. A corrective forward migration is required if a contract defect is found.

## Verification plan

- `npm run check:knowledge`
- `npm run test:ci-policy`
- `npm run test:db` on fresh local reset in CI
- full static/domain/build gates selected by classifier
- CodeQL and secret-history scan
- browser checks only if classifier selects them; no UI behavior is claimed

## Handoff record

- 2026-08-02: owner authorized implementation of the first Wave 1 item.
- 2026-08-02: production schema inspected read-only; no provider or data mutation.
- 2026-08-02: per-entry reconciliation model selected to preserve transfer-leg independence.
