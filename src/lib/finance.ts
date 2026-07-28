import type { Transaction } from "@/lib/sample-data";

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
 * Reconcile an observed balance when the active client ledger differs from the
 * server snapshot that produced it. This covers hydration, optimistic writes,
 * edits, soft-delete and restore without applying any transaction twice.
 */
export function balanceAfterLedgerReplacement(
  observedBalance: number,
  observedTransactions: Transaction[],
  activeTransactions: Transaction[],
): number {
  if (!Number.isSafeInteger(observedBalance)) {
    throw new Error("unsafe_balance_total");
  }
  const balanceBeforeObservedLedger =
    observedBalance - netTransactionEffect(observedTransactions);
  if (!Number.isSafeInteger(balanceBeforeObservedLedger)) {
    throw new Error("unsafe_balance_total");
  }
  return balanceAfterTransactions(balanceBeforeObservedLedger, activeTransactions);
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
  /** Current VND account balance. It already includes every active ledger row. */
  totalBalance: number;
  /** ISO date used to select the observed calendar month. */
  today: string;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

function isValidIsoDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
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
  { totalBalance, today }: DashboardSummaryOptions,
) {
  if (!Number.isSafeInteger(totalBalance)) {
    throw new Error("invalid_dashboard_balance");
  }
  if (!isValidIsoDate(today)) {
    throw new Error("invalid_dashboard_date");
  }
  const monthPrefix = today.slice(0, 7);
  const periodTransactions = transactions.filter((item) => item.occurredOn.startsWith(monthPrefix));
  const income = sumTransactions(periodTransactions, (item) => item.kind === "income");
  const expense = sumTransactions(periodTransactions, (item) => item.kind === "expense");
  const net = income - expense;
  if (!Number.isSafeInteger(net)) {
    throw new Error("unsafe_dashboard_net");
  }

  return {
    balance: totalBalance,
    income,
    expense,
    net,
  };
}

export function calculateBudgetProgress(spent: number, budget: number) {
  if (!Number.isSafeInteger(spent) || !Number.isSafeInteger(budget) || budget <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((spent / budget) * 100)));
}
