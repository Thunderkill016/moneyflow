import assert from "node:assert/strict";
import test from "node:test";
import { buildMonthPace } from "./month-pace.ts";
import type { Transaction } from "./transactions/contracts.ts";
import type { BudgetSummary } from "./planning/budgets.ts";

const tx = (over: Partial<Transaction>): Transaction =>
  ({
    id: "t",
    kind: "expense",
    amount: 1000,
    occurredOn: "2026-07-05",
    ...over,
  }) as Transaction;

const budget = (over: Partial<BudgetSummary>): BudgetSummary => ({
  id: "b",
  categoryId: "c",
  categoryName: "Ăn uống",
  categoryIcon: null,
  categoryColor: null,
  monthStart: "2026-07-01",
  limit: 3_100_000,
  spent: 0,
  ...over,
});

test("no monthly budget for this month → no pace, never a fake one", () => {
  assert.equal(
    buildMonthPace({
      rows: [tx({})],
      budgets: [budget({ monthStart: "2026-06-01" })],
      today: "2026-07-14",
    }),
    null,
  );
  assert.equal(
    buildMonthPace({ rows: [tx({})], budgets: [], today: "2026-07-14" }),
    null,
  );
});

test("cumulative nets refunds, skips transfers, and keeps excluded rows", () => {
  const pace = buildMonthPace({
    rows: [
      tx({ occurredOn: "2026-07-01", amount: 100_000 }),
      // Refund income nets the spend it reimburses.
      tx({ kind: "income", isRefund: true, occurredOn: "2026-07-02", amount: 40_000 }),
      // Transfers never count.
      tx({ kind: "transfer", occurredOn: "2026-07-03", amount: 900_000 }),
      // Excluded-from-reports rows still spent real money.
      tx({ occurredOn: "2026-07-03", amount: 50_000, excludedFromReports: true }),
      // Outside the month.
      tx({ occurredOn: "2026-06-30", amount: 999_999 }),
    ],
    budgets: [budget({ limit: 3_100_000 })],
    today: "2026-07-03",
  })!;
  assert.deepEqual(pace.cumulativeMinor, [100_000, 60_000, 110_000]);
  assert.equal(pace.actualToDateMinor, 110_000);
  assert.equal(pace.elapsedDays, 3);
  assert.equal(pace.daysInMonth, 31);
});

test("status bands: under/on/over at the ±10% ideal line", () => {
  // 14 elapsed days of 31 → ideal = 100_000 × 14 ÷ 31 ≈ 45_161 (floor).
  const budgets = [budget({ limit: 100_000 })];
  const at = (spent: number) =>
    buildMonthPace({
      rows: [tx({ amount: spent, occurredOn: "2026-07-01" })],
      budgets,
      today: "2026-07-14",
    })!;

  // ideal = floor(100_000 × 14 / 31) = 45_161
  assert.equal(at(40_000).status, "under"); // 400k < 45161×9=406449
  assert.equal(at(46_000).status, "on");
  assert.equal(at(50_000).status, "over"); // 500k > 45161×11=496771

  const pace = at(46_000);
  assert.equal(pace.idealToDateMinor, 45_161);
  assert.equal(pace.budgetLimitMinor, 100_000);
});

test("budget limits sum only this month's monthly rows", () => {
  const pace = buildMonthPace({
    rows: [tx({ amount: 10_000 })],
    budgets: [
      budget({ limit: 60_000 }),
      budget({ id: "b2", limit: 40_000 }),
      budget({ id: "old", monthStart: "2026-06-01", limit: 999_999 }),
    ],
    today: "2026-07-14",
  })!;
  assert.equal(pace.budgetLimitMinor, 100_000);
});
