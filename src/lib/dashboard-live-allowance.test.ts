import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDashboardSummary,
  DAILY_ALLOWANCE,
} from "./finance.ts";

test("authenticated allowance is derived from the user's own current balance", () => {
  const summary = calculateDashboardSummary([], {
    isDemo: false,
    totalBalance: 31_000_000,
    today: "2026-07-01",
  });

  assert.equal(summary.dailyAllowance, 1_000_000);
  assert.equal(summary.safeToday, 1_000_000);
  assert.ok(summary.dailyAllowance > DAILY_ALLOWANCE);
});

test("partial category budgets do not cap the global daily guide", () => {
  const summary = calculateDashboardSummary([], {
    isDemo: false,
    totalBalance: 31_000_000,
    remainingBudget: 3_100_000,
    today: "2026-07-01",
  });

  assert.equal(summary.dailyAllowance, 1_000_000);
});

test("a complete all-spending plan uses the tighter constraint", () => {
  const summary = calculateDashboardSummary([], {
    isDemo: false,
    totalBalance: 31_000_000,
    remainingBudget: 3_100_000,
    budgetPlanIsComplete: true,
    today: "2026-07-01",
  });

  assert.equal(summary.dailyAllowance, 100_000);
});

test("reserved money and planned savings reduce authenticated allowance", () => {
  const summary = calculateDashboardSummary([], {
    isDemo: false,
    totalBalance: 31_000_000,
    reservedCommitments: 3_100_000,
    reservedSavings: 3_100_000,
    plannedDailySavings: 50_000,
    today: "2026-07-01",
  });

  assert.equal(summary.dailyAllowance, 750_000);
});

test("demo keeps its fixed product fixture", () => {
  const summary = calculateDashboardSummary([], {
    isDemo: true,
    today: "2026-07-01",
  });

  assert.equal(summary.dailyAllowance, DAILY_ALLOWANCE);
});
