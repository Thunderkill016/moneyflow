# Implementation Plan: Transaction date and amount filters

- **Spec:** `specs/002-transaction-range-filters/spec.md`
- **Delivery branch:** `feat/transaction-range-filters-current-main-v2`
- **Change class:** Class 2 bounded UI/read-flow
- **Work packet:** not required; one existing route/client surface, no persistence, provider work, unresolved research or non-obvious rollback
- **Status:** completed and merged through PR #234
- **Merged baseline:** `main@45b6f22de80aa7c1fd67f2f402f4ffd6bd147cc8`
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
| Current evidence | Exact feature blobs delivered from current-main ancestry | pass |
| Bounded slice | One route, one client surface, pure helper, scoped CSS and tests | pass |
| Risk-proportional verification | Full static/build, browser/mobile/UI, CodeQL and secret scan | pass on PR #234 exact head |

## Repository changes

| Path | Responsibility | Change |
|---|---|---|
| `src/lib/transaction-filters.ts` | Pure filter parsing/composition/serialization | Added |
| `src/lib/transaction-filters.test.ts` | Boundary and composition contracts | Added |
| `src/app/transactions/page.tsx` | Normalize supported URL state | Updated |
| `src/components/transactions-page.tsx` | Render controls and apply filters | Updated |
| `src/components/transactions-page.module.css` | Responsive range-control layout | Updated |
| `e2e/transaction-range-filters.spec.ts` | Desktop/mobile user-flow evidence | Added |
| `e2e/audit/responsive.audit.spec.ts` | Keep SAFE-09 geometry evidence stable across demo-store hydration | Updated fixture/waiting only; assertions unchanged |
| `specs/002-transaction-range-filters/**` | Feature requirements, plan and task traceability | Added |

The implementation was first re-evaluated from PR #223 because the relevant UI source files had the same pre-feature SHAs. PR #232 verified the complete slice. PR #234 then reused the exact verified feature blobs on current-main ancestry because the repository ruleset required the published branch itself to contain the latest base.

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
- Rollback: revert merge commit `45b6f22de80aa7c1fd67f2f402f4ffd6bd147cc8`; no data rollback.

## Risks and counterexamples

| Risk | Prevention/evidence |
|---|---|
| Boundary rows excluded | Inclusive comparison unit tests |
| Transfer counted as income/expense | Existing totals logic unchanged; regression suite |
| Split or destination matching regresses | Dedicated composition tests |
| Invalid bounds silently mutate user intent | Explicit error; never swap |
| Edit clears context | URL/context Playwright flow |
| Pagination totals only reflect visible rows | Filter before `windowTransactions` |
| Phone controls clip | 4/2/1 grid and responsive/browser evidence |
| Stale PR docs overwrite current truth | Old roadmap rewrites excluded; bounded current PR records used |
| SAFE-09 reads a detached pre-hydration node | Contract-valid seed and connected-node polling; layout thresholds unchanged |

## Acceptance evaluation

| Acceptance area | Result | Evidence |
|---|---|---|
| Inclusive date/amount filtering and composition | pass | unit contracts and transaction Playwright flow |
| Canonical URL restoration and clear behavior | pass | route normalization, serialization tests and browser flow |
| Correction retains context | pass | desktop/mobile edit flow and explanatory notice |
| Totals/pagination remain truthful | pass | filter-before-window implementation and regression tests |
| Responsive/accessibility behavior | pass | 44px controls, named inputs, 4/2/1 layout and cross-device audit |
| Financial/data/security boundary | pass | exact diff contains no schema/RLS/provider/mutation-owner change |
| SAFE-09 stabilization | pass | audit passed with unchanged static/44px/no-overlap thresholds |

## Exact-head evidence

PR #234 head `397d05c751bb5998ccb02f46719f75e31c957e64` passed:

- CI #1145;
- diff hygiene, project knowledge and classifier contracts;
- deployment, CSS ownership and architecture contracts;
- lint, typecheck, unit/static RLS and production build;
- stable database job with database checks correctly not required;
- browser smoke and production cross-device UI audit;
- Playwright evidence upload;
- CodeQL #298 with both `Initialize CodeQL` and `Analyze` completed;
- Secret history scan #298.

PR #234 was squash merged as `45b6f22de80aa7c1fd67f2f402f4ffd6bd147cc8`.

## Evidence boundary

- Repository and browser evidence proves the merged implementation and selected behavior.
- It does not prove authenticated production deployment.
- No database, provider, deployment-setting or production-data write occurred.

## Delivery

1. PRs #223 and #232 are closed unmerged as superseded.
2. PR #234 passed all exact-head protections and merged.
3. Canonical project memory and capability-roadmap truth are reconciled by the post-merge lifecycle PR.
4. Any authenticated production smoke is recorded separately without retroactively changing repository evidence.
