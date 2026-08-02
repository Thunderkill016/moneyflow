# Tasks: Transaction date and amount filters

- **Spec:** `specs/002-transaction-range-filters/spec.md`
- **Plan:** `specs/002-transaction-range-filters/plan.md`
- **Work packet:** not required
- **Current phase:** implementation
- **Last updated:** 2026-08-03

## Reconnaissance and specification

- [x] T001 Inspect current transaction route, client surface, filter behavior and tests.
  - Permission: read_only
  - Evidence: current source SHAs and PR #223 patch review
- [x] T002 Confirm Class 2 scope and no database/RLS/provider impact.
  - Permission: read_only
  - Evidence: accepted spec and plan
- [x] T003 Write the current-main feature specification, plan and requirements checklist.
  - Permission: branch_write
  - Evidence: `specs/002-transaction-range-filters/**`

## Domain and route contracts

- [x] T010 Add pure date/amount normalization, validation, composition and URL serialization in `src/lib/transaction-filters.ts`.
  - Depends on: T003
  - Permission: branch_write
  - Evidence: pure helper with integer comparisons
- [x] T011 Add focused unit contracts in `src/lib/transaction-filters.test.ts`.
  - Depends on: T010
  - Permission: branch_write
  - Evidence: inclusive bounds, split category, transfer destination, invalid ranges and canonical URL tests
- [x] T012 Normalize supported query parameters in `src/app/transactions/page.tsx`.
  - Depends on: T010
  - Permission: branch_write
  - Evidence: route passes only validated initial filter state

## UI and correction context

- [x] T020 Compose all filters before totals and pagination in `src/components/transactions-page.tsx`.
  - Depends on: T010
  - Permission: branch_write
  - Evidence: existing operations remain owned by `useTransactions`
- [x] T021 Add accessible date/amount controls, validation and clear behavior.
  - Depends on: T020
  - Permission: branch_write
  - Evidence: named inputs, textual error, canonical URL state
- [x] T022 Preserve filters after edit and explain when a corrected row leaves the result set.
  - Depends on: T020
  - Permission: branch_write
  - Evidence: correction notice and URL state
- [x] T023 Add scoped 4/2/1 responsive layout in `src/components/transactions-page.module.css`.
  - Depends on: T021
  - Permission: branch_write
  - Evidence: 44px controls and bounded grid

## Browser evidence

- [x] T030 Add `e2e/transaction-range-filters.spec.ts` for inclusive filtering, URL restoration, correction context and invalid bounds.
  - Depends on: T020–T023
  - Permission: branch_write
  - Evidence: desktop/mobile Playwright projects

## Delivery

- [ ] T090 Open a draft current-main replacement PR and add its bounded PR memory.
- [ ] T091 Replace PR #223 in current open-PR memory and close #223 as superseded.
- [ ] T092 Pass exact-head CI, CodeQL and secret-history scanning.
- [ ] T093 Evaluate acceptance criteria and responsive/browser artifacts.
- [ ] T094 Mark ready-for-review with remaining limitations and owner-only merge action.
