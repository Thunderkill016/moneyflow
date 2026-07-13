import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBudgetProgress,
  calculateDashboardSummary,
  DAILY_ALLOWANCE,
} from "./finance.ts";
import type { Transaction } from "./sample-data.ts";

const expense: Transaction = {
  id: "test-expense",
  kind: "expense",
  categoryId: "test-category",
  category: "Ăn uống",
  note: "Bữa trưa",
  accountId: "test-account",
  account: "Tiền mặt",
  amount: 100_000,
  occurredOn: "2026-07-14",
  occurredAt: "2026-07-14T05:00:00.000Z",
  relativeDate: "Hôm nay",
};

test("a new expense reduces safe-to-spend and balance", () => {
  const summary = calculateDashboardSummary([expense]);
  assert.equal(summary.safeToday, DAILY_ALLOWANCE - 100_000);
  assert.equal(summary.balance, 1_026_000);
});

test("income increases balance without increasing today's spending allowance", () => {
  const summary = calculateDashboardSummary([
    { ...expense, kind: "income", category: "Lương", amount: 2_000_000 },
  ]);
  assert.equal(summary.safeToday, DAILY_ALLOWANCE);
  assert.equal(summary.balance, 3_126_000);
});

test("safe-to-spend never becomes negative", () => {
  const summary = calculateDashboardSummary([{ ...expense, amount: DAILY_ALLOWANCE + 1 }]);
  assert.equal(summary.safeToday, 0);
});

test("live summary uses ledger balance and removes demo baselines", () => {
  const summary = calculateDashboardSummary([expense], {
    isDemo: false,
    totalBalance: 900_000,
    today: "2026-07-14",
  });
  assert.equal(summary.balance, 900_000);
  assert.equal(summary.expense, 100_000);
  assert.equal(summary.foodExpense, 100_000);
  assert.equal(summary.safeToday, 0);
});

test("remaining category budgets cap the daily allowance", () => {
  const summary = calculateDashboardSummary([], {
    isDemo: false,
    totalBalance: 18_000_000,
    remainingBudget: 1_800_000,
    today: "2026-07-14",
  });
  assert.equal(summary.dailyAllowance, 100_000);
  assert.equal(summary.safeToday, 100_000);
});

test("unpaid commitments are reserved before calculating the daily allowance", () => {
  const summary = calculateDashboardSummary([], {
    isDemo: false,
    totalBalance: 2_800_000,
    reservedCommitments: 1_000_000,
    today: "2026-07-14",
  });
  assert.equal(summary.dailyAllowance, 100_000);
  assert.equal(summary.forecast, 1_800_000);
});

test("demo mode also holds back recurring commitments", () => {
  const withoutCommitments = calculateDashboardSummary([expense]);
  const withCommitments = calculateDashboardSummary([expense], { reservedCommitments: 900_000 });
  assert.ok(withCommitments.safeToday < withoutCommitments.safeToday);
  assert.equal(withCommitments.forecast, withoutCommitments.forecast - 900_000);
});

test("planned daily savings reduce spending without changing ledger balance", () => {
  const summary = calculateDashboardSummary([], { isDemo: false, totalBalance: 18_000_000, today: "2026-07-14", plannedDailySavings: 75_000 });
  assert.equal(summary.dailyAllowance, DAILY_ALLOWANCE - 75_000);
  assert.equal(summary.balance, 18_000_000);
});

test("budget progress is bounded and rejects invalid budgets", () => {
  assert.equal(calculateBudgetProgress(750_000, 1_000_000), 75);
  assert.equal(calculateBudgetProgress(2_000_000, 1_000_000), 100);
  assert.equal(calculateBudgetProgress(10, 0), 0);
});
