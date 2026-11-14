import { convertToVnd, type Account } from "../schema/account.schema.ts";
import type { Transaction } from "../schema/transaction.schema.ts";

export interface NetWorthSummary {
  liquidVnd: number;
  investmentVnd: number;
  debtVnd: number;
  debtLiabilityVnd: number;
  netWorthVnd: number;
}

export interface ReconcileResult {
  delta: number;
  transaction: Transaction | null;
}

export function computeAccountBalances(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
): Account[] {
  const balances = new Map<string, number>();
  for (const account of accounts) {
    balances.set(account.id, account.initialBalance);
  }

  const activeOrdered = transactions
    .filter((tx) => tx.syncStatus !== "DELETED")
    .slice()
    .sort((a, b) => a.occurredAt - b.occurredAt || a.updatedAt - b.updatedAt);

  for (const tx of activeOrdered) {
    if (tx.type === "INCOME") {
      if (balances.has(tx.accountId)) {
        balances.set(tx.accountId, (balances.get(tx.accountId) ?? 0) + tx.amount);
      }
      continue;
    }

    if (tx.type === "EXPENSE") {
      if (balances.has(tx.accountId)) {
        balances.set(tx.accountId, (balances.get(tx.accountId) ?? 0) - tx.amount);
      }
      continue;
    }

    if (tx.type === "TRANSFER") {
      if (balances.has(tx.accountId)) {
        balances.set(tx.accountId, (balances.get(tx.accountId) ?? 0) - tx.amount);
      }
      if (tx.toAccountId && balances.has(tx.toAccountId)) {
        balances.set(
          tx.toAccountId,
          (balances.get(tx.toAccountId) ?? 0) + tx.amount,
        );
      }
      continue;
    }

    if (tx.type === "RECONCILE") {
      if (balances.has(tx.accountId)) {
        const signedDelta = tx.reconcileDelta ?? tx.amount;
        balances.set(
          tx.accountId,
          (balances.get(tx.accountId) ?? 0) + signedDelta,
        );
      }
    }
  }

  return accounts.map((account) => ({
    ...account,
    currentBalance: balances.get(account.id) ?? account.initialBalance,
  }));
}

export function computeNetWorthSummary(
  accounts: readonly Account[],
): NetWorthSummary {
  let liquidVnd = 0;
  let investmentVnd = 0;
  let debtVnd = 0;
  let debtLiabilityVnd = 0;

  for (const account of accounts) {
    if (account.isArchived) continue;
    const vndValue = convertToVnd(account.currentBalance, account.currency);
    if (account.group === "LIQUID") {
      liquidVnd += vndValue;
    } else if (account.group === "INVESTMENT") {
      investmentVnd += vndValue;
    } else {
      debtVnd += vndValue;
      if (vndValue < 0) {
        debtLiabilityVnd += Math.abs(vndValue);
      }
    }
  }

  return {
    liquidVnd,
    investmentVnd,
    debtVnd,
    debtLiabilityVnd,
    netWorthVnd: liquidVnd + investmentVnd + debtVnd,
  };
}

export function createReconcileTransaction(params: {
  id: string;
  account: Account;
  actualBalance: number;
  now?: number;
  note?: string;
}): ReconcileResult {
  const now = params.now ?? Date.now();
  const delta = params.actualBalance - params.account.currentBalance;

  if (delta === 0) {
    return { delta: 0, transaction: null };
  }

  return {
    delta,
    transaction: {
      id: params.id,
      type: "RECONCILE",
      amount: Math.abs(delta),
      reconcileDelta: delta,
      accountId: params.account.id,
      categoryId: "khop-so-du",
      note:
        params.note?.trim() ||
        `Khớp số dư ${params.account.name} (${delta > 0 ? "+" : "-"}${Math.abs(delta)})`,
      occurredAt: now,
      syncStatus: "PENDING",
      updatedAt: now,
    },
  };
}

export function createTransferTransaction(params: {
  id: string;
  fromAccount: Account;
  toAccount: Account;
  amount: number;
  note?: string;
  occurredAt?: number;
  now?: number;
}): Transaction {
  if (params.fromAccount.id === params.toAccount.id) {
    throw new Error("Source and destination accounts must differ.");
  }
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }
  const now = params.now ?? Date.now();
  const isInvestmentTransfer = params.toAccount.group === "INVESTMENT";

  return {
    id: params.id,
    type: "TRANSFER",
    amount: Math.round(params.amount),
    accountId: params.fromAccount.id,
    toAccountId: params.toAccount.id,
    categoryId: isInvestmentTransfer ? "tich-luy" : "chuyen-vi",
    note:
      params.note?.trim() ||
      (isInvestmentTransfer
        ? `Tích lũy vào ${params.toAccount.name}`
        : `Chuyển ${params.fromAccount.name} → ${params.toAccount.name}`),
    occurredAt: params.occurredAt ?? now,
    syncStatus: "PENDING",
    updatedAt: now,
  };
}
