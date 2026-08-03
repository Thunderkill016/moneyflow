# MoneyFlow — MVP release acceptance ledger

- **Date:** 2026-08-03
- **Repository baseline:** `main@6cea2939663df2cf5245ec1e72e7ef186fd7a0cb`
- **Verified acceptance candidate:** `PR #252@0441af6db9093e9d725f9c8f8b0c81e5f6c4e21b`
- **Definition authority:** `docs/MVP_DEFINITION.md`
- **Purpose:** score the nine locked MVP exit criteria without confusing feature depth, public-beta hardening or missing public evidence with an unfinished MVP

## Status vocabulary

| Status | Meaning |
|---|---|
| **Evidenced** | Current repository or retained exact-head evidence directly supports the criterion. |
| **Evidenced on verified candidate** | Exact-head evidence is green on an open release candidate; the regression becomes current `main` truth only after merge. |
| **Conditional** | The criterion is supported by tests and issue state, but cannot be proven universally for all future inputs. |
| **Separate public-beta gate** | Valuable safety or acceptance work that is not one of the nine locked MVP exit criteria. |

## Locked exit criteria

| # | Exit criterion | Current status | Evidence and boundary |
|---:|---|---|---|
| 1 | `lint`, `typecheck`, unit tests green | **Evidenced on verified candidate** | CI #1230 passed exact-head diff hygiene, project knowledge, CI classification, deployment contract, CSS ownership, architecture, lint, typecheck, unit/static tests and production build on `PR #252@0441af6`. |
| 2 | Expense-path e2e green | **Evidenced on verified candidate** | The stable expense and Auth CAPTCHA browser smoke passed inside the 28-test Chromium desktop/mobile run on CI #1230. |
| 3 | Demo production build green | **Evidenced on verified candidate** | Production build passed in the exact-head full-verify job for CI #1230. |
| 4 | Transfer excluded from expense | **Evidenced** | Transfer neutrality is a repository invariant with unit, database and browser coverage; reports and account-register behavior preserve separate transfer semantics. |
| 5 | Landing G5 copy regression passes | **Evidenced for implementation** | The merged public-entry implementation passed source/browser/build checks and production route smoke. Final aesthetic approval is an owner-design decision, not this functional exit criterion. |
| 6 | Core empty states expose one primary CTA | **Evidenced on verified candidate** | `e2e/mvp-empty-state-primary-actions.spec.ts` seeded a deterministic empty demo ledger, visited the nine locked core routes and asserted every rendered empty-state action region exposed exactly one visible primary action and at most one muted secondary action. The gate passed on Chromium desktop and mobile in CI #1230, with per-route JSON evidence retained in the Playwright artifact. |
| 7 | Export reachable in at most two clicks | **Evidenced on verified candidate** | The same browser run confirmed `/reports` exposes direct `/reports/export?period=month` CSV and reaches `/settings/export` through the visible `Tùy chọn xuất` link in one click. |
| 8 | No P0 money bugs | **Conditional — no known public blocker** | Integer VND, transfer neutrality, exact split totals, idempotency, soft-delete recovery and ownership boundaries have strong automated coverage. A green suite cannot prove universal bug absence; release acceptance remains valid only while no known open P0 money issue exists for the chosen candidate. |
| 9 | Lighthouse lab scores documented | **Evidenced** | `docs/performance-budgets.md` records Lighthouse 13.4 mobile lab passes, including Performance, LCP, CLS, TBT, Speed Index, transfer size, misses and mitigation plan. Historical `/insights` measurements are retained as historical evidence; new baselines use `/dashboard`. |

## Current MVP release conclusion

All nine locked MVP exit criteria are reconciled on the verified acceptance candidate. Criterion 8 remains inherently conditional and is satisfied only while no known P0 money blocker is open for the chosen candidate.

This means:

> MoneyFlow is functional-MVP complete and its locked nine-criterion exit record is fully reconciled on `PR #252@0441af6`.

The browser regression is still unmerged. Merging PR #252 makes that gate part of current `main`; selecting a release SHA and deciding to release remain explicit owner actions.

## Completed release-candidate evidence

Retained exact-head evidence for `PR #252@0441af6db9093e9d725f9c8f8b0c81e5f6c4e21b`:

1. CI #1230: success;
2. full verify: diff hygiene, knowledge, CI policy, deployment contract, CSS ownership, architecture, lint, typecheck, unit/static tests and production build passed;
3. database checks: correctly not required for this test/documentation change;
4. Playwright: 28/28 tests passed on Chromium desktop and mobile;
5. locked route audit: `/dashboard`, `/transactions`, `/accounts`, `/categories`, `/budgets`, `/commitments`, `/goals`, `/reports` and `/settings/export` loaded under the deterministic empty demo fixture;
6. every rendered empty-state action region exposed exactly one visible primary action and at most one muted secondary action;
7. `/reports` exposed direct month CSV and one-click navigation to `/settings/export`;
8. CodeQL #375: success;
9. Secret history scan #375: success;
10. Playwright evidence artifact: `playwright-evidence-30794704195-1`.

This run does not claim WebKit, physical-device, hosted-provider or production-data acceptance. Those boundaries remain separate unless the owner explicitly promotes them.

## Separate public-beta gates

The following may still be required before broader public use, but they are not silently inserted into the locked nine-item MVP exit definition:

- hosted Auth/CAPTCHA and edge-control evidence;
- physical-device evidence beyond automated responsive coverage;
- owner acceptance of final landing/auth visual direction;
- approved staging load or provider-advisor evidence;
- deeper destructive/error-state review.

The owner may explicitly promote any of these to a release blocker. Until then they remain separate public-beta hardening or evidence-reconciliation work.

## Evidence limits

This ledger does not inspect private provider dashboards, unpublished device notes, user financial data or owner-held screenshots. Missing private evidence is never converted into a claim that the work was not performed.
