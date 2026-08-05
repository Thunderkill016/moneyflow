# MoneyFlow UI-system Phase 4 — Dashboard pilot

**Status:** completed
**Execution state:** completed
**Active role:** human_owner
**Permission scope:** owner_authorized_closure
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Phase 3 evidence:** merged PR #300 (`75129a6a0f212c12b20763a5d44c2de268832423`)
**Implementation PR:** #301
**Implementation merge:** `4b48626935aa0ed3ddd0058bb0561ae1c2d17335`
**Current main verified:** `429eb6777a63b3172a04ce164a512420e31085c8`
**Last updated:** 2026-08-06

The owner instructed **“sửa p4 đi”**, **“bắt đầu p4”**, **“Merge”** and then **“làm đi”** on 2026-08-06. Those instructions authorize the bounded Phase 4 specification correction, implementation, merge and closure record. They do not authorize Phase 5, a new visual direction, database/Auth/RLS/provider writes or production-data access.

This packet is the execution authority for Phase 4 and supersedes the stale Phase 4 task rows in the parent packet. The parent remains the program sequence. Phase 5 stays blocked until a new explicit owner instruction.

## Outcome

Phase 4 is complete and accepted as a merged Dashboard ownership pilot:

- `/dashboard` has one route-scoped presentation owner;
- `DashboardStatement` retains its own module and uses the same deterministic workspace date as Dashboard calculations;
- Dashboard errors, empty states and actions compose Phase 2 primitives;
- budget usage and goal completion expose truthful range semantics;
- the 320px action-overflow and important-target regressions are fixed;
- Dashboard-specific page-global CSS, stale action bridges and the safe-to-spend withdrawal bridge are retired;
- financial formulas, persisted data, App Shell geometry and product-safety boundaries are unchanged.

## Repository reconnaissance

### Merged implementation truth

PR #301 was squash-merged to `main` as `4b48626935aa0ed3ddd0058bb0561ae1c2d17335`.

The merged Dashboard boundary now consists of:

- `src/app/dashboard/page.tsx` for server workspace loading;
- `src/components/moneyflow-dashboard.tsx` for orchestration;
- `src/components/dashboard/dashboard.module.css` for route-level presentation;
- `src/components/dashboard/statement.tsx` and `statement.module.css` for standing/balance presentation;
- Dashboard overview and planning snapshot components composing Phase 2 primitives;
- deterministic period logic under `src/lib/dashboard-period.ts`;
- source, unit and browser contracts that prevent regression to page-global ownership or active spending advice.

### Retired compatibility

The implementation removed:

- Dashboard page-global stylesheet imports;
- stale KPI and Dashboard selector families from mixed planning compatibility CSS;
- retired weekly/action bridge styles;
- the CSS-only safe-to-spend withdrawal bridge after the active JSX path was confirmed absent.

Budgets and Goals route compatibility remains owned by later planning work and was not redesigned in Phase 4.

## Research

### Decisions retained from implementation

| Source | Phase 4 decision |
|---|---|
| Next.js CSS guidance | prefer local module ownership over route-imported global CSS |
| WCAG 2.2 Reflow | ordinary Dashboard content must work at an equivalent 320 CSS-pixel width without document overflow |
| WAI-ARIA meter/progress patterns | budget scalar usage and goal completion must expose consistent values and text |
| WCAG Use of Color | over-limit, income, expense and completion states require non-color cues |
| MDN flex sizing guidance | action items that must remain readable do not shrink while flexible title content may wrap |

Observed: global Dashboard CSS and mixed compatibility selectors could outlive route navigation; browser-local month calculation could disagree with server-selected data; over-limit labels and accessibility values could conflict.

Inference applied: one local route owner, deterministic period input, truthful range semantics and zero-consumer deletion were required before declaring the Dashboard migrated.

Product judgment retained: preserve B3.2/Fresh Blue, current hierarchy and financial calculations. Phase 4 was ownership and correctness work, not a visual redesign.

## Specification

### Preserved invariants

- VND remains integer đồng.
- Transfers remain excluded from income and expense.
- Split and transaction totals remain exact.
- Existing balance, budget, recurring-income, commitment and goal calculations remain unchanged.
- No numeric safe-to-spend recommendation is rendered.
- Money values are complete and not truncated.
- Public light-only and signed-in Light/Dark/System behavior remain unchanged.
- Phase 3 App Shell geometry and mobile-navigation reserve remain authoritative.

### Accepted ownership model

```text
/dashboard page
  -> server workspace read and deterministic period input
  -> MoneyFlowDashboard orchestration
       -> Dashboard route CSS Module
       -> DashboardStatement CSS Module
       -> overview/ledger/weekly/planning snapshot components
       -> Phase 2 primitives
  -> AppShell owns global chrome and capture
```

### Accepted action and accessibility rules

- App Shell owns the normal high-emphasis **Ghi chi tiêu** action.
- Contextual empty-state actions do not compete as a second high-emphasis primary.
- Navigation remains links; dialog activation remains buttons.
- Important supporting actions retain the MoneyFlow 44×44 target policy.
- Budget usage exposes meter semantics and explicit over-limit text.
- Goal completion uses bounded progress semantics.
- Color is not the sole state signal.

## Implementation plan

### Delivered changes

| Area | Delivered result |
|---|---|
| Route ownership | removed four Dashboard page-global imports and introduced one route module |
| Statement | injected workspace date and completed module-owned responsive/forced-colors behavior |
| Primitive composition | adopted Alert, Button, LinkButton and EmptyState where contracts matched |
| Range semantics | corrected budget meter and goal progress values/text |
| Responsive behavior | resolved narrow-width column conflict and 320px flex overflow |
| Legacy retirement | deleted retired Dashboard, weekly, action and withdrawal bridges after active-path proof |
| Regression protection | added ownership, deterministic-period, semantics and responsive source contracts |

### Data and rollback impact

- Schema/migration/backfill: none.
- Database/Auth/RLS/provider write: none.
- Financial formula change: none.
- Rollback: revert merge commit `4b48626935aa0ed3ddd0058bb0561ae1c2d17335`; no database rollback is required.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P4-T1 | Inventory current Dashboard render tree, imports and selector owners | packet reconnaissance and source review | completed |
| P4-T2 | Lock financial, transfer-exclusion, no-advice and deterministic-period invariants | source/unit contracts | completed |
| P4-T3 | Introduce one Dashboard route module and remove page-global imports | import graph and ownership tests | completed |
| P4-T4 | Finish statement ownership and workspace-derived period | helper/unit/source tests | completed |
| P4-T5 | Resolve action hierarchy and compose Phase 2 primitives | source and accessibility contracts | completed |
| P4-T6 | Localize Dashboard overview, activity, weekly and planning snapshots | route module and component diff | completed |
| P4-T7 | Correct budget/goal range semantics and non-color cues | semantic contracts | completed |
| P4-T8 | Establish responsive/forced-colors contract and remove narrow-width contradiction | Chromium/WebKit cross-device audit | completed |
| P4-T9 | Remove retired Dashboard and withdrawal bridges after zero-consumer proof | deletion list and active-JSX contracts | completed |
| P4-T10 | Run exact-head policy/static/tests/build/browser/security matrix | CI #1746, CodeQL #866, secret scan #866 | completed |
| P4-T11 | Owner reviews evidence and authorizes merge/closure | explicit **“Merge”** and **“làm đi”** instructions | completed |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-06 | researcher/planner | human_owner | specified | corrected packet and official-source decisions | implementation not yet authorized | owner review |
| 2026-08-06 | human_owner | implementer | implementing | **“bắt đầu p4”** | exact-head verification pending | bounded P4 implementation |
| 2026-08-06 | implementer | evaluator | evaluating | local ownership, semantics and deletion candidate | browser regressions possible | protected matrix |
| 2026-08-06 | evaluator | human_owner | verified | exact-head CI/browser/security evidence green | merge decision required | owner merge decision |
| 2026-08-06 | human_owner | repository | merged | **“Merge”**, PR #301, merge `4b486269…` | closure records stale | reconcile merged truth |
| 2026-08-06 | repository | human_owner | completed | production-boundary check and closure PR | authenticated production dataset was not accessed | Phase 5 requires new instruction |

### Current permission boundary

- Phase 4 product-code work is closed.
- No Phase 5 product-code write is authorized by this closure.
- No database, migration, Auth, RLS, provider setting or production-data operation was performed.
- A new product or visual requirement requires a separate owner-approved specification.

## Evaluation

### Exact-head implementation evidence

PR #301 exact head `3a2088a3a0c80075386db9c5bf5630f87c2d209f` passed:

- CI #1746;
- policy, CSS ownership and architecture checks;
- lint and TypeScript;
- 723 unit/static tests;
- production build;
- browser smoke;
- Chromium/WebKit cross-device UI audit;
- CodeQL #866;
- secret-history scan #866.

### Merge and production-boundary evidence

- PR #301 merged as `4b48626935aa0ed3ddd0058bb0561ae1c2d17335`.
- Current production deployment is READY at `main@429eb6777a63b3172a04ce164a512420e31085c8`, which contains P4 and the later CI-observability tooling merge.
- The production landing page returned HTTP 200 and rendered current MoneyFlow content.
- An unauthenticated production request to `/dashboard` reached the expected login boundary and rendered the login surface.
- Vercel runtime inspection found no active backend errors for `/dashboard` or `/login` in the inspected one-hour window.

### Evidence limits

- No production account, private user data or authenticated production Dashboard dataset was accessed.
- Therefore this closure does not claim a fresh authenticated production visual walkthrough; the signed-in Dashboard state claim remains grounded in the exact-head Chromium/WebKit audit.
- No physical Android or iOS/Safari acceptance is claimed; that remains Phase 11 program evidence.
- No deployment was triggered for closure because production already contained the merged commits and was READY.

### Closure decision

Phase 4 is **completed and accepted** for its bounded scope. The next UI-system boundary is Phase 5 Transactions and Capture, but it remains unauthorized until the owner explicitly starts it.