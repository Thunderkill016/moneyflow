/**
 * R7 — Reports month view discoverability + export from reports.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  EXPORT_CSV_LABEL,
  EXPORT_SETTINGS_HREF,
  reportCsvDownloadHref,
} from "./export-data.ts";
import {
  formatReportPeriodTitle,
  normalizeReportPeriod,
  REPORT_PERIOD_OPTIONS,
  REPORTS_MONTH_HREF,
  REPORTS_MONTH_LINK_LABEL,
  REPORTS_PATH,
  reportPeriodHref,
} from "./reports.ts";
import { readDashboardSource } from "./test-support/dashboard-source.ts";

const root = join(import.meta.dirname, "../..");

function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

test("R7: default period is month; canonical month href", () => {
  assert.equal(normalizeReportPeriod(undefined), "month");
  assert.equal(normalizeReportPeriod(null), "month");
  assert.equal(normalizeReportPeriod(""), "month");
  assert.equal(normalizeReportPeriod("month"), "month");
  assert.equal(REPORTS_PATH, "/reports");
  assert.equal(REPORTS_MONTH_HREF, "/reports?period=month");
  assert.equal(reportPeriodHref("month"), "/reports?period=month");
  assert.equal(reportPeriodHref("week"), "/reports?period=week");
  assert.equal(reportPeriodHref("year"), "/reports?period=year");
});

test("R7: formatReportPeriodTitle emphasizes month view", () => {
  assert.equal(formatReportPeriodTitle("month", "2026-07-14"), "Tháng 7/2026");
  assert.equal(formatReportPeriodTitle("week", "2026-07-13"), "Tuần này");
  assert.equal(formatReportPeriodTitle("year", "2026-01-01"), "Năm 2026");
  assert.equal(formatReportPeriodTitle("month", "bad"), "Báo cáo");
});

test("R7: period options cover week/month/year with VN labels", () => {
  assert.deepEqual(
    REPORT_PERIOD_OPTIONS.map((option) => option.value),
    ["week", "month", "year"],
  );
  assert.ok(
    REPORT_PERIOD_OPTIONS.some(
      (option) => option.value === "month" && option.label === "Tháng này",
    ),
  );
});

test("R7: export from reports uses period download + settings hub", () => {
  assert.equal(EXPORT_CSV_LABEL, "Xuất CSV");
  assert.equal(reportCsvDownloadHref("month"), "/reports/export?period=month");
  assert.equal(reportCsvDownloadHref("week"), "/reports/export?period=week");
  assert.equal(EXPORT_SETTINGS_HREF, "/settings/export");
});

test("R7: reports page wires period title, tabs, and dual export paths", () => {
  const page = readSrc("src/components/reports-page.tsx");
  assert.match(page, /formatReportPeriodTitle/);
  assert.match(page, /REPORT_PERIOD_OPTIONS|reportPeriodHref/);
  assert.match(page, /reportCsvDownloadHref/);
  assert.match(page, /EXPORT_CSV_LABEL/);
  assert.match(page, /EXPORT_SETTINGS_HREF/);
  assert.match(page, /primaryAction=\{\{/);
  assert.match(page, /data-slot="report-periods"/);
  assert.match(page, /LinkButton[\s\S]*EXPORT_SETTINGS_HREF/);
  assert.match(page, /\/reports\/export|reportCsvDownloadHref/);
  assert.match(page, /settings\/export|EXPORT_SETTINGS_HREF/);
});

test("R7: Insights deep-links to month reports (not bare /reports)", () => {
  const dash = readDashboardSource();
  assert.match(dash, /REPORTS_MONTH_HREF|\/reports\?period=month/);
  assert.match(dash, /REPORTS_MONTH_LINK_LABEL|Báo cáo tháng/);
  assert.equal(REPORTS_MONTH_LINK_LABEL, "Báo cáo tháng");
});

test("R7: reports export route still exists for one-click CSV", () => {
  const route = readSrc("src/app/reports/export/route.ts");
  assert.match(route, /transactionsToCsv/);
  assert.match(route, /normalizeReportPeriod/);
  assert.match(route, /Content-Disposition/);
  assert.match(route, /text\/csv/);
});

test("R7: desktop does not hide reports heading export", () => {
  const css = readSrc("src/app/globals.css");
  assert.doesNotMatch(
    css,
    /\.reports-heading\s*>\s*\.report-export\s*\{\s*display:\s*none/,
  );
});
