import type { Transaction } from "@/lib/sample-data";

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
    .reduce((sum, transaction) => sum + transaction.amount, 0);
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

/** Top expense categories for the month of `today`. Transfers never count. */
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
    const next = (totals.get(item.category) ?? 0) + item.amount;
    if (!Number.isSafeInteger(next)) continue;
    totals.set(item.category, next);
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
  const foodExpense = sumTransactions(
    periodTransactions,
    (item) => item.kind === "expense" && item.category === "Ăn uống",
  );
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
  const budgetBasedAllowance = remainingBudget === undefined
    ? Number.MAX_SAFE_INTEGER
    : Math.floor(Math.max(0, remainingBudget) / remainingDays);
  const dailyAllowance = Math.max(0, Math.min(DAILY_ALLOWANCE, balanceBasedAllowance, budgetBasedAllowance) - Math.max(0, plannedDailySavings));
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
