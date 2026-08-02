# Account register and detail

- **Status:** ready_for_review
- **Execution state:** ready_for_review
- **Active role:** human_owner
- **Permission scope:** read_only
- **Owner:** Thunderkill016
- **Issue/PR:** #228
- **Last updated:** 2026-08-02

## Outcome

Users can open a visible account and inspect the ledger movements related to it: trusted current/initial balance, separate income/expense/transfer movement totals and a newest-first read-only account register. Existing balance derivation, transaction mutation ownership, RLS and product scope remain unchanged.

## Repository reconnaissance

### Current behavior before this candidate

- `/accounts` showed balances with edit/archive actions but no detail route.
- `getAccountsWorkspace` provided validated viewer-scoped accounts and derived balances.
- `getFinanceWorkspace` provided the validated full transaction feed in authenticated/demo modes.
- Transactions already identified a source account and optional transfer destination.
- PR #222 reconciliation was closed unmerged because the owner prioritized account detail and transaction correction instead.

### Relevant areas

| Area | Decision |
|---|---|
| `src/server/accounts.ts` | Reused unchanged |
| `src/server/finance.ts` | Reused unchanged |
| `src/lib/account-register.ts` | Added pure account-leg projection |
| `src/app/accounts/[accountId]/page.tsx` | Added viewer-scoped route |
| `src/components/account-detail-page.*` | Added read-only responsive register |
| `src/components/accounts-page.*` | Added direct links only |
| PR #223 transaction filter files | Avoided entirely |

## Research

Not required. Current code and recorded owner decisions established the approach. No dependency, provider or service was adopted.

## Specification and acceptance

See `specs/001-account-register-detail/spec.md`.

- [x] Active and archived accounts expose `Xem sổ`.
- [x] The route composes existing viewer-scoped account and finance workspaces.
- [x] A pure helper maps income/expense and both transfer legs to signed account impact.
- [x] Transfers remain separate from income and expense totals.
- [x] Account identity, currency, current/initial balance and archived state are represented.
- [x] Populated rows group newest-first; the empty state is honest.
- [x] History failure hides unverified totals/register rather than displaying zeros.
- [x] Inaccessible IDs use a generic not-found UI without account identity leakage.
- [x] Phone layout has no horizontal overflow in focused browser evidence.
- [x] No database, RLS, RPC, provider, reconciliation or mutation-owner change exists.
- [x] Risk-selected exact-head checks passed.
- [x] Independent review found no financial, ownership, UI or scope blocker.

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
- Rollback: revert PR #228.

## Evaluation

### Risks and counterexamples

| Risk | Evidence/result |
|---|---|
| Transfer pollutes income/expense | Separate totals and passing unit counterexamples |
| Destination leg missing | `destinationAccountId` projection and passing tests |
| Ownership leak | Existing scoped loaders plus generic 404 UI browser assertion |
| False zero history | Error state hides movement totals/register |
| Mutation duplication | Register stays read-only and links to `/transactions` |
| Phone overflow | Scoped minmax/wrapping CSS and passing 360px browser assertion |
| PR #223 conflict | Final diff contains no transaction filter/page files |
| Reconciliation scope creep | No statement/matching/cleared/balance-adjustment code or schema |

### Verification evidence

Exact implementation head: `1775c3b763e5863d8c3f3955961583e152f0a762`.

- CI #1090: success after exact-head e2e job rerun.
- Verify: diff hygiene, project knowledge, CI policy, deployment configuration, CSS ownership, architecture, lint, typecheck, unit/static-RLS tests and production build all passed.
- Browser smoke: passed on desktop/mobile.
- Cross-device UI audit: passed on the exact-head rerun. The first attempt hit inconsistent unrelated SAFE-09 transaction-audit failures; rerunning the same job without code changes passed, so no out-of-scope transaction/audit code was modified.
- CodeQL #247: success.
- Secret history scan #247: success.
- Database job: success with database checks explicitly not required because no database contract changed.
- Production/provider verification: not applicable before owner merge/deployment.

## Tasks

See `specs/001-account-register-detail/tasks.md`. All implementation, verification and evaluation tasks are complete. Only the owner merge/deployment decision remains.

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next action |
|---|---|---|---|---|---|---|
| 2026-08-02 | owner | planner | specified | user instruction, code audit, PR #222 decision | no active spec existed | define bounded feature |
| 2026-08-02 | planner | implementer | planned | spec/plan/tasks/checklist | runtime unverified | implement focused slice |
| 2026-08-02 | implementer | evaluator | evaluating | source, tests, PR #228 | exact-head gates | verify and review |
| 2026-08-02 | evaluator | human owner | ready_for_review | CI #1090, CodeQL #247, secret #247, browser/UI evidence and bounded diff review | production remains unverified before merge | review, merge/request changes/reject |

### Current permission boundary

- Granted scope: read-only owner review of PR #228.
- Forbidden actions for the agent: merge, direct `main`, provider/deployment writes and production-data changes.
- Human approval required before merge and deployment.
- Production route verification occurs only after owner-controlled merge/deployment.

## Remaining limitations

This is a read-only first slice. It does not add trends, filters, export, transaction correction inside the account register or reconciliation.

## Delivery record

- Branch: `feat/account-register-detail-main`
- PR: #228
- Exact implementation checks: green at `1775c3b763e5863d8c3f3955961583e152f0a762`
- Final evidence-only head: repository checks pending
- Production deployment: not authorized
- Packet archive: after owner merge and acceptance only
