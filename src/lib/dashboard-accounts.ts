import type { Transaction } from "./transactions/contracts.ts";

/**
 * Per-account balance row for the dashboard statement. `balance` is integer
 * minor units in the row's own currency — VND rows sum to the ledger total;
 * foreign-currency rows are display-only and never merged into VND figures.
 */
export type AccountBalanceRow = {
  id: string;
  name: string;
  balance: number;
  currencyCode: string;
};

/** Signed effect of one transaction on a single account, in minor units. */
function accountEffect(transaction: Transaction, accountId: string): number {
  let delta = 0;
  if (transaction.kind === "income" && transaction.accountId === accountId) {
    delta += transaction.amount;
  }
  if (transaction.kind === "expense" && transaction.accountId === accountId) {
    delta -= transaction.amount;
  }
  if (transaction.kind === "transfer") {
    if (transaction.accountId === accountId) delta -= transaction.amount;
    if (transaction.destinationAccountId === accountId) {
      delta += transaction.amount;
    }
  }
  return delta;
}

function accountNetEffect(
  transactions: Transaction[],
  accountId: string,
): number {
  return transactions.reduce(
    (sum, item) => sum + accountEffect(item, accountId),
    0,
  );
}

/**
 * Replays the delta between the loader's snapshot and the live client
 * transaction list onto each account balance, so the per-account strip stays
 * consistent with `reconcileBalanceSnapshot` after an in-page save.
 */
export function reconcileAccountBalances(
  rows: AccountBalanceRow[],
  snapshotTransactions: Transaction[],
  liveTransactions: Transaction[],
): AccountBalanceRow[] {
  return rows.map((row) => {
    const next =
      row.balance +
      accountNetEffect(liveTransactions, row.id) -
      accountNetEffect(snapshotTransactions, row.id);
    if (!Number.isSafeInteger(next)) {
      throw new Error("unsafe_account_balance");
    }
    return { ...row, balance: next };
  });
}
