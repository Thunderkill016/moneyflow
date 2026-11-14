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

export function createSmartSplitTransactions(params: {
  idPrefix: string;
  payerAccount: Account;
  receivableAccount: Account;
  totalBill: number;
  headcount: number;
  categoryId: string;
  note: string;
  occurredAt?: number;
  now?: number;
}): {
  expenseTx: Transaction;
  receivableTransferTx: Transaction;
} {
  const totalBill = Math.round(params.totalBill);
  const headcount = Math.max(2, Math.min(100, Math.round(params.headcount)));
  if (!Number.isFinite(totalBill) || totalBill <= 0) {
    throw new Error("Total bill must be greater than zero.");
  }
  if (params.payerAccount.id === params.receivableAccount.id) {
    throw new Error("Payer account and receivable account must differ.");
  }

  const now = params.now ?? Date.now();
  const occurredAt = params.occurredAt ?? now;
  const myShare = Math.round(totalBill / headcount);
  const receivableAmount = Math.max(0, totalBill - myShare);
  const cleanNote = params.note.trim() || "Chia bill nhóm";

  const expenseTx: Transaction = {
    id: `${params.idPrefix}-exp`,
    type: "EXPENSE",
    amount: myShare,
    accountId: params.payerAccount.id,
    categoryId: params.categoryId,
    note: `${cleanNote} (Phần mình 1/${headcount})`,
    occurredAt,
    syncStatus: "PENDING",
    updatedAt: now,
    splitInfo: {
      totalBill,
      headcount,
      myShare,
      receivableAmount,
      isSettled: false,
    },
  };

  const receivableTransferTx: Transaction = {
    id: `${params.idPrefix}-recv`,
    type: "TRANSFER",
    amount: receivableAmount,
    accountId: params.payerAccount.id,
    toAccountId: params.receivableAccount.id,
    categoryId: "chuyen-vi",
    note: `Ứng hộ ${headcount - 1} người: ${cleanNote}`,
    occurredAt: occurredAt + 1,
    syncStatus: "PENDING",
    updatedAt: now,
  };

  return { expenseTx, receivableTransferTx };
}

export function settleSmartSplitTransaction(params: {
  settleId: string;
  expenseTx: Transaction;
  receivableAccountId: string;
  targetLiquidAccountId: string;
  now?: number;
}): {
  updatedExpenseTx: Transaction;
  repaymentTransferTx: Transaction | null;
} {
  const split = params.expenseTx.splitInfo;
  if (!split || split.isSettled) {
    return {
      updatedExpenseTx: params.expenseTx,
      repaymentTransferTx: null,
    };
  }

  const now = params.now ?? Date.now();
  const updatedExpenseTx: Transaction = {
    ...params.expenseTx,
    syncStatus: "PENDING",
    updatedAt: now,
    splitInfo: {
      ...split,
      isSettled: true,
      settleTransferId: params.settleId,
    },
  };

  if (
    split.receivableAmount <= 0 ||
    params.receivableAccountId === params.targetLiquidAccountId
  ) {
    return {
      updatedExpenseTx,
      repaymentTransferTx: null,
    };
  }

  const repaymentTransferTx: Transaction = {
    id: params.settleId,
    type: "TRANSFER",
    amount: split.receivableAmount,
    accountId: params.receivableAccountId,
    toAccountId: params.targetLiquidAccountId,
    categoryId: "chuyen-vi",
    note: `Thu hồi tiền ứng hộ: ${params.expenseTx.note}`,
    occurredAt: now,
    syncStatus: "PENDING",
    updatedAt: now,
  };

  return {
    updatedExpenseTx,
    repaymentTransferTx,
  };
}
