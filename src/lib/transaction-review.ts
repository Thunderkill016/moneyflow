import type {
  CategoryOption,
  Transaction,
  TransactionKind,
  TransactionReviewStatus,
} from "./transactions/contracts.ts";
import { isSplitExpense } from "./splits.ts";

export const DEFAULT_TRANSACTION_REVIEW_STATUS: TransactionReviewStatus = "reviewed";

export function getTransactionReviewStatus(
  transaction: Pick<Transaction, "reviewStatus">,
): TransactionReviewStatus {
  return transaction.reviewStatus ?? DEFAULT_TRANSACTION_REVIEW_STATUS;
}

export function normalizeTransactionIds(ids: readonly string[]) {
  return [...new Set(ids.filter((id) => id.length > 0))];
}

type BulkSelectionSuccess = {
  ok: true;
  ids: string[];
  transactions: Transaction[];
  kind: TransactionKind;
};

type BulkSelectionFailure = {
  ok: false;
  message: string;
};

export type BulkCategorySelectionResult =
  | BulkSelectionSuccess
  | BulkSelectionFailure;

export function evaluateBulkCategorySelection(
  transactions: readonly Transaction[],
  ids: readonly string[],
): BulkCategorySelectionResult {
  const normalizedIds = normalizeTransactionIds(ids);
  if (normalizedIds.length === 0) {
    return { ok: false, message: "Chọn ít nhất một giao dịch để đổi danh mục." };
  }
  if (normalizedIds.length > 100) {
    return { ok: false, message: "Mỗi lần chỉ sửa tối đa 100 giao dịch." };
  }

  const selectedById = new Map(
    transactions
      .filter((transaction) => normalizedIds.includes(transaction.id))
      .map((transaction) => [transaction.id, transaction]),
  );
  if (selectedById.size !== normalizedIds.length) {
    return {
      ok: false,
      message: "Một số giao dịch đã thay đổi hoặc không còn trong sổ.",
    };
  }

  const selected = normalizedIds.map((id) => selectedById.get(id)!);
  if (selected.some((transaction) => transaction.kind === "transfer")) {
    return {
      ok: false,
      message: "Không đổi danh mục hàng loạt cho giao dịch chuyển tiền.",
    };
  }
  if (selected.some((transaction) => transaction.isRecurringPayment)) {
    return {
      ok: false,
      message: "Khoản định kỳ phải được quản lý tại trang Định kỳ tương ứng.",
    };
  }
  if (selected.some(isSplitExpense)) {
    return {
      ok: false,
      message: "Khoản chia danh mục cần được sửa theo từng dòng ở một tác vụ riêng.",
    };
  }

  const kinds = new Set(selected.map((transaction) => transaction.kind));
  if (kinds.size !== 1) {
    return {
      ok: false,
      message: "Chỉ đổi danh mục cho một nhóm cùng loại thu hoặc chi.",
    };
  }

  const kind = selected[0]?.kind;
  if (kind !== "income" && kind !== "expense") {
    return {
      ok: false,
      message: "Nhóm giao dịch này không hỗ trợ đổi danh mục hàng loạt.",
    };
  }

  return {
    ok: true,
    ids: normalizedIds,
    transactions: selected,
    kind,
  };
}

export function applyBulkReviewStatus(
  transactions: readonly Transaction[],
  ids: readonly string[],
  reviewStatus: TransactionReviewStatus,
) {
  const normalizedIds = normalizeTransactionIds(ids);
  if (normalizedIds.length === 0 || normalizedIds.length > 100) {
    return {
      ok: false as const,
      message:
        normalizedIds.length > 100
          ? "Mỗi lần chỉ cập nhật tối đa 100 giao dịch."
          : "Chọn ít nhất một giao dịch.",
    };
  }
  const existingIds = new Set(transactions.map((transaction) => transaction.id));
  if (normalizedIds.some((id) => !existingIds.has(id))) {
    return {
      ok: false as const,
      message: "Một số giao dịch đã thay đổi hoặc không còn trong sổ.",
    };
  }
  const selectedIds = new Set(normalizedIds);
  return {
    ok: true as const,
    updatedIds: normalizedIds,
    transactions: transactions.map((transaction) =>
      selectedIds.has(transaction.id)
        ? { ...transaction, reviewStatus }
        : transaction,
    ),
  };
}

export function applyBulkCategoryCorrection(
  transactions: readonly Transaction[],
  ids: readonly string[],
  category: CategoryOption,
) {
  const selection = evaluateBulkCategorySelection(transactions, ids);
  if (!selection.ok) return selection;
  if (category.kind !== selection.kind) {
    return {
      ok: false as const,
      message:
        selection.kind === "expense"
          ? "Hãy chọn một danh mục chi."
          : "Hãy chọn một danh mục thu.",
    };
  }

  const selectedIds = new Set(selection.ids);
  return {
    ok: true as const,
    updatedIds: selection.ids,
    transactions: transactions.map((transaction) =>
      selectedIds.has(transaction.id)
        ? {
            ...transaction,
            categoryId: category.id,
            category: category.name,
          }
        : transaction,
    ),
  };
}
