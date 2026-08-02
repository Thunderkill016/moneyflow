# Tasks: Account register and detail

- **Spec:** `specs/001-account-register-detail/spec.md`
- **Plan:** `specs/001-account-register-detail/plan.md`
- **Packet:** `docs/plans/completed/2026-08-02-account-register-detail.md`
- **Current phase:** completed and archived
- **Last updated:** 2026-08-02

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

- [x] T030 Open PR #228 to `main` and add its bounded PR-memory record.
- [x] T040 Run risk-selected exact-head CI, unit, build, browser, UI, CodeQL and secret checks.
- [x] T050 Evaluate the actual diff against every acceptance criterion and constitutional boundary.
- [x] T060 Update packet/PR evidence and keep the PR ready for owner review.
- [x] T070 Owner approved squash merge; production deployment reached `READY`; packet archived.

## Completion evidence

| Task range | Status | Evidence |
|---|---|---|
| T001–T003 | done | current code, owner direction, spec/plan/checklist |
| T010–T024 | done | merged source, unit tests and Playwright coverage |
| T030 | done | PR #228 and PR-memory record |
| T040 | done | final head `642315e9c1ac96a0fa983426fc40f1bec56fc707`; CI #1095, CodeQL #252 and secret scan #252 succeeded |
| T050–T060 | done | bounded evaluation found no financial, ownership or scope blocker |
| T070 | done | squash merge `52c1eac9197e16f5f7398bb25c20af4833de1993`; Vercel deployment `dpl_84aJGAS3jkFRApiy66DBFXHkQgiu` READY; auth-boundary route smoke passed |
