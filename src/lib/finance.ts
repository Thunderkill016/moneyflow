import type { Transaction } from "@/lib/sample-data";

export const OPENING_BALANCE = 1_126_000;
export const MONTHLY_EXPENSE_BEFORE_SAMPLE = 4_209_000;

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

/**
 * Reconcile a server/demo balance snapshot with the current client ledger.
 * The snapshot already includes `snapshotTransactions`, so only their net delta
 * against `liveTransactions` is applied. Re-running with the same lists is stable.
 */
export function reconcileBalanceSnapshot(
  snapshotBalance: number,
  snapshotTransactions: Transaction[],
  liveTransactions: Transaction[],
): number {
  if (!Number.isSafeInteger(snapshotBalance)) {
    throw new Error("invalid_balance_snapshot");
  }
  const next =
    snapshotBalance +
    netTransactionEffect(liveTransactions) -
    netTransactionEffect(snapshotTransactions);
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
};

function requireSafeInteger(value: number, code: string) {
  if (!Number.isSafeInteger(value)) throw new Error(code);
  return value;
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

/**
 * Factual dashboard totals derived from the active ledger and current balance.
 * Planning inputs remain separate and must not be converted into spending advice here.
 */
export function calculateDashboardSummary(
  transactions: Transaction[],
  options: DashboardSummaryOptions = {},
) {
  const { isDemo = true, today = "2026-07-14" } = options;
  const currentBalance =
    options.totalBalance ??
    (isDemo ? balanceAfterTransactions(OPENING_BALANCE, transactions) : 0);
  requireSafeInteger(currentBalance, "invalid_current_balance");

  const monthPrefix = today.slice(0, 7);
  const periodTransactions = transactions.filter((item) => item.occurredOn.startsWith(monthPrefix));
  const income = sumTransactions(periodTransactions, (item) => item.kind === "income");
  const recordedExpense = sumTransactions(periodTransactions, (item) => item.kind === "expense");
  const expense = isDemo
    ? MONTHLY_EXPENSE_BEFORE_SAMPLE + recordedExpense
    : recordedExpense;

  return {
    income,
    expense,
    net: income - expense,
    balance: currentBalance,
  };
}

export function calculateBudgetProgress(spent: number, budget: number) {
  if (!Number.isSafeInteger(spent) || !Number.isSafeInteger(budget) || budget <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((spent / budget) * 100)));
}
