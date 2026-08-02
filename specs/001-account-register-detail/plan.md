# Implementation Plan: Account register and detail

**Feature spec:** `specs/001-account-register-detail/spec.md`  
**Branch:** `feat/account-register-detail`  
**Change class:** Class 2 — bounded UI/read-flow change  
**Work packet:** `docs/plans/active/account-register-detail.md`  
**Status:** implementing  
**Last updated:** 2026-08-02

## Technical Context

- Runtime/application stack: Next.js App Router, React 19, TypeScript, CSS modules.
- Affected subsystem: accounts read flow and presentation.
- Existing owner boundary: `getAccountsWorkspace` owns account summaries; `getFinanceWorkspace` owns the validated transaction feed.
- Storage/data boundary: existing RLS-backed Supabase views/tables; no new query contract.
- Authentication/authorization boundary: `requireViewer` plus existing server loaders.
- Existing tests: Node domain tests, Playwright browser flows, responsive audit.
- Supported runtime modes: authenticated and demo.
- Performance constraint: reuse current loaders; do not add per-row network requests.
- Accessibility constraint: 44px actions, semantic headings, text/sign direction independent of color.

## Constitution Check

| Principle/constraint | Plan response | Gate |
|---|---|---|
| Trustworthy ledger semantics | Pure helper computes account-leg impact; transfers excluded from income/expense totals | pass |
| Ownership, isolation and recovery | Existing viewer-aware/RLS loaders only; read-only slice | pass |
| Product-scope alignment | Deepens manual account ledger; no bank sync/reconciliation/advice | pass |
| Current evidence over generated prose | Current account/finance code and PR #222 owner decision inspected | pass |
| Bounded slice and permissions | New route/component/helper/test plus one link action | pass |
| Risk-proportional verification | Unit, static/build, browser and responsive evidence selected | pass |
| Work-packet coexistence | Packet owns state, permission and handoff | pass |

## Repository Reconnaissance

### Current behavior

- `/accounts` renders account summaries with edit/archive actions.
- `getAccountsWorkspace` validates account metadata and derived balances.
- `getFinanceWorkspace` validates the complete transaction feed for both runtime modes.
- Transfer rows carry source and optional destination account IDs/names.
- The transaction manager owns mutation behavior; account detail must not recreate it.

### Relevant areas

| Path/area | Current responsibility | Reuse/change/avoid | Evidence |
|---|---|---|---|
| `src/app/accounts/page.tsx` | Accounts route | unchanged | Thin route already loads account workspace |
| `src/components/accounts-page.tsx` | Cards and account actions | add register link only | Existing card action area |
| `src/server/accounts.ts` | Account summaries | reuse unchanged | Validated account/balance loader |
| `src/server/finance.ts` | Transaction feed | reuse unchanged | Validated authenticated/demo workspace |
| `src/lib/transactions/contracts.ts` | Transaction shape | reuse | Source/destination fields available |
| `src/lib/account-register.ts` | New pure account-leg projection | add | Keeps financial logic out of UI |
| `src/app/accounts/[accountId]/page.tsx` | New authorized route | add | Composes existing workspaces |
| `src/components/account-detail-page.tsx` | New read-only register UI | add | One presentation owner |
| `src/components/account-detail-page.module.css` | New scoped layout | add | Avoid global override layer |

## Architecture Fit

The route authorizes and composes existing workspaces. A pure domain helper maps product-wide transactions to one account's signed movements and summary. The client component renders read-only data and links to existing mutation owners. No repository/service abstraction or persistence adapter is added.

### Planned changes

| File/area | Change | Requirement/story | Reason |
|---|---|---|---|
| `src/lib/account-register.ts` | Filter/sort transactions, calculate signed impact and separate totals | US1/US2, FR-004–FR-007 | Testable financial projection |
| `src/lib/account-register.test.ts` | Transfer/income/expense/sorting tests | SC-002 | Lock invariants |
| `src/app/accounts/[accountId]/page.tsx` | Validate UUID, authorize, compose account and finance workspaces, not-found inaccessible IDs | FR-002–FR-004, FR-010 | Thin App Router route |
| `src/components/account-detail-page.tsx` | Render identity, balances, movement summary, grouped register and navigation | US1/US2, FR-007–FR-009 | User-visible slice |
| `src/components/account-detail-page.module.css` | Responsive scoped styles | required states/SC-003 | No global override |
| `src/components/accounts-page.tsx` | Add `Xem sổ` link to active/archived accounts | FR-001 | Entry path |
| `e2e/account-register-detail.spec.ts` | Demo populated/archived or route behavior and responsive assertions | SC-001/SC-003 | Browser evidence |

### Intentionally unchanged

- Financial mutations and balance derivation.
- Database schema/RLS/RPCs.
- Reconciliation and transaction review state.
- Transaction manager implementation and PR #223 files.
- Provider/production configuration.

## Research and Adoption Review

Not required. The selected behavior is established by current repository code, architecture and owner decision history. No dependency, provider, service, tool or external pattern is adopted.

## Data, Migration and Compatibility

- Schema/migration: not applicable.
- RLS/policies/grants: unchanged.
- Existing-data compatibility: account IDs and transaction contracts already exist.
- Backfill: none.
- Retry/idempotency: not applicable; read-only.
- Runtime-mode compatibility: compose existing demo/authenticated workspaces.
- Rollback: remove new route/helper/component/test and account-card links.

## Risk Analysis

| Risk or counterexample | Likelihood/impact | Prevention | Evidence/test | Stop condition |
|---|---|---|---|---|
| Incoming transfer counted as income | high correctness | Separate transfer totals in pure helper | Unit tests | Any summary mixes transfer with income/expense |
| Destination transfer omitted | medium | Match both `accountId` and `destinationAccountId` | Unit/browser test | Account register misses incoming leg |
| Other tenant account existence leaks | high security | Existing RLS loaders; return generic not-found | Route behavior review | New direct unscoped query appears |
| Duplicate mutation logic | medium maintainability | Register remains read-only and links to transaction manager | Diff review | Edit/delete logic added |
| Long names/amount clipping | medium UX | CSS wrapping/grid minmax and phone audit | UI audit | Horizontal overflow |
| Conflict with PR #223 | medium delivery | Do not edit transaction page/filter files | Compare diff | Overlap appears |

## Permission Boundary

- Allowed repository/branch: `Thunderkill016/moneyflow`, `feat/account-register-detail`.
- Allowed paths: feature spec/packet, new account detail route/component/helper/tests, bounded account-card navigation.
- Forbidden paths/writes: database migrations/RLS/RPCs, reconciliation branch, transaction-filter PR files, providers, production data, `main`.
- Provider access: none.
- Production-data access: none.
- Human approval required before: merge/deploy.
- Stop condition: implementation requires new persistence state, direct balance edits or transaction mutations.

## Verification Plan

| Layer | Required? | Command/evidence | What it proves |
|---|---|---|---|
| Diff hygiene / project knowledge | yes | `npm run check:knowledge` | Repository-policy consistency |
| CI classification | yes | `npm run test:ci-policy` | Correct gates |
| Deployment/config | yes | `npm run check:deployment-env` | Existing config contract |
| CSS ownership | yes | `npm run check:css-ownership` | No root override layer |
| Architecture | yes | `npm run check:architecture` | Boundary direction |
| Lint/typecheck | yes | `npm run lint`, `npm run typecheck` | Source correctness |
| Unit/domain | yes | `npm run test` | Account-leg financial projection |
| Production build | yes | `npm run build` | App Router compilation |
| Database/RLS | no | no DB diff; static ownership remains covered by full unit contract | Not applicable |
| Browser flow | yes | `npm run test:e2e` | Route and navigation |
| Responsive/visual | yes | `npm run test:ui-audit:pr` or focused evidence | Phone/desktop layout |
| Production/manual | after owner merge only | affected route smoke | Deployment reality |

## Delivery and Rollback

- Focused branch: `feat/account-register-detail` stacked on `chore/adopt-spec-kit`.
- Expected PR target: `chore/adopt-spec-kit` until PR #226 merges, then retarget to `main`.
- Exact-head evidence required before ready-for-review: selected CI, unit, build, browser and UI checks.
- Human review required: route semantics, transfer neutrality and responsive evidence.
- Deployment/production verification: owner-controlled after merge.
- Rollback: revert focused PR.
- Work-packet archive: after merge and acceptance.
- PR memory update: create after PR number exists.

## Generated Artifacts

- `spec.md`: accepted user and financial contract.
- `plan.md`: this file.
- `tasks.md`: executable task order.
- `checklists/requirements.md`: requirements-quality review.
- No research/data-model/contracts artifact required because persistence is unchanged.