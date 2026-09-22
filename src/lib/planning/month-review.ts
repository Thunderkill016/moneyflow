import {
  budgetEffectiveAvailable,
  budgetMonthKey,
  budgetRollover,
  type BudgetSummary,
} from "./budgets.ts";
import type { RecurringCommitment } from "./commitments.ts";

/*
 * Close-out facts for a budget month that has fully ended.
 *
 * PRODUCT_METRICS §8.2 asks plan-versus-actual to keep the *cause* of the
 * difference legible — income side, spending side, limit adherence and
 * recurring obligations each stay a separate, checkable number instead of
 * collapsing into one score. The CANON.md OECD/INFE guardrail forbids
 * grading the user, so this module returns counts and totals only: no score,
 * streak, verdict or generated advice.
 *
 * Two honesty rules shape the contract:
 *
 * 1. A review exists only once the month is strictly past, judged on the
 *    server-resolved Vietnam date. A month still in progress keeps the pace
 *    UI; printing close-out figures mid-month would dress a partial month up
 *    as a result.
 * 2. Each segment is independently nullable. A month with no budgets reports
 *    no "0/0" — the segment is withheld rather than asserting a fact about
 *    limits that never existed, and the same for months with no recurring
 *    obligation due.
 */

export type MonthReview = {
  /** Income recorded in the month, integer đồng. */
  income: number;
  /** Expense recorded in the month, integer đồng. Transfers never count. */
  expense: number;
  /** `income − expense` — signed; negative means the month spent more than it recorded earning. */
  net: number;
  /**
   * `within` of `total` viewed-month budgets closed at or under their
   * *effective* limit — prior under/overspend folded in through the same
   * rollover the cards show, so the strip can never disagree with a card
   * sitting directly below it.
   */
  budgets: { within: number; total: number } | null;
  /** `paid` of `total` active recurring obligations due in the month. */
  commitments: { paid: number; total: number } | null;
};

/**
 * True only when the viewed month has fully ended on the server-resolved
 * date. A malformed `today` cannot prove that, so it fails closed to "not
 * past" — the strip simply stays absent; a malformed `monthStart` throws via
 * `budgetMonthKey`, same as every other month-boundary caller.
 */
export function isPastBudgetMonth(monthStart: string, today: string): boolean {
  const viewedMonth = budgetMonthKey(monthStart);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return false;
  return viewedMonth < today.slice(0, 7);
}

export function buildMonthReview({
  monthStart,
  today,
  income,
  expense,
  budgets,
  priorBudgets,
  commitments,
}: {
  monthStart: string;
  /** Server-resolved Vietnam date (`YYYY-MM-DD`) — never a client clock. */
  today: string;
  /** Recorded month income, integer đồng (`monthIncome` from the workspace). */
  income: number;
  /** Recorded month expense, integer đồng (`monthExpense` from the workspace). */
  expense: number;
  /** The viewed month's budgets (live client state is fine — edits re-derive). */
  budgets: BudgetSummary[];
  /** Rollover-window history; see `budgetRollover`. */
  priorBudgets: Pick<
    BudgetSummary,
    "categoryId" | "monthStart" | "limit" | "spent"
  >[];
  /** Commitments already resolved for `monthStart` — `isPaid` is per-month. */
  commitments: RecurringCommitment[];
}): MonthReview | null {
  if (!isPastBudgetMonth(monthStart, today)) return null;
  if (!Number.isSafeInteger(income) || !Number.isSafeInteger(expense)) {
    throw new Error("invalid_month_review_money");
  }
  const net = income - expense;
  if (!Number.isSafeInteger(net)) throw new Error("unsafe_month_review_net");

  let budgetsWithin = 0;
  let budgetsTotal = 0;
  for (const budget of budgets) {
    if (budget.monthStart !== monthStart) continue;
    // A corrupt row is skipped rather than counted either way — asserting
    // "within" or "over" on unreadable numbers would both be fabrications.
    if (!Number.isSafeInteger(budget.limit) || !Number.isSafeInteger(budget.spent)) {
      continue;
    }
    const { carry } = budgetRollover({
      priorBudgets,
      categoryId: budget.categoryId,
      monthStart,
    });
    budgetsTotal += 1;
    if (budgetEffectiveAvailable(budget, carry) >= 0) budgetsWithin += 1;
  }

  /*
   * `dueDate` is resolved against the viewed month by `mapCommitmentRow`, so
   * the prefix filter only ever drops rows a caller hydrated for a different
   * month. Archived commitments stay excluded — the codebase-wide convention
   * (`commitmentTotals`, `uncoveredCommitmentTotal`) treats archive as "no
   * longer tracked", and there is no archived-at timestamp to prove the
   * obligation was live during the reviewed month.
   */
  const monthPrefix = monthStart.slice(0, 7);
  const due = commitments.filter(
    (item) => !item.isArchived && item.dueDate.startsWith(monthPrefix),
  );
  const paid = due.filter((item) => item.isPaid).length;

  return {
    income,
    expense,
    net,
    budgets: budgetsTotal > 0 ? { within: budgetsWithin, total: budgetsTotal } : null,
    commitments: due.length > 0 ? { paid, total: due.length } : null,
  };
}
