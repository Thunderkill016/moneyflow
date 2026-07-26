import type { Transaction } from "@/lib/sample-data";

/** Demo fixture only. Authenticated calculations must never be capped by it. */
export const DAILY_ALLOWANCE = 392_000;
export const OPENING_BALANCE = 1_126_000;
export const MONTHLY_EXPENSE_BEFORE_SAMPLE = 4_209_000;
export const FOOD_EXPENSE_BEFORE_SAMPLE = 2_697_000;

export function sumTransactions(
  transactions: Transaction[],
  predicate: (transaction: Transaction) => boolean,
) {
  return transactions
    .filter(predicate)
    .reduce((sum, transaction) => {
      const next = sum + transaction.amount;
      if (!Number.isSafeInteger(next)) throw new Error("unsafe_dashboard_total");
      return next;
    }, 0);
}

/**
 * Net effect of ledger rows on total assets (all accounts combined).
 * Income +, expense −, transfer 0 (moves money between own accounts).
 * Soft-deleted rows must be omitted from `transactions` before calling.
 */
export function netTransactionEffect(transactions: Transaction[]): number {
  let total = 0;
  for (const item of transactions) {
    if (item.kind === "income") total += item.amount;
    else if (item.kind === "expense") total -= item.amount;
    // transfer: no net change to total assets
    if (!Number.isSafeInteger(total)) throw new Error("unsafe_balance_total");
  }
  return total;
}

/**
 * Total balance after applying active transactions to an opening/total balance.
 * Pass only non-deleted rows (soft delete = exclude from list).
 */
export function balanceAfterTransactions(
  openingBalance: number,
  transactions: Transaction[],
): number {
  const next = openingBalance + netTransactionEffect(transactions);
  if (!Number.isSafeInteger(next)) {
    throw new Error("unsafe_balance_total");
  }
  return next;
}

/** Month expense total; transfers never count as expense. */
export function monthExpenseTotal(
  transactions: Transaction[],
  monthPrefix: string,
): number {
  return sumTransactions(
    transactions,
    (item) => item.kind === "expense" && item.occurredOn.startsWith(monthPrefix),
  );
}

type DashboardSummaryOptions = {
  isDemo?: boolean;
  /** Current VND account balance. It already includes every active ledger row. */
  totalBalance?: number;
  today?: string;
  /**
   * Remaining amount of a complete all-spending plan.
   * Category budgets are usually partial and must not be treated as this value.
   */
  remainingBudget?: number;
  /** Explicit trust gate for `remainingBudget`; false by default. */
  budgetPlanIsComplete?: boolean;
  reservedCommitments?: number;
  reservedSavings?: number;
  plannedDailySavings?: number;
};

export type DailySpendingGuideInput = {
  /** Current VND balance after today's posted/manual transactions. */
  currentBalance: number;
  /** Flexible expenses already recorded today; recurring commitments are excluded. */
  flexibleSpentToday: number;
  remainingDays: number;
  reservedCommitments?: number;
  reservedSavings?: number;
  plannedDailySavings?: number;
  /** Optional complete all-spending plan, never a sum of partial category budgets. */
  completePlanRemaining?: number;
};

export type DailySpendingGuide = {
  safeToday: number;
  dailyAllowance: number;
  spendableBalance: number;
};

function requireSafeInteger(value: number, code: string) {
  if (!Number.isSafeInteger(value)) throw new Error(code);
  return value;
}

/**
 * Calculate a stable allowance for the current calendar day.
 *
 * `currentBalance` already reflects today's expenses. Adding back only today's
 * flexible expenses reconstructs the start-of-day base; subtracting those same
 * expenses after division then counts them exactly once. Recurring payments are
 * excluded because releasing their matching reservation already offsets their
 * balance effect.
 */
export function calculateDailySpendingGuide({
  currentBalance,
  flexibleSpentToday,
  remainingDays,
  reservedCommitments = 0,
  reservedSavings = 0,
  plannedDailySavings = 0,
  completePlanRemaining,
}: DailySpendingGuideInput): DailySpendingGuide {
  requireSafeInteger(currentBalance, "invalid_current_balance");
  requireSafeInteger(flexibleSpentToday, "invalid_today_expense");
  requireSafeInteger(remainingDays, "invalid_remaining_days");
  requireSafeInteger(reservedCommitments, "invalid_reserved_commitments");
  requireSafeInteger(reservedSavings, "invalid_reserved_savings");
  requireSafeInteger(plannedDailySavings, "invalid_planned_daily_savings");
  if (completePlanRemaining !== undefined) {
    requireSafeInteger(completePlanRemaining, "invalid_complete_plan_remaining");
  }
  if (flexibleSpentToday < 0 || remainingDays <= 0) {
    throw new Error("invalid_daily_spending_guide_input");
  }

  const rawSpendableNow =
    currentBalance - Math.max(0, reservedCommitments) - Math.max(0, reservedSavings);
  const spendableBalance = Math.max(0, rawSpendableNow);
  const startOfDaySpendable = Math.max(0, rawSpendableNow + flexibleSpentToday);
  requireSafeInteger(startOfDaySpendable, "unsafe_start_of_day_balance");

  const balanceAllowance = Math.floor(startOfDaySpendable / remainingDays);
  const allowanceBeforeSavings =
    completePlanRemaining === undefined
      ? balanceAllowance
      : Math.min(
          balanceAllowance,
          Math.floor((Math.max(0, completePlanRemaining) + flexibleSpentToday) / remainingDays),
        );
  const dailyAllowance = Math.max(
    0,
    allowanceBeforeSavings - Math.max(0, plannedDailySavings),
  );
  const safeToday = Math.max(0, dailyAllowance - flexibleSpentToday);

  return { safeToday, dailyAllowance, spendableBalance };
}

export type CategoryShare = {
  name: string;
  amount: number;
  /** 0–100 share of month expense (integer). */
  share: number;
};

/** Top expense categories for the month of `today`. Transfers never count. Split lines expanded. */
export function topExpenseCategories(
  transactions: Transaction[],
  { today = "2026-07-14", limit = 5 }: { today?: string; limit?: number } = {},
): CategoryShare[] {
  const monthPrefix = today.slice(0, 7);
  const totals = new Map<string, number>();
  let expense = 0;
  for (const item of transactions) {
    if (item.kind !== "expense" || !item.occurredOn.startsWith(monthPrefix)) continue;
    if (!Number.isSafeInteger(item.amount) || item.amount <= 0) continue;
    const parts =
      item.splits && item.splits.length >= 2
        ? item.splits
            .filter((line) => Number.isSafeInteger(line.amount) && line.amount > 0 && line.category)
            .map((line) => ({ name: line.category, amount: line.amount }))
        : [{ name: item.category, amount: item.amount }];
    for (const part of parts) {
      const next = (totals.get(part.name) ?? 0) + part.amount;
      if (!Number.isSafeInteger(next)) continue;
      totals.set(part.name, next);
    }
    expense += item.amount;
  }
  if (!Number.isSafeInteger(expense)) expense = 0;
  return [...totals.entries()]
    .map(([name, amount]) => ({
      name,
      amount,
      share: expense > 0 ? Math.min(100, Math.max(0, Math.round((amount / expense) * 100))) : 0,
    }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "vi"))
    .slice(0, Math.max(0, limit));
}

export function calculateDashboardSummary(
  transactions: Transaction[],
  options: DashboardSummaryOptions = {},
) {
  const {
    isDemo = true,
    totalBalance = 0,
    today = "2026-07-14",
    reservedCommitments = 0,
    reservedSavings = 0,
    plannedDailySavings = 0,
    budgetPlanIsComplete = false,
  } = options;
  const monthPrefix = today.slice(0, 7);
  const periodTransactions = transactions.filter((item) => item.occurredOn.startsWith(monthPrefix));
  const income = sumTransactions(periodTransactions, (item) => item.kind === "income");
  const recordedExpense = sumTransactions(periodTransactions, (item) => item.kind === "expense");
  const todayFlexibleExpense = sumTransactions(
    periodTransactions,
    (item) =>
      item.kind === "expense" &&
      item.occurredOn === today &&
      !item.isRecurringPayment,
  );
  const foodExpense = periodTransactions.reduce((sum, item) => {
    if (item.kind !== "expense") return sum;
    if (item.splits && item.splits.length >= 2) {
      const part = item.splits
        .filter((line) => line.category === "Ăn uống" && Number.isSafeInteger(line.amount))
        .reduce((s, line) => s + line.amount, 0);
      return sum + part;
    }
    return item.category === "Ăn uống" ? sum + item.amount : sum;
  }, 0);
  const todayDate = new Date(`${today}T00:00:00.000Z`);
  const dayOfMonth = todayDate.getUTCDate();
  const daysInMonth = new Date(
    Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const remainingDays = Math.max(1, daysInMonth - dayOfMonth + 1);

  if (isDemo) {
    const reservedTotal = Math.max(0, reservedCommitments) + Math.max(0, reservedSavings);
    const demoBalance = OPENING_BALANCE + income - recordedExpense;
    const demoStartOfDayBalance = Math.max(
      0,
      demoBalance - reservedTotal + todayFlexibleExpense,
    );
    const demoBalanceAllowance = Math.floor(demoStartOfDayBalance / remainingDays);
    const demoDailyAllowance =
      reservedTotal > 0 || plannedDailySavings > 0
        ? Math.max(
            0,
            Math.min(DAILY_ALLOWANCE, demoBalanceAllowance) -
              Math.max(0, plannedDailySavings),
          )
        : DAILY_ALLOWANCE;
    const expense = MONTHLY_EXPENSE_BEFORE_SAMPLE + recordedExpense;
    return {
      income,
      expense,
      net: income - expense,
      balance: demoBalance,
      safeToday: Math.max(0, demoDailyAllowance - todayFlexibleExpense),
      dailyAllowance: demoDailyAllowance,
      forecast: Math.max(
        0,
        1_955_000 - Math.max(0, recordedExpense - 391_000) - reservedTotal,
      ),
      foodExpense: FOOD_EXPENSE_BEFORE_SAMPLE + foodExpense,
    };
  }

  const guide = calculateDailySpendingGuide({
    currentBalance: totalBalance,
    flexibleSpentToday: todayFlexibleExpense,
    remainingDays,
    reservedCommitments,
    reservedSavings,
    plannedDailySavings,
    completePlanRemaining:
      budgetPlanIsComplete && options.remainingBudget !== undefined
        ? options.remainingBudget
        : undefined,
  });
  const averageDailyExpense = Math.round(recordedExpense / Math.max(1, dayOfMonth));

  return {
    income,
    expense: recordedExpense,
    net: income - recordedExpense,
    balance: totalBalance,
    safeToday: guide.safeToday,
    dailyAllowance: guide.dailyAllowance,
    forecast: Math.max(
      0,
      guide.spendableBalance - averageDailyExpense * Math.max(0, remainingDays - 1),
    ),
    foodExpense,
  };
}

export function calculateBudgetProgress(spent: number, budget: number) {
  if (!Number.isSafeInteger(spent) || !Number.isSafeInteger(budget) || budget <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((spent / budget) * 100)));
}
