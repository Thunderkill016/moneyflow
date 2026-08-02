# Account reconciliation contract

- **Execution state:** evaluating
- **Active role:** database/domain evaluator
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
- split expenses can have multiple category entries for one transaction/account leg;
- financial mutations use SECURITY DEFINER RPCs;
- browser roles cannot directly mutate ledger entries;
- pgTAP already locks transfer, split, idempotency and recovery laws;
- reconciliation state, sessions and history did not exist on the audited `main`;
- tenant purge enumerates persisted user-owned tables.

## Research

### Decision question

Where must reconciliation state live so transfer legs, split allocations, corrections and statement balances remain correct?

### Sources and applicability

- Merged schema, RPCs, views and pgTAP establish executable truth.
- Issue #53 establishes pending/cleared/reconciled states, statement balance and adjustment requirements; old status claims do not override current code.
- Supabase/PostgreSQL guidance supports migration-first DDL, RLS, explicit grants, indexed ownership and transactional locking.
- External products are pattern references only; no third-party code was copied.

### Result

State is represented on `transaction_entries` but synchronized per transaction/account leg. Transfer legs in different accounts remain independent; sibling split allocations in one account move together.

## Specification

### Account-leg states

- `pending`: not cleared;
- `cleared`: selected for a statement but still correctable;
- `reconciled`: locked by a completed session.

Manual changes are pending ↔ cleared. Only zero-difference completion assigns reconciled. A deferred consistency trigger rejects mixed sibling state within one transaction/account leg.

### Session calculation

A session belongs to one account and records statement date, integer statement balance, status and completion snapshot.

`cleared balance = initial balance + active cleared/reconciled entries through statement date`

`difference = statement balance - cleared balance`

Completion rejects every non-zero difference and locks affected parent transactions against concurrent correction.

### Correction, lock and reopen

- amount/account/category/date correction or soft deletion resets a cleared leg to pending;
- reconciled transactions reject edit and soft delete;
- a transfer locks as a whole when either leg is reconciled;
- initial balance cannot change after reconciliation starts;
- discrepancies use real income/expense transactions, never direct balance writes;
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
- this PR performs no production DDL.

### Acceptance criteria

1. New entries default pending.
2. Transfer legs remain independent.
3. Split siblings move as one account leg.
4. One account has at most one open session.
5. Completed statement dates are monotonic.
6. Summary returns cleared balance, exact difference and account-leg counts.
7. Non-zero difference cannot complete.
8. Completion serializes against edit/delete and links eligible cleared legs only.
9. Corrections reset cleared state; reconciled transactions cannot edit/delete.
10. Initial balance overwrite is rejected.
11. Latest session reopens; older sessions do not.
12. Every transition appends history.
13. Tenant B cannot access tenant A data; purge leaves none behind.
14. Fresh migration replay and the full pgTAP suite pass.

## Implementation plan

1. Add enums, sessions/events and entry metadata.
2. Add ownership constraints, indexes, RLS and grants.
3. Add summary model and start/state/complete/reopen RPCs.
4. Add account-scoped serialization and transaction-row locks.
5. Add correction normalization and split-leg consistency.
6. Extend tenant purge.
7. Lock behavior with permanent pgTAP and update project memory.

## Tasks

- [x] Read-only schema/RPC/view/RLS/migration reconnaissance.
- [x] Select account-leg state model.
- [x] Add versioned migrations.
- [x] Add 92 reconciliation assertions.
- [x] Add mandatory `PR-222.md` record.
- [x] Fix portable pgTAP and SECURITY DEFINER inventory findings.
- [x] Add transaction serialization, split-leg and correction hardening.
- [x] Pass fresh local reset and full pgTAP on the complete implementation head.
- [x] Update current project snapshot to post-merge truth.
- [x] Review locks, grants, ownership, purge and mutation behavior.
- [ ] Confirm final post-memory exact-head checks.
- [ ] Owner review and merge decision.

## Evaluation

### Included

Schema/domain contract, state transitions, serialization, mutation locks, split-leg consistency, correction reset, summary view, history, RLS, grants, purge and database tests.

### Excluded

UI, account register, Server Actions, matching, reminders, bank sync, direct balance adjustment and production deployment.

### Findings resolved

- A clear/complete race was closed with account-scoped advisory locks and parent transaction locks.
- Partial split reconciliation was closed by synchronizing every sibling entry for a transaction/account leg.
- Edited or deleted cleared transactions now return to pending.
- pgTAP portability and the explicit SECURITY DEFINER inventory were corrected without changing domain semantics.

### Rollback

Before deployment, close/delete the branch. After deployment, preserve history and use corrective forward migrations rather than dropping reconciliation data.

### Verification selection

- knowledge and CI-policy contracts;
- fresh migration replay + complete pgTAP;
- CodeQL and secret-history scan;
- browser checks not applicable because no UI behavior is claimed.

## Handoff record

- 2026-08-02: owner authorized Wave 1 reconciliation implementation.
- 2026-08-02: production inspected read-only; no provider/data mutation.
- 2026-08-02: account-leg model selected for transfer and split correctness.
- 2026-08-02: PR #222 opened with migrations, tests and bounded memory.
- 2026-08-02: complete implementation head passed fresh reset and pgTAP; snapshot moved reconciliation from absent to partial.

### Current permission boundary

Branch and PR writes only. No merge, production migration, provider change or production data mutation is authorized.
