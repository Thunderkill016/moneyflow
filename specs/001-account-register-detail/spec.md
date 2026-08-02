# Feature Specification: Account register and detail

**Status:** accepted  
**Owner:** Thunderkill016  
**Created:** 2026-08-02  
**Last updated:** 2026-08-02

## Problem and outcome

The account list shows each current and initial balance, but users cannot open one account and inspect the ledger movements behind it. The full transaction manager can be filtered manually, but the account workflow has no direct detail/register path.

The outcome is a read-only account register reachable from every visible account. It shows account identity, trusted current/initial balance, separate income/expense/transfer movement totals, and only the transactions related to that account.

This feature follows the owner decision recorded when PR #222 was closed: reconciliation is not the current priority; account detail and transaction-correction workflows are. It MUST NOT revive statement matching, cleared/reconciled states or direct balance adjustment.

## User stories

### US1 — Open one account register (P1)

As a MoneyFlow user, I can open an account from the account list so that I can see which ledger movements relate to it.

Acceptance scenarios:

1. An active account opens at `/accounts/<account-id>` and shows name, type, currency, current balance and initial balance.
2. Related transactions include transactions where the account is the source or a transfer destination.
3. An incoming transfer is positive and labeled `Nhận từ`.
4. An outgoing transfer is negative and labeled `Chuyển đến`.
5. An archived account remains readable and its state is explicit.
6. An inaccessible account returns the same generic not-found state as an unknown ID.

### US2 — Understand movement composition (P1)

As a MoneyFlow user, I can distinguish income, expense, transfer-in and transfer-out so internal transfers are not mistaken for earnings or spending.

Acceptance scenarios:

1. Income includes only income transactions whose source is the account.
2. Expense includes only expense transactions whose source is the account.
3. Transfers remain separate from income and expense.
4. An account with no related transaction keeps its trusted balance and shows an empty register.
5. A history-load error does not present zero movement totals as verified data.

## Required states and edge cases

- Loading: App Router server render; no fabricated data.
- Empty: account identity/balance plus an honest no-movement message.
- Populated: newest-first groups by transaction date.
- Error: trusted account balance may remain visible, but unverified movement totals/register are hidden.
- Recovery: read-only; no destructive action.
- Long content: account names, notes and large integer money wrap without horizontal overflow.
- Responsive: phone/tablet/desktop supported; interactive targets at least 44px.
- Accessibility: semantic headings, named links and signed text; meaning does not rely on color.

## Functional requirements

- **FR-001:** Active and archived accounts MUST expose a keyboard-accessible `Xem sổ` link.
- **FR-002:** The route MUST authorize through existing viewer-scoped server loaders and MUST NOT trust a client ownership claim.
- **FR-003:** The implementation MUST reuse validated account summaries and the existing transaction feed.
- **FR-004:** Account-related rows MUST include source and transfer-destination legs.
- **FR-005:** Income and expense impacts apply only to the source account.
- **FR-006:** Transfer source impact is negative and destination impact positive, while transfer totals remain outside income/expense.
- **FR-007:** Rows MUST sort by `occurredOn`, then `occurredAt`, newest first.
- **FR-008:** The page MUST show account type, currency, initial balance, current balance and archived state.
- **FR-009:** Mutation ownership MUST remain on existing transaction/account surfaces; this register is read-only.
- **FR-010:** The feature MUST work in authenticated and demo modes.

## Financial, data and security constraints

- Money remains safe integer minor units.
- Existing derived account balance remains authoritative.
- No schema, migration, RLS, grant, RPC, provider or production-data change.
- No direct balance edit or reconciliation state.
- Existing RLS-backed loaders remain the ownership boundary.
- No secret or personal-data logging is added.

## Success criteria

- **SC-001:** Every account card has a direct accessible register path.
- **SC-002:** Unit tests prove source/destination transfer impacts and transfer-neutral income/expense totals.
- **SC-003:** Browser tests prove populated, empty, inaccessible and phone-width behavior.
- **SC-004:** Final diff contains no database, reconciliation, provider or transaction-mutation change.

## Out of scope

- Reconciliation, statement import/matching or cleared/reconciled states.
- Editing/deleting transactions from the account register.
- Charts, trends, date filters or account export.
- New database queries/indexes/RPCs.
- Cross-currency conversion.

## Clarifications

| Date | Question | Decision | Evidence |
|---|---|---|---|
| 2026-08-02 | Revive PR #222 reconciliation? | No | Owner closing decision moved priority to account detail/correction |
| 2026-08-02 | Duplicate transaction editing? | No | Existing transaction manager remains the mutation owner |

## Acceptance

- [x] Current code and owner decision history were inspected.
- [x] User stories and failure states are independently testable.
- [x] Financial/security implications and out-of-scope behavior are explicit.
- [x] Owner instruction authorizes implementation on a focused branch.
