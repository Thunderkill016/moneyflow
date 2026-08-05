# MoneyFlow UI-system Phase 4 — Dashboard pilot

**Status:** specified
**Execution state:** planned
**Active role:** planner
**Permission scope:** docs_only
**Owner:** MoneyFlow owner
**Issue/PR:** pending draft PR
**Last updated:** 2026-08-06

## Outcome

Make `/dashboard` the first route that fully proves the MoneyFlow migration method after Phases 0–3: one local presentation owner, explicit component/state contracts, deterministic financial presentation, responsive hierarchy that survives reflow and no live dependency on Dashboard-specific legacy/global CSS.

This packet supersedes the Phase 4 task table in `docs/plans/active/ui-system-migration.md` wherever the two conflict. The parent packet remains the program-level sequence; this file is the controlling Phase 4 specification.

## Authorization and boundary

The owner instructed **“sửa p4 đi”** on 2026-08-06. That instruction authorizes correction of the Phase 4 specification and documentation only.

It does **not** authorize:

- product/runtime/CSS/test implementation;
- merging this packet;
- Phase 5 or later work;
- a visual-direction or branding change;
- financial calculation, advice, database, migration, Auth, RLS, provider, deployment or production-data operations.

Implementation requires a new explicit owner instruction such as **“triển khai P4”**. Merge and deployment remain separate owner decisions.

## Post-Phase-3 baseline

Phase 3 was squash-merged through PR #300 at `main@75129a6a0f212c12b20763a5d44c2de268832423`.

The current Dashboard composition is distributed across:

- `src/app/dashboard/page.tsx`;
- `src/components/moneyflow-dashboard.tsx`;
- `src/components/dashboard/dashboard-overview-sections.tsx`;
- `src/components/dashboard/dashboard-planning-sections.tsx`;
- `src/components/dashboard/statement.tsx` and `statement.module.css`;
- `src/app/dashboard/calm-ledger-overview.css`;
- `src/app/dashboard/calm-ledger-overview-actions.css`;
- Dashboard selectors mixed into `src/app/safe-ux-planning.css`;
- `src/app/dashboard/safe-ux-weekly-summary.css`;
- inherited selectors and compatibility rules under `src/app/legacy.css`.

### Current source findings

1. `/dashboard/page.tsx` imports four global presentation files. The route therefore still relies on cascade order rather than one local Dashboard owner.
2. `DashboardStatement` already owns most of its presentation through a CSS Module, so the old Phase 4 task “make the statement component-owned” is stale. The remaining work is to finish and protect that ownership.
3. Global `.insights-kpi` rules still describe a retired four-card DOM while the render tree now uses `DashboardStatement`.
4. Safe-to-spend markup is absent from the active Dashboard render tree, but withdrawal/hidden-selector bridges remain in global styles.
5. `calm-ledger-overview-actions.css` says an old in-page primary action still exists, while current JSX intentionally omits that duplicate.
6. Phone layout rules conflict: one stylesheet selects a one-column arrangement at `max-width: 760px`, while a later stylesheet reintroduces two columns at `max-width: 430px`.
7. Budget usage is exposed as `progressbar` and clamps `aria-valuenow` to 100 even when visible/accessible copy can report more than 100%, creating a semantics mismatch.
8. Dashboard calculations use `workspace.today`, while `DashboardStatement` derives the displayed month from `new Date()`. Data and period copy can disagree at month/timezone boundaries.
9. `safe-ux-planning.css` mixes Dashboard, Budgets and Goals selectors. Phase 4 must extract only Dashboard ownership without redesigning Phase 7 routes.
10. Dashboard still consumes compatibility presentation components/classes where Phase 2 primitives or an explicit adapter should own the contract, including alert, empty-state, action and money-display surfaces.
11. Open PR #294 is a stale pre-Phase-3 candidate for removing the legacy `dashboard` class. Its intent is relevant, but its old shell geometry assertions and branch evidence are not directly reusable. Phase 4 must disposition it against current `main`; it must not be merged blindly.

## Research decisions

### Next.js CSS ownership

Next.js documents CSS Modules as locally scoped and warns that global styles can persist across client-side navigation and conflict by import order. Phase 4 therefore treats removal of Dashboard-specific page-global CSS ownership as a primary acceptance criterion, not optional cleanup.

Source: <https://nextjs.org/docs/app/getting-started/css>

### Reflow and zoom

WCAG 2.2 Reflow requires ordinary content to work at an equivalent 320 CSS-pixel width without two-dimensional scrolling or lost information, except content that genuinely requires a two-dimensional layout. Money figures must remain complete rather than truncated.

Source: <https://www.w3.org/WAI/WCAG22/Understanding/reflow.html>

### Range semantics

A budget-used value is a scalar measurement within or beyond a known range and should use a meter/text-first contract when that communicates the state accurately. A goal can use progressbar only when it genuinely represents task/process completion. `aria-valuenow`, min/max and visible/value text must never contradict one another.

Sources:

- <https://www.w3.org/WAI/ARIA/apg/patterns/meter/>
- <https://www.w3.org/WAI/ARIA/apg/patterns/progressbar/>

### Status cannot rely on color alone

Income, expense, warning and completion states require written labels, values, symbols or structure in addition to color.

Source: <https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html>

### Container-dependent composition

Cards whose layout depends on their pane width may use container queries after a bounded compatibility review. Viewport media queries remain acceptable for page-level composition. Container queries are an implementation option, not a mandatory dependency or redesign.

Source: <https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries>

## Product and financial invariants

Phase 4 must preserve:

- VND as integer đồng;
- transfers excluded from income and expense;
- exact split/transaction totals;
- current balance reconciliation behavior;
- current budget, recurring-income, commitment and goal calculations;
- no invented balances, dates, assumptions or advice;
- no numeric safe-to-spend recommendation;
- complete, non-truncated money values;
- current B3.2/Fresh Blue direction and Light/Dark/System workspace behavior;
- current navigation destinations and Phase 3 App Shell geometry.

Any discovered need to change a formula, financial definition, persisted data contract or product advice exits this packet and requires a separate owner-approved specification.

## Target ownership model

```text
/dashboard page
  -> server workspace read and deterministic period input
  -> MoneyFlowDashboard orchestration
       -> Dashboard route module
       -> DashboardStatement module
       -> Dashboard ledger/category/recent modules
       -> Dashboard weekly/planning snapshot modules
       -> Phase 2 primitives or explicitly documented adapters
  -> AppShell owns chrome, primary capture and safe-area reserve

legacy/global CSS
  -> no Dashboard-specific live consumer after zero-consumer proof
```

### Ownership rules

- `src/app/dashboard/page.tsx` must not import Dashboard-specific global CSS at Phase 4 completion.
- Dashboard component files must use CSS Modules or shared primitive-owned styles.
- No new root/global stylesheet, import chain, `!important`, document selector or legacy class registration.
- No structural style inference through `:has()` where an explicit state/variant prop or data attribute can own the contract.
- Phase 4 may split a mixed compatibility stylesheet only to preserve non-Dashboard behavior unchanged; Budgets/Goals redesign remains Phase 7.
- A selector/file is deleted only after source, DOM and affected-browser zero-consumer evidence.

## State and hierarchy contract

### Required Dashboard states

- empty ledger;
- populated/rich ledger;
- current month with no expenses but historical transactions present;
- data error;
- attention strip absent and populated;
- budget absent, under, near and over limit;
- commitments absent, unpaid and fully paid;
- recurring income absent, pending and fully received;
- goal absent, active and achieved;
- positive, zero and negative balance/net;
- long Vietnamese labels/notes;
- large and negative VND values;
- demo and authenticated presentation where repository fixtures support both.

### Information hierarchy

1. Current standing/balance.
2. Current period money flow.
3. Attention requiring user review.
4. Where money went and recent ledger activity.
5. Weekly and planning snapshots as supporting information.
6. Links to deeper planning/report routes.

Supporting information must not visually compete with the standing figure or the primary daily capture action.

### Action hierarchy

- App Shell remains the normal high-emphasis owner of **Ghi chi tiêu**.
- Populated Dashboard must not add a second competing high-emphasis primary action.
- An empty state may offer a contextual action, but its emphasis and accessible naming must make the hierarchy clear rather than duplicating the shell blindly.
- Navigation remains a real link; mutation/dialog activation remains a button.
- Important financial, icon-only and frequent-capture controls retain the MoneyFlow 44×44 target policy from Phase 2.

## Corrected implementation tasks

| ID | Task | Dependency | Required evidence | Status |
|---|---|---|---|---|
| P4-T1 | Inventory the exact Dashboard render tree, imports, active computed selectors, legacy hits and open PR #294 disposition on current `main` | P3 complete | selector-to-owner map, DOM probes, current screenshots | blocked — implementation not authorized |
| P4-T2 | Lock presentation invariants for balance, monthly flow, transfer exclusion, no safe-to-spend and one deterministic period source | P4-T1 | source/unit contract linked to existing finance tests | blocked — implementation not authorized |
| P4-T3 | Introduce one Dashboard route module and remove Dashboard-specific global imports from `/dashboard/page.tsx`; preserve non-Dashboard compatibility behavior unchanged | P4-T1 | import graph, computed-style before/after, no-new-debt checks | blocked — implementation not authorized |
| P4-T4 | Finish `DashboardStatement` ownership, pass period from the workspace source and cover positive/zero/negative/no-income/expense-over-income presentation | P4-T2, P4-T3 | unit/source/browser evidence with large VND and timezone boundary | blocked — implementation not authorized |
| P4-T5 | Resolve action hierarchy and migrate Dashboard alert, empty state and actions to Phase 2 primitives or a documented adapter | P4-T2, P4-T3 | accessible-role/name/action-count evidence | blocked — implementation not authorized |
| P4-T6 | Localize category distribution, recent transactions, attention strip, weekly summary and planning snapshots behind component modules | P4-T3 | owner map and empty/rich/long-data screenshots | blocked — implementation not authorized |
| P4-T7 | Correct budget/goal range semantics, value text, non-color cues, forced-colors behavior and over-limit representation without changing calculations | P4-T2, P4-T6 | accessibility tree, semantic assertions, contrast/forced-colors evidence | blocked — implementation not authorized |
| P4-T8 | Establish one responsive supporting-pane contract; resolve the 760/430 conflict and test component widths, reflow, text zoom and orientation | P4-T3 through P4-T7 | geometry assertions and reviewed screenshots | blocked — implementation not authorized |
| P4-T9 | Delete retired `.insights-kpi`, duplicate-action, safe-to-spend and other Dashboard selector bridges only after zero-consumer proof; split mixed planning CSS without changing Phase 7 routes | P4-T3 through P4-T8 | selector deletion list, DOM/source zero hits, before/after evidence | blocked — implementation not authorized |
| P4-T10 | Run exact-head policy, architecture, CSS ownership, lint, TypeScript, complete unit/static tests, production build, browser smoke, Chromium/WebKit Dashboard matrix, CodeQL and secret-history scan | P4-T9 | exact-head workflow runs and retained artifacts | blocked — implementation not authorized |
| P4-T11 | Owner reviews empty/rich/error, Light/Dark/System, phone/tablet/desktop, 200% text and 400% reflow evidence and decides merge | P4-T10 | explicit owner decision | blocked — implementation not authorized |

## Responsive acceptance matrix

Minimum evidence:

| Class | Width/state |
|---|---|
| Phone | 320, 360 and 390 CSS px |
| Large phone/small tablet | 430, 600 and 760 CSS px |
| Tablet/supporting pane | 768 and 1024 CSS px |
| Desktop | 1280 and 1440 CSS px |
| Zoom/reflow | 200% text and 400% browser zoom/equivalent 320 CSS px |
| Orientation | representative phone portrait/landscape |
| Engines | Chromium and WebKit |
| Theme | Light, Dark and System resolution where harness supports it |
| Data | empty, rich, error, long Vietnamese, large/negative VND |

Acceptance rules:

- no horizontal document scrolling for ordinary content;
- no clipped or ellipsized money value;
- no content hidden beneath Phase 3 mobile navigation;
- links/buttons remain reachable and visibly focused;
- supporting cards stack or recompose without reversing semantic reading order;
- any intentionally horizontally scrollable region has a bounded purpose, visible affordance and individually reflowing items.

## Verification plan

### Static and source

- `npm run check:knowledge`
- `npm run test:ci-policy`
- `npm run check:ui-migration`
- `npm run check:css-ownership`
- `npm run check:architecture`
- lint, typecheck and production build
- exact import/selector/component-owner contracts
- no new `/insights`, global stylesheet, `!important`, unknown token or legacy-class registration

### Unit and domain

- current finance/domain tests remain unchanged or are strengthened without rewriting expected calculations;
- deterministic period label uses the same workspace period source as Dashboard calculations;
- budget/meter and goal/progress semantics remain internally consistent;
- action hierarchy and empty-state contracts are source/unit asserted.

### Browser and accessibility

- empty, rich and data-error Dashboard;
- keyboard traversal and visible focus;
- accessible roles/names/value text for attention, range and action surfaces;
- Light/Dark/System and forced-colors spot check;
- Chromium/WebKit responsive matrix;
- no claim of physical Android/iOS readiness, which remains Phase 11.

### Database/provider/production

Not applicable unless implementation unexpectedly crosses one of those boundaries. No deployment or production-data work is authorized by this packet.

## Risks and counterexamples

| Risk/counterexample | Prevention/evidence |
|---|---|
| Local module appears correct only because a later legacy rule still wins | computed-style ownership probes and disable/remove comparison on the implementation branch |
| Deleting a dead-looking selector breaks a dynamic state | source/DOM interaction coverage plus before/after browser evidence; scanner output alone is insufficient |
| Mixed `safe-ux-planning.css` extraction restyles Budgets/Goals | preserve non-Dashboard declarations byte/behavior-equivalent and run representative planning-route smoke |
| Action deduplication removes the only discoverable empty-state path | explicit state/action hierarchy contract and accessible action-count tests |
| 400% reflow forces money truncation | row/stack recomposition; never solve by clipping or compact formatting that changes truth |
| Budget over-limit semantics hide the overage | text-first over-limit state and consistent min/max/value text |
| Container queries add needless complexity | use only when a card genuinely depends on container width; viewport queries remain valid otherwise |
| Period label changes independently from data | inject one workspace-derived period value through the component tree |
| PR #294 is merged as a shortcut with stale geometry assertions | close/supersede or rebuild its one-line intent inside the authorized P4 branch after current-main inventory |
| Dashboard pilot expands into Planning redesign | only Dashboard snapshots and compatibility extraction are in scope; planning route hierarchy remains Phase 7 |

## Rollback and stop conditions

Rollback is a focused revert of the Phase 4 implementation PR(s); no database rollback is expected.

Stop and require a separate specification when:

- a financial formula or domain definition must change;
- safe-to-spend or other financial advice is proposed;
- a database, migration, Auth, RLS, provider or production-data operation is required;
- the selected visual identity/direction must change;
- the work must redesign Budgets, Commitments, Income templates or Goals routes rather than preserve their current behavior.

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-06 | researcher/planner | owner | specified | current-main source review plus official Next.js/W3C/MDN guidance | implementation and exact computed-style inventory not authorized | owner reviews this packet; a new explicit instruction may authorize P4 implementation |

## Delivery record

- Branch: `agent/ui-phase-4-dashboard-spec`
- PR: pending
- Runtime implementation: not started
- Merge: not authorized
- Deployment/provider/production data: not authorized
- Phase 5: not authorized
