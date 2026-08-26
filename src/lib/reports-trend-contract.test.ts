import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildFinancialReport, customReportRange } from "./reports.ts";
import type { Transaction } from "./sample-data.ts";

const page = readFileSync("src/components/reports-page.tsx", "utf8");
const styles = readFileSync("src/components/reports-page.module.css", "utf8");

const RANGE = customReportRange("2026-08-01", "2026-08-31");

function row(id: string, overrides: Partial<Transaction> = {}): Transaction {
  return {
    id,
    kind: "expense",
    categoryId: "cat-food",
    category: "Ăn uống",
    note: "",
    accountId: "acc-cash",
    account: "Tiền mặt",
    amount: 100_000,
    occurredOn: "2026-08-10",
    occurredAt: "2026-08-10T05:00:00.000Z",
    relativeDate: "10 tháng 8",
    ...overrides,
  } as Transaction;
}

/*
 * `buildFinancialReport` has always computed income per trend bucket. The
 * reports page drew only the expense bar, so that half was computed and thrown
 * away on every report. These pin that it is drawn, and that the ways it could
 * be drawn wrongly are avoided.
 */

test("the trend already carries income per bucket, and it is not zero here", () => {
  const report = buildFinancialReport(
    [
      row("salary", { kind: "income", amount: 20_000_000, occurredOn: "2026-08-01" }),
      row("lunch", { amount: 300_000 }),
    ],
    RANGE,
  );

  const withIncome = report.trend.filter((item) => item.income > 0);
  assert.ok(withIncome.length > 0, "fixture must produce income in the trend");
  assert.equal(withIncome[0]?.income, 20_000_000);
});

test("both series are drawn", () => {
  assert.match(page, /styles\.incomeBar/u);
  assert.match(page, /styles\.expenseBar/u);
  assert.match(styles, /^\.incomeBar\s*\{/mu);
});

test("the two series share one scale", () => {
  /*
   * Scaling each series to its own maximum would make a 300.000 ₫ expense and a
   * 20.000.000 ₫ salary draw the same height, which reverses what the chart
   * says about where money went.
   */
  assert.match(page, /const trendMax = Math\.max\(/u);
  assert.ok(
    !/maxExpense/u.test(page),
    "the expense-only scale must be gone, not merely unused",
  );
  const scaleUses = [...page.matchAll(/\/ trendMax\)/gu)].length;
  assert.equal(scaleUses, 2, "both bars must divide by the shared maximum");
});

test("a period with income and no expense still renders the chart", () => {
  /*
   * The empty state used to key on expense alone, so a month where salary had
   * arrived and nothing was spent yet hid real recorded data behind
   * "chưa có khoản chi".
   */
  assert.match(page, /trendHasActivity/u);
  assert.match(page, /item\.income > 0 \|\| item\.expense > 0/u);
  assert.ok(!/\{expenseDays\.length \? \(/u.test(page));
});

test("the screen-reader table reports income as well", () => {
  // The chart is role="img" described by this list, so omitting income here
  // would make the accessible version say less than the picture.
  assert.match(page, /thu \{formatMoney\(item\.income\)\}/u);
  assert.match(page, /aria-label=\{`Biểu đồ thu và chi/u);
});

test("the series are named in text, not distinguished by colour alone", () => {
  assert.match(page, /styles\.trendLegend/u);
  assert.match(page, />Thu</u);
  assert.match(page, />Chi</u);
  assert.match(styles, /^\.legendIncome::before\s*\{/mu);
});
