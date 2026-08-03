import type { Transaction } from "./transactions/contracts.ts";
import { sampleTransactions } from "./demo/transaction-fixtures.ts";
import { isSplitLine, sumSplitAmounts } from "./splits.ts";
import { getTransactionReviewStatus } from "./transaction-review.ts";

export const TRANSACTION_STORAGE_KEY = "moneyflow-demo-transactions-v1";

export function isTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Transaction>;
  const baseOk =
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
    (item.reviewStatus === undefined ||
      item.reviewStatus === "needs_review" ||
      item.reviewStatus === "reviewed") &&
    (item.kind !== "transfer" || (
      typeof item.destinationAccountId === "string" &&
      typeof item.destinationAccount === "string" &&
      item.destinationAccountId !== item.accountId
    ));
  if (!baseOk) return false;

  if (item.splits === undefined) return true;
  if (!Array.isArray(item.splits) || item.splits.length < 2) return false;
  if (item.kind !== "expense") return false;
  if (!item.splits.every(isSplitLine)) return false;
  return sumSplitAmounts(item.splits) === item.amount;
}

function withNormalizedReviewStatus(transaction: Transaction): Transaction {
  return {
    ...transaction,
    reviewStatus: getTransactionReviewStatus(transaction),
  };
}

function normalizedSampleTransactions() {
  return sampleTransactions.map(withNormalizedReviewStatus);
}

export function readStoredTransactions() {
  try {
    const saved = localStorage.getItem(TRANSACTION_STORAGE_KEY);
    if (!saved) return normalizedSampleTransactions();
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.every(isTransaction)
      ? parsed.map(withNormalizedReviewStatus)
      : normalizedSampleTransactions();
  } catch {
    localStorage.removeItem(TRANSACTION_STORAGE_KEY);
    return normalizedSampleTransactions();
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
  return [withNormalizedReviewStatus(restored), ...current];
}
