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

Define the database contract and permanent invariants for account reconciliation without building the user interface. Preserve MoneyFlow's derived-balance ledger, tenant isolation, transfer neutrality, integer money and recoverable mutation rules.

## Repository reconnaissance

Verified against merged code and the live schema through read-only inspection:

- balances are `initial_balance_minor + active transaction_entries`;
- transfers are one transaction with two account entries;
- financial mutations use SECURITY DEFINER RPCs;
- browser roles cannot directly mutate ledger entries;
- permanent pgTAP already locks transfer, split, idempotency and recovery laws;
- reconciliation state, sessions and history do not exist on `main`;
- tenant purge enumerates persisted user-owned tables;
- active non-recurring transactions can currently be edited or soft-deleted.

## Research

### Decision question

Where must reconciliation state live so transfers, locks and statement balances remain correct?

### Sources and applicability

- Merged schema, RPCs, views and pgTAP establish MoneyFlow's executable truth.
- Issue #53 establishes the pending/cleared/reconciled, statement-balance and adjustment requirements; old completion status is not treated as current truth.
- Supabase/PostgreSQL guidance supports migration-first DDL, RLS on user-owned tables, explicit grants and indexed ownership paths.
- External finance products are pattern references only; no third-party code is copied.

### Result

State belongs to each `transaction_entries` row. A transfer's source and destination legs may reconcile independently because they belong to different account statements.

## Specification

### Entry states

- `pending`: not cleared;
- `cleared`: selected for a statement but still mutable;
- `reconciled`: locked by a completed session.

Manual changes are limited to pending ↔ cleared. Only zero-difference completion may assign reconciled.

### Session calculation

A session belongs to one account and records statement date, integer statement balance, status and completion snapshot.

`cleared balance = initial balance + active cleared/reconciled entries through statement date`

`difference = statement balance - cleared balance`

Completion rejects every non-zero difference.

### Lock and reopen

- reconciled transactions reject edit and soft delete;
- a transfer locks as a whole when either leg is reconciled;
- initial balance cannot change after reconciliation starts;
- corrections use real income/expense transactions, never direct balance writes;
- only the latest completed session may reopen;
- reopen converts that session's entries back to cleared;
- started/completed/reopened events remain append-only history.

### Security

- composite owner foreign keys prevent cross-tenant links;
- RLS exposes only own sessions/events;
- browser writes are revoked;
- RPCs derive `auth.uid()` and use empty search paths;
- internal helpers/triggers are not Data API callable;
- purge deletes and verifies reconciliation data;
- this branch performs no production DDL.

### Acceptance criteria

1. New entries default pending.
2. Transfer legs can hold independent states.
3. One account has at most one open session.
4. Completed statement dates are monotonic.
5. Summary returns cleared balance, difference and counts.
6. Non-zero difference cannot complete.
7. Completion links only eligible cleared entries.
8. Reconciled transactions cannot edit/delete.
9. Initial balance overwrite is rejected.
10. Latest session reopens; older sessions do not.
11. Every transition appends history.
12. Tenant B cannot access tenant A reconciliation data.
13. Tenant purge leaves no reconciliation rows.
14. Fresh reset and pgTAP pass.

## Implementation plan

1. Add reconciliation enums, session/event tables and entry metadata.
2. Add ownership constraints, indexes, RLS and explicit grants.
3. Add summary read model and start/state/complete/reopen RPCs.
4. Add central transaction/account mutation guards.
5. Extend tenant purge.
6. Lock all behavior with permanent pgTAP.
7. Record PR memory and exact-head evidence.

## Tasks

- [x] Read-only schema/RPC/view/RLS/migration reconnaissance.
- [x] Select per-entry state model.
- [x] Add versioned migration.
- [x] Add 61-assertion pgTAP contract.
- [x] Open draft PR #222.
- [x] Add `PR-222.md` memory record.
- [ ] Resolve exact-head CI findings.
- [ ] Update current project snapshot to post-merge truth.
- [ ] Independently review locking, grants and ownership.
- [ ] Mark ready only after fresh reset + pgTAP are green.

## Evaluation

### Included

Schema/domain contract, state transitions, mutation locks, summary view, history, RLS, grants, purge and database tests.

### Excluded

UI, account register, Server Actions, matching, reminders, bank sync, direct balance adjustment and production deployment.

### Rollback

Before deployment, delete the branch. After deployment, preserve history and use a corrective forward migration rather than dropping reconciliation data.

### Verification selection

- knowledge and CI-policy contracts;
- full static/domain/build gates selected by classifier;
- mandatory fresh migration replay + pgTAP;
- CodeQL and secret-history scan;
- browser checks only if selected; no UI claim.

## Handoff record

- 2026-08-02: owner authorized Wave 1 reconciliation implementation.
- 2026-08-02: production inspected read-only; no provider/data mutation.
- 2026-08-02: per-entry model selected for transfer-leg independence.
- 2026-08-02: draft PR #222 opened with migration, tests and bounded memory record.

### Current permission boundary

Branch and draft-PR writes only. No merge, production migration, provider change or production data mutation is authorized.
