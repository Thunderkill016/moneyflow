# Reports: arbitrary date range

Post-MVP depth item 4 in `docs/research/CURRENT_PROJECT_MEMORY.md`, first slice:
arbitrary range. Account/type dimensions and drill-down are not in this change.

## Outcome

A reader can pick any two dates on `/reports` and get totals, category shares,
trend and CSV export for exactly that window, compared against the equal-length
window immediately before it.

Status: `implemented`. Not `verified` in production — that is the owner's step.

## Repository reconnaissance

`/reports` offered three presets only — `week`, `month`, `year` — through
`?period=`. A reader wanting 1/6 to 15/7 had no way to ask for it, and the CSV
export inherited the same limit.

The existing shape is clean and was kept:

| Layer | File | Role |
|---|---|---|
| Domain | `src/lib/reports.ts` | `reportRange`, `buildFinancialReport` — pure, tested |
| Server | `src/server/reports.ts` | queries `previousStart..currentEnd`, builds the report |
| Route | `src/app/reports/page.tsx` | reads `?period=` |
| Export | `src/app/reports/export/route.ts` | same window, as CSV |
| UI | `src/components/reports-page.tsx` | presets, metrics, trend |

Two facts from the existing code decided the design rather than taste:

1. **The equal-length comparison rule already exists.** `reportRange` computes the
   previous window as the same number of elapsed days immediately before the
   current start, and the heading already says *"So với kỳ liền trước cùng số
   ngày"*. A custom window follows the same rule, so the comparison keeps meaning
   the same thing across all four periods.
2. **The trend chart already scrolls and thins its labels** above 14 columns
   (`trend-scroll`, and the `report.trend.length <= 14` label condition). That is
   measured behaviour, and it set the bucketing threshold below.

## Research

No external research. Every question was answerable from the existing code and
from the product's own rules.

**Bucketing.** `year` produced monthly buckets, everything else daily. A 90-day
custom window under the old rule would have produced 90 daily bars. The switch is
now by **span**, not by period name: daily up to `TREND_DAILY_MAX_DAYS = 62`,
monthly beyond. 62 is two months — twice what `month` can already produce (31) and
inside behaviour the chart demonstrably handles.

**Cap.** The server loads `previousStart..currentEnd`, so a custom window costs
twice its own span in rows. `CUSTOM_RANGE_MAX_DAYS = 1096` (three years) is longer
than the `year` preset and keeps the worst case bounded. Anything longer is an
export job, not a report.

**Hostile input.** `from`/`to` arrive from a query string anyone can edit.
`2026-02-31` is `Date`-parseable and silently rolls to March 3 — accepting it would
report a window nobody asked for, so validation compares the round-trip
(`dateString(parseDate(v)) === v`) rather than only the `YYYY-MM-DD` shape.

## Specification

1. `/reports?period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD` renders that window.
2. The comparison window is the equal-length window immediately before it.
3. The CSV export covers exactly the window on screen.
4. The window survives reload and sharing — it lives in the URL, not client state.
5. Unusable input still renders a report, and the adjustment is stated on screen.
6. Presets keep their current behaviour and output.

## Implementation plan

1. Extend the domain first, with tests, before touching any route or component.
2. Thread `from`/`to` through server → page → export route.
3. Add a plain GET form so no client state is involved.
4. Say out loud when the rendered window differs from the requested one.
5. Prove the browser spec red by unwiring the server call.

Risks:

- **Silent adjustment.** A clamped three-year request and an honoured one look
  identical on screen. Handled by `rangeNotice`, surfaced in the UI.
- **Export disagreeing with the page.** Handled by resolving the window in
  `getReportsWorkspace` only, so the CSV and the page cannot diverge.
- **A fixture-dependent browser assertion.** It bit — see the evaluation.

## Tasks

1. [x] Domain: `normalizeCustomRange`, `customReportRange`, `resolveReportRange`,
   span-based bucketing, custom title and href.
2. [x] Unit tests for every boundary, all with fixed dates.
3. [x] Server, page and export route threading.
4. [x] GET form, notice, scoped CSS.
5. [x] Browser spec, proved red before trusted.

## Implementation

Domain additions in `src/lib/reports.ts`, all pure and tested:

- `normalizeCustomRange(input, today)` — returns a usable window or `null`, and
  reports whether it `swapped` or `clamped`. It repairs a reversed range rather
  than discarding it, and clamps a future end to today so emptiness is not
  rendered as data.
- `customReportRange(from, to)` — the equal-length previous window.
- `resolveReportRange(today, period, custom)` — the one entry point; falls back to
  the month preset when a custom window is unusable.

`getReportsWorkspace(period, custom)` now returns `rangeNotice`, and the page
renders it. The export route resolves through the same workspace, so the CSV
window and the page window are the same object.

The UI is a plain GET form to `/reports` with a hidden `period=custom`. No client
state: the chosen window lands in the URL and survives reload, sharing and
bookmarking. The new CSS lives in `reports-page.module.css` — the legacy global
layers are being retired, not extended.

## Evaluation

- [x] Unit tests **659/659** (10 new, every one with fixed dates so the suite
      cannot start failing on a particular day of the month).
- [x] Browser spec, Chromium desktop and mobile: **8/8**.
- [x] **Proved red first.** Unwiring one argument — `getReportsWorkspace(period)`
      instead of `getReportsWorkspace(period, custom)` — turned **3 of 4** desktop
      tests red. The spec measures the wiring, not the URL builder.
- [x] MVP release gates unaffected: `e2e/mvp-empty-state-primary-actions` and
      `e2e/expense-path` **8/8** — `reportCsvDownloadHref` changed signature and
      the locked export criterion still holds.
- [x] `lint`, `typecheck`, `build`, `check:css-ownership` (1105 `!important`,
      unchanged; `unauthorizedDocumentSelectors` 0), `check:knowledge`,
      `check:architecture`.

### Two mistakes worth recording

**A weak assertion that passed for the wrong reason.** The first browser test
asserted the custom totals were "different from the month preset". Both were zero —
the demo fixture lives entirely in July 2026 while the month preset is August — so
on mobile it failed and on desktop it passed for reasons unrelated to the feature.
Replaced with a concrete transaction count inside a window the fixture actually
populates, which a page ignoring the dates would fail.

**A strict-mode violation from an unscoped role.** `getByRole("status")` resolved
to three elements: the demo banner, the toast and the notice. Scoped to `main`,
with the reason recorded in the spec.

## Out of scope, observed

- **The demo fixture has aged out of the default view.** Its transactions are all
  on 2026-07-10/13/14, so the demo `/reports` month preset is empty today. Not
  caused by this change and not fixed here, but a first-run demo that shows an
  empty report undersells the product.
- Account and type dimensions, and category drill-down, remain post-MVP depth
  item 4's later slices.
