import type { Transaction } from "./sample-data.ts";

export type AccountKind = "cash" | "bank" | "e_wallet" | "credit_card" | "savings";

export type AccountSummary = {
  id: string;
  name: string;
  kind: AccountKind;
  currencyCode: string;
  initialBalance: number;
  balance: number;
  isArchived: boolean;
};

export type SaveAccountInput = {
  id?: string;
  name: string;
  kind: AccountKind;
  /** ISO 4217; only applied on create (currency is immutable after). */
  currencyCode?: string;
  initialBalance: number;
};

export const accountKindLabels: Record<AccountKind, string> = {
  cash: "Tiền mặt",
  bank: "Ngân hàng",
  e_wallet: "Ví điện tử",
  credit_card: "Thẻ tín dụng",
  savings: "Tiết kiệm",
};

function accountEffects(transactions: Transaction[]) {
  const effects = new Map<string, number>();
  const add = (accountId: string, amount: number) => {
    const next = (effects.get(accountId) ?? 0) + amount;
    if (!Number.isSafeInteger(next)) {
      throw new Error("unsafe_account_balance");
    }
    effects.set(accountId, next);
  };

  for (const transaction of transactions) {
    if (!Number.isSafeInteger(transaction.amount) || transaction.amount <= 0) {
      throw new Error("invalid_transaction_amount");
    }
    if (transaction.kind === "income") {
      add(transaction.accountId, transaction.amount);
    } else if (transaction.kind === "expense") {
      add(transaction.accountId, -transaction.amount);
    } else {
      if (!transaction.destinationAccountId) {
        throw new Error("invalid_transfer_destination");
      }
      add(transaction.accountId, -transaction.amount);
      add(transaction.destinationAccountId, transaction.amount);
    }
  }
  return effects;
}

/**
 * Reconcile account-level balances with the same active ledger used by the
 * dashboard. The supplied balances are the observed server snapshot and
 * `observedTransactions` are the rows already reflected in that snapshot.
 */
export function accountBalancesAfterLedgerReplacement(
  accounts: AccountSummary[],
  observedTransactions: Transaction[],
  activeTransactions: Transaction[],
): AccountSummary[] {
  const observedEffects = accountEffects(observedTransactions);
  const activeEffects = accountEffects(activeTransactions);

  return accounts.map((account) => {
    const balanceBeforeObservedLedger =
      account.balance - (observedEffects.get(account.id) ?? 0);
    const balance =
      balanceBeforeObservedLedger + (activeEffects.get(account.id) ?? 0);
    if (
      !Number.isSafeInteger(balanceBeforeObservedLedger) ||
      !Number.isSafeInteger(balance)
    ) {
      throw new Error("unsafe_account_balance");
    }
    return { ...account, balance };
  });
}
