import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMonthReview,
  isPastBudgetMonth,
} from "./month-review.ts";
import type { BudgetSummary } from "./budgets.ts";
import type { RecurringCommitment } from "./commitments.ts";

const MONTH = "2026-07-01";

const budgetBase = {
  id: "b-food",
  categoryId: "cat-food",
  categoryName: "Ăn uống",
  categoryIcon: null,
  categoryColor: null,
  monthStart: MONTH,
  limit: 4_000_000,
  spent: 2_000_000,
} satisfies BudgetSummary;

const commitmentBase = {
  id: "c-internet",
  name: "Internet",
  amount: 250_000,
  dueDay: 15,
  dueDate: "2026-07-15",
  accountId: "a",
  accountName: "Bank",
  categoryId: "cat-bills",
  categoryName: "Hóa đơn",
  categoryIcon: null,
  categoryColor: null,
  isArchived: false,
  isPaid: false,
  transactionId: null,
} satisfies RecurringCommitment;

function review(overrides: Partial<Parameters<typeof buildMonthReview>[0]> = {}) {
  return buildMonthReview({
    monthStart: MONTH,
    today: "2026-08-03",
    income: 12_000_000,
    expense: 8_500_000,
    budgets: [budgetBase],
    priorBudgets: [],
    commitments: [commitmentBase],
    ...overrides,
  });
}

test("a month is past only once the server date has left it", () => {
  assert.equal(isPastBudgetMonth(MONTH, "2026-08-01"), true);
  assert.equal(isPastBudgetMonth(MONTH, "2026-07-31"), false);
  assert.equal(isPastBudgetMonth(MONTH, "2026-07-01"), false);
  assert.equal(isPastBudgetMonth(MONTH, "2026-09-20"), true);
});

test("current and future months never produce a review", () => {
  assert.equal(review({ today: "2026-07-20" }), null);
  assert.equal(review({ monthStart: "2026-09-01", today: "2026-08-03" }), null);
});

test("a malformed today cannot prove the month ended", () => {
  assert.equal(isPastBudgetMonth(MONTH, "not-a-date"), false);
  assert.equal(review({ today: "2026/08/03" }), null);
});

test("a malformed monthStart fails closed like every month-boundary caller", () => {
  assert.throws(() => isPastBudgetMonth("2026-07", "2026-08-03"));
  assert.throws(() => review({ monthStart: "July" }));
});

test("income, expense and net are stated plainly, including a negative net", () => {
  const result = review({ income: 5_000_000, expense: 6_500_000 });
  assert.equal(result?.income, 5_000_000);
  assert.equal(result?.expense, 6_500_000);
  assert.equal(result?.net, -1_500_000);
});

test("budgets count closes against the effective limit, carry included", () => {
  const result = review({
    budgets: [
      budgetBase, // 2tr of 4tr — within
      {
        ...budgetBase,
        id: "b-transport",
        categoryId: "cat-transport",
        limit: 1_000_000,
        spent: 1_200_000, // over its own limit…
      },
      {
        ...budgetBase,
        id: "b-shopping",
        categoryId: "cat-shopping",
        limit: 2_000_000,
        spent: 2_500_000, // over its own limit…
      },
    ],
    priorBudgets: [
      // …but June underspend carries +600k, so effective available is +400k.
      {
        categoryId: "cat-shopping",
        monthStart: "2026-06-01",
        limit: 2_000_000,
        spent: 1_400_000,
      },
    ],
  });
  assert.deepEqual(result?.budgets, { within: 2, total: 3 });
});

test("carried overspend can push a within-own-limit budget over", () => {
  const result = review({
    budgets: [budgetBase], // spent 2tr of 4tr own limit
    priorBudgets: [
      {
        categoryId: "cat-food",
        monthStart: "2026-06-01",
        limit: 4_000_000,
        spent: 6_500_000, // carry −2.5tr → effective limit 1.5tr < spent 2tr
      },
    ],
  });
  assert.deepEqual(result?.budgets, { within: 0, total: 1 });
});

test("a month with no budgets withholds the segment instead of printing 0/0", () => {
  assert.equal(review({ budgets: [] })?.budgets, null);
  // Rows from other months are not the viewed month's decision.
  assert.equal(
    review({
      budgets: [{ ...budgetBase, monthStart: "2026-06-01" }],
    })?.budgets,
    null,
  );
});

test("a budget with unreadable money is skipped rather than judged", () => {
  const result = review({
    budgets: [
      budgetBase,
      { ...budgetBase, id: "b-bad", categoryId: "cat-bad", spent: Number.NaN },
    ],
  });
  assert.deepEqual(result?.budgets, { within: 1, total: 1 });
});

test("commitments count what was due and paid that month", () => {
  const result = review({
    commitments: [
      { ...commitmentBase, isPaid: true, transactionId: "t-1" },
      { ...commitmentBase, id: "c-rent" },
      { ...commitmentBase, id: "c-gym", isArchived: true },
      { ...commitmentBase, id: "c-other-month", dueDate: "2026-06-15" },
    ],
  });
  assert.deepEqual(result?.commitments, { paid: 1, total: 2 });
});

test("a month with no active commitment due withholds the segment", () => {
  assert.equal(review({ commitments: [] })?.commitments, null);
  assert.equal(
    review({
      commitments: [{ ...commitmentBase, isArchived: true }],
    })?.commitments,
    null,
  );
});

test("unsafe money input throws instead of reporting a fake net", () => {
  assert.throws(() => review({ income: 1.5 }));
  assert.throws(() => review({ expense: Number.MAX_SAFE_INTEGER + 1 }));
});
