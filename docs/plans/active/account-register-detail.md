# Account register and detail

**Status:** implementing  
**Execution state:** implementing  
**Active role:** implementer  
**Permission scope:** branch_write  
**Owner:** Thunderkill016  
**Issue/PR:** stacked PR pending  
**Last updated:** 2026-08-02

## Outcome

Let a user open any visible MoneyFlow account and inspect the ledger movements that explain it: current and initial balance, income, expense, transfer-in/out and a newest-first account register. Preserve the current manual-first product, derived balances, transfer neutrality and existing transaction mutation ownership.

## Repository reconnaissance

### Current behavior

- `/accounts` displays account identity, current/initial balance and edit/archive actions.
- `getAccountsWorkspace` validates viewer-scoped account summaries and derived balances.
- `getFinanceWorkspace` validates the complete transaction feed for authenticated and demo runtimes.
- Transactions already identify source account and optional transfer destination.
- No account detail/register route exists on current `main`.
- PR #222's reconciliation contract was closed unmerged by the owner because account detail and transaction correction are the current priority.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/server/accounts.ts` | Viewer-scoped account identity/balance | Reuse unchanged |
| `src/server/finance.ts` | Validated full ledger feed | Reuse unchanged |
| `src/lib/transactions/contracts.ts` | Source/destination account contract | Reuse |
| `src/lib/account-register.ts` | Account-leg projection | Add pure helper |
| `src/app/accounts/[accountId]/page.tsx` | Authorized account route | Add |
| `src/components/account-detail-page.*` | Read-only account register UI | Add scoped component/CSS |
| `src/components/accounts-page.*` | Account card entry point | Add bounded links only |
| PR #223 transaction files | Separate active candidate | Avoid overlap |

### Existing tests and constraints

- Node tests can cover pure account-leg impacts and transfer neutrality.
- Playwright demo mode provides stable MB Bank populated data and USD travel empty data.
- No database/RLS tests are selected because persistence contracts do not change.
- Money must use safe integer minor units; transfers never become income/expense.
- Unknown/inaccessible account IDs must produce the same not-found behavior.

### Similar implementation and recent history

- Existing transaction manager groups validated feed rows by date and uses `MoneyValue` for signed/kind-aware amounts.
- Existing account cards already own edit/archive actions; this feature adds navigation without moving mutation ownership.
- PR #222 remains cold technical reference only; its schema and workflow are explicitly excluded.

### Open questions

None blocking implementation.

## Research

Not required. Current code, architecture and the recorded owner priority establish the selected approach. No dependency, provider, external service or third-party code is adopted.

## Specification

The accepted feature contract is `specs/001-account-register-detail/spec.md`.

### User stories

- As a user, I can open one account from the account list and inspect only its related ledger movements.
- As a user, I can distinguish income, expense, transfer-in and transfer-out so internal transfers are not mistaken for earnings or spending.

### Acceptance criteria

- [x] Active and archived account cards expose `Xem sổ` navigation.
- [x] A viewer-scoped route composes existing account and finance workspaces.
- [x] A pure helper produces signed source/destination account impacts.
- [x] Transfer totals remain separate from income and expense.
- [x] Account identity, current/initial balance and archived state are visible.
- [x] Populated rows group newest-first by date.
- [x] Empty accounts show an honest empty state.
- [x] History-load failure does not display invented zero movement totals.
- [x] No schema, RLS, RPC, provider, production-data or mutation-owner change exists.
- [ ] Exact-head static/domain/build/browser/UI checks pass.
- [ ] Independent review confirms scope and financial semantics.

### Required states

- Loading: App Router server render; no fabricated data.
- Empty: trusted account balance plus no-movement message.
- Populated: grouped rows and signed account impact.
- Validation/error: generic not-found for inaccessible IDs; trusted balance only when history fails.
- Recovery/undo: not applicable; read-only.
- Long data/large money: wrap names/notes/amounts.
- Responsive: 4/2/1-column summary and stacked phone rows.
- Accessibility: semantic headings, named links, text/sign direction and 44px targets.

### Financial and security constraints

- Existing derived balance remains authoritative.
- Income/expense count only their source account.
- Transfer source is negative and destination positive, but transfer remains outside income/expense.
- Existing viewer-scoped loaders/RLS remain the ownership boundary.
- No reconciliation, direct balance adjustment or new persistence.

### Out of scope

- Reconciliation or statement matching.
- Edit/delete/review/bulk actions from account detail.
- Date filters, charts, trends or account export.
- Database changes and cross-currency conversion.

## Implementation plan

### Architecture fit

The dynamic route authorizes and composes current server workspaces. A pure `src/lib` helper owns account-leg projection. The presentation component remains read-only and links to the existing transaction manager. This preserves the modular-monolith dependency direction and one mutation owner.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/lib/account-register.ts` | Account-related filter, signed impact, sort and summary | Testable finance projection |
| `src/lib/account-register.test.ts` | Counterexamples and transfer-neutral totals | Lock invariants |
| `src/app/accounts/[accountId]/page.tsx` | Viewer-scoped route and not-found handling | Authorized read flow |
| `src/components/account-detail-page.tsx` | Account identity, summary, grouped register and honest states | User-visible outcome |
| `src/components/account-detail-page.module.css` | Scoped responsive layout | Avoid root overrides |
| `src/components/accounts-page.tsx` | `Xem sổ` links | Direct workflow entry |
| `src/components/accounts-page.module.css` | Link presentation/targets | Usability |
| `e2e/account-register-detail.spec.ts` | Populated, empty, phone and inaccessible states | Browser evidence |

### Data and migration impact

- Schema/migration/backfill: none.
- Compatibility: additive route and presentation.
- Runtime modes: current demo/authenticated workspaces.
- Rollback: revert the focused PR.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Incoming transfer appears as income | Pure summary separates transfer-in; unit test |
| Outgoing transfer appears as expense | Pure summary separates transfer-out; unit test |
| Destination leg omitted | Match `destinationAccountId`; unit test |
| Another tenant account leaks | Viewer-scoped account list + generic not-found |
| History failure looks like zero activity | Hide movement summary/register and show error panel |
| Mutation logic duplicated | Read-only component and link to `/transactions` |
| UI conflicts with PR #223 | No transaction page/filter files changed |
| Phone overflow | Scoped minmax/wrapping CSS and Playwright width assertion |

### Verification plan

- Repository: `npm run check:knowledge`, `npm run test:ci-policy`.
- Static/build: deployment, CSS ownership, architecture, lint, typecheck, unit tests and build.
- Database/RLS: not applicable; no database contract change.
- Browser: focused account-register Playwright plus selected smoke.
- Responsive/visual: selected UI audit and human artifact review.
- Production: owner-controlled route smoke after merge only.

## Tasks

Task authority is `specs/001-account-register-detail/tasks.md`.

Current implementation status:

| Task | Evidence | Status |
|---|---|---|
| Domain projection and unit tests | helper/test files | done |
| Authorized route | dynamic route file | done |
| Register UI and scoped CSS | component/module | done |
| Account-card navigation | active/archived links | done |
| Focused browser test | Playwright spec | done |
| Exact-head verification | PR CI | pending |
| Independent evaluation | packet acceptance table | pending |
| PR memory and handoff | after PR number | pending |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks or unverified claims | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-02 | owner | researcher/planner | specified | user instruction; PR #222 owner decision; current code audit | no active feature spec existed | Create bounded Spec Kit artifacts |
| 2026-08-02 | planner | implementer | planned | spec, plan, tasks and checklist | exact-head behavior unverified | Implement only account detail slice |
| 2026-08-02 | implementer | evaluator | implementing | helper, route, UI, links and browser test | compiler/tests/visual evidence pending | Open stacked draft PR and run selected checks |

### Current permission boundary

- Granted scope: branch writes for the specified account-detail slice.
- Repository/branch: `Thunderkill016/moneyflow`, `feat/account-register-detail`.
- Base dependency: `chore/adopt-spec-kit` / PR #226.
- Forbidden writes: `main`, database/RLS/RPCs, reconciliation, provider settings, production data and deployment.
- Human approval required before: merge, retargeting after base merge and production verification.
- Stop condition: implementation requires new persistence, direct balance edits or transaction mutations.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Account links | accounts page diff | pass |
| Viewer-scoped route | dynamic route composing existing loaders | pass |
| Signed account impacts | pure helper and tests | pending execution |
| Transfer-neutral totals | helper/test assertions | pending execution |
| Honest empty/error states | detail component | pass by review; browser pending |
| Responsive layout | CSS and Playwright assertion | pending execution/artifact |
| No high-risk scope | changed-path diff | pending final compare |
| Exact-head gates | PR workflows | pending |

### Review findings so far

- Correctness: source/destination impacts are explicit; invalid same-account transfer ignored.
- Security: no direct data query; inaccessible account stays generic not-found.
- UI/UX: direct account workflow and error state avoids false zeros.
- Maintainability: financial projection is pure and UI does not own mutations.
- Scope: no reconciliation or PR #223 overlap.

### Remaining limitations

- This is a read-only first slice; correction remains in the transaction manager.
- No account trends, export, statement reconciliation or filters.
- Production behavior is unverified until owner merge/deployment.

## Delivery record

- Branch: `feat/account-register-detail`
- PR: pending
- Base: `chore/adopt-spec-kit`
- Exact-head CI: pending
- Production deployment: not authorized
- Production flow verified: not applicable before merge
- Packet archive: after owner merge and acceptance