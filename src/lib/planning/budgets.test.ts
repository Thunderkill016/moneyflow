import assert from "node:assert/strict";
import test from "node:test";
import {
  budgetBarColor,
  budgetEffectiveAvailable,
  budgetEffectiveStatusLabel,
  budgetEffectiveThreshold,
  budgetMonthEnd,
  budgetMonthKey,
  budgetPaceLine,
  budgetProgress,
  budgetRollover,
  budgetRolloverLabel,
  budgetRolloverWindowStart,
  BUDGET_ROLLOVER_LOOKBACK_MONTHS,
  monthElapsedPercent,
  budgetRemaining,
  budgetsToCarryForward,
  budgetStatusLabel,
  budgetSuggestions,
  budgetThreshold,
  budgetTransactionsHref,
  compareBudgetAmount,
  resolveBudgetMonth,
  shiftBudgetMonth,
  sumBudgetSpent,
  type BudgetSummary,
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
  // Exactly at the limit nothing has been exceeded — near, not over.
  assert.equal(budgetThreshold({ spent: 1_000_000, limit: 1_000_000 }), "near"); // 100%
  assert.equal(budgetThreshold({ spent: 1_250_000, limit: 1_000_000 }), "over"); // 125%
});

test("budgetThreshold decides over on raw đồng, never the rounded percent", () => {
  // Issue #714: 99.8% rounds to 100 while 10.000 ₫ remains — over requires
  // the raw spend to pass the limit, not the rounded percent to reach 100.
  assert.equal(budgetThreshold({ spent: 4_990_000, limit: 5_000_000 }), "near"); // 99.8%
  assert.equal(budgetThreshold({ spent: 4_995_000, limit: 5_000_000 }), "near"); // 99.9%
  // At the limit there is no overshoot — "Đã vượt X" would be a false claim.
  assert.equal(budgetThreshold({ spent: 5_000_000, limit: 5_000_000 }), "near"); // 100%
  // The first đồng past the cap is a real overspend.
  assert.equal(budgetThreshold({ spent: 5_000_001, limit: 5_000_000 }), "over");
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

test("budgetStatusLabel never claims vượt while đồng remain", () => {
  const format = (n: number) => `${n}`;
  // Issue #714 repro: 99.8% rounds to 100, but 10.000 ₫ remain — the label
  // must stay near-limit, not "Đã vượt 10.000 ₫".
  assert.equal(
    budgetStatusLabel({ spent: 4_990_000, limit: 5_000_000 }, format),
    "Gần hạn mức",
  );
  // Fully spent with zero overshoot is still not a vượt claim.
  assert.equal(
    budgetStatusLabel({ spent: 5_000_000, limit: 5_000_000 }, format),
    "Gần hạn mức",
  );
  assert.equal(
    budgetStatusLabel({ spent: 5_010_000, limit: 5_000_000 }, format),
    "Đã vượt 10000",
  );
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

const CARRY_MONTH = "2026-08-01";
const CARRY_PREVIOUS = "2026-07-01";

function carryRow(
  categoryId: string,
  limit: number,
  monthStart: string,
): BudgetSummary {
  return {
    id: `budget-${categoryId}-${monthStart}`,
    categoryId,
    categoryName: categoryId,
    categoryIcon: null,
    categoryColor: null,
    monthStart,
    limit,
    spent: 0,
  };
}

test("carry-forward fills categories this month has no decision for", () => {
  const carried = budgetsToCarryForward({
    previousBudgets: [
      carryRow("cat-food", 5_000_000, CARRY_PREVIOUS),
      carryRow("cat-transport", 2_000_000, CARRY_PREVIOUS),
    ],
    currentBudgets: [],
    monthStart: CARRY_MONTH,
  });

  assert.equal(carried.length, 2);
  assert.deepEqual(carried[0], {
    categoryId: "cat-food",
    monthStart: CARRY_MONTH,
    limit: 5_000_000,
  });
});

/*
 * The invariant the whole feature rests on. A limit the user already set this
 * month is a decision; replacing it with history would overwrite their own
 * judgement, and they would have no way to tell it had happened.
 */
test("carry-forward never overwrites a decision already made this month", () => {
  const carried = budgetsToCarryForward({
    previousBudgets: [carryRow("cat-food", 5_000_000, CARRY_PREVIOUS)],
    currentBudgets: [carryRow("cat-food", 3_000_000, CARRY_MONTH)],
    monthStart: CARRY_MONTH,
  });

  assert.deepEqual(carried, []);
});

test("carry-forward leaves a category budgeted only this month alone", () => {
  const carried = budgetsToCarryForward({
    previousBudgets: [carryRow("cat-food", 5_000_000, CARRY_PREVIOUS)],
    currentBudgets: [
      carryRow("cat-food", 3_000_000, CARRY_MONTH),
      carryRow("cat-fun", 1_000_000, CARRY_MONTH),
    ],
    monthStart: CARRY_MONTH,
  });

  assert.deepEqual(carried, []);
});

test("carry-forward skips non-positive previous limits", () => {
  const carried = budgetsToCarryForward({
    previousBudgets: [
      carryRow("cat-zero", 0, CARRY_PREVIOUS),
      carryRow("cat-negative", -5_000, CARRY_PREVIOUS),
      carryRow("cat-food", 5_000_000, CARRY_PREVIOUS),
    ],
    currentBudgets: [],
    monthStart: CARRY_MONTH,
  });

  assert.equal(carried.length, 1);
  assert.equal(carried[0]?.categoryId, "cat-food");
});

test("carry-forward has nothing to offer when last month was empty", () => {
  assert.deepEqual(
    budgetsToCarryForward({
      previousBudgets: [],
      currentBudgets: [carryRow("cat-food", 3_000_000, CARRY_MONTH)],
      monthStart: CARRY_MONTH,
    }),
    [],
  );
});

test("carry-forward rejects a malformed target month before writing anything", () => {
  assert.throws(
    () =>
      budgetsToCarryForward({
        previousBudgets: [carryRow("cat-food", 5_000_000, CARRY_PREVIOUS)],
        currentBudgets: [],
        monthStart: "2026-13-01",
      }),
    /invalid_budget_month_start/u,
  );
});

test("monthElapsedPercent reports the calendar share of the month", () => {
  // September has 30 days; day 15 elapsed = 50%.
  assert.equal(monthElapsedPercent("2026-09-01", "2026-09-15"), 50);
  assert.equal(monthElapsedPercent("2026-09-01", "2026-09-01"), 3);
  // February leap year: 2028-02 has 29 days.
  assert.equal(monthElapsedPercent("2028-02-01", "2028-02-29"), 100);
});

test("monthElapsedPercent stays silent outside the selected month", () => {
  assert.equal(monthElapsedPercent("2026-09-01", "2026-08-31"), null);
  assert.equal(monthElapsedPercent("2026-09-01", "2026-10-01"), null);
});

test("budgetPaceLine pairs usage with elapsed time, never a verdict", () => {
  const budget = { spent: 1_800_000, limit: 4_000_000 };
  // 45% of limit used while 50% of the month has elapsed — descriptive only.
  assert.equal(
    budgetPaceLine(budget, "2026-09-01", "2026-09-15"),
    "Đã dùng 45% hạn mức · tháng đã qua 50%",
  );
});

test("budgetPaceLine is null when the viewed month is not the current one", () => {
  const budget = { spent: 1_800_000, limit: 4_000_000 };
  assert.equal(budgetPaceLine(budget, "2026-08-01", "2026-09-15"), null);
  assert.equal(budgetPaceLine(budget, "2026-10-01", "2026-09-15"), null);
});

// --- Rollover: prior months' under/overspend carries into the viewed month ---

function rolloverRow(
  categoryId: string,
  monthStart: string,
  limit: number,
  spent: number,
): BudgetSummary {
  return {
    id: `budget-${categoryId}-${monthStart}`,
    categoryId,
    categoryName: categoryId,
    categoryIcon: null,
    categoryColor: null,
    monthStart,
    limit,
    spent,
  };
}

test("budgetRolloverWindowStart caps the lookback at the documented window", () => {
  assert.equal(BUDGET_ROLLOVER_LOOKBACK_MONTHS, 12);
  assert.equal(budgetRolloverWindowStart("2026-09-01"), "2025-09-01");
  assert.equal(budgetRolloverWindowStart("2026-01-01"), "2025-01-01");
});

test("budgetRollover adds a prior month's underspend", () => {
  const rollover = budgetRollover({
    priorBudgets: [rolloverRow("cat-food", "2026-08-01", 3_800_000, 2_940_000)],
    categoryId: "cat-food",
    monthStart: "2026-09-01",
  });
  assert.deepEqual(rollover, { carry: 860_000, monthsIncluded: 1 });
});

test("budgetRollover subtracts a prior month's overspend", () => {
  const rollover = budgetRollover({
    priorBudgets: [rolloverRow("cat-food", "2026-08-01", 3_000_000, 3_500_000)],
    categoryId: "cat-food",
    monthStart: "2026-09-01",
  });
  assert.deepEqual(rollover, { carry: -500_000, monthsIncluded: 1 });
});

test("budgetRollover nets several budgeted months, including gaps with no budget", () => {
  const rollover = budgetRollover({
    priorBudgets: [
      rolloverRow("cat-food", "2026-08-01", 3_000_000, 2_000_000), // +1.000.000
      // 2026-07 has no budget row: the category was not tracked that month,
      // so it contributes nothing rather than an invented deficit.
      rolloverRow("cat-food", "2026-06-01", 3_000_000, 3_400_000), // −400.000
    ],
    categoryId: "cat-food",
    monthStart: "2026-09-01",
  });
  assert.deepEqual(rollover, { carry: 600_000, monthsIncluded: 2 });
});

test("budgetRollover never borrows other categories or months at/after the viewed month", () => {
  const rollover = budgetRollover({
    priorBudgets: [
      rolloverRow("cat-transport", "2026-08-01", 1_000_000, 100_000),
      rolloverRow("cat-food", "2026-09-01", 3_000_000, 0), // the viewed month itself
      rolloverRow("cat-food", "2026-10-01", 3_000_000, 0), // a later month
      rolloverRow("cat-food", "2026-08-01", 3_000_000, 2_500_000),
    ],
    categoryId: "cat-food",
    monthStart: "2026-09-01",
  });
  assert.deepEqual(rollover, { carry: 500_000, monthsIncluded: 1 });
});

test("budgetRollover ignores budgeted months older than the lookback window", () => {
  const monthStart = "2026-09-01";
  const outside = shiftBudgetMonth(budgetRolloverWindowStart(monthStart), -1);
  const rollover = budgetRollover({
    priorBudgets: [
      rolloverRow("cat-food", outside, 9_000_000, 0), // +9.000.000, too old
      rolloverRow("cat-food", "2026-08-01", 1_000_000, 0), // +1.000.000
    ],
    categoryId: "cat-food",
    monthStart,
  });
  assert.deepEqual(rollover, { carry: 1_000_000, monthsIncluded: 1 });
});

test("budgetRollover is zero without prior budgeted months", () => {
  assert.deepEqual(
    budgetRollover({
      priorBudgets: [],
      categoryId: "cat-food",
      monthStart: "2026-09-01",
    }),
    { carry: 0, monthsIncluded: 0 },
  );
});

test("budgetRollover rejects a malformed viewed month instead of summing nothing", () => {
  assert.throws(
    () =>
      budgetRollover({
        priorBudgets: [rolloverRow("cat-food", "2026-08-01", 1_000_000, 0)],
        categoryId: "cat-food",
        monthStart: "2026-13-01",
      }),
    /invalid_budget_month_shift|budget_month_out_of_range/u,
  );
});

test("budgetEffectiveAvailable folds signed carry into limit minus spent", () => {
  assert.equal(
    budgetEffectiveAvailable({ limit: 4_000_000, spent: 2_760_000 }, 860_000),
    2_100_000,
  );
  assert.equal(
    budgetEffectiveAvailable({ limit: 4_000_000, spent: 2_760_000 }, -500_000),
    740_000,
  );
  // Carried overspend can consume the whole limit and more.
  assert.equal(
    budgetEffectiveAvailable({ limit: 1_000_000, spent: 0 }, -1_500_000),
    -500_000,
  );
});

test("budgetEffectiveThreshold reports over whenever available went negative", () => {
  // Spent under the month's own limit, but carried overspend still puts it over.
  assert.equal(
    budgetEffectiveThreshold({ limit: 1_000_000, spent: 0 }, -1_500_000),
    "over",
  );
  // A positive carry legitimately rescues a month spent past its own limit:
  // 1.200.000 used of a 1.500.000 effective cap lands in the 80% band.
  assert.equal(
    budgetEffectiveThreshold({ limit: 1_000_000, spent: 1_200_000 }, 500_000),
    "near",
  );
  // Bands still apply against the effective limit.
  assert.equal(
    budgetEffectiveThreshold({ limit: 1_000_000, spent: 400_000 }, 0),
    "ok",
  );
  assert.equal(
    budgetEffectiveThreshold({ limit: 1_000_000, spent: 850_000 }, 0),
    "near",
  );
});

test("budgetEffectiveStatusLabel keeps calm copy on the effective figures", () => {
  const format = (n: number) => `${n}`;
  assert.equal(
    budgetEffectiveStatusLabel({ limit: 1_000_000, spent: 400_000 }, 200_000, format),
    "Còn 800000",
  );
  assert.equal(
    budgetEffectiveStatusLabel({ limit: 1_000_000, spent: 0 }, -1_500_000, format),
    "Đã vượt 500000",
  );
  assert.equal(
    budgetEffectiveStatusLabel({ limit: 1_000_000, spent: 850_000 }, 0, format),
    "Gần hạn mức",
  );
});

test("budgetRolloverLabel explains the carry in plain Vietnamese", () => {
  assert.equal(
    budgetRolloverLabel({ carry: 860_000, monthsIncluded: 1 }),
    "Chuyển từ tháng trước: +860.000 ₫",
  );
  assert.equal(
    budgetRolloverLabel({ carry: -500_000, monthsIncluded: 1 }),
    "Trừ vì vượt hạn mức tháng trước: −500.000 ₫",
  );
  assert.equal(
    budgetRolloverLabel({ carry: 600_000, monthsIncluded: 2 }),
    "Chuyển từ 2 tháng trước đó: +600.000 ₫",
  );
});

test("budgetRolloverLabel stays silent when nothing carried", () => {
  assert.equal(budgetRolloverLabel({ carry: 0, monthsIncluded: 0 }), null);
  assert.equal(budgetRolloverLabel({ carry: 0, monthsIncluded: 3 }), null);
});

function suggestionRow(
  overrides: Partial<Transaction> & { occurredOn: string },
): Transaction {
  return { ...foodExpense, ...overrides, id: overrides.id ?? crypto.randomUUID() };
}

test("budgetSuggestions averages the trailing window per expense category", () => {
  // Viewing September: the window is Jun+Jul+Aug. Spend in months that
  // recorded nothing still counts toward the average — a monthly budget
  // must cover quiet months too, not just the ones with receipts.
  const suggestions = budgetSuggestions(
    [
      suggestionRow({ occurredOn: "2026-06-10", amount: 600_000 }),
      suggestionRow({ occurredOn: "2026-07-12", amount: 900_000 }),
      suggestionRow({ occurredOn: "2026-08-05", amount: 1_200_000 }),
      suggestionRow({
        id: "transport-aug",
        categoryId: "cat-transport",
        category: "Di chuyển",
        occurredOn: "2026-08-15",
        amount: 660_000,
      }),
      // Rows inside the viewed month never feed the suggestion.
      suggestionRow({ occurredOn: "2026-09-01", amount: 9_999_000 }),
      // A zero-spend category produces no suggestion at all.
    ],
    "2026-09-01",
  );
  assert.deepEqual(suggestions.get("cat-food"), {
    amount: 900_000, // (600k + 900k + 1.2M) / 3 months
    monthsWithData: 3,
  });
  assert.deepEqual(suggestions.get("cat-transport"), {
    amount: 220_000, // 660k spread over the 3-month window
    monthsWithData: 1,
  });
  assert.equal(suggestions.has("cat-none"), false);
});

test("budgetSuggestions distributes split lines and ignores non-expense rows", () => {
  const split: Transaction = {
    ...foodExpense,
    id: "split-1",
    amount: 300_000,
    occurredOn: "2026-07-10",
    splits: [
      { categoryId: "cat-food", category: "Ăn uống", amount: 200_000 },
      { categoryId: "cat-transport", category: "Di chuyển", amount: 100_000 },
    ],
  };
  const suggestions = budgetSuggestions(
    [
      split,
      { ...transferOut, occurredOn: "2026-07-11" },
      { ...income, occurredOn: "2026-07-25" },
    ],
    "2026-09-01",
  );
  // Split lines land on their own categories — the same per-entry
  // attribution `budget_progress.spent_minor` uses — so the suggestion and
  // the eventual "Đã chi" figure cannot disagree.
  assert.deepEqual(suggestions.get("cat-food"), {
    amount: 66_667, // 200k / 3
    monthsWithData: 1,
  });
  assert.deepEqual(suggestions.get("cat-transport"), {
    amount: 33_333, // 100k / 3
    monthsWithData: 1,
  });
  assert.equal(suggestions.has("cat-salary"), false);
});

test("budgetSuggestions anchors the window on the viewed month", () => {
  // Viewing June back: only Mar+Apr+May feed the average — June and later
  // rows are the viewer's "future" and must not leak in.
  const rows = [
    suggestionRow({ occurredOn: "2026-04-10", amount: 300_000 }),
    suggestionRow({ occurredOn: "2026-05-10", amount: 600_000 }),
    suggestionRow({ occurredOn: "2026-06-02", amount: 999_000 }),
    suggestionRow({ occurredOn: "2026-08-02", amount: 999_000 }),
  ];
  const suggestions = budgetSuggestions(rows, "2026-06-01");
  assert.deepEqual(suggestions.get("cat-food"), {
    amount: 300_000, // (300k + 600k) / 3
    monthsWithData: 2,
  });
});

test("budgetSuggestions refuses noise averages and blank categories", () => {
  const suggestions = budgetSuggestions(
    [
      // 3₫ across the window → a suggested limit of 1₫, pure noise.
      suggestionRow({ occurredOn: "2026-07-10", amount: 3 }),
      suggestionRow({
        id: "blank-cat",
        categoryId: "",
        category: "Chưa phân loại",
        occurredOn: "2026-07-10",
        amount: 500_000,
      }),
    ],
    "2026-09-01",
  );
  assert.equal(suggestions.get("cat-food"), undefined);
  assert.equal(suggestions.has(""), false);
});
