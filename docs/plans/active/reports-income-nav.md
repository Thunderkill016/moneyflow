# Reports: income categories + period navigation + savings rate

## Repository reconnaissance

- `FinancialReport.categories` is expense-only; income rows in the feed do
  carry category names ("Lương", "Thưởng", "Thu nhập khác").
- `report-drilldown.ts` already encapsulates all category/account/payee
  links and documents why `kind=` is load-bearing.
- `resolveReportRange`/`normalizeCustomRange` clamp future dates to the
  server-stamped `todayInVietnam()`; the workspace resolves the range
  before loading rows.
- Reports presentation lives in `src/components/reports-page.tsx` and its
  CSS module; arithmetic stays in `src/lib/reports.ts` — the page consumes
  the model.

## Research

Surface audit of `/reports` against comparable products found three real
gaps:

- Income rows carry categories but the report only broke down the expense
  side — Money Lover, MISA, YNAB and Monarch all show both directions.
- Moving to the previous period required hand-typing a custom range;
  every competitor offers one-tap previous/next navigation.
- The "Còn lại" figure showed no kept-share context (savings rate), which
  Monarch exposes and which costs one honest line here.

## Specification

- `incomeCategories` on `FinancialReport`: income grouped by category with
  the same split-distribution and six-month trend-strip rules as
  `categories`; shares divide by period income.
- `savingsRatePercent`: `net / income` rounded; `null` when income is
  zero; negative allowed when spending exceeds income.
- `adjacentReportRanges(range, today)`: presets move by calendar unit,
  custom windows shift by their own span (the same equal-length rule the
  comparison totals use); `next` is `null` when the following window is
  entirely future and clamps at `today` when it overlaps.
- `reportIncomeCategoryDrilldownHref`: `kind=income`, refuses blank names
  so a category link never opens the whole ledger looking like one slice.
- UI: chevron links (reusing the 44px `.periodLink` style) flanking the
  period pill, "Thu theo danh mục" section mirroring "Chi theo danh mục",
  and a "Giữ lại N% tiền vào" meta on the "Còn lại" card.
- Navigation hrefs are always `period=custom&from&to` — a past calendar
  month is not the "tháng này" preset, so a preset URL would lie about
  the window.
- Server stamps `todayIso` into `ReportsWorkspace` so chevron clamping
  uses the same clock that resolved the range.

## Implementation plan

- Domain first (TDD): extend `buildFinancialReport` with an income-side
  aggregation pass sharing `withTrend`; add `savingsRatePercent`; add
  `adjacentReportRanges` beside `customReportRange`.
- Drilldown: add `reportIncomeCategoryDrilldownHref` delegating to the
  existing `reportDrilldownHref` core with `kind: "income"` and
  `requiresCategory: true`.
- Loader: stamp `today` onto `ReportsWorkspace` as `todayIso`; update the
  capability test fixture.
- UI: `.periodNav` wrapper (6 lines) + existing `.periodLink` for the
  chevrons; mirror the expense category section markup for income;
  savings-rate meta on the existing summary card.

## Tasks

- [x] Domain: `incomeCategories`, `savingsRatePercent`,
      `adjacentReportRanges` in `src/lib/reports.ts`.
- [x] Drilldown: `reportIncomeCategoryDrilldownHref` in
      `src/lib/report-drilldown.ts`.
- [x] Loader: `todayIso` stamped on `ReportsWorkspace` (all five return
      sites + test fixture).
- [x] UI: chevrons, income section, savings-rate meta; `.periodNav` only
      (44px targets come from the existing `.periodLink` rule).
- [x] Icons: `arrowLeft` registered beside existing `arrowRight`.
- [x] Tests: income grouping/share/trend, transfer exclusion,
      savings-rate honesty (null/negative), adjacent ranges for all four
      periods including custom span shifts and today clamping, drilldown
      kind + blank refusal.

## Evaluation

- 49/49 reports-domain tests green (was 36 before this slice).
- 1906/1906 unit tests, typecheck, lint, architecture, css-ownership,
  ci-policy, knowledge checks all green; production build passes.
- Browser evidence (demo, 1280px + 390px): prev chevron on running
  month/week; both chevrons on a past custom window with `next` clamped
  at today; forward chevron hidden when the next window is entirely
  future; "Thu theo danh mục" renders "Lương +15.000.000 ₫ · 100%"; zero
  console errors, zero horizontal scroll.

## Out of scope

- Previous-period overlay on the trend chart; budget pacing inside
  reports; projections/forecasting (non-goal); PDF export.
