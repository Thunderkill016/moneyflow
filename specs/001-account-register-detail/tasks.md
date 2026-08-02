# Tasks: Account register and detail

**Spec:** `specs/001-account-register-detail/spec.md`  
**Plan:** `specs/001-account-register-detail/plan.md`  
**Packet:** `docs/plans/active/account-register-detail.md`  
**Current authorized phase:** exact-head verification and evaluation  
**Last updated:** 2026-08-02

## Reconnaissance and specification

- [x] T001 Inspect account cards, account workspace, finance workspace and transaction contracts.
- [x] T002 Confirm reconciliation remains deferred and select a read-only Class 2 slice.
- [x] T003 Write and quality-check the feature specification and plan.

## Domain projection

- [x] T010 Implement `src/lib/account-register.ts` with related-row filtering, signed impacts, newest-first ordering and separate totals.
- [x] T011 Add `src/lib/account-register.test.ts` for income, expense, source/destination transfer, unrelated rows, ordering and invalid inputs.

## User story implementation

- [x] T020 Add viewer-scoped `src/app/accounts/[accountId]/page.tsx` using existing loaders and generic not-found behavior.
- [x] T021 Add read-only `src/components/account-detail-page.tsx` with trusted balance, separated totals, grouped rows, empty and error states.
- [x] T022 Add scoped responsive styles in `src/components/account-detail-page.module.css`.
- [x] T023 Add `Xem sổ` navigation for active and archived accounts without changing edit/archive behavior.
- [x] T024 Add `e2e/account-register-detail.spec.ts` for populated, empty, inaccessible and phone-width states.

## Delivery and evidence

- [ ] T030 Open a draft PR to `main` and add its bounded PR-memory record.
- [ ] T040 Run risk-selected exact-head CI, unit, build, browser, UI, CodeQL and secret checks.
- [ ] T050 Evaluate the actual diff against every acceptance criterion and constitutional boundary.
- [ ] T060 Update packet/PR evidence and mark ready-for-review.
- [ ] T070 Owner decides merge/deployment; agent MUST NOT perform either.

## Progress

| Task range | Status | Evidence/next step |
|---|---|---|
| T001–T003 | done | current code, owner decision, spec/plan/checklist |
| T010–T024 | done | source, tests and browser spec committed to focused branch |
| T030 | active | open clean PR to `main` |
| T040–T060 | todo | exact-head workflows and independent evaluation |
| T070 | owner_only | merge/deployment remain forbidden to agent |
