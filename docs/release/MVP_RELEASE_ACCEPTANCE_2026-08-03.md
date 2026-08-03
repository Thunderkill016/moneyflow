# MoneyFlow — MVP release acceptance ledger

- **Date:** 2026-08-03
- **Repository baseline:** `main@481a9ee72663477172b9f727cacbf3f530aa6630`
- **Merged acceptance gate:** `PR #252` (squash commit `481a9ee72663477172b9f727cacbf3f530aa6630`)
- **Definition authority:** `docs/MVP_DEFINITION.md`
- **Purpose:** score the nine locked MVP exit criteria without confusing feature depth, public-beta hardening or missing public evidence with an unfinished MVP

## Status vocabulary

| Status | Meaning |
|---|---|
| **Evidenced** | Current `main`, retained exact-head evidence or both directly support the criterion. |
| **Conditional** | The criterion is supported by tests and issue state, but cannot be proven universally for all future inputs. |
| **Separate public-beta gate** | Valuable safety or acceptance work that is not one of the nine locked MVP exit criteria. |

## Locked exit criteria

| # | Exit criterion | Current status | Evidence and boundary |
|---:|---|---|---|
| 1 | `lint`, `typecheck`, unit tests green | **Evidenced** | Final PR #252 head `63269d3` passed CI #1234, including diff hygiene, project knowledge, CI classification, deployment contract, CSS ownership, architecture, lint, typecheck, unit/static tests and production build. The verified content was squash-merged as `main@481a9ee`. |
| 2 | Expense-path e2e green | **Evidenced** | The stable expense and Auth CAPTCHA browser smoke passed inside the 28-test Chromium desktop/mobile run retained from PR #252. |
| 3 | Demo production build green | **Evidenced** | Production build passed on final PR #252 head; the resulting content is current `main`. Vercel reports a successful deployment status for merge commit `481a9ee`; this is not represented as an independent production route smoke. |
| 4 | Transfer excluded from expense | **Evidenced** | Transfer neutrality is a repository invariant with unit, database and browser coverage; reports and account-register behavior preserve separate transfer semantics. |
| 5 | Landing G5 copy regression passes | **Evidenced for implementation** | The merged public-entry implementation passed source/browser/build checks and production route smoke. Final aesthetic approval is an owner-design decision, not this functional exit criterion. |
| 6 | Core empty states expose one primary CTA | **Evidenced** | Merged `e2e/mvp-empty-state-primary-actions.spec.ts` seeds a deterministic empty demo ledger, visits the nine locked core routes and asserts every rendered empty-state action region exposes exactly one visible primary action and at most one muted secondary action. The gate passed on Chromium desktop and mobile before merge, with per-route JSON evidence retained in the Playwright artifact. |
| 7 | Export reachable in at most two clicks | **Evidenced** | The merged browser regression confirms `/reports` exposes direct `/reports/export?period=month` CSV and reaches `/settings/export` through the visible `Tùy chọn xuất` link in one click. |
| 8 | No P0 money bugs | **Conditional — no known public blocker** | Integer VND, transfer neutrality, exact split totals, idempotency, soft-delete recovery and ownership boundaries have strong automated coverage. At the post-merge check on 2026-08-03, repository issue searches found no open issue carrying `P0` or `priority:P0`; universal bug absence still cannot be proven from a suite or label search. |
| 9 | Lighthouse lab scores documented | **Evidenced** | `docs/performance-budgets.md` records Lighthouse 13.4 mobile lab passes, including Performance, LCP, CLS, TBT, Speed Index, transfer size, misses and mitigation plan. Historical `/insights` measurements are retained as historical evidence; new baselines use `/dashboard`. |

## Current MVP release conclusion

All nine locked MVP exit criteria are reconciled on current `main`. Criterion 8 remains inherently conditional and is satisfied only while no known P0 money blocker is open for the chosen release SHA.

This means:

> MoneyFlow is functional-MVP complete and its locked nine-criterion exit record is fully reconciled on `main@481a9ee`.

The repository is ready for an explicit owner release decision. This ledger does not silently convert successful merge, CI or deployment status into a human decision to release.

## Retained acceptance evidence

Acceptance implementation head: `0441af6db9093e9d725f9c8f8b0c81e5f6c4e21b`.

Final documentation head before merge: `63269d3cba7e15499847161b24a06a4dbd571ac9`.

Merged squash commit: `481a9ee72663477172b9f727cacbf3f530aa6630`.

1. CI #1230: success on the acceptance implementation head;
2. Playwright: 28/28 tests passed on Chromium desktop and mobile;
3. locked route audit: `/dashboard`, `/transactions`, `/accounts`, `/categories`, `/budgets`, `/commitments`, `/goals`, `/reports` and `/settings/export` loaded under the deterministic empty demo fixture;
4. every rendered empty-state action region exposed exactly one visible primary action and at most one muted secondary action;
5. `/reports` exposed direct month CSV and one-click navigation to `/settings/export`;
6. Playwright artifact: `playwright-evidence-30794704195-1`;
7. CI #1234: success on the final PR head, including full verify, browser smoke and production build;
8. CodeQL #379: success;
9. Secret history scan #379: success;
10. PR #252 squash-merged successfully;
11. Vercel commit status for `main@481a9ee`: success;
12. post-merge issue search: no open issue labeled `P0` or `priority:P0`.

This evidence does not claim WebKit, physical-device, hosted-provider, production-data, final visual-direction or staging-capacity acceptance. Those boundaries remain separate unless the owner explicitly promotes them.

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
