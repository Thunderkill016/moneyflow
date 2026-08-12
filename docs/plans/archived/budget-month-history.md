# Budget month history, comparison and drill-down

Issue: #290
Branch: `feat/budget-month-history`
Baseline: current `main` after PR #289

## Outcome

`/budgets` becomes a monthly workspace rather than a current-month-only screen. A user can select a past month, understand that month’s limit/spend/remaining state, compare it with the immediately previous month and drill into the exact expense transactions that produced the spend.

This is a Class 3 financial read/write correctness slice because the selected month controls both displayed progress and the month targeted by budget mutations.

## Repository reconnaissance

- `src/server/budgets.ts` owned tenant-aware budget/category reads but hardcoded `currentMonthStart()`.
- `src/app/budgets/page.tsx` had no query contract and passed one `monthStart` into the client page.
- `src/components/planning/budgets-page.tsx` rendered one month and built category-only transaction links.
- `src/app/actions/budgets.ts` already accepted `monthStart` and delegated writes to `upsert_monthly_budget` / `delete_monthly_budget`.
- existing `budget_progress` rows carry `month_start`; the current schema and RPC authority are sufficient.
- existing transaction filters are the drill-down boundary; a second client-side ledger filter is unnecessary and prohibited.

The current read path already had explicit `.eq("user_id", viewer.id)` predicates alongside RLS. The history implementation preserves that tenant boundary and extends only the bounded month set from one month to selected plus immediately previous month.

## Research

No external research was required. The repository already defined all relevant authorities:

- Asia/Ho_Chi_Minh calendar semantics in the existing current-month helper;
- integer-VND and transfer-neutral budget calculations in `src/lib/planning/budgets.ts`;
- ownership-safe budget mutation RPCs in `src/app/actions/budgets.ts`;
- URL-owned transaction filters in `src/lib/transaction-filters.ts`;
- route-local budget amount layout and shared planning token ownership.

The design therefore follows existing product contracts rather than adding rollover, forecasting, a new dependency or another financial calculation path.

## Specification

1. URL authority is `/budgets?month=YYYY-MM`.
2. Calendar semantics use `Asia/Ho_Chi_Minh`.
3. Invalid or future month input resolves deterministically to the current month and is stated rather than silently misrepresented.
4. Previous month means the immediately previous calendar month.
5. Missing previous data is “không có dữ liệu so sánh”, not zero improvement.
6. Transfers remain excluded from budget spend.
7. VND remains integer đồng.
8. Writes apply only to the effective selected month.
9. Next-month navigation is disabled beyond the current month.
10. Drill-down carries selected month start/end, category and `kind=expense`.
11. Authenticated history reads remain tenant and month bounded.
12. Demo mode provides deterministic current/previous data and an honest older-month empty state.

## Implementation plan

### Domain

Add pure helpers for:

- canonical month parsing/normalization;
- current, previous and next month boundaries;
- month start/end date strings;
- truthful total/category comparison states;
- exact transaction drill-down href construction.

All helpers use fixed dates in tests.

### Server

- accept the requested month and resolve one effective month;
- query selected and previous month through one bounded read;
- preserve explicit `.eq("user_id", viewer.id)` predicates plus RLS;
- return selected month, previous month and adjustment notice;
- return deterministic selected/previous demo fixtures.

### Route and UI

- read `searchParams.month` on the server page;
- remount the client workspace by effective month;
- add previous/next month navigation and a GET month form;
- show comparison only where prior data exists;
- generate selected-month drill-down links;
- keep create/edit/delete bound to the effective selected month;
- use route-local scoped CSS and existing MoneyFlow tokens.

### Verification

- unit tests for month boundaries, hostile input, missing comparison and drill-down URLs;
- static contract tests for route wiring, tenant/month predicates and selected-month mutation guards;
- browser tests for current, previous, empty, hostile query and exact drill-down states;
- permanent Chromium phone, Chromium desktop and WebKit phone discovery;
- exact-head policy, lint/typecheck, unit/static RLS, production build, browser, CodeQL and secret-history gates;
- independent review before merge.

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
- **Month mutation mismatch:** selected month is resolved once on the server, used as the component remount key and threaded to dialog/action payloads.
- **Drill-down mismatch:** use one pure month-boundary helper for both labels and transaction query dates.
- **Demo aging:** use relative month fixtures rather than hardcoded historical calendar dates.
- **Client full-ledger filtering:** prohibited; drill-down delegates to the existing transaction filter contract.

## Tasks

1. [x] Add month normalization/boundary/comparison/drill-down helpers and unit tests.
2. [x] Extend budget workspace types and selected/previous month reads.
3. [x] Add route query handling and truthful adjustment notice.
4. [x] Add responsive month navigation and comparison UI.
5. [x] Bind selected month to create/edit and exact transaction links.
6. [x] Add static tenant/month contract tests.
7. [x] Add Chromium/WebKit browser coverage for current, previous, empty and hostile query states.
8. [x] Add mandatory PR memory after PR number is assigned.
9. [ ] Complete final exact-head gates.
10. [ ] Complete independent review and merge decision.

## Evaluation

Current candidate evidence before the final documentation correction:

- production build passed;
- unit tests and static RLS passed, including the new domain and wiring contracts;
- database replay was correctly classified as not required because no schema or migration changed;
- CSS ownership and architecture contracts passed;
- lint found and caused removal of a redundant state-synchronization effect;
- policy found and caused correction of diff hygiene and work-packet structure.

All prior runs are superseded by the final head. Browser, CodeQL, secret-history and stable summary evidence must be taken only from the final exact SHA.

## Acceptance

- current, previous and empty months render truthful states;
- invalid/future query values are repaired visibly;
- missing prior data is not interpreted as zero;
- selected-month mutations cannot target another month or tenant through the shipped workspace;
- transaction drill-down represents exactly the category/month spend window;
- no clipped VND values or overflowing month controls at 320/360/390/tablet/desktop;
- light/dark Chromium/WebKit audit passes;
- no production operation is claimed by repository CI alone.
