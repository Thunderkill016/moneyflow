# Feature Specification: Transaction date and amount filters

- **Feature directory:** `specs/002-transaction-range-filters/`
- **Status:** accepted for implementation
- **Owner:** Thunderkill016
- **Created:** 2026-08-03
- **Last updated:** 2026-08-03
- **Source candidate:** PR #223, re-evaluated against `main@b185bce263589a79f8c7d4d9ff28ad4d73a9726b`

## Problem and outcome

The transaction ledger already supports text, kind, account and category filters, but users cannot bound results by transaction date or amount. They must manually scan long ledgers, and the active filter context is not fully shareable through the URL.

The outcome is an inclusive date-and-amount filter layer that composes with existing filters, keeps filtered totals and pagination truthful, preserves filter context after correction, and exposes canonical URL parameters.

## User stories

### US1 — Bound the visible ledger (P1)

As a MoneyFlow user, I can filter transactions by inclusive start/end date and minimum/maximum amount so that I can review a focused ledger range.

Acceptance scenarios:

1. A transaction exactly on either date boundary remains visible.
2. A transaction exactly on either amount boundary remains visible.
3. Date/amount filters compose with text, kind, account and category filters.
4. Split-category matching and transfer destination-account matching remain intact.
5. Filtered count, income, expense, net and progressive pagination derive from the full matching result set.
6. Invalid date or amount ordering shows a specific Vietnamese error and returns no misleading rows.

### US2 — Keep and share filter context (P1)

As a user, I can reload or share the current ledger URL so that the same supported filters are restored.

Acceptance scenarios:

1. Active text, kind, account, category, date and amount filters serialize to canonical query parameters.
2. Invalid or unknown date/account/category values do not become active state.
3. Clearing filters removes filter parameters without navigating away from the current route.
4. Editing a visible transaction keeps the current filter URL; if the corrected row no longer matches, it disappears and the success notice explains why.

### US3 — Use range controls across supported layouts (P2)

As a keyboard, mobile or enlarged-text user, I can operate the range controls without clipping or relying on color.

Acceptance scenarios:

1. Controls render in four columns on wide layouts, two on intermediate layouts and one on narrow phones.
2. Each input has an accessible name and at least a 44px target.
3. Validation uses textual `role="alert"` feedback.
4. Long Vietnamese text and integer VND values wrap within the owning surface.

## Requirements

### Functional requirements

- **FR-001:** The system MUST support inclusive `from` and `to` transaction-date filters.
- **FR-002:** The system MUST support inclusive non-negative integer minimum and maximum amount filters.
- **FR-003:** All active filters MUST compose deterministically without changing existing split-category or transfer-destination matching.
- **FR-004:** Invalid range ordering MUST NOT be silently swapped.
- **FR-005:** Supported active filters MUST serialize to canonical URL parameters and restore on `/transactions`.
- **FR-006:** Filter changes MUST reset the visible pagination window while totals remain based on all matching rows.
- **FR-007:** Successful correction MUST preserve active filters and explain when the corrected row no longer matches.
- **FR-008:** Clearing filters MUST restore the unfiltered ledger and clean the current route URL.

### Financial, data and security requirements

- VND amounts remain integer minor units; no floating-point conversion is introduced.
- Transfers remain excluded from income and expense totals.
- Filtering is a read-only client projection over the existing viewer-scoped workspace.
- Existing mutation owners, authentication, RLS and tenant isolation remain unchanged.
- No schema, migration, RPC, policy, provider or production-data write is permitted.
- Empty or invalid filter results MUST NOT be represented as reconciled, cleared or verified balances.

### Product and UX requirements

- Vietnamese copy remains factual and non-judgmental.
- Money meaning does not depend on color.
- Existing loading/data-error/empty-ledger behavior remains unchanged.
- The filtered-empty state distinguishes invalid range feedback from a valid no-match result.
- Desktop, tablet, phone, keyboard and enlarged-text behavior are in scope for verification.

## Success criteria

- **SC-001:** Unit contracts prove inclusive bounds and composition with split categories and transfer destinations.
- **SC-002:** Browser evidence proves URL restoration, correction context and invalid-range feedback on desktop and mobile projects.
- **SC-003:** Existing transaction creation, transfer, split, edit, delete/undo, totals and pagination contracts remain green.
- **SC-004:** No database/provider boundary changes appear in the final diff.

## Out of scope

- Transaction review/approval state.
- Multi-select, bulk edit or bulk delete.
- In-place split-line editing.
- Account/statement reconciliation, matching or cleared status.
- Bank integration, new persistence, new dependencies or server-side filter RPCs.

## Assumptions and dependencies

- The current transaction workspace continues to return the bounded viewer-scoped transaction list.
- Stored transaction amounts are positive integer minor units; kind determines income/expense semantics.
- The existing edit owner remains authoritative for correction.

## Clarifications

| Date | Question | Decision | Decided by | Impact |
|---|---|---|---|---|
| 2026-08-03 | Reuse PR #223 or merge it unchanged? | Rebuild from current `main`; retain only feature/runtime evidence and replace stale governance content. | Owner continuation + repository audit | New current-main PR supersedes #223. |
| 2026-08-03 | Does this implement reconciliation or review state? | No. | Existing project direction | Explicitly out of scope. |

## Unresolved questions

None block implementation or verification.

## Traceability

| Requirement/story | Evidence |
|---|---|
| US1 / FR-001–FR-004 | `src/lib/transaction-filters.test.ts`, focused browser assertions |
| US2 / FR-005–FR-008 | `/transactions` route parsing and Playwright correction flow |
| US3 | scoped CSS, mobile browser project and UI audit |
| Financial/data boundary | existing transaction totals plus exact diff review |
