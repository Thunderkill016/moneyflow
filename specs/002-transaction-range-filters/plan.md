# Implementation Plan: Transaction date and amount filters

- **Spec:** `specs/002-transaction-range-filters/spec.md`
- **Branch:** `feat/transaction-range-filters-current-main-v2`
- **Change class:** Class 2 bounded UI/read-flow
- **Work packet:** not required; one existing route/client surface, no persistence, provider work, unresolved research or non-obvious rollback
- **Status:** replacement delivery in PR #234; final exact-head verification pending
- **Last updated:** 2026-08-03

## Technical context

- Next.js App Router route `src/app/transactions/page.tsx` owns supported URL parameter normalization.
- `src/components/transactions-page.tsx` owns client-side ledger filters, totals, pagination and correction feedback.
- `src/lib/transactions/contracts.ts` owns the transaction contract.
- `src/lib/transaction-list.ts` owns progressive list windowing.
- `src/lib/money.ts` owns integer VND input formatting.
- `useTransactions` and existing Server Actions remain the sole mutation owners.
- Authenticated and demo modes reuse the existing viewer-scoped workspace.

## Constitution checks

| Constraint | Plan response | Result |
|---|---|---|
| Integer ledger semantics | Pure integer comparison; no financial writes | pass |
| Transfer neutrality | Existing totals continue to count only income/expense | pass |
| Ownership/RLS | Existing loaders and mutation owners unchanged | pass |
| Product scope | Deepens an existing ledger review loop | pass |
| Current evidence | Verified PR #232 feature blobs are recreated directly on latest `main`; stale memory is not reused | pass |
| Bounded slice | One route, one client surface, pure helper, scoped CSS and tests | pass |
| Risk-proportional verification | Full static/build, browser/mobile/UI, CodeQL and secret scan | pass on PR #232 merge candidate; pending on PR #234 exact head |

## Repository changes

| Path | Responsibility | Change |
|---|---|---|
| `src/lib/transaction-filters.ts` | Pure filter parsing/composition/serialization | Add |
| `src/lib/transaction-filters.test.ts` | Boundary and composition contracts | Add |
| `src/app/transactions/page.tsx` | Normalize supported URL state | Update |
| `src/components/transactions-page.tsx` | Render controls and apply filters | Update |
| `src/components/transactions-page.module.css` | Responsive range-control layout | Update |
| `e2e/transaction-range-filters.spec.ts` | Desktop/mobile user-flow evidence | Add |
| `e2e/audit/responsive.audit.spec.ts` | Keep SAFE-09 transaction-group geometry evidence stable across demo-store hydration | Update test fixture/waiting only; assertions unchanged |
| `specs/002-transaction-range-filters/**` | Feature requirements, plan and task traceability | Add |

The implementation was first re-evaluated from PR #223 because the existing UI source files had the exact same pre-feature SHAs. PR #232 then verified the complete slice. PR #234 reuses those exact verified blobs on current `main@3e138c667ed8885108b3fbd388ca2900a1375ced` because the repository ruleset requires current-main ancestry before merge.

## Intentionally unchanged

- Transaction storage, Server Actions and domain mutation owners.
- Account register/detail introduced by PR #228.
- Database schema, migrations, RPCs, RLS, grants and policies.
- Reports, export and reconciliation semantics.
- Dependencies, workflows, provider settings and production data.
- SAFE-09 geometry requirements: static day header, minimum 44px height and no overlap with the first transaction row.

## Data, compatibility and rollback

- Schema/backfill: none.
- Existing data: read-only comparison of existing positive integer amounts and ISO dates.
- URL compatibility: additive parameters `q`, `kind`, `account`, `category`, `from`, `to`, `min`, `max`.
- Runtime modes: authenticated and demo.
- Rollback: revert the focused PR; no data rollback.

## Risks and counterexamples

| Risk | Prevention/evidence |
|---|---|
| Boundary rows excluded | Inclusive comparison unit tests |
| Transfer counted as income/expense | Existing totals logic unchanged; regression suite |
| Split or destination matching regresses | Dedicated composition tests |
| Invalid bounds silently mutate user intent | Explicit error; never swap |
| Edit clears context | URL/context Playwright flow |
| Pagination totals only reflect visible rows | Filter before `windowTransactions` |
| Phone controls clip | 4/2/1 grid and selected responsive/browser evidence |
| Stale PR docs overwrite current truth | Exclude old capability-roadmap rewrites; use bounded PR #234 memory |
| SAFE-09 reads a detached pre-hydration node or depends on unrelated quick capture | Seed one contract-valid transaction directly and poll current connected geometry; retain all layout thresholds |

## Acceptance evaluation

| Acceptance area | Result | Evidence |
|---|---|---|
| Inclusive date/amount filtering and composition | pass | unit contracts and transaction Playwright flow |
| Canonical URL restoration and clear behavior | pass | route normalization, serialization tests and browser flow |
| Correction retains context | pass | desktop/mobile edit flow and explanatory notice |
| Totals/pagination remain truthful | pass | filter-before-window implementation and regression tests |
| Responsive/accessibility behavior | pass | 44px controls, named inputs, 4/2/1 layout and cross-device audit |
| Financial/data/security boundary | pass | exact diff contains no schema/RLS/provider/mutation-owner change |
| SAFE-09 stabilization | pass | audit passed at 320/360/390px with unchanged thresholds |

PR #232's final head `4706b71f5c7c4413be5e201784d673e9b2e97e23` passed CI #1130, CodeQL #286 and Secret #286. After `main` advanced, its latest merge candidate passed CI #1142, CodeQL #296 and Secret #296, including browser smoke and cross-device audit. GitHub nevertheless rejected merge because the branch ancestry predated current `main`; PR #234 resolves only that delivery constraint.

## Permission boundary

- Allowed: focused branch and listed source/test/spec/memory paths.
- Forbidden: direct `main` write, database/provider/production writes, dependencies, reconciliation or bulk correction.
- Owner authorization: merge PR #234 after all repository protections pass.
- Stop if the implementation requires a server filter RPC, schema change or new mutation owner.

## Verification plan

| Layer | Required evidence |
|---|---|
| Diff/project knowledge | diff hygiene, `npm run check:knowledge`, `npm run test:ci-policy` |
| Static/build | deployment config, CSS ownership, architecture, lint, typecheck, unit tests, production build |
| Database/RLS | stable job success with checks correctly not required |
| Browser | focused transaction range flow on desktop/mobile plus selected smoke |
| Responsive/UI | selected cross-device UI audit and artifact review, including SAFE-09 at 320/360/390px |
| Security | protected CodeQL with real initialize/analyze upload; secret-history scan |
| Production | owner-controlled `/transactions` smoke only after merge/deployment |

## Delivery

1. PR #234 exists directly on latest `main`; PRs #223 and #232 are closed unmerged as superseded.
2. Requirements, implementation and prior merge-candidate evidence are evaluated.
3. Run the same selected gates on PR #234's final exact head.
4. Merge with expected-head protection because the owner explicitly authorized merge.
5. Record merged capability truth and production evidence separately; do not claim deployment from repository checks alone.
