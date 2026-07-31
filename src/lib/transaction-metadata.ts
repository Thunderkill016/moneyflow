export const transactionSourceKinds = [
  "manual",
  "transfer",
  "split",
  "recurring_commitment",
  "recurring_income",
  "import",
] as const;

export type TransactionSourceKind = (typeof transactionSourceKinds)[number];
export type ClearingFilter = "all" | "cleared" | "uncleared";
export type TransactionClearingState = "uncleared" | "partial" | "cleared";

export type ClearingTransactionLike = {
  accountId: string;
  destinationAccountId?: string;
  clearedAccountIds: string[];
};

const sourceLabels: Record<TransactionSourceKind, string> = {
  manual: "Nhập tay",
  transfer: "Chuyển tiền",
  split: "Chia danh mục",
  recurring_commitment: "Lịch định kỳ",
  recurring_income: "Thu nhập định kỳ",
  import: "Nhập dữ liệu",
};

export function transactionSourceLabel(source: TransactionSourceKind) {
  return sourceLabels[source];
}

export function transactionAccountIds(transaction: ClearingTransactionLike) {
  return transaction.destinationAccountId
    ? [transaction.accountId, transaction.destinationAccountId]
    : [transaction.accountId];
}

export function isTransactionAccountCleared(
  transaction: ClearingTransactionLike,
  accountId: string,
) {
  return (
    transactionAccountIds(transaction).includes(accountId) &&
    transaction.clearedAccountIds.includes(accountId)
  );
}

export function transactionClearingState(
  transaction: ClearingTransactionLike,
): TransactionClearingState {
  const accountIds = transactionAccountIds(transaction);
  const clearedCount = accountIds.filter((accountId) =>
    transaction.clearedAccountIds.includes(accountId),
  ).length;
  if (clearedCount === 0) return "uncleared";
  return clearedCount === accountIds.length ? "cleared" : "partial";
}

export function setTransactionAccountCleared<T extends ClearingTransactionLike>(
  transaction: T,
  accountId: string,
  cleared: boolean,
): T {
  if (!transactionAccountIds(transaction).includes(accountId)) return transaction;
  const current = new Set(transaction.clearedAccountIds);
  if (cleared) current.add(accountId);
  else current.delete(accountId);
  return { ...transaction, clearedAccountIds: [...current] };
}

export function matchesClearingFilter(
  transaction: ClearingTransactionLike,
  accountId: string,
  filter: ClearingFilter,
) {
  if (filter === "all") return true;
  const isCleared = isTransactionAccountCleared(transaction, accountId);
  return filter === "cleared" ? isCleared : !isCleared;
}
