import assert from "node:assert/strict";
import test from "node:test";
import {
  balanceAfterTransactions,
  calculateBudgetProgress,
  calculateDashboardSummary,
  DAILY_ALLOWANCE,
  monthExpenseTotal,
  netTransactionEffect,
  OPENING_BALANCE,
  topExpenseCategories,
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

const transport: Transaction = {
  ...expense,
  id: "test-transport",
  categoryId: "test-transport",
  category: "Di chuyển",
  note: "Grab",
  amount: 50_000,
};

const incomeTxn: Transaction = {
  ...expense,
  id: "test-income",
  kind: "income",
  categoryId: "test-income",
  category: "Lương",
  note: "Lương tháng",
  amount: 500_000,
};

const transfer: Transaction = {
  ...expense,
  id: "test-transfer",
  kind: "transfer",
  categoryId: "",
  category: "Chuyển tiền",
  note: "Chuyển ví",
  amount: 200_000,
  destinationAccountId: "test-momo",
  destinationAccount: "MoMo",
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

test("dashboard summary exposes month net as income minus expense", () => {
  const summary = calculateDashboardSummary([expense, incomeTxn], {
    isDemo: false,
    totalBalance: 1_000_000,
    today: "2026-07-14",
  });
  assert.equal(summary.income, 500_000);
  assert.equal(summary.expense, 100_000);
  assert.equal(summary.net, 400_000);
});

test("top expense categories use list bars data and ignore transfers", () => {
  const categories = topExpenseCategories(
    [expense, transport, incomeTxn, transfer, { ...expense, id: "food-2", amount: 50_000 }],
    { today: "2026-07-14", limit: 5 },
  );
  assert.equal(categories.length, 2);
  assert.equal(categories[0]?.name, "Ăn uống");
  assert.equal(categories[0]?.amount, 150_000);
  assert.equal(categories[0]?.share, 75);
  assert.equal(categories[1]?.name, "Di chuyển");
  assert.equal(categories[1]?.amount, 50_000);
  assert.equal(categories[1]?.share, 25);
});

test("top expense categories only count the current month", () => {
  const categories = topExpenseCategories(
    [expense, { ...transport, occurredOn: "2026-06-01" }],
    { today: "2026-07-14" },
  );
  assert.equal(categories.length, 1);
  assert.equal(categories[0]?.name, "Ăn uống");
  assert.equal(categories[0]?.share, 100);
});

// --- TASK-117 domain expansion: balance / edit / soft-delete / transfer / safe-to-spend ---

test("balance after expense reduces total assets by integer amount", () => {
  const opening = 1_000_000;
  assert.equal(balanceAfterTransactions(opening, [expense]), 900_000);
  assert.equal(netTransactionEffect([expense]), -100_000);
});

test("balance after income increases total assets", () => {
  assert.equal(balanceAfterTransactions(1_000_000, [incomeTxn]), 1_500_000);
  assert.equal(netTransactionEffect([incomeTxn]), 500_000);
});

test("balance after transfer is unchanged (total assets preserved)", () => {
  assert.equal(netTransactionEffect([transfer]), 0);
  assert.equal(balanceAfterTransactions(1_000_000, [transfer]), 1_000_000);
  assert.equal(
    balanceAfterTransactions(1_000_000, [expense, incomeTxn, transfer]),
    1_400_000,
  );
});

test("balance after edit uses the new expense amount", () => {
  const opening = OPENING_BALANCE;
  const original = balanceAfterTransactions(opening, [expense]);
  assert.equal(original, opening - 100_000);

  const edited: Transaction = { ...expense, amount: 40_000, note: "Đã sửa" };
  const afterEdit = balanceAfterTransactions(opening, [edited]);
  assert.equal(afterEdit, opening - 40_000);
  assert.equal(afterEdit - original, 60_000);

  // Demo dashboard balance follows the same edit delta
  const before = calculateDashboardSummary([expense]);
  const after = calculateDashboardSummary([edited]);
  assert.equal(after.balance, before.balance + 60_000);
  assert.equal(after.expense, before.expense - 60_000);
});

test("balance after soft-delete restores assets (deleted row excluded from sum)", () => {
  const opening = 2_000_000;
  const withExpense = balanceAfterTransactions(opening, [expense, transport]);
  assert.equal(withExpense, 1_850_000);

  // Soft-delete = omit from active list (deleted_at filter on server / remove in demo)
  const afterSoftDelete = balanceAfterTransactions(opening, [transport]);
  assert.equal(afterSoftDelete, 1_950_000);
  assert.equal(afterSoftDelete - withExpense, expense.amount);

  const empty = balanceAfterTransactions(opening, []);
  assert.equal(empty, opening);

  const demoBefore = calculateDashboardSummary([expense]);
  const demoAfterDelete = calculateDashboardSummary([]);
  assert.equal(demoAfterDelete.balance, demoBefore.balance + expense.amount);
});

test("transfer is excluded from month expense totals and dashboard expense", () => {
  const month = "2026-07";
  assert.equal(monthExpenseTotal([expense, transfer, incomeTxn], month), 100_000);
  assert.equal(monthExpenseTotal([transfer], month), 0);

  const withTransfer = calculateDashboardSummary([expense, transfer], {
    isDemo: false,
    totalBalance: 1_000_000,
    today: "2026-07-14",
  });
  const expenseOnly = calculateDashboardSummary([expense], {
    isDemo: false,
    totalBalance: 1_000_000,
    today: "2026-07-14",
  });
  assert.equal(withTransfer.expense, 100_000);
  assert.equal(withTransfer.expense, expenseOnly.expense);
  assert.equal(withTransfer.income, 0);
  // Transfer must not affect net either (not income, not expense)
  assert.equal(withTransfer.net, expenseOnly.net);
});

test("safe-to-spend is a non-negative safe integer (floor division)", () => {
  const over = calculateDashboardSummary([{ ...expense, amount: DAILY_ALLOWANCE + 50_000 }]);
  assert.equal(over.safeToday, 0);
  assert.ok(Number.isSafeInteger(over.safeToday));
  assert.ok(over.safeToday >= 0);

  // Remainder days yield floor (integer) allowance, never fractional
  const live = calculateDashboardSummary([], {
    isDemo: false,
    totalBalance: 1_000_001, // not divisible cleanly
    today: "2026-07-14",
  });
  assert.ok(Number.isSafeInteger(live.safeToday));
  assert.ok(Number.isSafeInteger(live.dailyAllowance));
  assert.ok(live.safeToday >= 0);
  assert.equal(live.safeToday, live.dailyAllowance);
  // 1_000_001 / remainingDays is floored inside calculateDashboardSummary
  assert.equal(live.dailyAllowance, Math.floor(live.dailyAllowance));

  const normal = calculateDashboardSummary([expense]);
  assert.ok(Number.isSafeInteger(normal.safeToday));
  assert.ok(normal.safeToday >= 0);
  assert.equal(normal.safeToday, DAILY_ALLOWANCE - 100_000);
});
