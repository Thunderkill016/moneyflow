# Account register and detail

- **Status:** implementing
- **Execution state:** implementing
- **Active role:** evaluator
- **Permission scope:** branch_write
- **Owner:** Thunderkill016
- **Issue/PR:** #228
- **Last updated:** 2026-08-02

## Outcome

Users can open a visible account and inspect the ledger movements related to it: trusted current/initial balance, separate income/expense/transfer movement totals and a newest-first read-only account register. Existing balance derivation, transaction mutation ownership, RLS and product scope remain unchanged.

## Repository reconnaissance

### Current behavior

- `/accounts` shows balances with edit/archive actions but no detail route.
- `getAccountsWorkspace` provides validated viewer-scoped accounts and derived balances.
- `getFinanceWorkspace` provides the validated full transaction feed in authenticated/demo modes.
- Transactions identify a source account and optional transfer destination.
- PR #222 reconciliation was closed unmerged because the owner prioritized account detail and transaction correction instead.

### Relevant areas

| Area | Decision |
|---|---|
| `src/server/accounts.ts` | Reuse unchanged |
| `src/server/finance.ts` | Reuse unchanged |
| `src/lib/account-register.ts` | New pure account-leg projection |
| `src/app/accounts/[accountId]/page.tsx` | New viewer-scoped route |
| `src/components/account-detail-page.*` | New read-only responsive register |
| `src/components/accounts-page.*` | Add direct links only |
| PR #223 transaction filter files | Avoid entirely |

### Existing tests and constraints

- Node tests own financial projection counterexamples.
- Playwright demo data provides stable populated MB Bank and empty USD travel states.
- Database/RLS tests are not selected because those contracts do not change.
- Transfers must never become income/expense; inaccessible IDs must not reveal ownership.

### Open questions

None blocking.

## Research

Not required. Current code and recorded owner decisions establish the approach. No dependency/provider/service is adopted.

## Specification

See `specs/001-account-register-detail/spec.md`.

### Acceptance criteria

- [x] Active and archived accounts expose `Xem sổ`.
- [x] Route composes existing viewer-scoped account and finance workspaces.
- [x] Pure helper maps income/expense and both transfer legs to signed account impact.
- [x] Transfers remain separate from income and expense totals.
- [x] Account identity, currency, current/initial balance and archived state are represented.
- [x] Populated rows group newest-first; empty state is honest.
- [x] History failure hides unverified totals/register rather than displaying zeros.
- [x] No database, RLS, RPC, provider, reconciliation or mutation-owner change exists.
- [ ] Exact-head selected checks pass.
- [ ] Independent review confirms UI, security and financial semantics.

### Required states

- Loading: server render; no fabricated data.
- Empty: trusted account/balance and no-movement message.
- Populated: date groups and signed row impacts.
- Error: generic not-found or trusted balance with unavailable-history panel.
- Recovery: not applicable; read-only.
- Responsive/accessibility: 44px actions, semantic labels, wrapping and textual direction.

### Out of scope

Reconciliation, statement matching, transaction mutation, trends/charts/filters/export, new data contracts and FX conversion.

## Implementation plan

### Architecture fit

The App Router route authorizes and composes current server loaders. A pure domain helper owns financial projection. The UI remains read-only and links to current transaction/account mutation owners.

### Changed areas

| Path | Change |
|---|---|
| `src/lib/account-register.ts` | Related-row filtering, signed impacts, ordering and summary |
| `src/lib/account-register.test.ts` | Financial and invalid-input tests |
| `src/app/accounts/[accountId]/page.tsx` | Viewer-scoped detail route |
| `src/components/account-detail-page.tsx` | Trusted summary/register states |
| `src/components/account-detail-page.module.css` | Scoped responsive layout |
| `src/components/accounts-page.tsx` | Active/archived `Xem sổ` links |
| `src/components/accounts-page.module.css` | Link presentation and targets |
| `e2e/account-register-detail.spec.ts` | Populated/empty/inaccessible/phone evidence |

### Data and rollback

- Schema/migration/backfill: none.
- Compatibility: additive.
- Rollback: revert the focused PR.

### Risks and counterexamples

| Risk | Prevention/evidence |
|---|---|
| Transfer pollutes income/expense | Separate totals and unit tests |
| Destination leg missing | Match/test `destinationAccountId` |
| Ownership leak | Existing scoped loaders and generic not-found |
| False zero history | Error state hides movement data |
| Mutation duplication | Read-only route; link to `/transactions` |
| Phone overflow | Minmax/wrapping CSS and browser assertion |
| PR #223 conflict | No overlapping files |

### Verification plan

- Knowledge/CI policy and diff hygiene.
- Deployment, CSS ownership and architecture contracts.
- Lint, typecheck, unit tests and build.
- Focused Playwright/browser smoke and responsive UI audit.
- CodeQL and secret-history scan.
- Database/production/provider evidence: not applicable before owner merge.

## Tasks

See `specs/001-account-register-detail/tasks.md`. Implementation tasks are complete; PR #228 exact-head evaluation is active.

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next action |
|---|---|---|---|---|---|---|
| 2026-08-02 | owner | planner | specified | user instruction, code audit, PR #222 decision | no active spec existed | define bounded feature |
| 2026-08-02 | planner | implementer | planned | spec/plan/tasks/checklist | runtime unverified | implement focused slice |
| 2026-08-02 | implementer | evaluator | implementing | source, unit tests, browser test, PR #228 | exact-head gates pending | resolve CI findings and evaluate |

### Current permission boundary

- Allowed: branch `feat/account-register-detail-main`, specified source/tests/docs and PR metadata.
- Forbidden: direct `main`, database/RLS/RPCs, providers, production data, reconciliation and deployment.
- Human approval required before merge/deploy.
- Stop if new persistence, direct balance editing or transaction mutation becomes necessary.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Direct account navigation | accounts page diff | pass by review |
| Signed account impacts | helper/tests | pending execution |
| Transfer-neutral totals | helper/tests | pending execution |
| Honest UI states | component/browser spec | pending execution |
| Responsive behavior | CSS/browser/UI audit | pending execution |
| No high-risk scope | final compare | pending |
| Exact-head gates | GitHub Actions | pending |

### Remaining limitations

Read-only first slice; no trends, filters, export or reconciliation. Production route remains unverified until owner merge/deployment.

## Delivery record

- Branch: `feat/account-register-detail-main`
- PR: #228
- CI: rerun pending after diff-hygiene repair
- Production deployment: not authorized
- Packet archive: after owner merge and acceptance only
