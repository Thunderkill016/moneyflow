import { sumTransactions } from "../finance.ts";
import { formatMoney } from "../money.ts";
import type { Transaction } from "../sample-data.ts";
import { budgetMonthKey, type BudgetSummary } from "./budgets.ts";
import type { RecurringCommitment } from "./commitments.ts";

/*
 * Money that has not been given a job yet.
 *
 * A category cap answers "did I overspend here?" after the fact. It cannot
 * answer "is all of my money accounted for?", because caps are independent of
 * income — a user can hold four budgets totalling far less, or far more, than
 * they actually earned and nothing in the product says so.
 *
 * This module closes that gap with one subtraction, and deliberately nothing
 * more:
 *
 *     unassigned = income recorded this month
 *                − budget limits assigned this month
 *                − unpaid recurring obligations no budget already covers
 *
 * The third term is not optional. Without it the figure counts only limits and
 * overstates free money by the size of the user's bills, in the direction that
 * causes harm: it invites committing money that is already spoken for.
 *
 * Three rules keep the figure honest, and each is load-bearing:
 *
 * 1. **Recorded income, never expected income.** Income templates are
 *    expectations; `PRINCIPLES.md` puts facts before derived views. The income
 *    side is selected exactly as `calculateDashboardSummary` selects it —
 *    `kind === "income"` over `occurredOn.startsWith(monthPrefix)` — so the two
 *    figures cannot drift apart and show a user two different incomes.
 * 2. **Transfers never count.** They move a user's own money between their own
 *    accounts, so counting one as income would invent money that was already
 *    there. This falls out of matching on `kind` exactly.
 * 3. **No carry-over between months.** YNAB's "age your money" rule assumes a
 *    stable salary, and the merged Vietnam strategy records that irregular
 *    income needs its own observed workflow rather than being treated as a
 *    variant of salaried behaviour. Each month therefore stands alone here, and
 *    carry-over stays a separate, explicit decision.
 *
 * What this is not: it states arithmetic on the user's own recorded numbers and
 * leaves the decision to them. It must never grow into a suggestion about what
 * to spend — that is the line the withdrawn safe-to-spend figure crossed.
 */

export type AllocationState =
  /** Income has arrived that no budget claims yet. */
  | "unallocated"
  /** Every recorded đồng is assigned, and no more than that. */
  | "balanced"
  /** More has been assigned to budgets than was actually earned. */
  | "over";

export type MonthAllocation = {
  monthStart: string;
  /** Income recorded in this calendar month, in integer đồng. */
  income: number;
  /** Sum of budget limits assigned to this month, in integer đồng. */
  limits: number;
  /**
   * Unpaid recurring obligations this month that no budget already covers.
   *
   * Separate from `limits` so the reader can see which half of the claim is a
   * decision they made and which half is a bill that is simply due.
   */
  committed: number;
  /** `limits + committed` — everything this month's income is already claimed by. */
  allocated: number;
  /** `income − allocated`. Negative means over-allocated. */
  unassigned: number;
  state: AllocationState;
};

/**
 * Income recorded in one calendar month.
 *
 * Mirrors `monthExpenseTotal` deliberately, including its whole-month prefix
 * match: a row dated later this month is already inside the dashboard's income
 * figure, so a window ending at today would disagree with what the user saw.
 */
export function monthIncomeTotal(
  transactions: Transaction[],
  monthPrefix: string,
): number {
  return sumTransactions(
    transactions,
    (item) => item.kind === "income" && item.occurredOn.startsWith(monthPrefix),
  );
}

/**
 * Recurring obligations that no budget already accounts for.
 *
 * Without this, the unassigned figure counts only budget limits and therefore
 * overstates free money by the size of the user's unpaid bills — in the wrong
 * direction, because it invites committing money that is already spoken for.
 *
 * Each đồng must be claimed exactly once, which is what the coverage rule
 * below is for:
 *
 * - A commitment whose category **has** a budget this month is already
 *   allocated by that limit. Adding its amount again would double-count rent
 *   against a `Nhà ở` budget set to cover exactly that rent.
 * - A commitment whose category has **no** budget is its own allocation, and
 *   is the case this function exists to find.
 * - A **paid** commitment is already a recorded expense with a transaction, so
 *   it lives in budget `spent`, never in an allocation.
 * - Archived commitments, and occurrences due in another month, claim nothing.
 *
 * `commitments` must already be resolved for `monthStart` — `isPaid` is a
 * per-month fact, so passing an unhydrated list would report last month's
 * payment state.
 */
export function uncoveredCommitmentTotal({
  commitments,
  budgets,
  monthStart,
}: {
  commitments: RecurringCommitment[];
  budgets: BudgetSummary[];
  monthStart: string;
}): number {
  const monthPrefix = budgetMonthKey(monthStart);
  const budgetedCategories = new Set(
    budgets
      .filter((budget) => budget.monthStart === monthStart)
      .map((budget) => budget.categoryId),
  );

  return commitments
    .filter(
      (item) =>
        !item.isArchived &&
        !item.isPaid &&
        item.dueDate.startsWith(monthPrefix) &&
        !budgetedCategories.has(item.categoryId),
    )
    .reduce((sum, item) => {
      const next = sum + item.amount;
      if (!Number.isSafeInteger(next)) throw new Error("unsafe_commitment_total");
      return next;
    }, 0);
}

/**
 * The subtraction itself, for callers that already hold both totals.
 *
 * The budgets page recomputes its allocated total from live client state as the
 * user adds and edits limits, so it cannot go back through the ledger for every
 * keystroke — and a figure that lagged behind the list it sits above would be
 * worse than showing nothing.
 */
export function allocateMonthFromTotals({
  income,
  limits,
  committed = 0,
  monthStart,
}: {
  income: number;
  limits: number;
  /** Uncovered recurring obligations; see `uncoveredCommitmentTotal`. */
  committed?: number;
  monthStart: string;
}): MonthAllocation {
  // Throws on a malformed month rather than silently reporting zero, which
  // would read as "nothing assigned" instead of "the question was invalid".
  budgetMonthKey(monthStart);

  if (
    !Number.isSafeInteger(income) ||
    !Number.isSafeInteger(limits) ||
    !Number.isSafeInteger(committed)
  ) {
    throw new Error("unsafe_allocation_input");
  }

  const allocated = limits + committed;
  if (!Number.isSafeInteger(allocated)) throw new Error("unsafe_allocated_total");

  const unassigned = income - allocated;
  if (!Number.isSafeInteger(unassigned)) {
    throw new Error("unsafe_unassigned_total");
  }

  const state: AllocationState =
    unassigned > 0 ? "unallocated" : unassigned < 0 ? "over" : "balanced";

  return { monthStart, income, limits, committed, allocated, unassigned, state };
}

export function allocateMonth({
  transactions,
  budgets,
  commitments = [],
  monthStart,
}: {
  transactions: Transaction[];
  budgets: BudgetSummary[];
  /** Must already be resolved for `monthStart`; see `uncoveredCommitmentTotal`. */
  commitments?: RecurringCommitment[];
  monthStart: string;
}): MonthAllocation {
  const monthPrefix = budgetMonthKey(monthStart);

  const limits = budgets
    .filter((budget) => budget.monthStart === monthStart)
    .reduce((sum, budget) => {
      const next = sum + budget.limit;
      if (!Number.isSafeInteger(next)) throw new Error("unsafe_allocated_total");
      return next;
    }, 0);

  return allocateMonthFromTotals({
    income: monthIncomeTotal(transactions, monthPrefix),
    limits,
    committed: uncoveredCommitmentTotal({ commitments, budgets, monthStart }),
    monthStart,
  });
}

/**
 * The sentence under the figure, stating the subtraction it came from.
 *
 * The figure is only worth showing if the reader can check it, so both operands
 * are named rather than implied. It reports and never advises: no wording here
 * may tell the reader what to do with the money.
 */
export function allocationExplanation(allocation: MonthAllocation): string {
  if (allocation.income === 0 && allocation.allocated === 0) {
    return "Chưa ghi thu nhập và chưa đặt hạn mức nào cho tháng này.";
  }

  const income = formatMoney(allocation.income);
  const limits = formatMoney(allocation.limits);

  /*
   * Bills are named separately from limits when they exist. Folding them into
   * one "allocated" total would hide the half the reader did not choose, and
   * the figure is only checkable if every operand is visible.
   */
  const claims =
    allocation.committed > 0
      ? `hạn mức ${limits} + cam kết chưa trả ${formatMoney(allocation.committed)}`
      : `hạn mức ${limits}`;

  if (allocation.state === "over") {
    return `${claims.charAt(0).toUpperCase()}${claims.slice(1)} nhiều hơn thu nhập đã ghi ${income}.`;
  }
  if (allocation.state === "balanced") {
    return `Thu nhập đã ghi ${income}, đã kín với ${claims}.`;
  }
  return `Thu nhập đã ghi ${income} − ${claims}.`;
}
