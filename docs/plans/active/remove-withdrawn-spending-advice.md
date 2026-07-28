# Remove withdrawn spending advice from runtime

**Status:** implemented; PR pending  
**Owner:** Codex  
**Issue/PR:** Issue #81 product decision; PR pending  
**Last updated:** 2026-07-28

## Outcome

MoneyFlow shows only observed ledger totals and user-authored planning data. The
withdrawn balance-derived daily spending recommendation is no longer calculated
in the dashboard runtime, referenced by current product copy, or retained behind
hidden compatibility CSS. Dashboard and account balances now also reconcile
against the same active ledger after demo hydration and subsequent mutations.

## Repository reconnaissance

### Baseline before change

- The Calm Ledger dashboard renders balance, monthly income, expense, net,
  categories and planning status; it does not render a daily spending guide.
- `calculateDashboardSummary` calculated and returned `safeToday`,
  `dailyAllowance` and `forecast` from total balance and days remaining.
- `MoneyFlowDashboard` derived commitments, savings and partial-budget
  inputs solely for the withdrawn calculation.
- A compatibility stylesheet hid the old card, and dead `.safe-card` selectors
  remained in global refresh layers.
- Goals and commitments contained copy that implied a global spendable amount.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `src/lib/finance.ts` | Owns dashboard financial calculations | Keep observed totals; remove advice |
| `src/components/moneyflow-dashboard.tsx` | Supplies dashboard summary inputs | Remove advice-only derivations |
| `src/components/planning/` | Contains stale planning copy | Clarify observed vs allocated money |
| `src/app/legacy.css` and legacy CSS layers | Hide/style removed UI | Remove advice-only compatibility rules |
| `src/lib/*.test.ts` | Locks financial behavior and source contracts | Replace withdrawn assertions |

### Existing tests and constraints

- Related unit tests: `finance.test.ts`, `money-invariants.test.ts`,
  `transfer-expense-contract.test.ts`, `dashboard-live-allowance.test.ts`.
- Database/RLS tests: unaffected; no schema or mutation changes.
- Browser tests: `expense-path.spec.ts` and `global-pfm-ux.spec.ts` already require
  observed totals and no untrusted spending advice.
- Product/architecture rules: total balance is not a spending plan; unknown
  income-cycle, reserve and obligation data must not be guessed.

### Similar implementation and recent history

- PR #68 hid the old card after the financial model was withdrawn.
- `docs/research/08_SAFE_TO_SPEND_WITHDRAWAL.md` records the approved product
  decision and the evidence required before any future replacement.
- The current `DashboardHeaderSections` already renders only four observed
  values and is the presentation pattern to preserve.

### Open questions

- [x] Is a new spending model authorized? No.
- [x] Does removing the calculation require a migration? No.
- [x] Do budgets, commitments or goals need behavior changes? No; only
  advice-specific derivation and copy are removed.

## Research

Not required. This change implements an already approved internal product
decision. The external product evidence and counterexamples are preserved in
`docs/research/08_SAFE_TO_SPEND_WITHDRAWAL.md`.

### Questions researched

1. None beyond the approved withdrawal decision.

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| `docs/research/08_SAFE_TO_SPEND_WITHDRAWAL.md` | 2026-07-28 | Balance-derived daily advice is unsafe and withdrawn | Does not define a replacement model |
| `docs/product/PRINCIPLES.md` | 2026-07-28 | Missing planning inputs remain unknown | Current product phase only |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Keep calculating but hide with CSS | Smallest diff | Accidental re-exposure; misleading contracts and dead runtime | Reject |
| Return nullable advice fields | Preserves API shape | Suggests an approved feature still exists | Reject |
| Remove advice end-to-end | Runtime and product truth align | Requires updating tests and legacy CSS | Adopt |

### Research decision

Remove the withdrawn model rather than preserving a hidden compatibility API.
Any future spending plan must begin with a new researched contract and cannot
reuse these balance-derived assumptions by accident.

## Specification

### Problem

Users are currently protected visually, but the product still computes an
untrusted daily spending recommendation and contains planning copy that refers
to it. This creates a regression path where a future UI change could expose a
financially misleading value.

### User stories

- As a MoneyFlow user, I see only values supported by my recorded data.
- As a maintainer, I cannot accidentally render a balance-derived spending
  recommendation from the dashboard summary.
- As a user planning bills or goals, I receive factual copy about allocation
  without an implied global amount I may spend.

### Acceptance criteria

- [x] Dashboard summary returns only `balance`, `income`, `expense` and `net`.
- [x] Dashboard summary requires explicit balance and period inputs and rejects
  an unsafe balance or invalid reporting date.
- [x] No production TypeScript calculates or returns a global daily allowance,
  safe-to-spend value or balance-derived forecast.
- [x] Advice-only props and calculations are removed from the dashboard client.
- [x] Current goals, commitments and metadata contain no stale “có thể chi” copy.
- [x] Advice-only compatibility CSS and selectors are removed.
- [x] Transfer, split, integer-VND and observed monthly-total tests remain green.
- [x] Demo and authenticated ledger mutations adjust the observed balance
  exactly once after hydration, edit, delete, restore, income or expense.
- [x] Desktop and mobile expense/dashboard/export E2E flows remain green.

### Required states

- Loading: unchanged.
- Empty: observed totals and one transaction CTA remain unchanged.
- Populated: balance, income, expense, net, category and planning data remain.
- Validation/error: unsafe dashboard balance fails instead of being guessed.
- Recovery/undo: unchanged.
- Long data / large VND: existing `MoneyValue` behavior remains.
- Mobile/tablet/desktop: no layout or navigation change.
- Accessibility: no interactive control is added or removed.

### Financial and security constraints

- No guessed financial data or recommendation.
- Integer VND and transfer invariants remain intact.
- Ownership/RLS implications: none; no persistence or query-boundary change.

### Out of scope

- A replacement monthly or payday planning model.
- Reconciliation, import provenance or persisted rules.
- Supabase Auth leaked-password provider configuration.
- Broad Calm Ledger redesign or unrelated CSS cleanup.

## Implementation plan

### Architecture fit

Observed dashboard calculations stay in `src/lib/finance.ts`. The client
dashboard supplies the authenticated/demo balance already loaded by the server
workspace. Planning modules continue to calculate their own explicit budgets,
commitments and goal progress without feeding a global spending recommendation.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `src/lib/finance.ts` | Remove daily-guide types, constants and branches; validate explicit observed inputs | Align domain API with product truth |
| `src/components/moneyflow-dashboard.tsx` | Remove advice-only derivations/imports | Stop untrusted work at runtime |
| Planning copy and metadata | Describe allocation/obligations factually | Remove misleading user promise |
| Legacy CSS layers | Remove hidden card import and dead advice selectors | Remove regression surface |
| Existing unit/source tests | Replace advice assertions with observed-total and absence contracts | Prevent reintroduction |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: internal-only return shape; current renderer consumes only the
  retained four totals.
- Rollback: revert the focused PR; no data rollback.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Demo balance changes | Pass the explicit demo workspace balance and retain E2E assertions |
| Hydrated demo ledger diverges from server sample rows | Reconcile active-vs-observed ledger effects and assert exact balance before/after expense |
| Transfer leaks into observed totals | Existing transfer invariant tests remain |
| Partial budgets lose their own UI | Remove only the global derivation; budget components remain |
| Dead CSS removal changes another surface | Confirm zero TSX consumers and run cross-device/browser tests |
| Future code calls summary without balance/date | Required options plus runtime validation |

### Verification plan

- Static: knowledge, architecture, CSS ownership, lint and typecheck.
- Unit/domain: full unit suite including finance and money invariants.
- Database: static RLS tests; no migration, so local pgTAP is not behaviorally
  required for this slice.
- Browser flow: full desktop/mobile E2E suite.
- Responsive/visual: selected cross-device audit or full PR audit if runtime
  permits.
- Production/manual: verify dashboard observed values after PR deployment.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Replace withdrawn domain tests with observed-summary contracts | None | Focused tests failed before implementation and pass after it | done |
| T2 | Remove advice calculation and dashboard data flow | T1 | Focused tests, full suite and typecheck pass | done |
| T3 | Remove stale copy and advice-only CSS | T1 | Source absence contract and CSS ownership check pass | done |
| T4 | Run complete verification and review diff | T2, T3 | Gates below; WebKit and pgTAP environment limits recorded | done |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Observed-only dashboard contract | `finance.test.ts` deep-equality and invalid balance/date tests | pass |
| No withdrawn runtime or CSS surface | `withdrawn-spending-advice.test.ts`; repository search | pass |
| Finance invariants | Full unit/domain suite: 568 passed | pass |
| Live balance after ledger replacement | Unit edit/delete/restore/income/transfer contract and desktop/mobile expense E2E | pass |
| Cross-route balance consistency | Dashboard and Accounts both show 349.000 ₫ after an empty-ledger 777.000 ₫ expense | pass |
| Static quality and architecture | knowledge, architecture, CSS ownership, lint, typecheck, static RLS | pass |
| Production compilation | Explicit demo-mode `next build`; 43 routes generated | pass |
| Core browser flows | Playwright desktop/mobile: 6 passed | pass |
| Cross-device UI | PR audit: 219 passed across Chromium, dark mode, 200% text and keyboard | pass |
| WebKit compatibility | 12 tests blocked before launch; host lacks required system libraries | blocked by environment |
| Local pgTAP | Supabase static RLS passed; Docker daemon is not running for local DB | blocked by environment |

### Review findings

- Correctness: dashboard totals now have one observed-data contract; transfer,
  split, edit/delete, account-level balance and integer-VND invariants remain
  green.
- Security/ownership: no schema, query or RLS boundary changed; static RLS
  ownership checks pass.
- UI/UX/accessibility: current dashboard never exposes the withdrawn advice;
  desktop/mobile flows and all runnable responsive, dark, zoom and keyboard
  audits pass.
- Maintainability/duplication: removed 660 lines of dead calculation, tests and
  compatibility CSS; a source-level absence contract prevents reintroduction.
- Scope compliance: pending.

### Remaining limitations

- A future planning recommendation still requires a separate researched product
  contract and real-use evidence.

## Delivery record

- Branch: `fix/remove-withdrawn-spending-advice`
- PR: pending
- Squash commit: pending
- CI run: pending
- Production deployment: pending
- Production flow verified: pending
- Work packet moved to `docs/plans/completed/`: no
