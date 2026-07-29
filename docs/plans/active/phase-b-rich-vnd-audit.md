# Phase B rich VND and long Vietnamese UI audit

**Status:** evaluating  
**Owner:** agent  
**Issue/PR:** #72 / #104  
**Last updated:** 2026-07-28

## Outcome

MoneyFlow now has repeatable browser evidence that large integer VND values and long Vietnamese transaction notes remain usable across the configured responsive matrix. The slice also fixed two production layout defects found by the audit: Transactions rows exceeded phone viewports, and Reports totals were ellipsized on narrow screens.

## Repository reconnaissance

### Current behavior

- The baseline responsive suite covers default/empty states and checks document overflow, interactive controls, dialogs and clipped money.
- Closed PR #75 preserved the rich-state requirement but targeted retired `/insights` assumptions.
- Initial PR #104 run #388 found Transactions rows extending to 575px on 320/360/390px phones.
- Follow-up run #393 confirmed the Transactions fix and then exposed clipped Reports totals plus timing races in quick-capture and keyboard-focus evidence.
- Run #398 passed the complete configured matrix after the route-owned fixes and test stabilization.

### Relevant repository areas

| Area | Change or reuse |
|---|---|
| `e2e/audit/rich-state.responsive.audit.spec.ts` | Adds synthetic large-VND and long-note evidence |
| `src/components/transactions-page.module.css` | Owns the phone transaction-row correction |
| `src/components/reports-page.tsx` and `.module.css` | Own readable narrow-screen report totals |
| `e2e/audit/keyboard-focus.ts` | Waits for authored/native focus transitions before measuring |
| `playwright.audit.config.ts` | Reuses the seven-project responsive matrix |

### Existing tests and constraints

- VND remains integer đồng.
- Transfers remain excluded from income/expense totals.
- No Auth, RLS, schema, migration or production-data changes were made.
- Fixtures are synthetic demo localStorage values.
- Reports keeps its existing server-owned demo workspace; this slice does not add a test-only runtime boundary.

### Similar implementation and recent history

- Reused `auditRoute` for PNG/JSON evidence and P1/P2 classification.
- Added fixes to component-owned CSS Modules rather than another global override layer.
- Followed issue #72’s rule to fix the root component and retain regression evidence at failing viewports.

### Open questions

- [x] Rich data exposes phone overflow: fixed in Transactions.
- [x] Reports consumes browser-local transaction fixtures: no; canonical server demo data remains authoritative.
- [x] Quick capture starts in expense mode: yes, accessible name `Khoản chi (−)`.
- [x] Full responsive matrix passes after the fixes: yes, run #398.

## Research

No external research was required. This was an internal browser-regression and responsive-layout correction using current repository contracts.

### Questions researched

1. Which data owner supplies each audited route?
2. Which layout boundary causes phone overflow?
3. Whether the remaining failures were product defects or asynchronous test measurements.

### Sources

| Source | Date | Establishes | Limitation |
|---|---|---|---|
| Issue #72 and closed PR #75 | 2026-07-28 | Preserved rich-state requirement | Historical implementation was stale |
| CI runs #388, #393 and #398 | 2026-07-28 | Failing and passing route/viewport evidence | Emulated browsers only |
| Current component and CSS ownership | 2026-07-28 | Correct production fix boundaries | Applies to current shell |

### Alternatives considered

| Option | Decision |
|---|---|
| Restore PR #75 unchanged | Rejected: stale routes and selectors |
| Hide overflowing rows/panels | Rejected: would clip user data |
| Phone-specific Transactions layout in its CSS Module | Selected |
| Force Reports to read a test-only browser fixture | Rejected |
| Remove keyboard checks to avoid timing failures | Rejected; stabilized measurement instead |

### Research decision

Keep evidence representative of current runtime ownership, fix actual clipping/overflow at component boundaries, and stabilize browser measurements without weakening acceptance criteria.

## Specification

### Problem

Desktop minimum-width grids and nowrap/ellipsis rules made large amounts or long transaction content unreadable on narrow screens. Asynchronous focus changes also made browser evidence flaky even when the final UI state was correct.

### User stories

- As a user with a long Vietnamese note, I can read the transaction without horizontal scrolling.
- As a user with a large VND amount, I can see full transaction and report values on a phone.
- As a keyboard user, focused controls are brought into view and retain a visible focus indicator.
- As a maintainer, I receive reproducible screenshots and JSON evidence across supported viewports.

### Acceptance criteria

- [x] `/dashboard` renders the 987.654.321 ₫ seeded expense without clipped money.
- [x] `/transactions` renders 987.654.321 ₫, 12.345.678.900 ₫ and 4.567.890.123 ₫ without document overflow.
- [x] Long notes wrap and phone rows stay inside 320/360/390px viewports.
- [x] Quick capture accepts 987.654.321 ₫ and a long Vietnamese note with input and Save action inside the viewport.
- [x] `/reports` renders canonical populated totals without ellipsis or clipped money on narrow screens.
- [x] Keyboard focus evidence passes after authored/native focus transitions settle.
- [x] PNG and JSON Playwright evidence is uploaded.
- [x] Full configured CI is green.

### Required states

- Loading: shared audit waits for visible loading state to settle.
- Empty: retained in the baseline suite.
- Populated: rich local transactions on Dashboard/Transactions; canonical populated Reports data.
- Long data / large VND: covered by the new suite.
- Mobile/tablet/desktop: 320, 360, 390, 768, 1024, 1366 and 1440 Chromium projects.
- Accessibility: role/label/pressed-state interactions and keyboard-focus audit.
- Validation/error/recovery: remain open under #72.

### Financial and security constraints

- No financial advice or inferred user data.
- Integer VND and transfer semantics are unchanged.
- No ownership, tenant-isolation or database impact.

### Out of scope

- Changing Reports data ownership.
- Validation, destructive confirmation and import-review states.
- Physical Android/iOS acceptance.
- Unrelated visual redesign.

## Implementation plan

### Architecture fit

The regression suite belongs under `e2e/audit/`. Production fixes remain in route/component CSS Modules. No new global stylesheet or finance-domain logic was introduced.

### Implemented changes

| File/area | Change |
|---|---|
| Rich-state responsive spec | Seed large VND and long notes; audit four flows across seven projects |
| Transactions CSS Module | Phone grid becomes icon/content/actions; amount moves to row two; text wraps |
| Reports component/CSS Module | Report metric values wrap instead of ellipsizing on phones |
| Keyboard helper | Wait two animation frames and native focus scrolling before measurement |
| Quick-capture test | Wait for category focus transition before entering the long note |

### Data and migration impact

- Schema/migration/backfill: none.
- Existing demo localStorage keys remain unchanged.
- Rollback: revert the component CSS and browser tests.

### Risks and counterexamples

| Risk | Prevention/evidence |
|---|---|
| Overflow is merely hidden | Row bounds and money clipping assertions remain active |
| Large amount pushes actions away | Fixed action column; amount occupies second content row |
| Long text preserves min-content width | `min-width: 0` plus wrapping rules |
| Reports test asserts the wrong fixture | Uses canonical Reports workspace and clipping assertions |
| Focus audit measures an intermediate element | Settles React/native focus transition without programmatic scrolling |

### Verification plan

- Knowledge, deployment and CSS ownership contracts.
- Lint, typecheck, unit/static-RLS and production build.
- Fresh local Supabase reset and pgTAP.
- Expense-path browser smoke.
- Rich-state and baseline responsive audit on all configured projects.
- Keyboard-focus audit.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Add current-main rich-state suite | PR #104 | done |
| T2 | Classify initial failures | Runs #388/#393 artifacts | done |
| T3 | Fix Transactions phone overflow | 320/360/390 regression | done |
| T4 | Fix Reports money clipping | Narrow-screen report audit | done |
| T5 | Stabilize quick-capture and keyboard evidence | Run #398 | done |
| T6 | Run full CI and evaluate | Run #398 | done |
| T7 | Update #72 and merge | Issue/PR record | done — PR #104 merged `76c4629d636f1f50a9c6f96fab12c7dd4b46e6c6` |

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| Static, unit and production build | Run #398 `verify` | pass |
| Fresh Supabase reset and pgTAP | Run #398 `database` | pass |
| Expense browser flow | Run #398 `Expense-path browser smoke` | pass |
| Rich VND/long-note responsive matrix | Run #398 `Production cross-device UI audit` | pass |
| Keyboard-focus evidence | Run #398 audit matrix | pass |
| Screenshots and JSON | Run #398 Playwright artifact upload | pass |

### Review findings

- Correctness: finance calculations and transfer semantics were unchanged.
- Security/ownership: no production data, Auth, RLS or database changes.
- UI/UX/accessibility: Transactions and Reports narrow-screen defects are fixed; keyboard evidence is stable.
- Maintainability: fixes live with their component owners; shared audit infrastructure is reused.
- Scope: limited to two production layout corrections, evidence and test stabilization.

### Remaining limitations

- Reports exact totals are based on its canonical server-owned demo workspace, not the browser-local rich transaction fixture.
- Emulation does not establish physical-device readiness. (2026-07-28: a fresh local demo-build re-run of `rich-state.responsive.audit.spec.ts` on `chromium-desktop-1366`/`chromium-phone-320` still passes for dashboard/transactions/reports rich-money states — reconfirms the fix holds, does not add physical-device evidence.)
- Validation, destructive confirmation and import review remain open under #72.

## Delivery record

- Branch: `agent/phase-b-rich-vnd-audit`
- PR: #104 (merged 2026-07-28)
- Squash commit: `76c4629d636f1f50a9c6f96fab12c7dd4b46e6c6` (current `main` HEAD)
- CI: run #398 (`30332248576`) — complete success
- Production deployment: merge landed on `main`; exact Vercel production deployment for this commit not yet manually re-verified
- Production manual/physical verification: not claimed
- Work packet state: remains in `docs/plans/active/` — merged and CI-green, but not moved to `completed/` because production manual verification (AGENTS.md §8) is still outstanding
