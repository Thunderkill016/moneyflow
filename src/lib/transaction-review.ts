import type {
  CategoryOption,
  Transaction,
  TransactionKind,
  TransactionReviewStatus,
} from "./transactions/contracts.ts";
import { isSplitExpense } from "./splits.ts";
import { formatRelativeDate } from "./relative-date.ts";

export const DEFAULT_TRANSACTION_REVIEW_STATUS: TransactionReviewStatus = "reviewed";

/** Shared cap for every bulk mutation path (selection + server schemas). */
export const BULK_SELECTION_LIMIT = 100;

/**
 * Short Vietnamese reason labels for rows a bulk edit skips.
 *
 * They double as grouping keys in `summarizeBulkSkips`, so they are noun
 * phrases ("2 khoản định kỳ") rather than sentences; the confirm dialog and
 * the result notice both render them.
 */
export const BULK_SKIP_RECURRING = "khoản định kỳ";
export const BULK_SKIP_SPLIT = "khoản chia danh mục";
export const BULK_SKIP_SAME_DATE = "đã đúng ngày";
export const BULK_SKIP_TRANSFER_TARGET = "chuyển tiền thiếu tài khoản đích";
export const BULK_SKIP_RECONCILED = "đã đối soát";
export const BULK_SKIP_NOT_FOUND = "không còn trong sổ";
export const BULK_SKIP_OFFLINE = "mất kết nối";

export type BulkSkippedRow = {
  id: string;
  note: string;
  reason: string;
};

/**
 * A bulk edit plan partitions the selection instead of rejecting it outright:
 * rows the single-transaction rules lock (recurring, split lines, …) are
 * skipped with a reason while the rest proceed one RPC each.
 */
export type BulkEditPlan =
  | {
      ok: true;
      ids: string[];
      eligible: Transaction[];
      skipped: BulkSkippedRow[];
    }
  | { ok: false; message: string };

/** Result shape for skip-aware bulk mutations (date change, soft delete). */
export type BulkMutationResult =
  | { ok: true; updatedIds: string[]; skipped: BulkSkippedRow[] }
  | { ok: false; message: string };

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
  if (normalizedIds.length > BULK_SELECTION_LIMIT) {
    return {
      ok: false,
      message: `Mỗi lần chỉ sửa tối đa ${BULK_SELECTION_LIMIT} giao dịch.`,
    };
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
  if (normalizedIds.length === 0 || normalizedIds.length > BULK_SELECTION_LIMIT) {
    return {
      ok: false as const,
      message:
        normalizedIds.length > BULK_SELECTION_LIMIT
          ? `Mỗi lần chỉ cập nhật tối đa ${BULK_SELECTION_LIMIT} giao dịch.`
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

type BulkSelectionResolution =
  | { ok: true; ids: string[]; found: Transaction[]; missingIds: string[] }
  | { ok: false; message: string };

/**
 * Selection invariants shared by every bulk edit: normalized and bounded.
 * Unlike the all-or-nothing category path, a stale or optimistic id does not
 * fail the batch — it comes back as a "không còn trong sổ" per-row skip,
 * matching what the per-row RPC would report anyway.
 */
function resolveBulkSelection(
  transactions: readonly Transaction[],
  ids: readonly string[],
): BulkSelectionResolution {
  const normalizedIds = normalizeTransactionIds(ids);
  if (normalizedIds.length === 0) {
    return { ok: false, message: "Chọn ít nhất một giao dịch." };
  }
  if (normalizedIds.length > BULK_SELECTION_LIMIT) {
    return {
      ok: false,
      message: `Mỗi lần chỉ sửa tối đa ${BULK_SELECTION_LIMIT} giao dịch.`,
    };
  }

  const byId = new Map(
    transactions.map((transaction) => [transaction.id, transaction]),
  );
  const found: Transaction[] = [];
  const missingIds: string[] = [];
  for (const id of normalizedIds) {
    const transaction = byId.get(id);
    if (transaction) found.push(transaction);
    else missingIds.push(id);
  }

  return { ok: true, ids: normalizedIds, found, missingIds };
}

function skipRow(transaction: Transaction, reason: string): BulkSkippedRow {
  return { id: transaction.id, note: transaction.note, reason };
}

/**
 * Bulk "đổi ngày" mirrors the single-row edit rules: recurring rows belong to
 * the Định kỳ pages, split expenses only change per line, and no-op dates are
 * skipped instead of firing a pointless write. Transfers stay eligible — the
 * single edit path moves their date through `update_account_transfer`.
 * Reconciled rows cannot be detected client-side; the per-row RPC raises
 * `transaction_reconciled` and they land in `skipped` after the run.
 */
export function planBulkDateChange(
  transactions: readonly Transaction[],
  ids: readonly string[],
  occurredOn: string,
): BulkEditPlan {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
    return { ok: false, message: "Chọn ngày giao dịch hợp lệ." };
  }
  const selection = resolveBulkSelection(transactions, ids);
  if (!selection.ok) return selection;

  const eligible: Transaction[] = [];
  const skipped: BulkSkippedRow[] = selection.missingIds.map((id) => ({
    id,
    note: id,
    reason: BULK_SKIP_NOT_FOUND,
  }));
  for (const transaction of selection.found) {
    if (transaction.isRecurringPayment) {
      skipped.push(skipRow(transaction, BULK_SKIP_RECURRING));
    } else if (isSplitExpense(transaction)) {
      skipped.push(skipRow(transaction, BULK_SKIP_SPLIT));
    } else if (transaction.occurredOn === occurredOn) {
      skipped.push(skipRow(transaction, BULK_SKIP_SAME_DATE));
    } else if (
      transaction.kind === "transfer" &&
      !transaction.destinationAccountId
    ) {
      skipped.push(skipRow(transaction, BULK_SKIP_TRANSFER_TARGET));
    } else {
      eligible.push(transaction);
    }
  }
  return { ok: true, ids: selection.ids, eligible, skipped };
}

/**
 * Bulk soft delete mirrors `handleDelete`: only recurring rows are locked
 * client-side. Transfers and split expenses delete through the same
 * `soft_delete_money_transaction` RPC a single row uses.
 */
export function planBulkDelete(
  transactions: readonly Transaction[],
  ids: readonly string[],
): BulkEditPlan {
  const selection = resolveBulkSelection(transactions, ids);
  if (!selection.ok) return selection;

  const eligible: Transaction[] = [];
  const skipped: BulkSkippedRow[] = selection.missingIds.map((id) => ({
    id,
    note: id,
    reason: BULK_SKIP_NOT_FOUND,
  }));
  for (const transaction of selection.found) {
    if (transaction.isRecurringPayment) {
      skipped.push(skipRow(transaction, BULK_SKIP_RECURRING));
    } else {
      eligible.push(transaction);
    }
  }
  return { ok: true, ids: selection.ids, eligible, skipped };
}

/**
 * "2 khoản định kỳ, 1 đã đối soát" — grouped counts keep the notice and the
 * confirm dialog honest without listing every row.
 */
export function summarizeBulkSkips(skipped: readonly BulkSkippedRow[]): string {
  const counts = new Map<string, number>();
  for (const row of skipped) {
    counts.set(row.reason, (counts.get(row.reason) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([reason, count]) => `${count} ${reason}`)
    .join(", ");
}

/**
 * Translate a per-row action failure into a grouping-friendly reason label.
 * Unknown failures keep the action's own (already privacy-safe) message.
 */
export function bulkSkipReasonForFailure(
  code: string | undefined,
  message: string,
): string {
  if (code === "transaction_reconciled") return BULK_SKIP_RECONCILED;
  if (code === "recurring_payment_locked") return BULK_SKIP_RECURRING;
  if (code === "transaction_not_found") return BULK_SKIP_NOT_FOUND;
  return message.trim() || "không rõ lý do";
}

/** "Hôm nay" / "Hôm qua" / "13 thg 7" — delegates to the shared date label. */
export function bulkOccurredOnLabel(occurredOn: string, today: string): string {
  return formatRelativeDate(occurredOn, today);
}

/**
 * Local apply for the demo ledger: move the eligible rows to the new date and
 * re-derive their relative label against the caller's resolved "today".
 * Server mode does not use this — each confirmed RPC row carries its own
 * server-computed `relativeDate`.
 */
export function applyBulkDateChange(
  transactions: readonly Transaction[],
  ids: readonly string[],
  occurredOn: string,
  today: string,
) {
  const idSet = new Set(normalizeTransactionIds(ids));
  if (idSet.size === 0) {
    return { ok: false as const, message: "Chọn ít nhất một giao dịch." };
  }
  const relativeDate = bulkOccurredOnLabel(occurredOn, today);
  const updatedIds: string[] = [];
  const next = transactions.map((transaction) => {
    if (!idSet.has(transaction.id)) return transaction;
    updatedIds.push(transaction.id);
    return { ...transaction, occurredOn, relativeDate };
  });
  return { ok: true as const, updatedIds, transactions: next };
}
