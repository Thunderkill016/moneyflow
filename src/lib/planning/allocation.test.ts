import assert from "node:assert/strict";
import test from "node:test";
import { calculateDashboardSummary } from "../finance.ts";
import type { Transaction } from "../sample-data.ts";
import type { BudgetSummary } from "./budgets.ts";
import type { RecurringCommitment } from "./commitments.ts";
import {
  allocateMonth,
  allocateMonthFromTotals,
  allocationExplanation,
  monthIncomeTotal,
} from "./allocation.ts";

const MONTH_START = "2026-08-01";
const TODAY = "2026-08-14";

const base: Transaction = {
  id: "base",
  kind: "expense",
  categoryId: "cat-food",
  category: "Ăn uống",
  note: "Bữa trưa",
  accountId: "acc-cash",
  account: "Tiền mặt",
  amount: 100_000,
  occurredOn: "2026-08-05",
  occurredAt: "2026-08-05T05:00:00.000Z",
  relativeDate: "5 tháng 8",
};

const salary: Transaction = {
  ...base,
  id: "salary",
  kind: "income",
  categoryId: "cat-salary",
  category: "Lương",
  amount: 20_000_000,
  occurredOn: "2026-08-01",
};

/*
 * The regression this module has to survive: an income row dated later in the
 * month is already inside the dashboard's income figure, because that aggregate
 * selects on the "YYYY-MM" prefix rather than on days up to today. A window
 * ending at today would drop it and the two screens would disagree.
 */
const lateIncome: Transaction = {
  ...salary,
  id: "late-income",
  amount: 5_000_000,
  occurredOn: "2026-08-28",
};

const transfer: Transaction = {
  ...base,
  id: "transfer",
  kind: "transfer",
  categoryId: "cat-transfer",
  category: "Chuyển khoản",
  amount: 9_000_000,
  occurredOn: "2026-08-10",
  destinationAccount: "Ngân hàng",
};

const lastMonthIncome: Transaction = {
  ...salary,
  id: "last-month-income",
  amount: 18_000_000,
  occurredOn: "2026-07-31",
};

function budget(categoryId: string, limit: number, monthStart = MONTH_START): BudgetSummary {
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

test("unassigned is income minus what this month's budgets claim", () => {
  const result = allocateMonth({
    transactions: [salary, base],
    budgets: [budget("cat-food", 6_000_000), budget("cat-transport", 2_000_000)],
    monthStart: MONTH_START,
  });

  assert.equal(result.income, 20_000_000);
  assert.equal(result.allocated, 8_000_000);
  assert.equal(result.unassigned, 12_000_000);
  assert.equal(result.state, "unallocated");
});

test("assigning more than was earned reports over, not zero", () => {
  const result = allocateMonth({
    transactions: [salary],
    budgets: [budget("cat-food", 25_000_000)],
    monthStart: MONTH_START,
  });

  assert.equal(result.unassigned, -5_000_000);
  assert.equal(result.state, "over");
});

test("assigning exactly the income reports balanced", () => {
  const result = allocateMonth({
    transactions: [salary],
    budgets: [budget("cat-food", 20_000_000)],
    monthStart: MONTH_START,
  });

  assert.equal(result.unassigned, 0);
  assert.equal(result.state, "balanced");
});

test("a transfer is never counted as income", () => {
  const withTransfer = allocateMonth({
    transactions: [salary, transfer],
    budgets: [],
    monthStart: MONTH_START,
  });
  const withoutTransfer = allocateMonth({
    transactions: [salary],
    budgets: [],
    monthStart: MONTH_START,
  });

  assert.equal(withTransfer.income, withoutTransfer.income);
  // Not vacuous: the transfer is real, large, and inside the month.
  assert.equal(transfer.occurredOn.startsWith("2026-08"), true);
  assert.equal(transfer.amount, 9_000_000);
});

test("income dated later in the same month still counts", () => {
  const result = allocateMonth({
    transactions: [salary, lateIncome],
    budgets: [],
    monthStart: MONTH_START,
  });

  assert.equal(result.income, 25_000_000);
});

test("last month's income never leaks in, and neither do other months' budgets", () => {
  const result = allocateMonth({
    transactions: [salary, lastMonthIncome],
    budgets: [
      budget("cat-food", 6_000_000),
      budget("cat-food", 99_000_000, "2026-07-01"),
    ],
    monthStart: MONTH_START,
  });

  assert.equal(result.income, 20_000_000);
  assert.equal(result.allocated, 6_000_000);
});

/*
 * The figure would be worthless if it disagreed with the income the dashboard
 * already shows the same user for the same month, so the agreement is pinned
 * rather than assumed.
 */
test("the income side matches what the dashboard reports", () => {
  const transactions = [salary, lateIncome, base, transfer];
  const summary = calculateDashboardSummary(transactions, {
    isDemo: false,
    totalBalance: 0,
    today: TODAY,
  });
  const result = allocateMonth({ transactions, budgets: [], monthStart: MONTH_START });

  assert.equal(result.income, summary.income);
  assert.equal(result.income, 25_000_000);
});

test("no budgets at all means every recorded đồng is unassigned", () => {
  const result = allocateMonth({
    transactions: [salary],
    budgets: [],
    monthStart: MONTH_START,
  });

  assert.equal(result.allocated, 0);
  assert.equal(result.unassigned, 20_000_000);
  assert.equal(result.state, "unallocated");
});

test("a month with no income and no budgets is balanced, not over", () => {
  const result = allocateMonth({ transactions: [base], budgets: [], monthStart: MONTH_START });

  assert.equal(result.income, 0);
  assert.equal(result.unassigned, 0);
  assert.equal(result.state, "balanced");
});

test("a malformed month is rejected rather than reported as nothing assigned", () => {
  assert.throws(
    () => allocateMonth({ transactions: [], budgets: [], monthStart: "2026-08" }),
    /invalid_budget_month_start/u,
  );
  assert.throws(
    () => allocateMonth({ transactions: [], budgets: [], monthStart: "2026-13-01" }),
    /invalid_budget_month_start/u,
  );
});

test("monthIncomeTotal sums only income rows in the prefix", () => {
  assert.equal(monthIncomeTotal([salary, base, transfer], "2026-08"), 20_000_000);
  assert.equal(monthIncomeTotal([salary], "2026-07"), 0);
  assert.equal(monthIncomeTotal([], "2026-08"), 0);
});

test("allocateMonthFromTotals agrees with the ledger-derived path", () => {
  const transactions = [salary, base, transfer];
  const budgets = [budget("cat-food", 6_000_000), budget("cat-transport", 2_000_000)];
  const fromLedger = allocateMonth({ transactions, budgets, monthStart: MONTH_START });
  const fromTotals = allocateMonthFromTotals({
    income: fromLedger.income,
    limits: 8_000_000,
    monthStart: MONTH_START,
  });

  assert.deepEqual(fromTotals, fromLedger);
});

test("allocateMonthFromTotals refuses unsafe operands", () => {
  assert.throws(
    () =>
      allocateMonthFromTotals({
        income: Number.MAX_SAFE_INTEGER,
        limits: -1,
        monthStart: MONTH_START,
      }),
    /unsafe_unassigned_total/u,
  );
  assert.throws(
    () => allocateMonthFromTotals({ income: 1.5, limits: 0, monthStart: MONTH_START }),
    /unsafe_allocation_input/u,
  );
});

test("the explanation names both operands so the figure can be checked", () => {
  const unallocated = allocateMonthFromTotals({
    income: 20_000_000,
    limits: 8_000_000,
    monthStart: MONTH_START,
  });
  const text = allocationExplanation(unallocated);

  assert.match(text, /20\.000\.000/u);
  assert.match(text, /8\.000\.000/u);
});

test("the explanation distinguishes over-allocation from an empty month", () => {
  const over = allocationExplanation(
    allocateMonthFromTotals({ income: 5_000_000, limits: 9_000_000, monthStart: MONTH_START }),
  );
  const empty = allocationExplanation(
    allocateMonthFromTotals({ income: 0, limits: 0, monthStart: MONTH_START }),
  );

  assert.match(over, /nhiều hơn thu nhập/u);
  assert.match(empty, /Chưa ghi thu nhập/u);
  assert.notEqual(over, empty);
});

/*
 * The line this figure must never cross. Restating the user's own recorded
 * numbers is honest; telling them what to do with the money is the guidance
 * the product withdrew, and it must not return through this wording.
 */
test("the explanation reports and never advises", () => {
  const forbidden =
    /nên|đừng|hãy|cảnh báo|vượt mức|tiết kiệm|cắt giảm|quá nhiều|hạn chế|khuyên|cẩn thận|coi chừng|còn có thể tiêu/iu;

  for (const [income, limits] of [
    [20_000_000, 8_000_000],
    [5_000_000, 9_000_000],
    [7_000_000, 7_000_000],
    [0, 0],
    [0, 3_000_000],
  ] as [number, number][]) {
    const text = allocationExplanation(
      allocateMonthFromTotals({ income, limits, monthStart: MONTH_START }),
    );
    assert.ok(!forbidden.test(text), `advisory wording leaked: ${text}`);
  }
});

function commitment(
  categoryId: string,
  amount: number,
  overrides: Partial<RecurringCommitment> = {},
): RecurringCommitment {
  return {
    id: `commitment-${categoryId}-${amount}`,
    name: categoryId,
    amount,
    dueDay: 5,
    dueDate: "2026-08-05",
    accountId: "acc-bank",
    accountName: "Ngân hàng",
    categoryId,
    categoryName: categoryId,
    categoryIcon: null,
    categoryColor: null,
    isArchived: false,
    isPaid: false,
    transactionId: null,
    ...overrides,
  };
}

/*
 * The defect this rule exists to prevent, with the numbers from the report:
 * income 20tr, limits 8tr, an unpaid 6tr bill in an unbudgeted category. Before
 * commitments were counted the page said 12tr was free when only 6tr was.
 */
test("an unpaid bill in an unbudgeted category is not free money", () => {
  const result = allocateMonth({
    transactions: [salary],
    budgets: [budget("cat-food", 8_000_000)],
    commitments: [commitment("cat-rent", 6_000_000)],
    monthStart: MONTH_START,
  });

  assert.equal(result.limits, 8_000_000);
  assert.equal(result.committed, 6_000_000);
  assert.equal(result.allocated, 14_000_000);
  assert.equal(result.unassigned, 6_000_000);
});

test("a bill whose category has a budget is claimed once, by the budget", () => {
  const result = allocateMonth({
    transactions: [salary],
    budgets: [budget("cat-rent", 6_000_000)],
    commitments: [commitment("cat-rent", 6_000_000)],
    monthStart: MONTH_START,
  });

  assert.equal(result.committed, 0, "double-counting rent against its own budget");
  assert.equal(result.allocated, 6_000_000);
  assert.equal(result.unassigned, 14_000_000);
});

test("a paid bill is already an expense and is never allocated again", () => {
  const result = allocateMonth({
    transactions: [salary],
    budgets: [],
    commitments: [
      commitment("cat-rent", 6_000_000, { isPaid: true, transactionId: "txn-rent" }),
    ],
    monthStart: MONTH_START,
  });

  assert.equal(result.committed, 0);
  assert.equal(result.unassigned, 20_000_000);
});

test("archived bills and bills due in another month claim nothing", () => {
  const result = allocateMonth({
    transactions: [salary],
    budgets: [],
    commitments: [
      commitment("cat-rent", 6_000_000, { isArchived: true }),
      commitment("cat-insurance", 4_000_000, { dueDate: "2026-09-05" }),
    ],
    monthStart: MONTH_START,
  });

  assert.equal(result.committed, 0);
  assert.equal(result.unassigned, 20_000_000);
});

test("bills can push a month from unallocated into over", () => {
  const result = allocateMonth({
    transactions: [salary],
    budgets: [budget("cat-food", 16_000_000)],
    commitments: [commitment("cat-rent", 6_000_000)],
    monthStart: MONTH_START,
  });

  assert.equal(result.state, "over");
  assert.equal(result.unassigned, -2_000_000);
});

test("the explanation names bills separately from limits", () => {
  const withBills = allocationExplanation(
    allocateMonthFromTotals({
      income: 20_000_000,
      limits: 8_000_000,
      committed: 6_000_000,
      monthStart: MONTH_START,
    }),
  );

  assert.match(withBills, /8\.000\.000/u);
  assert.match(withBills, /6\.000\.000/u);
  assert.match(withBills, /cam kết chưa trả/u);

  // With no bills the wording stays as it was, rather than saying "+ 0".
  const withoutBills = allocationExplanation(
    allocateMonthFromTotals({ income: 20_000_000, limits: 8_000_000, monthStart: MONTH_START }),
  );
  assert.ok(!withoutBills.includes("cam kết"));
});

test("the explanation still never advises once bills are named", () => {
  const forbidden =
    /nên|đừng|hãy|cảnh báo|vượt mức|tiết kiệm|cắt giảm|quá nhiều|hạn chế|khuyên|cẩn thận|coi chừng|còn có thể tiêu/iu;

  for (const [income, limits, committed] of [
    [20_000_000, 8_000_000, 6_000_000],
    [5_000_000, 2_000_000, 9_000_000],
    [7_000_000, 3_000_000, 4_000_000],
    [0, 0, 3_000_000],
  ] as [number, number, number][]) {
    const text = allocationExplanation(
      allocateMonthFromTotals({ income, limits, committed, monthStart: MONTH_START }),
    );
    assert.ok(!forbidden.test(text), `advisory wording leaked: ${text}`);
  }
});
