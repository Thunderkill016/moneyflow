# #426 — Daily-path simplification

**Status:** implementing
**Execution state:** implementing
**Active role:** implementer
**Permission scope:** branch_write
**Owner:** Thunderkill016
**Issue/PR:** #426 / #427
**Branch:** `product/426-daily-path-simplification`
**Base:** `fec11958a573653ebb706d4c3307ace6c7d2d4ac`
**Last updated:** 2026-08-18

## Outcome

Make the default MoneyFlow daily path simpler without deleting capability: one clear capture primary per viewport, a dashboard centered on financial truth and recent ledger activity, and secondary planning available through progressive disclosure instead of duplicated on the home screen.

This is a simplification slice, not a broad redesign. Financial semantics, the one-bounded-RPC dashboard path, request-private data, Auth, schema/RLS, provider configuration and release evidence boundaries remain unchanged.

## Owner direction

On 2026-08-18 the owner directed the project to clean up things that make the product worse and to prefer simple, proven, high-impact changes. This packet converts that broad direction into one bounded first slice rather than allowing drive-by deletion or redesign.

The owner direction promotes #426 ahead of further #403 optimization implementation. #403 is paused, not closed; its merged FCP attribution instrument remains valid future evidence. RRB-08 remains the independent owner physical-device lane.

## Repository reconnaissance

### Current defects on the default path

1. `src/components/layout/app-shell.tsx` renders the `PRIMARY_NAV` capture action in the desktop sidebar while also rendering the topbar primary capture CTA. This violates the repository product law that each viewport should have one primary action. Mobile's centered `Ghi` action is intentional and remains.
2. `src/components/moneyflow-dashboard.tsx` renders `DashboardPlanningColumn` on the default dashboard even though `DashboardHeaderSections` already exposes compact links to Budgets, Recurring, Income and Goals. The detailed column duplicates secondary planning on the daily ledger surface.
3. `DashboardPlanningColumn` pulls recurring-income/goals/planning rendering into the dashboard client tree. Current #403 evidence names dashboard hydration/client-JS/main-thread cost as a measured bottleneck: about 311.6 KB transferred script and 766–814 ms JS bootup while server response is about 14–15 ms.

### Existing authority to preserve

- Product principles: the daily ledger is the core; advanced/secondary capability should use progressive disclosure; one primary action per viewport.
- `src/server/dashboard.ts`: exactly one bounded `get_dashboard_bundle` RPC on the authenticated private path; no shared/static cache of private financial data.
- All planning routes remain supported and reachable.
- Mobile bottom navigation and Capture 4 behavior remain unchanged.

## Research

Repository evidence was read first. External research is supporting rationale only; repository behavior/tests outrank it.

### Primary sources used

- GOV.UK/GDS design principles: **Do less**, **Design with data**, and **Do the hard work to make it simple**.
- Hick (1952) and Hyman (1953): choice/reaction time increases with information/choice uncertainty; relevant here only to unnecessary simultaneous choices, not as a universal UI rule.
- Next.js App Router documentation: Server Components do not add client JavaScript and `"use client"` boundaries should be kept to interactive surface area.

### Research decision

Do not add new UI or introduce a new navigation model. Remove duplicated presentation and dead interaction code first. Preserve capability behind existing routes. Measure stable script transfer before claiming any technical gain.

## Specification

### In scope

1. Desktop shell: remove the duplicate sidebar capture action. Keep the topbar capture CTA as the single desktop primary.
2. Mobile shell: keep centered `Ghi` bottom-nav capture unchanged.
3. Remove the now-unreachable shell `CaptureSheet` and its capture-only client code if no other caller exists.
4. Dashboard: remove `DashboardPlanningColumn` from the default home surface.
5. Keep existing compact planning links and all dedicated planning routes.
6. Remove props/imports/demo hydration that become dead solely because the planning column is no longer on the dashboard.
7. Collapse the dashboard content grid to the daily ledger column; remove CSS only when usage evidence makes it unambiguously dead.
8. Re-measure canonical `/dashboard` Lighthouse script transfer with the existing methodology; report LCP/TBT only with their observed spread/noise.

### Explicitly out of scope

- deleting planning features or routes;
- changing capture transaction/transfer semantics;
- redesigning the bottom nav, Capture 4, brand, auth, settings or account flows;
- changing `get_dashboard_bundle`, schema, SQL, RLS, Auth or provider/deployment state;
- shared caching/private-data boundary changes;
- production load testing;
- closing #403 or RRB-08;
- unrelated dependency/dead-CSS work such as #417/#418.

## Implementation plan

1. Remove only the duplicate desktop capture entry point and shell chooser made unreachable by that removal; preserve topbar and mobile capture paths.
2. Remove only the detailed planning column from default `/dashboard`; preserve compact planning links, attention signals and all planning routes.
3. Stop passing client props that become unused solely because the column is gone; do not change dashboard server/RPC semantics.
4. Evolve existing source contracts to assert the intended simplified shell rather than introducing a parallel brittle test layer.
5. Let risk-selected exact-head CI, browser/UI artifacts and same-method Lighthouse evidence decide whether the candidate is safe and whether client cost actually improved.

## Tasks

- [x] Register #426 and this packet on the Current Work Board; pause rather than close #403.
- [x] Remove duplicate desktop sidebar capture action.
- [x] Preserve mobile centered `Ghi` and topbar desktop capture CTA.
- [x] Remove now-unreachable shell `CaptureSheet` client code.
- [x] Remove `DashboardPlanningColumn` from default dashboard.
- [x] Preserve compact planning links and dedicated planning routes.
- [x] Stop serializing dashboard income-template/goal detail no longer rendered by home.
- [x] Update existing app-shell source contract for the simplified behavior.
- [ ] Pass exact-head knowledge, static, unit, build, Browser smoke, Cross-device UI audit and CodeQL gates selected by CI.
- [ ] Inspect exact-head visual artifacts for desktop/mobile regressions and planning discoverability.
- [ ] Record same-method `/dashboard` script-transfer before/after without overstating noisy timing deltas.
- [ ] Complete independent evaluation and fix any valid findings.

## Acceptance criteria

- [ ] **426-AC1** Desktop renders exactly one prominent capture primary; there is no sidebar duplicate.
- [ ] **426-AC2** Mobile centered `Ghi` remains present and functionally unchanged.
- [ ] **426-AC3** Default dashboard no longer embeds the detailed planning column; compact planning links/routes remain discoverable.
- [ ] **426-AC4** No financial/domain/RPC/cache/Auth/schema/RLS/provider semantic change.
- [ ] **426-AC5** Dead shell/dashboard client code directly created by the removed surfaces is deleted rather than left bundled.
- [ ] **426-AC6** Browser smoke and cross-device audit show no clipped or unreachable critical controls.
- [ ] **426-AC7** Same-method performance evidence records `/dashboard` script transferred bytes before/after. Any LCP/TBT claim clears the harness noise floor; otherwise it is reported as noise.
- [ ] **426-AC8** Exact-head risk-selected gates and independent evaluation are green before owner handoff.

## Evaluation

Independent evaluation must challenge the candidate rather than merely confirm the intended simplification:

- Did removing the dashboard planning column make planning materially harder to discover, or do the existing compact links and dedicated routes preserve capability?
- Is mobile `Ghi` still the same capture action and is desktop left with one clear primary rather than none?
- Did any transaction/transfer, balance, integer-VND, dashboard RPC, cache/private-data, Auth or provider behavior drift?
- Is client surface genuinely removed rather than hidden with CSS or moved into another eager bundle?
- Does exact-head script-transfer measurement improve; if not, is the UX simplification still justified without inventing a performance win?
- Do browser/cross-device artifacts expose awkward empty layout, clipping, unreachable controls or a new competing primary?

Valid findings must be fixed in-scope or recorded as a stop condition; the evaluator cannot waive repository policy or owner gates.

## Verification plan

Run `npm run agent:doctor -- --json` and obey the selected risk class. At minimum exercise knowledge/migration contracts, lint, typecheck, unit tests, production build, load contracts, browser smoke and cross-device UI audit when selected. Use the existing canonical Lighthouse harness for before/after script transfer. Preserve exact final head and check evidence.

## Stop conditions

Stop rather than expand scope if simplification would require changing financial semantics, provider/deployment state, private caching, planning feature deletion, or a new navigation architecture. If measurement shows no script reduction, report that honestly; UX simplification may still stand on its own product-law evidence if behavior/regression gates are green.

## Lifecycle

This packet is active only for #426 Slice 1. Later cleanup must be separately justified by observed friction, code/evidence and owner/board authority; "cleanup" is not permission for opportunistic refactors.
