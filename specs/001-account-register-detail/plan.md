# Implementation Plan: Account register and detail

**Spec:** `specs/001-account-register-detail/spec.md`  
**Branch:** `feat/account-register-detail-main`  
**Change class:** Class 2 bounded UI/read-flow  
**Work packet:** `docs/plans/active/account-register-detail.md`  
**Status:** implementing  
**Last updated:** 2026-08-02

## Technical context

- Next.js App Router, React and TypeScript.
- Existing `getAccountsWorkspace` owns viewer-scoped account summaries/balances.
- Existing `getFinanceWorkspace` owns the validated transaction feed.
- Existing `requireViewer` and RLS-backed loaders remain authorization boundaries.
- Demo and authenticated modes are supported by the same existing workspaces.
- No new persistence contract, dependency or provider.

## Constitution and product checks

| Constraint | Plan response | Result |
|---|---|---|
| Integer money and transfer neutrality | Pure account-leg helper with tests | pass |
| Ownership/RLS | Existing viewer-scoped loaders only | pass |
| Manual-first product scope | Deepens account-to-ledger workflow | pass |
| Current evidence over prose | Current code and PR #222 owner decision inspected | pass |
| Bounded slice | Read-only route/helper/component/links/tests | pass |
| Risk-proportional verification | Static, unit, build, browser and UI evidence | pass |

## Repository fit

| Path | Responsibility | Change |
|---|---|---|
| `src/server/accounts.ts` | Validated account summaries | Reuse unchanged |
| `src/server/finance.ts` | Validated full transaction feed | Reuse unchanged |
| `src/lib/account-register.ts` | Account-leg projection | Add pure helper |
| `src/lib/account-register.test.ts` | Financial counterexamples | Add |
| `src/app/accounts/[accountId]/page.tsx` | Viewer-scoped route | Add |
| `src/components/account-detail-page.tsx` | Read-only register | Add |
| `src/components/account-detail-page.module.css` | Scoped responsive layout | Add |
| `src/components/accounts-page.tsx` | Account-card entry point | Add `Xem sổ` only |
| `src/components/accounts-page.module.css` | Link targets/presentation | Bounded update |
| `e2e/account-register-detail.spec.ts` | Browser evidence | Add |

The route composes existing server workspaces. A pure domain helper maps product-wide transactions to signed account legs and separate totals. The presentation component renders trusted data and links to existing mutation owners.

## Intentionally unchanged

- Balance derivation and transaction mutations.
- Database schema, migrations, RLS, grants and RPCs.
- Reconciliation/statement workflow from closed PR #222.
- Transaction-filter files from PR #223.
- Provider and deployment configuration.

## Data, compatibility and rollback

- Schema/backfill: none.
- Compatibility: additive route and UI.
- Runtime modes: existing authenticated/demo behavior.
- Rollback: revert the focused PR.

## Risks and evidence

| Risk | Prevention/evidence |
|---|---|
| Transfer counted as income/expense | Separate transfer totals and unit tests |
| Destination leg omitted | Match `destinationAccountId` and test both legs |
| Other-tenant account existence leaks | Viewer-scoped account list and generic not-found |
| History failure appears as verified zero | Hide movement summary/register on `dataError` |
| Mutation logic duplicates | Read-only detail; link to `/transactions` |
| Phone overflow | Scoped minmax/wrapping CSS and Playwright assertion |
| Scope overlaps PR #223 | No transaction page/filter files changed |

## Permission boundary

- Allowed: `feat/account-register-detail-main`, specified source/tests/docs.
- Forbidden: `main` direct write, database/RLS/RPCs, reconciliation, providers, production data and deployment.
- Human approval required before merge/deploy.
- Stop if implementation requires new persistence or direct balance/transaction mutation.

## Verification plan

| Layer | Evidence |
|---|---|
| Knowledge/CI policy | `npm run check:knowledge`, `npm run test:ci-policy` |
| Static/build | deployment, CSS ownership, architecture, lint, typecheck, unit, build |
| Database/RLS | not applicable; no DB contract change |
| Browser | focused account-register Playwright plus selected smoke |
| Responsive/UI | selected audit and human artifact review |
| Security | CodeQL and secret-history scan |
| Production | owner-controlled route smoke only after merge |

## Delivery

- Open draft PR to `main` so repository CI can produce exact-head evidence.
- Add one truthful PR-memory record after the PR number exists.
- Resolve failures before independent evaluation.
- Mark ready-for-review only when exact-head selected checks and acceptance review are complete.
- Owner alone decides merge and deployment.
