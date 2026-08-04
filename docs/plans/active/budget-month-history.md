# Budget month history, comparison and drill-down

Issue: #290
Branch: `feat/budget-month-history`
Baseline: current `main` after PR #289

## Outcome

`/budgets` becomes a monthly workspace rather than a current-month-only screen. A user can select a past month, understand that month’s limit/spend/remaining state, compare it with the immediately previous month and drill into the exact expense transactions that produced the spend.

This is a Class 3 financial read/write correctness slice because the selected month controls both displayed progress and the month targeted by budget mutations.

## Current authority

- `src/server/budgets.ts` owns tenant-aware budget/category reads but hardcodes `currentMonthStart()`.
- `src/app/budgets/page.tsx` has no query contract and passes one `monthStart` into the client page.
- `src/components/planning/budgets-page.tsx` renders one month and builds category-only transaction links.
- `src/app/actions/budgets.ts` already accepts `monthStart` and delegates writes to `upsert_monthly_budget` / `delete_monthly_budget`.
- existing `budget_progress` rows carry `month_start`; prefer this schema and existing RPC authority.
- existing transaction filters are the drill-down boundary; do not add a second client-side ledger filter.

## Product rules

1. URL authority is `/budgets?month=YYYY-MM`.
2. Calendar semantics use `Asia/Ho_Chi_Minh`.
3. Invalid or future month input resolves deterministically to the current month and is stated rather than silently misrepresented.
4. Previous month means the immediately previous calendar month.
5. Missing previous data is “không có dữ liệu so sánh”, not zero improvement.
6. Transfers remain excluded from budget spend.
7. VND remains integer đồng.
8. Writes apply only to the effective selected month.
9. Next-month navigation is disabled beyond the current month.
10. Drill-down must carry selected month start/end, category and `kind=expense`.

## Scope

### Domain

Add pure helpers for:

- canonical month parsing/normalization;
- current, previous and next month boundaries;
- month start/end date strings;
- truthful total/category comparison states;
- exact transaction drill-down href construction.

All helpers use fixed dates in tests.

### Server

- accept an effective selected month;
- query selected and previous month through bounded reads;
- preserve explicit `.eq("user_id", viewer.id)` predicates plus RLS;
- return selected month, previous month and adjustment notice;
- demo mode returns deterministic selected/previous month fixtures.

### Route/UI

- read `searchParams.month` on the server page;
- add previous/next month navigation and a month input;
- retain the current action hierarchy and responsive budget cards;
- show comparison only where prior data exists;
- generate selected-month drill-down links;
- keep state URL-owned, not duplicated in client-only state.

### Mutation boundary

- create/edit uses the effective selected month already supplied to `BudgetDialog`;
- deletion remains ID-owned and tenant-safe;
- no bulk copy, rollover or cross-month mutation.

## Explicit exclusions

- automatic rollover;
- copy-last-month action;
- forecast or spending advice;
- recurring matching;
- new dependency;
- schema rewrite without evidence;
- production DDL/data/provider actions without separate owner authorization.

## Risks and controls

- **Silent month repair:** return and render a notice for invalid/future input.
- **Comparison lies:** model missing previous data separately from numeric zero.
- **Month mutation mismatch:** selected month is resolved once on the server and threaded to the dialog/action payload.
- **Drill-down mismatch:** use one pure month-boundary helper for both labels and transaction query dates.
- **Demo aging:** use relative month fixtures rather than hardcoded historical calendar dates.
- **Client full-ledger filtering:** prohibited; drill-down delegates to the existing server-backed transaction filter contract.

## Tasks

1. [x] Add month normalization/boundary/comparison/drill-down helpers and unit tests.
2. [x] Extend budget workspace types and selected/previous month reads.
3. [x] Add route query handling and truthful adjustment notice.
4. [x] Add responsive month navigation and comparison UI.
5. [x] Bind selected month to create/edit and exact transaction links.
6. [x] Add static tenant/month contract tests.
7. [x] Add Chromium/WebKit browser coverage for current, previous, empty and hostile query states.
8. [x] Add mandatory PR memory after PR number is assigned.
9. [ ] Run exact-head policy/static/unit/build/database classification/browser/CodeQL/secret gates.
10. [ ] Independent review before any merge decision.

## Acceptance

- current, previous and empty months render truthful states;
- invalid/future query values are repaired visibly;
- missing prior data is not interpreted as zero;
- selected-month mutations cannot target another month or tenant;
- transaction drill-down represents exactly the category/month spend window;
- no clipped VND values or overflowing month controls at 320/360/390/tablet/desktop;
- light/dark Chromium/WebKit audit passes;
- no production operation is claimed by repository CI alone.
