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
  totalBalance?: number;
  today?: string;
  remainingBudget?: number;
  reservedCommitments?: number;
  reservedSavings?: number;
  plannedDailySavings?: number;
};

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
  { isDemo = true, totalBalance = 0, today = "2026-07-14", remainingBudget, reservedCommitments = 0, reservedSavings = 0, plannedDailySavings = 0 }: DashboardSummaryOptions = {},
) {
  const monthPrefix = today.slice(0, 7);
  const periodTransactions = transactions.filter((item) => item.occurredOn.startsWith(monthPrefix));
  const income = sumTransactions(periodTransactions, (item) => item.kind === "income");
  const recordedExpense = sumTransactions(periodTransactions, (item) => item.kind === "expense");
  const todayExpense = sumTransactions(
    periodTransactions,
    (item) => item.kind === "expense" && item.occurredOn === today,
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
  const daysInMonth = new Date(Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth() + 1, 0)).getUTCDate();
  const remainingDays = Math.max(1, daysInMonth - dayOfMonth + 1);

  if (isDemo) {
    const reservedTotal = Math.max(0, reservedCommitments) + Math.max(0, reservedSavings);
    const demoBalance = OPENING_BALANCE + income - recordedExpense;
    const demoBalanceAllowance = Math.floor(Math.max(0, demoBalance - reservedTotal) / remainingDays);
    const demoDailyAllowance = reservedTotal > 0 || plannedDailySavings > 0
      ? Math.max(0, Math.min(DAILY_ALLOWANCE, demoBalanceAllowance) - Math.max(0, plannedDailySavings))
      : DAILY_ALLOWANCE;
    const expense = MONTHLY_EXPENSE_BEFORE_SAMPLE + recordedExpense;
    return {
      income,
      expense,
      net: income - expense,
      balance: demoBalance,
      safeToday: Math.max(0, demoDailyAllowance - todayExpense),
      dailyAllowance: demoDailyAllowance,
      forecast: Math.max(0, 1_955_000 - Math.max(0, recordedExpense - 391_000) - reservedTotal),
      foodExpense: FOOD_EXPENSE_BEFORE_SAMPLE + foodExpense,
    };
  }

  const spendableBalance = Math.max(0, totalBalance - reservedCommitments - reservedSavings);
  const balanceBasedAllowance = Math.floor(spendableBalance / remainingDays);
  const allowanceBeforeSavings = remainingBudget === undefined
    ? balanceBasedAllowance
    : Math.min(
        balanceBasedAllowance,
        Math.floor(Math.max(0, remainingBudget) / remainingDays),
      );
  const dailyAllowance = Math.max(
    0,
    allowanceBeforeSavings - Math.max(0, plannedDailySavings),
  );
  const averageDailyExpense = Math.round(recordedExpense / Math.max(1, dayOfMonth));

  return {
    income,
    expense: recordedExpense,
    net: income - recordedExpense,
    balance: totalBalance,
    safeToday: Math.max(0, dailyAllowance - todayExpense),
    dailyAllowance,
    forecast: Math.max(0, spendableBalance - averageDailyExpense * Math.max(0, remainingDays - 1)),
    foodExpense,
  };
}

export function calculateBudgetProgress(spent: number, budget: number) {
  if (!Number.isSafeInteger(spent) || !Number.isSafeInteger(budget) || budget <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((spent / budget) * 100)));
}
