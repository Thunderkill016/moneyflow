import assert from "node:assert/strict";
import test from "node:test";
import {
  balanceAfterTransactions,
  calculateBudgetProgress,
  calculateDailySpendingGuide,
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

test("demo expense reduces the fixed illustrative allowance and balance", () => {
  const summary = calculateDashboardSummary([expense]);
  assert.equal(summary.safeToday, DAILY_ALLOWANCE - 100_000);
  assert.equal(summary.balance, 1_026_000);
});

test("demo income increases balance without increasing the fixed allowance", () => {
  const summary = calculateDashboardSummary([
    { ...expense, kind: "income", category: "Lương", amount: 2_000_000 },
  ]);
  assert.equal(summary.safeToday, DAILY_ALLOWANCE);
  assert.equal(summary.balance, 3_126_000);
});

test("authenticated spending is counted once when current balance already includes it", () => {
  const before = calculateDashboardSummary([], {
    isDemo: false,
    totalBalance: 1_000_000,
    today: "2026-07-14",
  });
  const after = calculateDashboardSummary([{ ...expense, amount: 10_000 }], {
    isDemo: false,
    totalBalance: 990_000,
    today: "2026-07-14",
  });

  assert.equal(before.dailyAllowance, Math.floor(1_000_000 / 18));
  assert.equal(after.dailyAllowance, before.dailyAllowance);
  assert.equal(after.safeToday, before.safeToday - 10_000);
});

test("multiple same-day expenses keep one stable start-of-day allowance", () => {
  const transactions = [
    { ...expense, id: "first", amount: 10_000 },
    { ...expense, id: "second", amount: 15_000 },
  ];
  const summary = calculateDashboardSummary(transactions, {
    isDemo: false,
    totalBalance: 975_000,
    today: "2026-07-14",
  });

  assert.equal(summary.dailyAllowance, Math.floor(1_000_000 / 18));
  assert.equal(summary.safeToday, Math.floor(1_000_000 / 18) - 25_000);
});

test("a paid recurring commitment releases its reserve without consuming flexible room", () => {
  const before = calculateDashboardSummary([], {
    isDemo: false,
    totalBalance: 1_000_000,
    reservedCommitments: 100_000,
    today: "2026-07-14",
  });
  const paid = calculateDashboardSummary(
    [{ ...expense, amount: 100_000, isRecurringPayment: true }],
    {
      isDemo: false,
      totalBalance: 900_000,
      reservedCommitments: 0,
      today: "2026-07-14",
    },
  );

  assert.equal(paid.dailyAllowance, before.dailyAllowance);
  assert.equal(paid.safeToday, before.safeToday);
});

test("partial category budgets do not masquerade as a complete spending plan", () => {
  const withoutPartialBudget = calculateDashboardSummary([], {
    isDemo: false,
    totalBalance: 18_000_000,
    today: "2026-07-14",
  });
  const withPartialBudget = calculateDashboardSummary([], {
    isDemo: false,
    totalBalance: 18_000_000,
    remainingBudget: 1_800_000,
    today: "2026-07-14",
  });

  assert.equal(withPartialBudget.safeToday, withoutPartialBudget.safeToday);
});

test("an explicitly complete all-spending plan can cap the daily guide", () => {
  const summary = calculateDashboardSummary([], {
    isDemo: false,
    totalBalance: 18_000_000,
    remainingBudget: 1_800_000,
    budgetPlanIsComplete: true,
    today: "2026-07-14",
  });
  assert.equal(summary.dailyAllowance, 100_000);
  assert.equal(summary.safeToday, 100_000);
});

test("reserved commitments, allocated savings and daily savings reduce the guide", () => {
  const summary = calculateDashboardSummary([], {
    isDemo: false,
    totalBalance: 18_000_000,
    reservedCommitments: 1_800_000,
    reservedSavings: 1_800_000,
    plannedDailySavings: 100_000,
    today: "2026-07-14",
  });

  assert.equal(summary.dailyAllowance, 700_000);
  assert.equal(summary.safeToday, 700_000);
  assert.equal(summary.balance, 18_000_000);
});

test("daily guide validates integer money and never returns a negative amount", () => {
  const guide = calculateDailySpendingGuide({
    currentBalance: 100_000,
    flexibleSpentToday: 200_000,
    remainingDays: 10,
  });
  assert.equal(guide.safeToday, 0);
  assert.ok(Number.isSafeInteger(guide.safeToday));
  assert.throws(
    () =>
      calculateDailySpendingGuide({
        currentBalance: 100.5,
        flexibleSpentToday: 0,
        remainingDays: 10,
      }),
    /invalid_current_balance/,
  );
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

test("balance and month totals preserve income, expense and transfer invariants", () => {
  assert.equal(netTransactionEffect([expense]), -100_000);
  assert.equal(netTransactionEffect([incomeTxn]), 500_000);
  assert.equal(netTransactionEffect([transfer]), 0);
  assert.equal(
    balanceAfterTransactions(1_000_000, [expense, incomeTxn, transfer]),
    1_400_000,
  );
  assert.equal(monthExpenseTotal([expense, transfer, incomeTxn], "2026-07"), 100_000);
});

test("editing and soft-deleting an expense update assets exactly once", () => {
  const edited: Transaction = { ...expense, amount: 40_000, note: "Đã sửa" };
  assert.equal(
    balanceAfterTransactions(OPENING_BALANCE, [edited]) -
      balanceAfterTransactions(OPENING_BALANCE, [expense]),
    60_000,
  );
  assert.equal(
    balanceAfterTransactions(2_000_000, [transport]) -
      balanceAfterTransactions(2_000_000, [expense, transport]),
    expense.amount,
  );
});

test("top expense categories rank expenses, expand splits and ignore transfers", () => {
  const split: Transaction = {
    ...expense,
    id: "split-expense",
    category: "Chia · 2 danh mục",
    amount: 150_000,
    splits: [
      { categoryId: "c1", category: "Ăn uống", amount: 100_000 },
      { categoryId: "c2", category: "Di chuyển", amount: 50_000 },
    ],
  };
  const categories = topExpenseCategories([split, transport, incomeTxn, transfer], {
    today: "2026-07-14",
    limit: 5,
  });

  assert.equal(categories.length, 2);
  assert.equal(categories.find((row) => row.name === "Ăn uống")?.amount, 100_000);
  assert.equal(categories.find((row) => row.name === "Di chuyển")?.amount, 100_000);
  assert.equal(categories.find((row) => row.name.startsWith("Chia")), undefined);
});

test("top expense categories only count the requested month", () => {
  const categories = topExpenseCategories(
    [expense, { ...transport, occurredOn: "2026-06-01" }],
    { today: "2026-07-14" },
  );
  assert.equal(categories.length, 1);
  assert.equal(categories[0]?.name, "Ăn uống");
  assert.equal(categories[0]?.share, 100);
});

test("split expense total counts once toward month expense and balance", () => {
  const split: Transaction = {
    ...expense,
    id: "split-once",
    category: "Chia · 2 danh mục",
    amount: 90_000,
    splits: [
      { categoryId: "c1", category: "Ăn uống", amount: 40_000 },
      { categoryId: "c2", category: "Mua sắm", amount: 50_000 },
    ],
  };
  assert.equal(monthExpenseTotal([split], "2026-07"), 90_000);
  assert.equal(netTransactionEffect([split]), -90_000);
  assert.equal(balanceAfterTransactions(OPENING_BALANCE, [split]), OPENING_BALANCE - 90_000);
});

test("budget progress is bounded and rejects invalid budgets", () => {
  assert.equal(calculateBudgetProgress(750_000, 1_000_000), 75);
  assert.equal(calculateBudgetProgress(2_000_000, 1_000_000), 100);
  assert.equal(calculateBudgetProgress(10, 0), 0);
});
