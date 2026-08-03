# Requirements Quality Checklist: Transaction date and amount filters

- **Feature:** `specs/002-transaction-range-filters/spec.md`
- **Created:** 2026-08-03

## Scope and evidence

- [x] The problem is grounded in the current transaction route/client surface.
- [x] Observable outcomes are separated from implementation details.
- [x] PR #223 is candidate evidence only; stale project-memory rewrites are excluded.
- [x] Review state, bulk correction, reconciliation and persistence are explicitly out of scope.

## User scenarios

- [x] Inclusive date and amount boundaries are independently testable.
- [x] Existing text/kind/account/category, split and transfer matching is covered.
- [x] URL restoration, clear behavior and edit context are covered.
- [x] Invalid-range, no-match and existing empty-ledger states are distinguished.

## Financial, data and security

- [x] Integer VND comparison is explicit.
- [x] Transfer neutrality in totals is preserved.
- [x] Existing viewer-scoped loaders, RLS and mutation owners remain unchanged.
- [x] No schema, RPC, provider, secret or production-data impact exists.
- [x] The feature does not imply reconciliation, clearing or verified balances.

## Product and UX

- [x] The feature deepens the existing manual ledger loop.
- [x] Vietnamese validation copy is factual and non-judgmental.
- [x] Controls have accessible names and 44px targets.
- [x] Four/two/one-column responsive behavior is defined.
- [x] Errors and money meaning do not rely on color.

## Measurability and governance

- [x] Requirements map to unit, browser, responsive and scope evidence.
- [x] Change class and no-packet rationale are recorded.
- [x] Owner-only merge/deployment boundaries remain intact.
- [x] Real exact-head CodeQL analysis and secret scan are required.
- [x] No unresolved question blocks implementation.

No requirements-quality finding blocks exact-head verification.
