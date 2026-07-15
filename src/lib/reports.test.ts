import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFinancialReport,
  formatReportPeriodTitle,
  normalizeReportPeriod,
  reportPeriodHref,
  reportRange,
  REPORTS_MONTH_HREF,
  transactionsToCsv,
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
