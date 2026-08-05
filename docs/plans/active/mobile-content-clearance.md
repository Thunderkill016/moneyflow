# Remove legacy dashboard mobile clearance

**Status:** evaluating
**Execution state:** evaluating
**Active role:** evaluator
**Permission scope:** branch_write
**Owner:** MoneyFlow owner
**Issue/PR:** PR #294
**Last updated:** 2026-08-05

## Outcome

Remove excessive blank space after Tổng quan content on phones without changing fixed navigation, adding another CSS override or altering financial behavior.

## Repository reconnaissance

### Current behavior

- `MoneyFlowDashboard` rendered the retired global `dashboard` class and the current route-owned `insights-dashboard` class together.
- `ui-refresh.css` applies `padding-bottom: var(--mobile-content-end) !important` to `.dashboard` on phones.
- `--mobile-content-end` still includes floating-action-button clearance even though capture now lives in the center bottom-navigation item.
- `app-shell.module.css` already reserves the actual fixed navigation.
- `calm-ledger-overview.css` already owns current Dashboard padding.

### Relevant areas

| Area | Role | Decision |
|---|---|---|
| `src/components/moneyflow-dashboard.tsx` | selected both style owners | remove only the legacy class |
| `src/app/dashboard/calm-ledger-overview.css` | current route spacing | retain unchanged |
| `src/components/layout/app-shell.module.css` | fixed navigation geometry/reserve | retain unchanged |
| `src/app/ui-refresh.css` | stale compatibility rule | do not extend in this slice |
| `src/lib/dashboard-mobile-clearance.test.ts` | regression contract | add |

### Existing constraints

- UI changes require full policy/static/unit/build verification, browser smoke and cross-device audit.
- App-shell styling remains owned by `app-shell.module.css`.
- No new global stylesheet or `!important` declaration is allowed.

## Research

External research is not required. Current code establishes the root cause and the old CSS-cleanup candidate recorded the stacked-clearance geometry.

## Specification

### Problem

A phone user reaches the end of Tổng quan and sees excessive blank space because the page reserves both current fixed-navigation space and obsolete floating-action-button clearance.

### Acceptance criteria

- [x] `MoneyFlowDashboard` no longer renders the legacy `dashboard` class.
- [x] The current `insights-dashboard` class remains.
- [x] No CSS declaration or `!important` is added.
- [x] A regression records route-versus-shell spacing ownership.
- [ ] Exact-head policy, static, unit and build gates pass.
- [ ] Browser smoke and cross-device audit pass.
- [ ] Phone evidence shows final content visible above navigation without the old blank area.

### Required states

- Empty and populated Dashboard.
- Existing long-Vietnamese and large-VND stress fixtures.
- 320, 360 and 390px phone widths plus tablet/desktop audit matrix.
- Light/dark workspace themes where supported.
- Keyboard and touch access unchanged.

### Financial and security constraints

No financial calculation, ledger mutation, authentication, RLS, provider or production-data behavior changes.

### Out of scope

- Removing every stale FAB/global rule.
- Landing redesign.
- Changing bottom-navigation height or destinations.
- Merging old PR #170/#171.

## Implementation plan

### Architecture fit

The current route already has complete CSS ownership under `.insights-dashboard`. Removing the obsolete class is smaller and safer than adding an override or rewriting legacy CSS in this fix.

### Planned changes

| File | Change | Reason |
|---|---|---|
| `src/components/moneyflow-dashboard.tsx` | remove `dashboard` from the main class list | stop opting into stale global padding |
| `src/lib/dashboard-mobile-clearance.test.ts` | assert current class and spacing ownership | prevent regression |

### Data and migration impact

None. Rollback is restoration of one class name and removal of the focused test.

### Risks and counterexamples

| Risk | Prevention/evidence |
|---|---|
| Legacy class still owns a needed style | current route CSS inspection plus full browser audit |
| Content moves under fixed navigation | shell reserve and phone evidence |
| Source changes but computed layout does not | responsive screenshots and geometry checks |

### Verification plan

- Static: knowledge, CI policy, deployment, CSS ownership, architecture, lint and typecheck.
- Unit: focused regression and full test suite.
- Build: production build.
- Browser: standard smoke.
- Responsive: production cross-device UI audit with artifact review.
- Production: separate owner-controlled verification after merge if authorized.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Remove legacy class | focused diff | done |
| T2 | Add regression | source contract | done |
| T3 | Run exact-head CI | workflow run | running |
| T4 | Review phone evidence | audit artifact | pending |
| T5 | Independent scope review | PR review | pending |

## Handoff record

| Date | From | To | State | Evidence | Open risk | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-05 | implementer | evaluator | evaluating | one-line runtime change + regression | browser evidence pending | inspect exact-head CI and artifacts |

### Current permission boundary

- Granted: branch writes in `Thunderkill016/moneyflow`.
- Forbidden: merge, direct `main` writes, deployment, provider settings and production data.
- Human approval required before: merge and production verification.
- Stop condition: browser evidence shows loss of needed styling or content overlap.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| legacy class removed | component diff | pass |
| no CSS or `!important` added | compare diff | pass |
| regression added | test file | pass |
| exact-head CI | run 30982720739 | running |
| phone visual result | audit artifact | pending |

### Remaining limitations

- Stale global FAB tokens/rules remain for other legacy consumers and require separate current-main cleanup.
- No physical-device claim is made.

## Delivery record

- Branch: `agent/fix-mobile-content-clearance`
- PR: #294
- CI: running
- Production deployment: not authorized
- Production verification: no
