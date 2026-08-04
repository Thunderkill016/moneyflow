import assert from "node:assert/strict";
import test from "node:test";
import {
  budgetBarColor,
  budgetMonthEnd,
  budgetMonthKey,
  budgetProgress,
  budgetRemaining,
  budgetStatusLabel,
  budgetThreshold,
  budgetTransactionsHref,
  compareBudgetAmount,
  resolveBudgetMonth,
  shiftBudgetMonth,
  sumBudgetSpent,
} from "./budgets.ts";
import type { Transaction } from "../sample-data.ts";

const foodExpense: Transaction = {
  id: "food-1",
  kind: "expense",
  categoryId: "cat-food",
  category: "Ăn uống",
  note: "Cà phê",
  accountId: "cash",
  account: "Tiền mặt",
  amount: 45_000,
  occurredOn: "2026-07-10",
  occurredAt: "2026-07-10T08:00:00.000Z",
  relativeDate: "Tuần này",
};

const foodExpense2: Transaction = {
  ...foodExpense,
  id: "food-2",
  amount: 80_000,
  occurredOn: "2026-07-14",
};

const transportExpense: Transaction = {
  ...foodExpense,
  id: "transport-1",
  categoryId: "cat-transport",
  category: "Di chuyển",
  amount: 30_000,
};

const transferOut: Transaction = {
  ...foodExpense,
  id: "xfer-1",
  kind: "transfer",
  categoryId: "cat-food", // even if mis-tagged, transfer must not count
  category: "Chuyển tiền",
  amount: 500_000,
  destinationAccountId: "bank",
  destinationAccount: "Ngân hàng",
};

const income: Transaction = {
  ...foodExpense,
  id: "income-1",
  kind: "income",
  categoryId: "cat-salary",
  category: "Lương",
  amount: 10_000_000,
};

const priorMonthFood: Transaction = {
  ...foodExpense,
  id: "food-june",
  amount: 200_000,
  occurredOn: "2026-06-20",
};

test("budget month helpers cross year boundaries without local timezone parsing", () => {
  assert.equal(budgetMonthKey("2026-07-01"), "2026-07");
  assert.equal(shiftBudgetMonth("2026-01-01", -1), "2025-12-01");
  assert.equal(shiftBudgetMonth("2026-12-01", 1), "2027-01-01");
  assert.equal(budgetMonthEnd("2024-02-01"), "2024-02-29");
  assert.equal(budgetMonthEnd("2026-02-01"), "2026-02-28");
});

test("resolveBudgetMonth keeps valid history and exposes navigation", () => {
  assert.deepEqual(resolveBudgetMonth("2026-06", "2026-08-01"), {
    monthKey: "2026-06",
    monthStart: "2026-06-01",
    monthEnd: "2026-06-30",
    previousMonthStart: "2026-05-01",
    nextMonthStart: "2026-07-01",
    canGoNext: true,
    adjustment: null,
  });
});

test("resolveBudgetMonth repairs invalid and future input visibly", () => {
  const invalid = resolveBudgetMonth("2026-13", "2026-08-01");
  assert.equal(invalid.monthStart, "2026-08-01");
  assert.equal(invalid.adjustment, "invalid");
  assert.equal(invalid.canGoNext, false);

  const future = resolveBudgetMonth("2026-09", "2026-08-01");
  assert.equal(future.monthStart, "2026-08-01");
  assert.equal(future.adjustment, "future");
  assert.equal(future.canGoNext, false);
});

test("budget comparison distinguishes missing prior data from numeric zero", () => {
  assert.deepEqual(compareBudgetAmount(0, null), {
    state: "unavailable",
    difference: null,
  });
  assert.deepEqual(compareBudgetAmount(0, 0), {
    state: "same",
    difference: 0,
  });
  assert.deepEqual(compareBudgetAmount(1_200_000, 1_000_000), {
    state: "increase",
    difference: 200_000,
  });
  assert.deepEqual(compareBudgetAmount(800_000, 1_000_000), {
    state: "decrease",
    difference: -200_000,
  });
});

test("budget transaction drill-down carries the exact month and expense category", () => {
  assert.equal(
    budgetTransactionsHref("2026-07-01", "Ăn uống & cà phê"),
    "/transactions?from=2026-07-01&to=2026-07-31&category=%C4%82n+u%E1%BB%91ng+%26+c%C3%A0+ph%C3%AA&kind=expense",
  );
});

test("budget progress can report overspending without hiding it", () => {
  assert.equal(budgetProgress({ spent: 750_000, limit: 1_000_000 }), 75);
  assert.equal(budgetProgress({ spent: 1_250_000, limit: 1_000_000 }), 125);
});

test("budget remaining becomes negative when over limit", () => {
  assert.equal(budgetRemaining({ spent: 1_250_000, limit: 1_000_000 }), -250_000);
});

test("budgetThreshold maps progress bands calmly", () => {
  // Bands use rounded percent (same as budgetProgress).
  assert.equal(budgetThreshold({ spent: 400_000, limit: 1_000_000 }), "ok"); // 40%
  assert.equal(budgetThreshold({ spent: 500_000, limit: 1_000_000 }), "watch"); // 50%
  assert.equal(budgetThreshold({ spent: 790_000, limit: 1_000_000 }), "watch"); // 79%
  assert.equal(budgetThreshold({ spent: 800_000, limit: 1_000_000 }), "near"); // 80%
  assert.equal(budgetThreshold({ spent: 990_000, limit: 1_000_000 }), "near"); // 99%
  assert.equal(budgetThreshold({ spent: 1_000_000, limit: 1_000_000 }), "over"); // 100%
  assert.equal(budgetThreshold({ spent: 1_250_000, limit: 1_000_000 }), "over"); // 125%
});

test("budgetStatusLabel uses calm copy: Gần hạn mức / Đã vượt X / Còn X", () => {
  const format = (n: number) => `${n}`;
  assert.equal(budgetStatusLabel({ spent: 400_000, limit: 1_000_000 }, format), "Còn 600000");
  assert.equal(budgetStatusLabel({ spent: 850_000, limit: 1_000_000 }, format), "Gần hạn mức");
  assert.equal(budgetStatusLabel({ spent: 1_250_000, limit: 1_000_000 }, format), "Đã vượt 250000");
  // No guilt words
  const over = budgetStatusLabel({ spent: 1_100_000, limit: 1_000_000 }, format);
  assert.match(over, /^Đã vượt /);
  assert.doesNotMatch(over, /lãng phí|sai|tệ|tội|phải/i);
});

test("budgetBarColor returns distinct tokens per threshold (pair with text)", () => {
  const ok = budgetBarColor("ok");
  const near = budgetBarColor("near");
  const over = budgetBarColor("over");
  assert.notEqual(ok, near);
  assert.notEqual(near, over);
  assert.ok(
    over.includes("danger") ||
      over.includes("EF4444") ||
      over.includes("DC2626") ||
      over.includes("var(--color-danger"),
  );
});

// --- TASK-117: budget spent ignores transfer ---

test("sumBudgetSpent only counts expenses for the category and month", () => {
  const spent = sumBudgetSpent(
    [foodExpense, foodExpense2, transportExpense, priorMonthFood, income],
    "cat-food",
    "2026-07-01",
  );
  assert.equal(spent, 125_000);
  assert.ok(Number.isSafeInteger(spent));
});

test("sumBudgetSpent ignores transfers even with matching categoryId", () => {
  const withoutTransfer = sumBudgetSpent([foodExpense], "cat-food", "2026-07-01");
  const withTransfer = sumBudgetSpent(
    [foodExpense, transferOut],
    "cat-food",
    "2026-07-01",
  );
  assert.equal(withoutTransfer, 45_000);
  assert.equal(withTransfer, 45_000);
  assert.equal(sumBudgetSpent([transferOut], "cat-food", "2026-07-01"), 0);
});

test("sumBudgetSpent after soft-delete drops the expense amount", () => {
  const active = [foodExpense, foodExpense2];
  assert.equal(sumBudgetSpent(active, "cat-food", "2026-07-01"), 125_000);
  // Soft-delete foodExpense2 → exclude from active list
  const afterDelete = active.filter((item) => item.id !== "food-2");
  assert.equal(sumBudgetSpent(afterDelete, "cat-food", "2026-07-01"), 45_000);
});

test("sumBudgetSpent counts only matching split line portion", () => {
  const split: Transaction = {
    ...foodExpense,
    id: "split-budget",
    categoryId: "cat-food",
    category: "Chia · 2 danh mục",
    amount: 100_000,
    splits: [
      { categoryId: "cat-food", category: "Ăn uống", amount: 60_000 },
      { categoryId: "cat-transport", category: "Di chuyển", amount: 40_000 },
    ],
  };
  assert.equal(sumBudgetSpent([split], "cat-food", "2026-07-01"), 60_000);
  assert.equal(sumBudgetSpent([split], "cat-transport", "2026-07-01"), 40_000);
  assert.equal(sumBudgetSpent([split], "cat-other", "2026-07-01"), 0);
});
