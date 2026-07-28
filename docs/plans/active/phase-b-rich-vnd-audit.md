# Phase B rich VND and long Vietnamese UI audit

**Status:** implementing  
**Owner:** agent  
**Issue/PR:** #72 / #104  
**Last updated:** 2026-07-28

## Outcome

MoneyFlow has repeatable browser evidence that realistic large VND values and long Vietnamese transaction notes remain readable and usable across the current responsive matrix on Dashboard, Transactions and quick capture. Reports remains in the populated route audit, but its server-owned demo workspace is not falsely treated as if it consumed the browser-local transaction fixture.

## Repository reconnaissance

### Current behavior

- The baseline responsive audit covers empty/default demo states and checks document overflow, clipped dialogs, small controls and clipped money.
- Closed PR #75 preserved the rich-state requirement but targeted the retired `/insights` route.
- PR #103 restored a fully green public CI baseline on canonical `/dashboard`.
- Initial PR #104 run #388 exposed one production defect: phone transaction rows retained the desktop five-column minimum width and extended to 575px at 320/360/390px viewports.
- The same run showed two test-fixture mismatches: Reports uses its server-owned demo workspace rather than the browser-local transaction seed, and quick capture already opens in expense mode with accessible name `Khoản chi (−)`.

### Relevant repository areas

| Area | Why it matters | Reuse/change/avoid |
|---|---|---|
| `e2e/audit/responsive-audit.ts` | Shared route audit and evidence | Reuse |
| `e2e/audit/rich-state.responsive.audit.spec.ts` | Current rich-state matrix | Add and reconcile |
| `src/components/transactions-page.tsx` | Transaction row structure | Reuse structure |
| `src/components/transactions-page.module.css` | Route-owned responsive override | Fix phone row layout here |
| `playwright.audit.config.ts` | Seven responsive Chromium projects | Reuse existing matcher |

### Existing tests and constraints

- Unit/static-RLS, production build, fresh Supabase reset and pgTAP remain mandatory.
- Expense browser smoke must remain green.
- VND stays integer đồng and transfers remain excluded from income/expense totals.
- No production credentials or user data are used; fixtures live in demo localStorage.

### Similar implementation and recent history

- Reuse `auditRoute` for PNG/JSON evidence and P1/P2 classification.
- Reuse route-owned CSS Module bridges instead of adding another global override layer.
- Issue #72 requires fixes by shared component/root cause and regression evidence at the failing viewport.

### Open questions

- [x] Does rich data expose a phone overflow? Yes: Transactions rows at 320/360/390px.
- [x] Can Reports consume the same browser fixture? No; current Reports data ownership is server-side demo workspace.
- [x] Does quick capture require switching to expense mode? No; expense mode is already selected.

## Research

Not required. This is an internal regression and responsive-layout correction using existing repository contracts and test infrastructure.

### Questions researched

1. Which current data owner supplies each audited route?
2. Which layout boundary causes the phone overflow?

### Sources

| Source | Date accessed | What it establishes | Limits/applicability |
|---|---|---|---|
| Issue #72 and closed PR #75 | 2026-07-28 | Preserved rich-state requirement | Historical implementation was stale |
| CI run #388 Playwright artifacts | 2026-07-28 | Exact failing routes, viewports and accessible names | Emulated browsers only |
| Current Transactions component and CSS | 2026-07-28 | Desktop grid minimums caused the overflow | Applies to current shell |

### Alternatives considered

| Option | Advantages | Risks | Decision |
|---|---|---|---|
| Restore PR #75 unchanged | Small diff | Stale route and assumptions | Rejected |
| Hide overflow on the panel | Fast | Clips content and masks defect | Rejected |
| Phone-specific three-column row in route-owned CSS | Preserves content and actions | Must verify all phone widths | Selected |
| Inject test-only data into Reports server workspace | Could force exact numbers | Adds a new test-only runtime boundary | Rejected for this slice |

### Research decision

Use evidence-first coverage. Fix the real Transactions phone layout in its CSS Module, align quick-capture selectors with the current accessible state, and audit Reports as populated canonical data without claiming it consumed the localStorage fixture.

## Specification

### Problem

Large values and long notes can force transaction content beyond narrow viewports. The old desktop row grid reserves fixed columns that cannot fit a 320–390px screen.

### User stories

- As a user with a long Vietnamese note, I can read the transaction without horizontal scrolling.
- As a user with a large VND amount, I can see the amount and row actions on a phone.
- As a maintainer, I receive reproducible evidence across all supported responsive Chromium viewports.

### Acceptance criteria

- [ ] `/dashboard` renders the 987.654.321 ₫ seeded expense without clipped money.
- [ ] `/transactions` renders 987.654.321 ₫, 12.345.678.900 ₫ and 4.567.890.123 ₫ records without document overflow.
- [ ] Long transaction notes wrap and each phone row stays within 320/360/390px viewports.
- [ ] Quick capture accepts 987.654.321 ₫ and a long Vietnamese note while the input and Save action remain inside the viewport.
- [ ] `/reports` remains usable with its canonical populated demo workspace and has no clipped visible money.
- [ ] PNG and JSON evidence is uploaded.
- [ ] Full configured CI is green.

### Required states

- Loading: wait for visible busy/loading state to settle.
- Empty: covered by baseline suite.
- Populated: rich browser-local transactions on Dashboard/Transactions; canonical populated Reports workspace.
- Validation/error: remains open under #72.
- Recovery/undo: out of scope.
- Long data / large VND: primary focus.
- Mobile/tablet/desktop: 320, 360, 390, 768, 1024, 1366 and 1440 Chromium projects.
- Accessibility: interact through current roles, labels and pressed state.

### Financial and security constraints

- No financial advice or guessed data.
- Integer VND and transfer invariants remain unchanged.
- No Auth, RLS, schema or production-data impact.

### Out of scope

- Changing Reports data ownership or introducing a test-only production route.
- Validation/destructive confirmation/import-review states.
- Physical Android/iOS acceptance.
- Unrelated visual redesign.

## Implementation plan

### Architecture fit

The regression spec belongs in `e2e/audit/`. The production fix belongs in `transactions-page.module.css`, which already bridges the current Transactions route away from legacy global ownership. No new global stylesheet is added.

### Planned changes

| File/area | Change | Reason |
|---|---|---|
| `e2e/audit/rich-state.responsive.audit.spec.ts` | Seed rich data, audit routes, align quick-capture and Reports assertions | Current evidence contract |
| `src/components/transactions-page.module.css` | On phones use `icon | minmax(0,1fr) | actions`, wrap detail, move amount to row two | Remove 575px row overflow without clipping |
| Work packet | Record findings, decisions and evidence | Keep scope reviewable |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Compatibility: existing demo localStorage keys unchanged.
- Rollback: revert the CSS Module and regression spec.

### Risks and counterexamples

| Risk/counterexample | Prevention or test |
|---|---|
| Fix masks overflow by clipping | Do not set row overflow hidden; assert row bounds and visible money |
| Large amount pushes actions away | Put amount in second content row; actions occupy fixed third column |
| Long words preserve min-content width | `min-width: 0`, `overflow-wrap: anywhere`, `word-break: break-word` |
| Reports assertion tests the wrong data owner | Assert route usability and unclipped canonical money, not local fixture values |
| Quick capture selector misses `Khoản chi (−)` | Match accessible-name prefix and assert pressed state |

### Verification plan

- Static: knowledge, deployment, CSS ownership, lint and typecheck.
- Unit/domain: full unit/static-RLS suite.
- Database: fresh Supabase reset and pgTAP.
- Browser flow: expense-path smoke.
- Responsive/visual: rich-state suite on seven viewports plus baseline production audit.
- Production/manual: not required for test/CSS slice; physical checks remain open.

## Tasks

| ID | Task | Dependency | Evidence | Status |
|---|---|---|---|---|
| T1 | Add current-main rich-state suite | PR #103 | Initial PR #104 diff | done |
| T2 | Classify run #388 failures | T1 | Playwright artifact | done |
| T3 | Fix phone transaction row root cause | T2 | CSS Module + 320/360/390 regression | in progress |
| T4 | Align Reports and quick-capture assertions with current owners/state | T2 | Updated spec | in progress |
| T5 | Run full CI and evaluate evidence | T3, T4 | New Actions run | todo |
| T6 | Update #72 and deliver PR | T5 | Issue comment and merge | todo |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Baseline static/build/database gates | Run #388 | pass |
| Expense browser smoke | Run #388 | pass |
| Rich phone transaction rows | Run #388 showed 575px defect; fix pending rerun | pending |
| Reports canonical populated state | Run #388 showed fixture-owner mismatch; assertion corrected | pending rerun |
| Quick capture filled state | Run #388 exposed exact-name mismatch; selector corrected | pending rerun |
| Full CI | Follow-up run | pending |

### Review findings

- Correctness: transfer remains display-only for this test and domain totals are unchanged.
- Security/ownership: no production data or tenant boundary changes.
- UI/UX/accessibility: real phone overflow found and fixed at route ownership boundary.
- Maintainability/duplication: shared audit helper reused; no new framework or global CSS layer.
- Scope compliance: one production CSS root-cause fix plus tests/docs.

### Remaining limitations

- Reports does not currently accept the browser-local transaction fixture, so exact rich report totals are not proven in this slice.
- Emulation does not establish physical-device readiness.
- Validation, destructive confirmation and import review remain open under #72.

## Delivery record

- Branch: `agent/phase-b-rich-vnd-audit`
- PR: #104
- Squash commit: pending
- CI run: #388 failed at rich-state audit; follow-up pending
- Production deployment: pending after merge
- Production flow verified: not applicable before merge
- Work packet moved to `docs/plans/completed/`: pending
