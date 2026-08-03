# Implementation Plan: Transaction date and amount filters

- **Spec:** `specs/002-transaction-range-filters/spec.md`
- **Branch:** `feat/transaction-range-filters-current-main`
- **Change class:** Class 2 bounded UI/read-flow
- **Work packet:** not required; one existing route/client surface, no persistence, provider work, unresolved research or non-obvious rollback
- **Status:** evaluated; final evidence-only exact-head verification pending
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
| Current evidence | Current files equal the PR #223 pre-feature baseline; stale memory is not reused | pass |
| Bounded slice | One route, one client surface, pure helper, scoped CSS and tests | pass |
| Risk-proportional verification | Full static/build, browser/mobile/UI, CodeQL and secret scan | pass on implementation head; final evidence-only head pending |

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

The implementation blobs are re-evaluated from PR #223 only because the three existing UI source files on current `main` have the exact same pre-feature SHAs as PR #223's base. Old PR memory and capability-roadmap rewrites are intentionally excluded.

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
| Stale PR docs overwrite current truth | Exclude PR #223 memory/gap rewrites; create new bounded record |
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
| SAFE-09 stabilization | pass | implementation head audit passed at 320/360/390px with unchanged thresholds |

Implementation head `d294e50872d5a78c332d1dce288678fa505f7819` passed CI #1127, CodeQL #283, Secret #283, 24/24 Playwright smoke and 384 passed/125 skipped cross-device audit cases. Artifact: `8837389357`, digest `sha256:26aa3d06b4f835b3617f8508da790d80c5b38cc1609f5c84f0441004ad8b69ec`.

## Permission boundary

- Allowed: focused branch and listed source/test/spec/memory paths.
- Forbidden: direct `main` write, merge without owner instruction, database/provider/production writes, dependencies, reconciliation or bulk correction.
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

1. Replacement PR #232 exists on current `main`; PR #223 is closed unmerged as superseded.
2. Requirements, implementation and implementation-head evidence are evaluated.
3. Run the same selected gates on the final evidence-only head.
4. Update the PR body without changing the branch and prepare owner review handoff.
5. Owner decides merge and deployment.
