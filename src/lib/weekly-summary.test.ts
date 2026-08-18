/**
 * TASK-126 — weekly summary helpers. #426 removes the detailed weekly card from
 * the default daily dashboard but keeps the financial helper contracts intact.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import type { Transaction } from "./sample-data.ts";
import { readDashboardSource } from "./test-support/dashboard-source.ts";
import {
  buildWeeklySummary,
  formatWeekDayLabel,
  formatWeekRangeLabel,
  WEEKLY_SUMMARY_ARIA,
  WEEKLY_SUMMARY_EMPTY_LEDGER,
  WEEKLY_SUMMARY_EMPTY_WEEK,
  WEEKLY_SUMMARY_REPORTS_HREF,
  WEEKLY_SUMMARY_TITLE,
  weeklyExpenseCompareLine,
} from "./weekly-summary.ts";

const txn = (overrides: Partial<Transaction>): Transaction => ({
  id: crypto.randomUUID(),
  kind: "expense",
  categoryId: "food",
  category: "Ăn uống",
  note: "Bữa trưa",
  accountId: "cash",
  account: "Tiền mặt",
  amount: 100_000,
  occurredOn: "2026-07-14",
  occurredAt: "2026-07-14T05:00:00.000Z",
  relativeDate: "Hôm nay",
  ...overrides,
});

test("formatWeekDayLabel and range are compact vi dates", () => {
  assert.equal(formatWeekDayLabel("2026-07-13"), "13/7");
  assert.equal(formatWeekRangeLabel("2026-07-13", "2026-07-15"), "13/7 – 15/7");
});

test("buildWeeklySummary uses Mon–today week and integer money", () => {
  const summary = buildWeeklySummary(
    [
      txn({ amount: 80_000, occurredOn: "2026-07-14", category: "Ăn uống" }),
      txn({
        id: "income",
        kind: "income",
        category: "Lương",
        amount: 500_000,
        occurredOn: "2026-07-13",
      }),
      txn({
        id: "transport",
        amount: 40_000,
        occurredOn: "2026-07-15",
        category: "Di chuyển",
      }),
      txn({ id: "old", amount: 999_000, occurredOn: "2026-07-10" }),
      txn({
        id: "xfer",
        kind: "transfer",
        categoryId: "",
        category: "Chuyển tiền",
        destinationAccountId: "bank",
        destinationAccount: "NH",
        amount: 200_000,
        occurredOn: "2026-07-14",
      }),
    ],
    "2026-07-15",
  );

  assert.equal(summary.weekStart, "2026-07-13");
  assert.equal(summary.weekEnd, "2026-07-15");
  assert.equal(summary.income, 500_000);
  assert.equal(summary.expense, 120_000);
  assert.equal(summary.net, 380_000);
  assert.equal(summary.transactionCount, 4);
  assert.equal(summary.topCategory, "Ăn uống");
  assert.equal(summary.topCategoryAmount, 80_000);
  assert.ok(Number.isSafeInteger(summary.income));
  assert.ok(Number.isSafeInteger(summary.expense));
  assert.ok(Number.isSafeInteger(summary.net));
});

test("buildWeeklySummary excludes transfer from income/expense", () => {
  const summary = buildWeeklySummary(
    [
      txn({
        kind: "transfer",
        categoryId: "",
        category: "Chuyển tiền",
        destinationAccountId: "bank",
        destinationAccount: "NH",
        amount: 1_000_000,
        occurredOn: "2026-07-14",
      }),
    ],
    "2026-07-15",
  );
  assert.equal(summary.income, 0);
  assert.equal(summary.expense, 0);
  assert.equal(summary.net, 0);
  assert.equal(summary.topCategory, null);
});

test("weeklyExpenseCompareLine is calm and non-judgmental", () => {
  assert.equal(weeklyExpenseCompareLine(null), null);
  assert.match(weeklyExpenseCompareLine(0) ?? "", /tương đương/);
  assert.match(weeklyExpenseCompareLine(25) ?? "", /cao hơn khoảng 25%/);
  assert.match(weeklyExpenseCompareLine(-10) ?? "", /thấp hơn khoảng 10%/);
  for (const percent of [0, 25, -10] as const) {
    const line = weeklyExpenseCompareLine(percent) ?? "";
    assert.doesNotMatch(line, /lãng phí|tệ|sai|phải tiết kiệm|overspend/i);
  }
});

test("default daily dashboard no longer embeds the weekly summary card", () => {
  const dashboard = readDashboardSource();
  assert.doesNotMatch(dashboard, /buildWeeklySummary/);
  assert.doesNotMatch(dashboard, /weekly-summary-panel/);
  assert.doesNotMatch(dashboard, /WEEKLY_SUMMARY_TITLE/);
});

test("copy constants remain calm Vietnamese and point to weekly reports", () => {
  assert.equal(WEEKLY_SUMMARY_TITLE, "Tóm tắt tuần này");
  assert.match(WEEKLY_SUMMARY_ARIA, /tuần/i);
  assert.equal(WEEKLY_SUMMARY_REPORTS_HREF, "/reports?period=week");
  assert.match(WEEKLY_SUMMARY_EMPTY_WEEK, /Tuần này chưa có/);
  assert.match(WEEKLY_SUMMARY_EMPTY_LEDGER, /Ghi vài khoản/);
  const lib = readFileSync(join(process.cwd(), "src/lib/weekly-summary.ts"), "utf8");
  assert.doesNotMatch(lib, /resend|sendgrid|nodemailer|smtp|email provider/i);
});
