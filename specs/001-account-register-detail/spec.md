# Feature Specification: Account register and detail

**Feature directory:** `specs/001-account-register-detail/`  
**Status:** accepted  
**Owner:** Thunderkill016  
**Issue/PR:** follow-up to owner priority recorded when PR #222 was closed  
**Created:** 2026-08-02  
**Last updated:** 2026-08-02

> This feature deepens the existing manual-first account workflow. It does not revive the rejected/deferred reconciliation contract from PR #222.

## Problem and Outcome

### Observed problem

The accounts page shows each account's current and initial balance, but the cards only allow edit or archive. A user cannot open one account and inspect the ledger movements that explain its balance. The full transaction page can filter by account manually, but the account workflow has no direct detail/register path.

### Intended outcome

From an account card, the user can open a dedicated account register that shows the account identity, current balance, separate income/expense/transfer movement totals and the account's related transactions in date order.

### Current evidence

| Evidence | What it establishes | Limits |
|---|---|---|
| `src/components/accounts-page.tsx` | Account cards expose balance, edit and archive only | No account-detail navigation |
| `src/server/accounts.ts` | Validated account summaries and derived balances already exist | Does not load ledger history |
| `src/server/finance.ts` | Validated full transaction feed already exists for authenticated and demo modes | Feed is product-wide, not account-scoped |
| PR #222 closing decision | Reconciliation is technically valid but deferred; priority moved to transaction correction and account detail | Cold reference only; no reconciliation schema may be revived |

## User Scenarios and Testing

### User Story 1 — Open one account's register (Priority: P1)

As a MoneyFlow user, I can open an account from the accounts page, so that I can understand which ledger movements explain that account.

**Why this priority:** This closes the missing navigation between balance and supporting history without adding a new financial model.

**Independent test:** Open `/accounts`, choose an active or archived account, and verify the detail route renders only transactions whose source or destination is that account.

**Acceptance scenarios:**

1. **Given** an active account with income, expense and transfers, **When** the user opens its register, **Then** the page shows the account name, type, currency, current balance and all related ledger movements newest first.
2. **Given** an incoming transfer, **When** the destination account register is open, **Then** the row is labeled as received from the source account and has a positive account impact.
3. **Given** the same transfer on the source account, **When** its register is open, **Then** the row is labeled as transferred to the destination and has a negative account impact.
4. **Given** an archived account, **When** the register is opened, **Then** history remains visible and the archived state is explicit.

### User Story 2 — Understand movement composition (Priority: P1)

As a MoneyFlow user, I can distinguish income, expenses and transfers for one account, so that transfers are never mistaken for earnings or spending.

**Independent test:** Use a fixture containing all transaction kinds and verify the summary keeps transfer totals separate from income and expense.

**Acceptance scenarios:**

1. **Given** account-related transactions, **When** the summary is calculated, **Then** income contains only income transactions and expense contains only expense transactions.
2. **Given** incoming and outgoing transfers, **When** the summary is calculated, **Then** transfer-in and transfer-out remain separate and do not change income or expense totals.
3. **Given** no transactions for an account, **When** the register opens, **Then** the current balance remains visible and an honest empty state is shown.

## Edge Cases and Required States

- Loading: handled by the App Router server render; no invented skeleton data.
- Empty: show account identity/balance plus an empty register message.
- Populated: group rows by transaction date and show signed impact for this account.
- Validation/error: invalid or inaccessible account ID returns the route not-found state; workspace failure shows a non-destructive alert.
- Recovery/undo: not applicable because this slice is read-only.
- Long data or large integer VND: account names and transaction notes must wrap; all amounts remain safe integers and use existing MoneyFlow formatting.
- Mobile/tablet/desktop: summary and rows reflow without horizontal clipping; interactive targets are at least 44px.
- Accessibility: semantic headings, list/row labels, explicit archived text and signed amounts that do not rely on color alone.

## Requirements

### Functional Requirements

- **FR-001:** Each active and archived account card MUST provide a clear `Xem sổ` action linking to `/accounts/<account-id>`.
- **FR-002:** The account detail route MUST authorize the viewer through existing server loaders and MUST NOT trust client ownership input.
- **FR-003:** The page MUST use the existing validated account summary and transaction feed rather than introducing a second persistence adapter.
- **FR-004:** Related transactions MUST include transactions where the account is either source or transfer destination.
- **FR-005:** Income and expense impacts MUST apply only when the account is the transaction source account.
- **FR-006:** Transfers MUST produce a negative source-account impact and positive destination-account impact while remaining excluded from income and expense totals.
- **FR-007:** Rows MUST be grouped newest-first by `occurredOn` and `occurredAt`.
- **FR-008:** The page MUST show account type, currency, initial balance, current balance and archived state.
- **FR-009:** The page MUST link back to the accounts list and to the existing full transaction manager without duplicating mutation owners.
- **FR-010:** The feature MUST work in authenticated and demo runtime modes.

### Financial and Data Requirements

- VND and other supported account currencies remain integer minor units.
- Transfers remain neutral to product-wide income/expense semantics.
- Account balance remains the existing derived balance; this feature does not recalculate or overwrite it.
- No schema, migration, RLS, grant, RPC or production-data change.
- No reconciliation, statement balance, cleared/reconciled state or direct balance adjustment.

### Authentication, Security and Privacy Requirements

- Existing `requireViewer`, RLS-backed account loader and transaction-feed loader remain the ownership boundary.
- An unknown or inaccessible UUID must not reveal whether another tenant owns it.
- No secret, provider or personal-data logging is added.

### Product and UX Requirements

- Copy remains Vietnamese, factual and non-judgmental.
- Transfer rows explicitly say `Nhận từ` or `Chuyển đến`.
- Signed values and text communicate direction; color is supplemental only.
- The register is read-only in this slice; transaction mutation remains owned by the existing transaction surface.

## Success Criteria

- **SC-001:** Every account card provides a keyboard-accessible path to its register.
- **SC-002:** Unit tests prove correct source/destination transfer impact and transfer-neutral income/expense totals.
- **SC-003:** Browser evidence proves active, archived, populated and empty register states at phone and desktop widths.
- **SC-004:** No database, RLS, financial mutation or provider file changes appear in the diff.

## Out of Scope

- Reconciliation, statement import/matching or cleared/reconciled states.
- Editing, deleting, bulk correction or review state from the account register.
- New database queries, indexes, migrations or RPCs.
- Charts, trends, arbitrary date filters or account export.
- Cross-currency conversion.

## Assumptions and Dependencies

- Existing account summaries and full finance workspace are sufficient for the first read-only slice.
- PR #226 supplies the Spec Kit adapter and is the stacked base for this feature.
- PR #223 remains a separate transaction-filter candidate; this feature avoids modifying its files.

## Clarifications

| Date | Question | Decision | Decided by | Impact |
|---|---|---|---|---|
| 2026-08-02 | Should reconciliation PR #222 be revived? | No; owner previously closed it as the wrong current priority | Owner record on PR #222 | Account detail stays read-only and schema-free |
| 2026-08-02 | Should the register duplicate transaction editing? | No; link to the existing transaction manager | Repository architecture | One mutation owner remains |

## Unresolved Questions

None blocking this slice.

## Traceability

| Requirement/story | Source or decision | Planned evidence |
|---|---|---|
| US1 / FR-001–FR-004 | Current accounts and finance workspaces | Browser route test and diff review |
| US2 / FR-005–FR-006 | Financial invariants and PR #222 closure | Domain unit tests |
| FR-007–FR-010 | Current App Router/UI patterns | Unit, typecheck, build and responsive browser evidence |

## Spec Acceptance

- [x] Current repository behavior was inspected.
- [x] User stories are independently testable.
- [x] Financial/security/data implications are explicit.
- [x] Required states and accessibility are covered.
- [x] Success criteria are measurable and implementation-independent.
- [x] Out-of-scope behavior prevents reconciliation and mutation scope drift.
- [x] Material questions are resolved.
- [x] Owner instruction authorizes implementation of the accepted plan on a focused branch.