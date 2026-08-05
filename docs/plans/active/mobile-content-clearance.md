# Remove legacy dashboard mobile clearance

**Status:** evaluating  
**Execution state:** evaluating  
**Active role:** evaluator  
**Permission scope:** branch_write  
**Owner:** MoneyFlow owner  
**Issue/PR:** draft PR pending  
**Last updated:** 2026-08-05

## Outcome

Remove the excessive blank space after Tổng quan content on phone without changing the fixed navigation, adding another CSS override or altering financial behavior.

## Repository reconnaissance

### Current behavior

- `MoneyFlowDashboard` renders both the retired global `dashboard` class and the current route-owned `insights-dashboard` class.
- `ui-refresh.css` applies mobile `padding-bottom: var(--mobile-content-end) !important` to `.dashboard`.
- `--mobile-content-end` still contains floating-action-button clearance even though capture now lives in the center bottom-navigation item.
- `app-shell.module.css` already reserves the actual fixed navigation separately.
- `calm-ledger-overview.css` already owns dashboard desktop and phone padding.

### Relevant repository areas

| Area | Why it matters | Decision |
|---|---|---|
| `src/components/moneyflow-dashboard.tsx` | opts into both old and current style ownership | remove only the legacy class |
| `src/app/dashboard/calm-ledger-overview.css` | current route-owned dashboard spacing | retain unchanged |
| `src/components/layout/app-shell.module.css` | fixed bottom-navigation geometry and reserve | retain unchanged |
| `src/app/ui-refresh.css` | stale compatibility rule | do not extend; separate cleanup may retire it later |
| `src/lib/dashboard-mobile-clearance.test.ts` | focused source contract | add regression |

### Existing tests and constraints

- `src/lib/mobile-layout.test.ts` contains historical global mobile contracts and does not prove the current dashboard is free from the legacy class.
- UI changes require full static/build verification, browser smoke and responsive evidence.
- App-shell styling remains owned by `app-shell.module.css`; no new global stylesheet is allowed.

## Research

Not required. The root cause is established by current repository code and the measured geometry recorded in the old CSS cleanup candidate. No external behavior or technology decision is involved.

## Specification

### Problem

A phone user reaches the end of Tổng quan and sees excessive blank space because the page reserves both the current fixed navigation and an obsolete floating-action-button clearance.

### Acceptance criteria

- [x] `MoneyFlowDashboard` no longer renders the legacy `dashboard` class.
- [x] The current `insights-dashboard` route class remains.
- [x] No CSS declaration or `!important` is added.
- [x] A regression test records route-vs-shell spacing ownership.
- [ ] Exact-head static, unit, build and UI gates pass.
- [ ] Browser evidence at 320, 360 and 390px shows the final content remains visible above navigation without the old blank area.

### Required states

- Empty and populated Dashboard.
- Long Vietnamese and large VND fixtures already covered by the broader audit.
- Phone widths 320, 360 and 390px.
- Light/dark workspace themes.
- Keyboard and touch access unchanged.

### Financial and security constraints

- No financial calculation, ledger mutation, auth, RLS, provider or production-data behavior changes.

### Out of scope

- Removing every stale FAB/global rule.
- Landing redesign.
- Changing bottom-navigation height or destinations.
- Merging old PR #170/#171.

## Implementation plan

### Architecture fit

The current route already has complete CSS ownership under `.insights-dashboard`. Removing the obsolete class is smaller and safer than adding another override or rewriting the legacy stylesheet inside this fix.

### Planned changes

| File | Change | Reason |
|---|---|---|
| `src/components/moneyflow-dashboard.tsx` | remove `dashboard` from the main class list | stop opting into stale global padding |
| `src/lib/dashboard-mobile-clearance.test.ts` | assert current class and spacing ownership | prevent regression |

### Data and migration impact

None. Rollback is one class-name restoration and test removal.

### Risks and counterexamples

| Risk | Prevention/test |
|---|---|
| Legacy class still owns a needed dashboard style | current route CSS is explicit; browser audit reviews the full screen |
| Content sits under navigation | shell reserve and phone screenshot evidence |
| Fix only changes source but not computed layout | responsive browser evidence required before ready-for-review |

### Verification plan

- Static: knowledge, CI policy, deployment, CSS ownership, architecture, lint and typecheck.
- Unit: focused regression plus full test suite.
- Build: production build.
- Browser: affected Dashboard smoke.
- Responsive: UI audit and screenshots at 320/360/390, both themes where supported.
- Production: separate owner-controlled verification after merge if authorized.

## Tasks

| ID | Task | Evidence | Status |
|---|---|---|---|
| T1 | Remove legacy class | focused diff | done |
| T2 | Add regression | new static test | done |
| T3 | Run exact-head CI | workflow runs | pending |
| T4 | Review phone evidence | screenshots/artifact | pending |
| T5 | Independent scope review | PR diff review | pending |

## Handoff record

| Date | From | To | State | Artifacts/evidence | Open risks | Next allowed action |
|---|---|---|---|---|---|---|
| 2026-08-05 | implementer | evaluator | evaluating | two-file runtime/test diff | browser evidence pending | open draft PR and inspect CI artifacts |

### Current permission boundary

- Granted: branch writes in `Thunderkill016/moneyflow`.
- Forbidden: merge, `main`, deployment, provider settings and production data.
- Human approval required before: merge and production verification.
- Stop if: browser evidence reveals loss of needed styling or content overlap.

## Evaluation

### Acceptance evidence

| Criterion | Evidence | Result |
|---|---|---|
| legacy class removed | component diff | pass |
| no CSS or important added | compare diff | pass |
| regression added | new test file | pass |
| exact-head CI | pending | pending |
| phone visual result | pending | pending |

### Remaining limitations

- The stale global FAB tokens/rules remain for other legacy consumers and need a separate current-main cleanup.
- No browser or physical-device claim is made yet.

## Delivery record

- Branch: `agent/fix-mobile-content-clearance`
- PR: pending
- CI: pending
- Production deployment: not authorized
- Production verification: no
