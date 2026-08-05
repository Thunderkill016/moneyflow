# MoneyFlow UI-system Phase 4 — Dashboard pilot

**Status:** implementing
**Execution state:** in progress
**Active role:** implementer
**Permission scope:** owner_authorized_branch_write
**Owner:** Thunderkill016
**Parent packet:** `docs/plans/active/ui-system-migration.md`
**Phase 3 evidence:** merged PR #300 (`75129a6a0f212c12b20763a5d44c2de268832423`)
**Current PR:** #301
**Last updated:** 2026-08-06

The owner first instructed **“sửa p4 đi”** and then **“bắt đầu p4”** on 2026-08-06. The latter authorizes Phase 4 runtime, CSS and test implementation on PR #301 plus exact-head verification. It does not authorize merge, deployment, Phase 5, provider/database/Auth/RLS operations, production-data access or a new visual identity.

This packet supersedes the stale Phase 4 rows in `docs/plans/active/ui-system-migration.md` wherever they conflict. The parent packet remains the program-level sequence; this file controls the Dashboard pilot.

## Outcome

Make `/dashboard` the first route that fully proves the MoneyFlow migration method after Phases 0–3:

- one local presentation owner;
- explicit component and state contracts;
- deterministic financial presentation;
- responsive hierarchy that survives reflow;
- no live dependency on Dashboard-specific legacy or page-global CSS;
- no change to formulas, persisted data, financial advice or App Shell geometry.

The implementation candidate remains unmerged until exact-head policy, static, unit, build, browser and security evidence is green and the owner separately approves completion.

## Repository reconnaissance

### Post-Phase-3 baseline

Phase 3 was squash-merged through PR #300 at `main@75129a6a0f212c12b20763a5d44c2de268832423`.

Before Phase 4 implementation, Dashboard presentation was distributed across:

- `src/app/dashboard/page.tsx`;
- `src/components/moneyflow-dashboard.tsx`;
- `src/components/dashboard/dashboard-overview-sections.tsx`;
- `src/components/dashboard/dashboard-planning-sections.tsx`;
- `src/components/dashboard/statement.tsx` and `statement.module.css`;
- three Dashboard-specific global stylesheets;
- Dashboard selectors mixed into `src/app/safe-ux-planning.css`;
- a safe-to-spend withdrawal stylesheet imported from `src/app/legacy.css`;
- inherited legacy selector families.

### Findings confirmed before implementation

1. `/dashboard/page.tsx` imported four global presentation files, so route appearance depended on cascade order rather than one local owner.
2. `DashboardStatement` already owned most presentation through a CSS Module; remaining work was to finish and protect that boundary rather than recreate it.
3. Global KPI rules described retired four-card markup while the active render tree used `DashboardStatement`.
4. Numeric safe-to-spend markup was absent from active Dashboard JSX, but global hiding and withdrawal bridges remained.
5. The duplicate in-page primary action was already absent, while a stylesheet still documented and hid the old path.
6. Phone rules contradicted one another: one layer selected a single-column layout while a later layer reintroduced two columns at a narrower width.
7. Budget usage claimed progress semantics and clamped its numeric accessibility value while text could report an over-limit percentage.
8. Dashboard calculations used `workspace.today`, while the statement generated its month label from browser-local time.
9. `safe-ux-planning.css` mixed Dashboard selectors with Budgets and Goals compatibility owned by Phase 7.
10. Dashboard error, empty-state and action surfaces still bypassed some Phase 2 primitives.
11. PR #294 was a stale pre-Phase-3 mobile-clearance candidate whose intent was relevant but whose old shell measurements and assertions were not reusable unchanged.

### Implemented ownership result on PR #301

- `/dashboard/page.tsx` imports no Dashboard-specific global CSS.
- `src/components/dashboard/dashboard.module.css` is the route-level presentation owner.
- `DashboardStatement` retains its dedicated module and receives the same workspace date used by Dashboard calculations.
- Dashboard error, empty-state and action surfaces compose Phase 2 primitives.
- Budget usage exposes meter semantics and explicit over-limit text.
- Goal completion retains bounded progress semantics.
- Dashboard selectors are removed from mixed planning compatibility CSS while Budgets and Goals declarations remain for Phase 7.
- Retired Dashboard global styles, action bridge, weekly override and safe-to-spend withdrawal bridge are deleted.
- Source contracts guard ownership, period source, range semantics, responsive behavior and the absence of active spending advice.

## Research

### Research basis and decisions

| Source | Phase 4 decision |
|---|---|
| [Next.js CSS guidance](https://nextjs.org/docs/app/getting-started/css) | use locally scoped component/route ownership and remove Dashboard page-global styling |
| [WCAG 2.2 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) | ordinary content must work at an equivalent 320 CSS-pixel width without lost information or two-dimensional document scrolling |
| [WAI-ARIA meter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/meter/) | budget usage is a scalar measurement with a known range and explicit value text |
| [WAI-ARIA progressbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/progressbar/) | goal completion may use progress semantics when value, bounds and text remain consistent |
| [WCAG Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) | warning, over-limit, income, expense and completion states need written or structural cues in addition to color |
| [MDN container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries) | container-dependent composition is optional when pane width, rather than viewport width, owns layout |

Observed: global imports and shared compatibility selectors could continue influencing Dashboard after client navigation; the period label could disagree with server-selected data; over-limit budget accessibility values were internally contradictory.

Inference: Dashboard needs one route module, a separately owned statement module, deterministic period input and text-first range states before legacy selector deletion is trustworthy.

Product judgment: preserve the selected B3.2/Fresh Blue direction, existing information hierarchy and current financial calculations. Phase 4 is ownership and correctness work, not a visual redesign.

## Specification

### Product and financial invariants

Phase 4 must preserve:

- VND as integer đồng;
- transfers excluded from income and expense;
- exact split and transaction totals;
- current balance reconciliation;
- current budget, recurring-income, commitment and goal calculations;
- no invented balances, dates, assumptions or advice;
- no numeric safe-to-spend recommendation;
- complete, non-truncated money values;
- current B3.2/Fresh Blue direction;
- Light/Dark/System workspace behavior;
- current navigation destinations;
- Phase 3 App Shell geometry and mobile-navigation reserve.

Any need to change a formula, financial definition, persisted data contract or product advice exits this packet and requires a separate owner-approved specification.

### Target ownership model

```text
/dashboard page
  -> server workspace read and deterministic period input
  -> MoneyFlowDashboard orchestration
       -> Dashboard route module
       -> DashboardStatement module
       -> Dashboard overview/ledger components
       -> Dashboard weekly/planning snapshot components
       -> Phase 2 primitives or documented adapters
  -> AppShell owns chrome, primary capture and safe-area reserve

legacy/global CSS
  -> no Dashboard-specific live consumer after zero-consumer proof
```

### Ownership rules

- `src/app/dashboard/page.tsx` must not import Dashboard-specific global CSS.
- Dashboard component files use CSS Modules or shared primitive-owned styling.
- No new root/global stylesheet, CSS import chain, `!important`, document selector or legacy-class registration.
- No structural capability inference through `:has()` where an explicit prop or data attribute can own state.
- Mixed compatibility CSS may be split only while preserving non-Dashboard routes unchanged.
- A selector or file is deleted only after source, DOM and affected-browser zero-consumer evidence.

### Required states

- empty ledger;
- populated/rich ledger;
- historical transactions with no current-month expense;
- data error;
- attention strip absent and populated;
- budget absent, under, near and over limit;
- commitments absent, unpaid and fully paid;
- recurring income absent, pending and fully received;
- goal absent, active and achieved;
- positive, zero and negative balance/net;
- long Vietnamese labels and notes;
- large and negative VND values;
- demo and authenticated presentation where repository fixtures support both.

### Information hierarchy

1. Current standing and balance.
2. Current-period money flow.
3. Attention requiring review.
4. Category distribution and recent ledger activity.
5. Weekly and planning snapshots as supporting information.
6. Links to deeper planning and report routes.

Supporting information must not visually compete with the standing figure or the App Shell capture action.

### Action hierarchy

- App Shell remains the normal high-emphasis owner of **Ghi chi tiêu**.
- Populated Dashboard does not add a second competing high-emphasis action.
- Empty or no-expense states may expose a contextual secondary action.
- Navigation remains a semantic link; dialog activation remains a button.
- Important financial and icon-only controls retain the Phase 2 44×44 target policy.

### Responsive acceptance

Minimum matrix:

| Class | Width/state |
|---|---|
| Phone | 320, 360 and 390 CSS px |
| Large phone/small tablet | 430, 600 and 760 CSS px |
| Tablet/supporting pane | 768 and 1024 CSS px |
| Desktop | 1280 and 1440 CSS px |
| Zoom/reflow | 200% text and 400% browser zoom or equivalent 320 CSS px |
| Orientation | representative phone portrait and landscape |
| Engines | Chromium and WebKit |
| Theme | Light, Dark and System resolution where supported |
| Data | empty, rich, error, long Vietnamese and large/negative VND |

Acceptance rules:

- no horizontal document scrolling for ordinary content;
- no clipped or ellipsized money value;
- no content hidden beneath Phase 3 mobile navigation;
- links and buttons remain reachable and visibly focused;
- supporting cards stack or recompose without reversing semantic reading order;
- an intentionally horizontally scrollable navigation rail remains bounded and each item reflows internally.

## Implementation plan

### Architecture fit

The route now composes one local Dashboard module and the existing statement module. Shared Phase 2 primitives own alert, action and empty-state semantics. Planning route compatibility remains outside the Dashboard owner and is preserved for Phase 7.

### Implemented file changes

| File/area | Change | Reason |
|---|---|---|
| `src/app/dashboard/page.tsx` | remove Dashboard-specific global CSS imports | stop route-level cascade ownership |
| `src/components/dashboard/dashboard.module.css` | add route-scoped presentation owner | consolidate layout, responsive and forced-colors rules |
| `src/components/moneyflow-dashboard.tsx` | consume module, Alert and deterministic date path | remove legacy root classes and primitive bypasses |
| `dashboard-overview-sections.tsx` | compose Button, LinkButton and EmptyState | clarify action hierarchy and semantics |
| `dashboard-planning-sections.tsx` | correct meter/progress values and icon-link targets | align accessibility semantics without changing calculations |
| `statement.tsx` / `statement.module.css` | inject workspace date and finish phone/forced-colors ownership | prevent timezone mismatch and global override dependence |
| `src/lib/dashboard-period.ts` | add deterministic period helper | provide unit-testable period presentation |
| `src/app/safe-ux-planning.css` | remove Dashboard selectors only | preserve Phase 7 route compatibility |
| retired Dashboard/withdrawal styles | delete after active-path proof | remove dead cascade bridges |
| Phase 4 tests | add ownership, period and range contracts | prevent regression to global/ambiguous ownership |

### Data and migration impact

- Schema/migration: none.
- Backfill: none.
- Database/Auth/RLS/provider operation: none.
- Financial formulas: unchanged.
- Rollback: revert PR #301; no database rollback required.

### Risks and counterexamples

| Risk | Prevention/evidence |
|---|---|
| Local module appears correct only because a later legacy rule still wins | remove Dashboard selectors from shared/global layers and verify computed behavior in browser audits |
| Dead-looking selector supports a dynamic state | source contracts plus empty/rich/error and interaction evidence; scanner output alone is insufficient |
| Planning CSS extraction changes Budgets/Goals | preserve their declarations and run representative planning-route smoke through the existing cross-device matrix |
| Contextual empty CTA competes with App Shell primary action | use secondary intent and accessible action-role assertions |
| 400% reflow truncates money | stack/recompose layout; never clip or compact values to alter truth |
| Budget over-limit semantics hide overage | meter bounds plus explicit written VND overage and percentage text |
| Period label diverges from data | inject `workspace.today` through one helper and component path |
| PR #294 reintroduces stale shell assertions | supersede its intent through PR #301 rather than merging the old branch |
| Dashboard work expands into Planning redesign | preserve planning route behavior; only Dashboard snapshots and compatibility extraction are in scope |

### Stop conditions

Stop and require a separate specification when:

- a financial formula or definition must change;
- safe-to-spend or other financial advice is proposed;
- a database, migration, Auth, RLS, provider or production-data operation is required;
- the selected identity or visual direction must change;
- Budgets, Commitments, Income templates or Goals routes require redesign rather than behavior-preserving compatibility extraction.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| P4-T1 | Inventory Dashboard render tree, imports, selector owners and PR #294 disposition | current-main source review and packet | completed |
| P4-T2 | Lock balance, flow, transfer exclusion, no-advice and deterministic-period invariants | source/unit contracts | completed |
| P4-T3 | Introduce one Dashboard route module and remove page-global imports | import graph and ownership tests | completed |
| P4-T4 | Finish statement ownership and workspace-derived period | helper/unit/source tests | completed |
| P4-T5 | Resolve action hierarchy and compose Phase 2 Alert/Button/LinkButton/EmptyState | source and accessibility contracts | completed |
| P4-T6 | Localize category, recent transaction, attention, weekly and planning snapshot presentation | Dashboard module and component diff | completed |
| P4-T7 | Correct budget/goal range semantics and non-color over-limit cues | semantic source contracts | completed |
| P4-T8 | Establish one responsive/forced-colors contract and remove the narrow-width contradiction | module media rules; browser evidence pending | implemented — evaluating |
| P4-T9 | Remove retired Dashboard and withdrawal bridges after active-path proof | deletion list and zero-active-JSX contracts | completed |
| P4-T10 | Run exact-head policy/static/tests/build/browser/cross-device/security matrix | workflow runs and artifacts | running |
| P4-T11 | Owner reviews evidence and decides completion/merge | explicit owner decision | blocked pending P4-T10 |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-06 | researcher/planner | owner | specified | current-main review and official sources | implementation unauthorized | owner reviews packet |
| 2026-08-06 | human_owner | implementer | implementing | “bắt đầu p4” | exact-head verification pending | implement bounded P4 on PR #301 |
| 2026-08-06 | implementer | evaluator | evaluating | local Dashboard owner, primitive composition, semantics and deletion candidate | static/browser regressions possible | run protected full matrix and fix actual failures |

### Current permission boundary

- Authorized: Phase 4 code, CSS, test and packet writes on PR #301; exact-head verification; disposition stale PR #294.
- Forbidden: merge, deployment, provider/database/Auth/RLS changes, production-data access, Phase 5 and new identity.
- Human approval required before: Phase 4 closure and merge.

## Evaluation

### Candidate evidence

Current implementation candidate: `fb9a778026db074eb2144f7f8a5c34faefb3298b` before this packet-schema correction.

Observed so far:

- UI migration classifier passed after removing a retired-route literal from a source-contract regex;
- database classification correctly reported database checks not required;
- project knowledge failed only because the earlier packet omitted repository-required top-level headings;
- no runtime, static, unit, build or browser conclusion is claimed from that failed run;
- CodeQL and secret-history checks remain exact-head dependent and must be refreshed after documentation changes.

### Required final evidence

- project knowledge and UI migration policy;
- CSS ownership and architecture;
- lint and TypeScript;
- complete unit/static suite;
- production build;
- browser smoke;
- Chromium/WebKit cross-device audit including Dashboard empty/rich/error states;
- CodeQL;
- all-ref secret-history scan;
- retained browser artifacts and digest identifiers where emitted.

### Current limitations

- No physical Android or iOS/Safari claim; physical-device acceptance remains Phase 11.
- No production deployment or production-data verification is authorized.
- Visual acceptance remains pending owner review after exact-head evidence is green.

## Delivery record

- Branch: `agent/ui-phase-4-dashboard-spec`
- PR: #301
- Starting main: `75129a6a0f212c12b20763a5d44c2de268832423`
- Runtime implementation: in progress, unmerged
- Current ownership result: local Dashboard module plus dedicated statement module
- Financial-domain behavior change: none
- Database/provider/production operation: none
- Phase 5 authorization: not granted
- Merge authorization: not granted
