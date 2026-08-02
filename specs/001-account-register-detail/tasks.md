# Tasks: Account register and detail

**Specification:** `specs/001-account-register-detail/spec.md`  
**Plan:** `specs/001-account-register-detail/plan.md`  
**Active work packet:** `docs/plans/active/account-register-detail.md`  
**Current authorized task:** T010–T050 on focused branch  
**Last updated:** 2026-08-02

## Phase 1 — Setup and Reconnaissance

- [x] T001 Inspect current account cards, account workspace, finance workspace and transaction contracts
  - Depends on: none
  - Permission: read_only
  - Evidence: `plan.md` repository reconnaissance
  - Stop condition: current code lacks source/destination account identity

- [x] T002 Confirm reconciliation remains deferred and select Class 2 read-only scope
  - Depends on: T001
  - Permission: read_only
  - Evidence: PR #222 owner closing decision and accepted spec
  - Stop condition: implementation requires persistence or mutation changes

## Phase 2 — Domain Projection

- [ ] T010 [US1] Implement account-leg projection in `src/lib/account-register.ts`
  - Depends on: T002
  - Permission: branch_write
  - Evidence: account-related filtering, signed impacts, newest-first ordering and separate totals
  - Stop condition: transfer changes income/expense totals

- [ ] T011 [P] [US2] Add invariant tests in `src/lib/account-register.test.ts`
  - Depends on: T002
  - Permission: branch_write
  - Evidence: source/destination transfer, income, expense, unrelated account and sorting tests
  - Stop condition: tests require changing transaction contracts

**Checkpoint:** The account register projection is independently testable without React or Supabase.

## Phase 3 — User Story 1: Open one account register

- [ ] T020 [US1] Add authorized route `src/app/accounts/[accountId]/page.tsx`
  - Depends on: T010
  - Permission: branch_write
  - Evidence: UUID validation, existing workspace composition and generic not-found behavior
  - Stop condition: a direct unscoped database query is needed

- [ ] T021 [US1] Add `src/components/account-detail-page.tsx`
  - Depends on: T010, T020
  - Permission: branch_write
  - Evidence: identity, current/initial balance, archived state, movement summary, grouped rows and empty/error states
  - Stop condition: mutation ownership is duplicated

- [ ] T022 [P] [US1] Add scoped responsive styles in `src/components/account-detail-page.module.css`
  - Depends on: T021
  - Permission: branch_write
  - Evidence: no horizontal overflow, wrapping amounts and 44px controls
  - Stop condition: a global override layer or `!important` is required

- [ ] T023 [US1] Add `Xem sổ` links to active and archived cards in `src/components/accounts-page.tsx`
  - Depends on: T020
  - Permission: branch_write
  - Evidence: keyboard-accessible direct route from both account states
  - Stop condition: edit/archive behavior changes

**Checkpoint:** An account can be opened directly and its related ledger is visible read-only.

## Phase 4 — Browser and Delivery Evidence

- [ ] T030 [US1] Add focused browser coverage in `e2e/account-register-detail.spec.ts`
  - Depends on: T021–T023
  - Permission: branch_write
  - Evidence: accounts navigation, populated register, transfer labeling, empty/archived or inaccessible state, phone layout
  - Stop condition: test depends on production data or hidden fixtures

- [ ] T040 Run risk-selected exact-head verification
  - Depends on: T010–T030
  - Permission: branch_write; provider/production writes forbidden
  - Evidence: exact CI, unit, build, browser and UI results
  - Stop condition: any required gate fails or is skipped unexpectedly

- [ ] T041 Evaluate actual diff against spec and constitution
  - Depends on: T040
  - Permission: read_only evaluation
  - Evidence: acceptance table in work packet
  - Stop condition: scope drift, transfer misclassification or ownership leak

- [ ] T050 Open stacked draft PR and create its bounded PR-memory record
  - Depends on: T041
  - Permission: branch_write
  - Evidence: PR, exact-head SHA, `docs/research/pr-memory/2026/Q3/PR-<number>.md`
  - Stop condition: merge/deploy is attempted

## Progress Record

| Task | Status | Owner/role | Evidence | Notes/blockers |
|---|---|---|---|---|
| T001 | done | researcher | plan reconnaissance | Current loaders sufficient |
| T002 | done | planner | spec clarification | Reconciliation explicitly excluded |
| T010 | active | implementer | pending | Start with pure helper |
| T011 | todo | implementer | pending | Parallel-safe with T010 design only |
| T020 | todo | implementer | pending | |
| T021 | todo | implementer | pending | |
| T022 | todo | implementer | pending | |
| T023 | todo | implementer | pending | |
| T030 | todo | implementer | pending | |
| T040 | todo | evaluator | pending | |
| T041 | todo | evaluator | pending | |
| T050 | todo | implementer | pending | |