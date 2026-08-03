# MoneyFlow — MVP release acceptance ledger

- **Date:** 2026-08-03
- **Repository baseline:** `main@b7b0e1fb2c13e82061d7641f86e6b3c2a9b2bed4`
- **Definition authority:** `docs/MVP_DEFINITION.md`
- **Purpose:** score the nine locked MVP exit criteria without confusing feature depth, public-beta hardening or missing public evidence with an unfinished MVP

## Status vocabulary

| Status | Meaning |
|---|---|
| **Evidenced** | Current repository or retained exact-head evidence directly supports the criterion. |
| **Release-candidate gate** | The implementation contract exists, but the exact release candidate still needs one focused acceptance run. |
| **Conditional** | The criterion is supported by tests and issue state, but cannot be proven universally for all future inputs. |
| **Separate public-beta gate** | Valuable safety or acceptance work that is not one of the nine locked MVP exit criteria. |

## Locked exit criteria

| # | Exit criterion | Current status | Evidence and boundary |
|---:|---|---|---|
| 1 | `lint`, `typecheck`, unit tests green | **Evidenced** | `scripts/mvp-verify.sh` owns the sequence; runtime-affecting PRs repeatedly passed exact-head lint, typecheck and tests. The docs-only PRs after the last runtime/database slices did not alter application behavior. |
| 2 | Expense-path e2e green | **Evidenced** | The stable browser gate has repeatedly passed Chromium/WebKit expense and Auth CAPTCHA smoke on affected runtime heads. |
| 3 | Demo production build green | **Evidenced** | Production build is part of `mvp-verify` and risk-selected CI; relevant runtime heads passed it. |
| 4 | Transfer excluded from expense | **Evidenced** | Transfer neutrality is a repository invariant with unit, database and browser coverage; reports and account-register behavior preserve separate transfer semantics. |
| 5 | Landing G5 copy regression passes | **Evidenced for implementation** | The merged public-entry implementation passed source/browser/build checks and production route smoke. Final aesthetic approval is an owner-design decision, not this functional exit criterion. |
| 6 | Core empty states expose one primary CTA | **Release-candidate gate** | `src/components/empty-state.tsx` explicitly prefers one primary CTA and optional muted secondary action; Transactions and Reports use one primary action in their empty paths. A focused browser assertion across the current core route set is still required before claiming universal release-candidate acceptance. |
| 7 | Export reachable in at most two clicks | **Evidenced** | The canonical surface is now `/reports`, not retired `/insights`. `ReportsPage` exposes direct period CSV actions and a direct link to `/settings/export`, so export is available in one click from Báo cáo. |
| 8 | No P0 money bugs | **Conditional — no known public blocker** | Integer VND, transfer neutrality, exact split totals, idempotency, soft-delete recovery and ownership boundaries have strong automated coverage. A green suite cannot prove universal bug absence; release acceptance must confirm no known open P0 money issue for the exact candidate. |
| 9 | Lighthouse lab scores documented | **Evidenced** | `docs/performance-budgets.md` records Lighthouse 13.4 mobile lab passes, including Performance, LCP, CLS, TBT, Speed Index, transfer size, misses and mitigation plan. Historical `/insights` measurements are retained as historical evidence; new baselines use `/dashboard`. |

## Current MVP release conclusion

Eight criteria have repository evidence. The only focused acceptance run still required by the locked definition is criterion 6 across the exact release candidate. Criterion 8 remains inherently conditional and is satisfied only while no known P0 money blocker is open.

This means:

> MoneyFlow is functional-MVP complete and is one focused release-candidate empty-state assertion away from a fully reconciled nine-criterion exit record.

## Exact release-candidate gate

Run on the exact candidate SHA in demo mode:

1. `npm run mvp-verify`;
2. existing expense-path browser smoke;
3. visit `/dashboard`, `/transactions`, `/accounts`, `/categories`, `/budgets`, `/commitments`, `/goals`, `/reports` and `/settings/export` in their empty states;
4. for each empty-state action region, assert exactly one visible `.primary-button` or equivalent primary action;
5. allow secondary links only when visually and semantically secondary;
6. confirm `/reports` exposes direct CSV export and `/settings/export` in at most one click;
7. record the exact SHA, test run and any observed P0/P1 blocker.

Fix only observed release blockers. Do not expand competitive-depth scope during this gate.

## Separate public-beta gates

The following may still be required before broader public use, but they are not silently inserted into the locked nine-item MVP exit definition:

- hosted Auth/CAPTCHA and edge-control evidence;
- physical-device evidence beyond automated WebKit/responsive coverage;
- owner acceptance of final landing/auth visual direction;
- approved staging load or provider-advisor evidence;
- deeper destructive/error-state review.

The owner may explicitly promote any of these to a release blocker. Until then they remain separate public-beta hardening or evidence-reconciliation work.

## Evidence limits

This ledger does not inspect private provider dashboards, unpublished device notes, user financial data or owner-held screenshots. Missing private evidence is never converted into a claim that the work was not performed.