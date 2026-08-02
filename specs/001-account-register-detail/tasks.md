# Tasks: Account register and detail

**Specification:** `specs/001-account-register-detail/spec.md`  
**Plan:** `specs/001-account-register-detail/plan.md`  
**Active work packet:** `docs/plans/active/account-register-detail.md`  
**Current authorized task:** T040–T060 exact-head evaluation and handoff  
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

- [x] T010 [US1] Implement account-leg projection in `src/lib/account-register.ts`
  - Depends on: T002
  - Permission: branch_write
  - Evidence: account-related filtering, signed impacts, newest-first ordering and separate totals
  - Stop condition: transfer changes income/expense totals

- [x] T011 [P] [US2] Add invariant tests in `src/lib/account-register.test.ts`
  - Depends on: T002
  - Permission: branch_write
  - Evidence: source/destination transfer, income, expense, unrelated account and sorting tests
  - Stop condition: tests require changing transaction contracts

**Checkpoint:** The account register projection is independently testable without React or Supabase.

## Phase 3 — User Story 1: Open one account register

- [x] T020 [US1] Add authorized route `src/app/accounts/[accountId]/page.tsx`
  - Depends on: T010
  - Permission: branch_write
  - Evidence: existing workspace composition and generic not-found behavior for inaccessible IDs
  - Stop condition: a direct unscoped database query is needed

- [x] T021 [US1] Add `src/components/account-detail-page.tsx`
  - Depends on: T010, T020
  - Permission: branch_write
  - Evidence: identity, current/initial balance, archived state, movement summary, grouped rows and empty/error states
  - Stop condition: mutation ownership is duplicated

- [x] T022 [P] [US1] Add scoped responsive styles in `src/components/account-detail-page.module.css`
  - Depends on: T021
  - Permission: branch_write
  - Evidence: bounded wrapping, responsive summary/rows and 44px controls
  - Stop condition: a global override layer or `!important` is required

- [x] T023 [US1] Add `Xem sổ` links to active and archived cards in `src/components/accounts-page.tsx`
  - Depends on: T020
  - Permission: branch_write
  - Evidence: keyboard-accessible direct route from both account states
  - Stop condition: edit/archive behavior changes

**Checkpoint:** An account can be opened directly and its related ledger is visible read-only.

## Phase 4 — Browser and Delivery Evidence

- [x] T030 [US1] Add focused browser coverage in `e2e/account-register-detail.spec.ts`
  - Depends on: T021–T023
  - Permission: branch_write
  - Evidence: accounts navigation, populated register, empty register, inaccessible state and phone-width overflow assertion
  - Stop condition: test depends on production data or hidden fixtures

- [x] T035 Open stacked draft PR #227 and create its bounded PR-memory record
  - Depends on: T010–T030
  - Permission: branch_write
  - Evidence: PR #227 and `docs/research/pr-memory/2026/Q3/PR-227.md`
  - Stop condition: merge/deploy is attempted

- [ ] T040 Run risk-selected exact-head verification
  - Depends on: T035
  - Permission: branch_write; provider/production writes forbidden
  - Evidence: exact CI, unit, build, browser and UI results
  - Stop condition: any required gate fails or is skipped unexpectedly

- [ ] T050 Evaluate actual diff against spec and constitution
  - Depends on: T040
  - Permission: read_only evaluation
  - Evidence: acceptance table in work packet
  - Stop condition: scope drift, transfer misclassification or ownership leak

- [ ] T060 Prepare owner handoff and mark PR ready for review
  - Depends on: T050
  - Permission: branch_write metadata only
  - Evidence: exact-head SHA, updated PR body/packet and remaining owner-only actions
  - Stop condition: merge, retarget-after-base-merge or deployment is attempted without owner action

## Progress Record

| Task | Status | Owner/role | Evidence | Notes/blockers |
|---|---|---|---|---|
| T001 | done | researcher | plan reconnaissance | Current loaders sufficient |
| T002 | done | planner | spec clarification | Reconciliation explicitly excluded |
| T010 | done | implementer | `src/lib/account-register.ts` | Pure account-leg projection |
| T011 | done | implementer | `src/lib/account-register.test.ts` | Execution pending CI |
| T020 | done | implementer | dynamic account route | Existing loaders only |
| T021 | done | implementer | detail component | Read-only; honest error state |
| T022 | done | implementer | scoped CSS module | UI evidence pending |
| T023 | done | implementer | active/archived links | |
| T030 | done | implementer | focused Playwright spec | Execution pending CI |
| T035 | done | implementer | PR #227 + PR memory | Stacked on PR #226 |
| T040 | active | evaluator | pending | Await exact-head workflows |
| T050 | todo | evaluator | pending | |
| T060 | todo | implementer | pending | Owner merge remains forbidden |