import { isSplitExpense } from "../splits.ts";
import type { Transaction } from "./contracts.ts";

/*
 * Resolves a `?open=<id>` deep link against owner-scoped route data.
 *
 * Split and recurring rows deliberately resolve to a notice — the same
 * message the row action shows — because their edits live elsewhere:
 * splits are recreated, recurring rows are managed under /commitments.
 * Stale or foreign ids resolve to "missing" rather than opening a dialog
 * over the wrong row.
 */
export type TransactionOpenResolution =
  | { type: "edit"; transaction: Transaction }
  | { type: "notice"; message: string }
  | { type: "missing" };

export const TRANSACTION_OPEN_SPLIT_NOTICE =
  "Khoản chia danh mục: xóa rồi tạo lại nếu cần sửa các dòng.";
export const TRANSACTION_OPEN_RECURRING_NOTICE =
  "Giao dịch từ lịch định kỳ — quản lý ở trang Định kỳ.";
export const TRANSACTION_OPEN_MISSING_NOTICE =
  "Không tìm thấy giao dịch — có thể đã bị xóa.";

export function resolveTransactionOpenTarget(
  id: string | undefined,
  transactions: Transaction[],
): TransactionOpenResolution {
  if (!id) return { type: "missing" };
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) return { type: "missing" };
  if (transaction.isRecurringPayment) {
    return { type: "notice", message: TRANSACTION_OPEN_RECURRING_NOTICE };
  }
  if (isSplitExpense(transaction)) {
    return { type: "notice", message: TRANSACTION_OPEN_SPLIT_NOTICE };
  }
  return { type: "edit", transaction };
}
