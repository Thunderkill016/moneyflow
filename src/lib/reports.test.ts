import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFinancialReport,
  customReportRange,
  CUSTOM_RANGE_MAX_DAYS,
  formatReportPeriodTitle,
  normalizeCustomRange,
  normalizeReportPeriod,
  reportPeriodHref,
  reportRange,
  REPORTS_MONTH_HREF,
  resolveReportRange,
  transactionsToCsv,
  TREND_DAILY_MAX_DAYS,
} from "./reports.ts";
import type { Transaction } from "./sample-data.ts";

const transaction = (overrides: Partial<Transaction>): Transaction => ({
  id: crypto.randomUUID(), kind: "expense", categoryId: "food", category: "Ăn uống", note: "Bữa trưa",
  accountId: "cash", account: "Tiền mặt", amount: 100_000, occurredOn: "2026-07-14",
  occurredAt: "2026-07-14T05:00:00.000Z", relativeDate: "Hôm nay", ...overrides,
});

test("builds equal-length current and previous report ranges", () => {
  assert.deepEqual(reportRange("2026-07-14", "week"), { period: "week", currentStart: "2026-07-13", currentEnd: "2026-07-14", previousStart: "2026-07-11", previousEnd: "2026-07-12" });
  assert.deepEqual(reportRange("2026-07-14", "month"), { period: "month", currentStart: "2026-07-01", currentEnd: "2026-07-14", previousStart: "2026-06-17", previousEnd: "2026-06-30" });
  assert.equal(normalizeReportPeriod("unexpected"), "month");
  assert.equal(REPORTS_MONTH_HREF, reportPeriodHref("month"));
  assert.equal(formatReportPeriodTitle("month", "2026-07-01"), "Tháng 7/2026");
});

test("excludes transfers from income and expense totals", () => {
  const range = reportRange("2026-07-14", "month");
  const report = buildFinancialReport([
    transaction({ amount: 100_000 }),
    transaction({ id: "income", kind: "income", category: "Lương", amount: 500_000 }),
    transaction({ id: "transfer", kind: "transfer", categoryId: "", category: "Chuyển tiền", destinationAccountId: "bank", destinationAccount: "Ngân hàng", amount: 200_000 }),
    transaction({ id: "previous", occurredOn: "2026-06-20", amount: 50_000 }),
  ], range);
  assert.deepEqual(report.totals, { income: 500_000, expense: 100_000, net: 400_000, transactions: 3 });
  assert.equal(report.previous.expense, 50_000);
  assert.equal(report.expenseChangePercent, 100);
  assert.deepEqual(report.categories, [{ name: "Ăn uống", amount: 100_000, share: 100 }]);
});

test("CSV escapes spreadsheet formulas and preserves integer amounts", () => {
  const csv = transactionsToCsv([transaction({ note: "=HYPERLINK(\"bad\")", amount: 123_456 })]);
  assert.match(csv, /"'=HYPERLINK\(""bad""\)"/);
  assert.match(csv, /"-123456"/);
  assert.ok(csv.startsWith("\uFEFF"));
});

/*
 * Custom report window (post-MVP depth item 4).
 *
 * Every case below fixes a date explicitly. Nothing here reads the clock, so the
 * suite cannot start failing on a particular day of the month.
 */

test("custom range compares against the equal-length window immediately before", () => {
  // 45 days: 2026-06-01..2026-07-15 → previous 2026-04-17..2026-05-31.
  assert.deepEqual(customReportRange("2026-06-01", "2026-07-15"), {
    period: "custom",
    currentStart: "2026-06-01",
    currentEnd: "2026-07-15",
    previousStart: "2026-04-17",
    previousEnd: "2026-05-31",
  });
  // A single day compares against the day before, not against nothing.
  assert.deepEqual(customReportRange("2026-07-14", "2026-07-14"), {
    period: "custom",
    currentStart: "2026-07-14",
    currentEnd: "2026-07-14",
    previousStart: "2026-07-13",
    previousEnd: "2026-07-13",
  });
});

test("custom range spans month and year boundaries without drifting", () => {
  // Crossing new year: 2025-12-20..2026-01-10 is 22 days.
  const range = customReportRange("2025-12-20", "2026-01-10");
  assert.equal(range.previousEnd, "2025-12-19");
  assert.equal(range.previousStart, "2025-11-28");
  // Leap day is a real date and must be usable as a boundary.
  assert.equal(customReportRange("2028-02-29", "2028-03-01").previousEnd, "2028-02-28");
});

test("custom range rejects impossible dates rather than shifting them", () => {
  // 2026-02-31 is Date-parseable and rolls to March 3; treating it as valid would
  // silently report a window the reader never asked for.
  assert.equal(normalizeCustomRange({ from: "2026-02-31", to: "2026-03-05" }, "2026-07-14"), null);
  assert.equal(normalizeCustomRange({ from: "not-a-date", to: "2026-03-05" }, "2026-07-14"), null);
  assert.equal(normalizeCustomRange({ from: "2026-03-01", to: null }, "2026-07-14"), null);
  assert.throws(() => customReportRange("2026-07-15", "2026-07-01"), /invalid_report_range/);
});

test("custom range repairs a reversed window instead of discarding it", () => {
  const result = normalizeCustomRange({ from: "2026-07-15", to: "2026-06-01" }, "2026-07-20");
  assert.deepEqual(result, { from: "2026-06-01", to: "2026-07-15", clamped: false, swapped: true });
});

test("custom range never reports past today", () => {
  // A future end would render emptiness as if it were data.
  const result = normalizeCustomRange({ from: "2026-07-01", to: "2027-01-01" }, "2026-07-14");
  assert.deepEqual(result, { from: "2026-07-01", to: "2026-07-14", clamped: false, swapped: false });
  // A window entirely in the future collapses onto today rather than inverting.
  const future = normalizeCustomRange({ from: "2027-01-01", to: "2027-02-01" }, "2026-07-14");
  assert.deepEqual(future, { from: "2026-07-14", to: "2026-07-14", clamped: false, swapped: false });
});

test("custom range is capped, and reports that it was", () => {
  const result = normalizeCustomRange({ from: "2000-01-01", to: "2026-07-14" }, "2026-07-14");
  assert.ok(result);
  assert.equal(result.clamped, true);
  assert.equal(result.to, "2026-07-14");
  // Exactly CUSTOM_RANGE_MAX_DAYS days inclusive, counted from the end.
  const span = (Date.parse(`${result.to}T00:00:00Z`) - Date.parse(`${result.from}T00:00:00Z`)) / 86_400_000 + 1;
  assert.equal(span, CUSTOM_RANGE_MAX_DAYS);
  // The boundary itself is not clamped.
  const atLimit = normalizeCustomRange({ from: "2023-07-15", to: "2026-07-14" }, "2026-07-14");
  assert.ok(atLimit);
  assert.equal(atLimit.clamped, false);
});

test("resolveReportRange falls back to the month preset on an unusable window", () => {
  assert.deepEqual(
    resolveReportRange("2026-07-14", "custom", { from: "junk", to: "2026-07-01" }),
    reportRange("2026-07-14", "month"),
  );
  assert.deepEqual(resolveReportRange("2026-07-14", "week"), reportRange("2026-07-14", "week"));
});

test("trend buckets switch from daily to monthly by span, not by period name", () => {
  const daily = buildFinancialReport([], customReportRange("2026-06-01", "2026-07-01"));
  assert.equal(daily.trend.length, 31);
  assert.equal(daily.trend[0]!.key, "2026-06-01");

  // 62 days is the last daily window.
  const atLimit = buildFinancialReport([], customReportRange("2026-05-14", "2026-07-14"));
  assert.equal(atLimit.trend.length, TREND_DAILY_MAX_DAYS);

  // 63 days must not produce 63 bars the chart was never shaped for.
  const monthly = buildFinancialReport([], customReportRange("2026-05-13", "2026-07-14"));
  assert.deepEqual(monthly.trend.map((item) => item.key), ["2026-05", "2026-06", "2026-07"]);
});

test("custom trend totals stay attached to the right bucket", () => {
  const report = buildFinancialReport([
    transaction({ occurredOn: "2026-05-20", amount: 300_000 }),
    transaction({ id: "b", occurredOn: "2026-06-10", amount: 700_000 }),
    transaction({ id: "c", kind: "income", category: "Lương", occurredOn: "2026-06-11", amount: 900_000 }),
    // Outside the window entirely — must not leak into any bucket or total.
    transaction({ id: "d", occurredOn: "2026-08-01", amount: 999_000 }),
  ], customReportRange("2026-05-13", "2026-07-14"));

  assert.deepEqual(report.trend.map((item) => [item.key, item.expense, item.income]), [
    ["2026-05", 300_000, 0],
    ["2026-06", 700_000, 900_000],
    ["2026-07", 0, 0],
  ]);
  assert.deepEqual(report.totals, { income: 900_000, expense: 1_000_000, net: -100_000, transactions: 3 });
});

test("custom period href and title read as the chosen window", () => {
  assert.equal(
    reportPeriodHref("custom", "2026-06-01", "2026-07-15"),
    "/reports?period=custom&from=2026-06-01&to=2026-07-15",
  );
  assert.equal(reportPeriodHref("month"), REPORTS_MONTH_HREF);
  assert.equal(formatReportPeriodTitle("custom", "2026-06-01", "2026-07-15"), "1/6 – 15/7/2026");
  assert.equal(formatReportPeriodTitle("custom", "2025-12-20", "2026-01-10"), "20/12/2025 – 10/1/2026");
  assert.equal(formatReportPeriodTitle("custom", "2026-06-01"), "Khoảng tự chọn");
});
