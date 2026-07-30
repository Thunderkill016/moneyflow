import assert from "node:assert/strict";
import test from "node:test";
import {
  balanceAfterTransactions,
  calculateBudgetProgress,
  calculateDashboardSummary,
  monthExpenseTotal,
  netTransactionEffect,
  OPENING_BALANCE,
  reconcileBalanceSnapshot,
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

test("demo dashboard summary preserves visible factual totals only", () => {
  const summary = calculateDashboardSummary([expense, incomeTxn]);
  assert.deepEqual(summary, {
    income: 500_000,
    expense: 4_309_000,
    net: -3_809_000,
    balance: 1_526_000,
  });
});

test("authenticated dashboard summary contains only ledger facts", () => {
  const summary = calculateDashboardSummary(
    [expense, incomeTxn, transfer, { ...transport, occurredOn: "2026-06-30" }],
    {
      isDemo: false,
      totalBalance: 1_000_000,
      today: "2026-07-14",
    },
  );

  assert.deepEqual(summary, {
    income: 500_000,
    expense: 100_000,
    net: 400_000,
    balance: 1_000_000,
  });
});

test("dashboard summary rejects unsafe balance input", () => {
  assert.throws(
    () =>
      calculateDashboardSummary([], {
        isDemo: false,
        totalBalance: 100.5,
        today: "2026-07-14",
      }),
    /invalid_current_balance/,
  );
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

test("snapshot reconciliation applies live expense, income and transfer deltas exactly once", () => {
  const snapshotTransactions = [expense, incomeTxn, transfer];
  const snapshotBalance = balanceAfterTransactions(
    OPENING_BALANCE,
    snapshotTransactions,
  );
  const liveTransactions = [
    { ...expense, id: "live-expense", amount: 25_000 },
    { ...incomeTxn, id: "live-income", amount: 75_000 },
    { ...transfer, id: "live-transfer", amount: 900_000 },
    ...snapshotTransactions,
  ];

  const reconciled = reconcileBalanceSnapshot(
    snapshotBalance,
    snapshotTransactions,
    liveTransactions,
  );
  assert.equal(reconciled, snapshotBalance + 50_000);
  assert.equal(
    reconcileBalanceSnapshot(
      snapshotBalance,
      snapshotTransactions,
      liveTransactions,
    ),
    reconciled,
  );

  const summary = calculateDashboardSummary(liveTransactions, {
    isDemo: true,
    totalBalance: reconciled,
    today: "2026-07-14",
  });
  assert.equal(summary.balance, reconciled);
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
