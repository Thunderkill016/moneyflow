# Tasks: Transaction date and amount filters

- **Spec:** `specs/002-transaction-range-filters/spec.md`
- **Plan:** `specs/002-transaction-range-filters/plan.md`
- **Work packet:** not required
- **Current phase:** final exact-head verification for PR #234
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
- [x] T031 Stabilize existing SAFE-09 audit fixture without weakening geometry assertions.
  - Depends on: first exact-head browser run
  - Permission: branch_write
  - Evidence: direct contract-valid demo transaction seed, connected-node polling, unchanged static/44px/no-overlap thresholds
  - Finding: initial run passed all feature browser flows but exposed a 320px pre-hydration locator/quick-capture fixture flake; 360px and 390px SAFE-09 cases passed

## Delivery

- [x] T090 Open current-main replacement PR #234 and add its bounded PR memory.
- [x] T091 Close PRs #223 and #232 unmerged as superseded.
- [x] T092 Pass implementation-head CI #1127, CodeQL #283 and Secret history scan #283.
  - Evidence: `d294e50872d5a78c332d1dce288678fa505f7819`; CodeQL initialized and analyzed; database checks correctly not required
- [x] T093 Evaluate acceptance criteria and responsive/browser artifacts.
  - Evidence: 24/24 Playwright smoke; cross-device audit 384 passed/125 skipped; SAFE-09 passed at 320/360/390px; artifact `8837389357`, digest `sha256:26aa3d06b4f835b3617f8508da790d80c5b38cc1609f5c84f0441004ad8b69ec`
- [x] T094 Reverify PR #232 against `main@3e138c667ed8885108b3fbd388ca2900a1375ced`.
  - Evidence: CI #1142, CodeQL #296 and Secret history scan #296 succeeded; browser smoke and cross-device audit passed; merge remained blocked only because the published branch ancestry predated current `main`
- [x] T095 Recreate the exact verified feature blobs on `feat/transaction-range-filters-current-main-v2`, which starts directly from latest `main`.
- [ ] T096 Pass full exact-head CI, CodeQL and secret scan on PR #234.
- [ ] T097 Squash merge PR #234 with expected-head protection under the owner's explicit merge authorization.
- [ ] T098 Record post-merge capability/deployment truth without overstating repository checks as production evidence.
