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

export function safeDivide(
  numerator: number,
  denominator: number,
  fallback = 0,
): number {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator === 0
  ) {
    return fallback;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

function foldVietnamese(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/gu, "d")
    .replace(/Đ/gu, "d")
    .toLowerCase();
}

export function computeTransactionFingerprint(params: {
  occurredAt: number;
  type: Transaction["type"];
  amount: number;
  note: string;
  accountId?: string;
}): string {
  const dateObj = new Date(params.occurredAt);
  const dateKey = Number.isNaN(dateObj.getTime())
    ? "1970-01-01"
    : `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
  const cleanNote = foldVietnamese(params.note)
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
  const payload = `${dateKey}|${params.type}|${Math.round(Math.abs(params.amount))}|${params.accountId ?? ""}|${cleanNote}`;

  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < payload.length; i += 1) {
    const code = payload.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `fp_${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}

export function attachTransactionFingerprint(tx: Transaction): Transaction {
  if (tx.fingerprint) return tx;
  return {
    ...tx,
    fingerprint: computeTransactionFingerprint({
      occurredAt: tx.occurredAt,
      type: tx.type,
      amount: tx.amount,
      note: tx.note,
      accountId: tx.accountId,
    }),
  };
}

export function deduplicateTransactions(
  incoming: readonly Transaction[],
  existing: readonly Transaction[],
): {
  unique: Transaction[];
  skippedCount: number;
} {
  const seenIds = new Set(existing.map((tx) => tx.id));
  const seenFps = new Set(
    existing.map((tx) => attachTransactionFingerprint(tx).fingerprint!),
  );
  const unique: Transaction[] = [];
  let skippedCount = 0;

  for (const rawTx of incoming) {
    const tx = attachTransactionFingerprint(rawTx);
    if (seenIds.has(tx.id) || seenFps.has(tx.fingerprint!)) {
      skippedCount += 1;
      continue;
    }
    seenIds.add(tx.id);
    seenFps.add(tx.fingerprint!);
    unique.push(tx);
  }

  return { unique, skippedCount };
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
    .filter((tx) => tx.syncStatus !== "DELETED" && !tx.deletedAt)
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
