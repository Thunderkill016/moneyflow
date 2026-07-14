import { sampleTransactions, type Transaction } from "./sample-data.ts";

export const TRANSACTION_STORAGE_KEY = "moneyflow-demo-transactions-v1";

export function isTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Transaction>;
  return (
    typeof item.id === "string" &&
    (item.kind === "expense" || item.kind === "income" || item.kind === "transfer") &&
    typeof item.categoryId === "string" &&
    typeof item.category === "string" &&
    typeof item.note === "string" &&
    typeof item.accountId === "string" &&
    typeof item.account === "string" &&
    typeof item.amount === "number" &&
    Number.isSafeInteger(item.amount) &&
    item.amount > 0 &&
    typeof item.occurredOn === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.occurredOn) &&
    typeof item.occurredAt === "string" &&
    Number.isFinite(Date.parse(item.occurredAt)) &&
    typeof item.relativeDate === "string" &&
    (item.isRecurringPayment === undefined || typeof item.isRecurringPayment === "boolean") &&
    (item.kind !== "transfer" || (
      typeof item.destinationAccountId === "string" &&
      typeof item.destinationAccount === "string" &&
      item.destinationAccountId !== item.accountId
    ))
  );
}

export function readStoredTransactions() {
  try {
    const saved = localStorage.getItem(TRANSACTION_STORAGE_KEY);
    if (!saved) return sampleTransactions;
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.every(isTransaction) ? parsed : sampleTransactions;
  } catch {
    localStorage.removeItem(TRANSACTION_STORAGE_KEY);
    return sampleTransactions;
  }
}

export function writeStoredTransactions(transactions: Transaction[]) {
  localStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(transactions));
}

/**
 * Re-insert a soft-deleted transaction for undo.
 * No-op if the id is already present (idempotent restore).
 */
export function restoreTransactionInList(
  current: Transaction[],
  restored: Transaction,
): Transaction[] {
  if (current.some((item) => item.id === restored.id)) return current;
  return [restored, ...current];
}
