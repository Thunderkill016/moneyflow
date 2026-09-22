"use client";

import { startTransition, useEffect, useOptimistic, useState } from "react";
import { approveInboxCandidateAction } from "@/app/actions/inbox-approval";
import {
  bulkSetTransactionReviewAction,
  bulkUpdateTransactionCategoryAction,
  type BulkTransactionActionResult,
} from "@/app/actions/transaction-review";
import {
  createSplitExpenseAction,
  createTransactionAction,
  deleteTransactionAction,
  restoreTransactionAction,
  updateTransactionAction,
  updateTransferAction,
  type TransactionActionResult,
} from "@/app/actions/transactions";
import { executeTransferMutation } from "@/hooks/transfer-mutation";
import type {
  AccountOption,
  BulkTransactionCategoryInput,
  BulkTransactionReviewInput,
  CategoryOption,
  CreateSplitExpenseInput,
  CreateTransactionInput,
  CreateTransferInput,
  Transaction,
  UpdateMoneyTransactionInput,
  UpdateTransferInput,
} from "@/lib/sample-data";
import { buildSplitExpenseTransaction } from "@/lib/splits";
import {
  readStoredTransactions,
  restoreTransactionInList,
  writeStoredTransactions,
} from "@/lib/transaction-store";
import {
  releaseDeletedTransactions,
  tombstoneTransactions,
} from "@/lib/deleted-transactions";
import {
  applyBulkCategoryCorrection,
  applyBulkDateChange,
  applyBulkReviewStatus,
  BULK_SKIP_OFFLINE,
  bulkSkipReasonForFailure,
  getTransactionReviewStatus,
  planBulkDateChange,
  planBulkDelete,
  type BulkMutationResult,
  type BulkSkippedRow,
} from "@/lib/transaction-review";
import { todayInVietnam } from "@/lib/vietnam-date";
import {
  buildOptimisticTransaction,
  buildUpdatedTransaction,
  reduceOptimisticTransactions,
} from "@/lib/optimistic-transactions";

type Options = {
  initialTransactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  isDemo: boolean;
};

function withReviewStatus(transaction: Transaction): Transaction {
  return {
    ...transaction,
    reviewStatus: getTransactionReviewStatus(transaction),
  };
}

/**
 * Rebuild the single-row update input with only `occurredOn` changed — the
 * update RPCs require the full field set, so a bulk date edit replays each
 * row's own account/category/kind/amount/note through the same contract the
 * edit dialog uses.
 */
function dateUpdateInput(
  transaction: Transaction,
  occurredOn: string,
): UpdateMoneyTransactionInput | UpdateTransferInput | null {
  if (transaction.kind === "transfer") {
    if (!transaction.destinationAccountId) return null;
    return {
      id: transaction.id,
      kind: "transfer",
      sourceAccountId: transaction.accountId,
      destinationAccountId: transaction.destinationAccountId,
      amount: transaction.amount,
      occurredOn,
      note: transaction.note,
    };
  }
  if (transaction.kind !== "income" && transaction.kind !== "expense") {
    return null;
  }
  if (!transaction.categoryId) return null;
  return {
    id: transaction.id,
    kind: transaction.kind,
    accountId: transaction.accountId,
    categoryId: transaction.categoryId,
    amount: transaction.amount,
    occurredOn,
    note: transaction.note,
  };
}

export function useTransactions({ initialTransactions, accounts, categories, isDemo }: Options) {
  const [transactions, setTransactions] = useState(
    initialTransactions.map(withReviewStatus),
  );
  const [optimisticTransactions, applyOptimisticMutation] = useOptimistic(
    transactions,
    reduceOptimisticTransactions,
  );
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    if (!isDemo) return;
    const frame = window.requestAnimationFrame(() => setTransactions(readStoredTransactions()));
    return () => window.cancelAnimationFrame(frame);
  }, [isDemo]);

  function commitDemoTransactions(next: Transaction[]) {
    writeStoredTransactions(next);
    setTransactions(next);
  }

  async function addTransaction(input: CreateTransactionInput): Promise<TransactionActionResult> {
    if (isDemo) {
      const account = accounts.find((item) => item.id === input.accountId);
      const category = categories.find((item) => item.id === input.categoryId);
      if (!account || !category || category.kind !== input.kind) {
        return { ok: false, message: "Tài khoản hoặc danh mục chưa hợp lệ." };
      }

      const transaction: Transaction = {
        id: crypto.randomUUID(),
        kind: input.kind,
        categoryId: category.id,
        category: category.name,
        note: input.note || category.name,
        payee: input.payee?.trim() || undefined,
        accountId: account.id,
        account: account.name,
        amount: input.amount,
        occurredOn: input.occurredOn,
        occurredAt: new Date().toISOString(),
        relativeDate: "Vừa xong",
        reviewStatus: "reviewed",
      };
      const current = readStoredTransactions();
      const next = [
        transaction,
        ...current.filter((item) => item.id !== transaction.id),
      ];
      commitDemoTransactions(next);
      return { ok: true, transaction };
    }

    if (input.inboxCandidateId) {
      setIsMutating(true);
      try {
        const result = await approveInboxCandidateAction({
          candidateId: input.inboxCandidateId,
          kind: input.kind,
          accountId: input.accountId,
          categoryId: input.categoryId,
          destinationAccountId: null,
          amount: input.amount,
          occurredOn: input.occurredOn,
          note: input.note,
          payee: input.payee,
          idempotencyKey: input.idempotencyKey,
          allowHeuristicDuplicate: input.allowHeuristicDuplicate ?? false,
        });
        if (result.ok) {
          const reviewed = withReviewStatus(result.transaction);
          setTransactions((current) => [
            reviewed,
            ...current.filter((item) => item.id !== reviewed.id),
          ]);
        }
        return result;
      } catch {
        return { ok: false, message: "Mất kết nối. Kiểm tra mạng rồi thử lại." };
      } finally {
        setIsMutating(false);
      }
    }

    const optimistic = buildOptimisticTransaction(input, accounts, categories);
    if (!optimistic.ok) return optimistic;

    setIsMutating(true);
    return await new Promise<TransactionActionResult>((resolve) => {
      startTransition(async () => {
        applyOptimisticMutation({
          type: "add",
          transaction: withReviewStatus(optimistic.transaction),
        });
        try {
          const result = await createTransactionAction(input);
          if (result.ok && result.transaction) {
            // Tag the confirmation with the same idempotency key the optimistic
            // row carries, so the optimistic layer can retire the pending row
            // instead of rendering both and double-counting the amount.
            const reviewed = {
              ...withReviewStatus(result.transaction),
              pendingKey: input.idempotencyKey,
            };
            setTransactions((current) => [
              reviewed,
              ...current.filter((item) => item.id !== reviewed.id),
            ]);
          }
          resolve(
            result.ok
              ? result
              : { ok: false, message: result.message || "Không lưu được giao dịch. Thử lại." },
          );
        } catch {
          resolve({ ok: false, message: "Mất kết nối. Kiểm tra mạng rồi thử lại." });
        } finally {
          setIsMutating(false);
        }
      });
    });
  }

  async function deleteTransaction(id: string): Promise<TransactionActionResult> {
    if (isDemo) {
      /*
       * Tombstone before dropping from the live store so the demo trash page
       * can offer the same browse+restore as the authenticated surface. The
       * two reads are deliberate: the persistence contract pins
       * `const next = readStoredTransactions().filter` verbatim.
       */
      const removed = readStoredTransactions().filter(
        (transaction) => transaction.id === id,
      );
      tombstoneTransactions(removed);
      const next = readStoredTransactions().filter(
        (transaction) => transaction.id !== id,
      );
      commitDemoTransactions(next);
      return { ok: true };
    }

    /**
     * Hide the row inside the transition that carries the delete RPC. If the
     * action fails the optimistic overlay is dropped and the row returns
     * untouched; if it succeeds the base list drops the row for good. The
     * undo snapshot stays outside this state (`restoreTransaction` re-inserts
     * it), and the refreshed feed cannot resurrect the row — `transaction_feed`
     * excludes `deleted_at`.
     */
    setIsMutating(true);
    return await new Promise<TransactionActionResult>((resolve) => {
      startTransition(async () => {
        applyOptimisticMutation({ type: "remove", id });
        try {
          const result = await deleteTransactionAction(id);
          if (result.ok) {
            setTransactions((current) =>
              current.filter((item) => item.id !== id),
            );
          }
          resolve(
            result.ok
              ? result
              : { ok: false, message: result.message || "Không xóa được giao dịch. Thử lại." },
          );
        } catch {
          resolve({ ok: false, message: "Mất kết nối. Kiểm tra mạng rồi thử lại." });
        } finally {
          setIsMutating(false);
        }
      });
    });
  }

  /** Undo soft-delete: demo re-inserts snapshot; server clears deleted_at via RPC. */
  async function restoreTransaction(transaction: Transaction): Promise<TransactionActionResult> {
    if (isDemo) {
      const next = restoreTransactionInList(
        readStoredTransactions(),
        transaction,
      );
      commitDemoTransactions(next);
      /*
       * Release the tombstone only after the live store is committed — if the
       * commit throws, the row is still recoverable from the trash page.
       * Undo and trash-restore share this path, so both stay consistent.
       */
      releaseDeletedTransactions([transaction.id]);
      return { ok: true, transaction: withReviewStatus(transaction) };
    }

    setIsMutating(true);
    try {
      const result = await restoreTransactionAction(transaction.id);
      if (result.ok) {
        const restored: Transaction = {
          ...(result.transaction ?? transaction),
          reviewStatus: getTransactionReviewStatus(transaction),
        };
        setTransactions((current) => restoreTransactionInList(current, restored));
        return { ok: true, transaction: restored };
      }
      return {
        ok: false,
        message: result.message || "Không khôi phục được giao dịch. Thử lại.",
      };
    } catch {
      return { ok: false, message: "Mất kết nối. Kiểm tra mạng rồi thử lại." };
    } finally {
      setIsMutating(false);
    }
  }

  async function addTransfer(input: CreateTransferInput): Promise<TransactionActionResult> {
    if (!isDemo) setIsMutating(true);
    try {
      if (!isDemo && input.inboxCandidateId) {
        const result = await approveInboxCandidateAction({
          candidateId: input.inboxCandidateId,
          kind: "transfer",
          accountId: input.sourceAccountId,
          categoryId: null,
          destinationAccountId: input.destinationAccountId,
          amount: input.amount,
          occurredOn: input.occurredOn,
          note: input.note,
          idempotencyKey: input.idempotencyKey,
          allowHeuristicDuplicate: input.allowHeuristicDuplicate ?? false,
        });
        if (result.ok) {
          const reviewed = withReviewStatus(result.transaction);
          setTransactions((current) => [
            reviewed,
            ...current.filter((item) => item.id !== reviewed.id),
          ]);
        }
        return result;
      }

      const result = await executeTransferMutation({ input, accounts, isDemo });
      if (result.ok) {
        const reviewed = withReviewStatus(result.transaction);
        if (isDemo) {
          setTransactions(readStoredTransactions());
        } else {
          setTransactions((current) => [
            reviewed,
            ...current.filter((item) => item.id !== reviewed.id),
          ]);
        }
      }
      return result;
    } finally {
      if (!isDemo) setIsMutating(false);
    }
  }

  async function addSplitExpense(input: CreateSplitExpenseInput): Promise<TransactionActionResult> {
    const account = accounts.find((item) => item.id === input.accountId);
    if (!account) return { ok: false, message: "Tài khoản chưa hợp lệ." };

    if (isDemo) {
      const built = buildSplitExpenseTransaction({
        id: crypto.randomUUID(),
        input,
        account,
        categories,
      });
      if (!built.ok) return { ok: false, message: built.message };
      const reviewed = withReviewStatus(built.transaction);
      const current = readStoredTransactions();
      const next = [
        reviewed,
        ...current.filter((item) => item.id !== reviewed.id),
      ];
      commitDemoTransactions(next);
      return { ok: true, transaction: reviewed };
    }

    setIsMutating(true);
    try {
      const result = await createSplitExpenseAction(input);
      if (result.ok && result.transaction) {
        const reviewed = withReviewStatus(result.transaction);
        setTransactions((current) => [
          reviewed,
          ...current.filter((item) => item.id !== reviewed.id),
        ]);
      }
      return result.ok
        ? result
        : { ok: false, message: result.message || "Không chia được khoản chi. Thử lại." };
    } catch {
      return { ok: false, message: "Mất kết nối. Kiểm tra mạng rồi thử lại." };
    } finally {
      setIsMutating(false);
    }
  }

  async function updateTransaction(
    input: UpdateMoneyTransactionInput | UpdateTransferInput,
  ): Promise<TransactionActionResult> {
    if (isDemo) {
      const current = readStoredTransactions();
      const existing = current.find((item) => item.id === input.id);
      if (!existing || existing.isRecurringPayment) {
        return { ok: false, message: "Giao dịch này không thể sửa tại đây." };
      }
      const draft = buildUpdatedTransaction(existing, input, accounts, categories);
      if (!draft.ok) return { ok: false, message: draft.message };
      const transaction = draft.transaction;
      const next = current.map((item) =>
        item.id === transaction.id ? transaction : item,
      );
      commitDemoTransactions(next);
      return { ok: true, transaction };
    }

    /**
     * The same shared builder produces the draft shown while the update RPC
     * is in flight. Recurring rows are skipped — the server rejects them with
     * `recurring_payment_locked`, so previewing a known failure would flash a
     * lie. A missing base row (stale id) just runs without the preview.
     */
    const existing = transactions.find((item) => item.id === input.id);
    const draft =
      existing && !existing.isRecurringPayment
        ? buildUpdatedTransaction(existing, input, accounts, categories)
        : null;

    setIsMutating(true);
    return await new Promise<TransactionActionResult>((resolve) => {
      startTransition(async () => {
        if (draft?.ok) {
          applyOptimisticMutation({ type: "update", transaction: draft.transaction });
        }
        try {
          const result =
            input.kind === "transfer"
              ? await updateTransferAction(input)
              : await updateTransactionAction(input);
          if (result.ok && result.transaction) {
            setTransactions((current) =>
              current.map((item) =>
                item.id === result.transaction?.id
                  ? {
                      ...(result.transaction as Transaction),
                      reviewStatus: getTransactionReviewStatus(item),
                    }
                  : item,
              ),
            );
          }
          resolve(
            result.ok
              ? result
              : { ok: false, message: result.message || "Không cập nhật được. Thử lại." },
          );
        } catch {
          resolve({ ok: false, message: "Mất kết nối. Kiểm tra mạng rồi thử lại." });
        } finally {
          setIsMutating(false);
        }
      });
    });
  }

  async function bulkSetReviewStatus(
    input: BulkTransactionReviewInput,
  ): Promise<BulkTransactionActionResult> {
    const sourceTransactions = isDemo
      ? readStoredTransactions()
      : transactions;
    const applied = applyBulkReviewStatus(
      sourceTransactions,
      input.ids,
      input.reviewStatus,
    );
    if (!applied.ok) return applied;

    if (isDemo) {
      commitDemoTransactions(applied.transactions);
      return { ok: true, updatedIds: applied.updatedIds };
    }

    setIsMutating(true);
    try {
      const result = await bulkSetTransactionReviewAction(input);
      if (result.ok) {
        setTransactions((current) => {
          const next = applyBulkReviewStatus(
            current,
            result.updatedIds,
            input.reviewStatus,
          );
          return next.ok ? next.transactions : current;
        });
      }
      return result;
    } catch {
      return { ok: false, message: "Mất kết nối. Kiểm tra mạng rồi thử lại." };
    } finally {
      setIsMutating(false);
    }
  }

  async function bulkUpdateCategory(
    input: BulkTransactionCategoryInput,
  ): Promise<BulkTransactionActionResult> {
    const category = categories.find((item) => item.id === input.categoryId);
    if (!category) {
      return { ok: false, message: "Danh mục không còn tồn tại." };
    }
    const sourceTransactions = isDemo
      ? readStoredTransactions()
      : transactions;
    const applied = applyBulkCategoryCorrection(
      sourceTransactions,
      input.ids,
      category,
    );
    if (!applied.ok) return applied;

    if (isDemo) {
      commitDemoTransactions(applied.transactions);
      return { ok: true, updatedIds: applied.updatedIds };
    }

    setIsMutating(true);
    try {
      const result = await bulkUpdateTransactionCategoryAction(input);
      if (result.ok) {
        setTransactions((current) => {
          const next = applyBulkCategoryCorrection(
            current,
            result.updatedIds,
            category,
          );
          return next.ok ? next.transactions : current;
        });
      }
      return result;
    } catch {
      return { ok: false, message: "Mất kết nối. Kiểm tra mạng rồi thử lại." };
    } finally {
      setIsMutating(false);
    }
  }

  /**
   * Bulk "đổi ngày": re-plan against the live ledger at execution time, then
   * walk the eligible rows through the same per-row update RPCs the edit
   * dialog uses (update_money_transaction / update_account_transfer).
   * Sequential calls keep per-item skip reporting honest for a personal
   * ledger's bounded selection (≤100 rows).
   */
  async function bulkUpdateDate(input: {
    ids: string[];
    occurredOn: string;
  }): Promise<BulkMutationResult> {
    const sourceTransactions = isDemo
      ? readStoredTransactions()
      : transactions;
    const plan = planBulkDateChange(
      sourceTransactions,
      input.ids,
      input.occurredOn,
    );
    if (!plan.ok) return plan;
    const skipped: BulkSkippedRow[] = [...plan.skipped];
    if (plan.eligible.length === 0) {
      return { ok: true, updatedIds: [], skipped };
    }

    if (isDemo) {
      const applied = applyBulkDateChange(
        sourceTransactions,
        plan.eligible.map((transaction) => transaction.id),
        input.occurredOn,
        todayInVietnam(),
      );
      if (!applied.ok) return { ok: false, message: applied.message };
      commitDemoTransactions(applied.transactions);
      return { ok: true, updatedIds: applied.updatedIds, skipped };
    }

    setIsMutating(true);
    try {
      const updatedIds: string[] = [];
      const updatedRows = new Map<string, Transaction>();
      for (const transaction of plan.eligible) {
        const update = dateUpdateInput(transaction, input.occurredOn);
        if (!update) {
          skipped.push({
            id: transaction.id,
            note: transaction.note,
            reason: "thiếu dữ liệu để đổi ngày",
          });
          continue;
        }
        try {
          const result =
            update.kind === "transfer"
              ? await updateTransferAction(update)
              : await updateTransactionAction(update);
          if (result.ok) {
            updatedIds.push(transaction.id);
            if (result.transaction) {
              updatedRows.set(transaction.id, result.transaction);
            }
          } else {
            skipped.push({
              id: transaction.id,
              note: transaction.note,
              reason: bulkSkipReasonForFailure(result.code, result.message),
            });
          }
        } catch {
          skipped.push({
            id: transaction.id,
            note: transaction.note,
            reason: BULK_SKIP_OFFLINE,
          });
        }
      }
      if (updatedRows.size > 0) {
        setTransactions((current) =>
          current.map((item) => {
            const confirmed = updatedRows.get(item.id);
            return confirmed
              ? {
                  ...confirmed,
                  reviewStatus: getTransactionReviewStatus(item),
                }
              : item;
          }),
        );
      }
      return { ok: true, updatedIds, skipped };
    } finally {
      setIsMutating(false);
    }
  }

  /**
   * Bulk soft delete: same `soft_delete_money_transaction` RPC per row as the
   * single-row delete, so RLS, the recurring lock and the reconciled-entry
   * trigger all apply unchanged. Returns deleted ids plus per-row skips.
   */
  async function bulkDeleteTransactions(input: {
    ids: string[];
  }): Promise<BulkMutationResult> {
    const sourceTransactions = isDemo
      ? readStoredTransactions()
      : transactions;
    const plan = planBulkDelete(sourceTransactions, input.ids);
    if (!plan.ok) return plan;
    const skipped: BulkSkippedRow[] = [...plan.skipped];
    if (plan.eligible.length === 0) {
      return { ok: true, updatedIds: [], skipped };
    }

    const eligibleIds = plan.eligible.map((transaction) => transaction.id);
    if (isDemo) {
      const gone = new Set(eligibleIds);
      // Tombstone every deleted row so the trash surface can restore it later.
      tombstoneTransactions(plan.eligible);
      commitDemoTransactions(
        sourceTransactions.filter((transaction) => !gone.has(transaction.id)),
      );
      return { ok: true, updatedIds: eligibleIds, skipped };
    }

    setIsMutating(true);
    try {
      const deletedIds: string[] = [];
      for (const transaction of plan.eligible) {
        try {
          const result = await deleteTransactionAction(transaction.id);
          if (result.ok) {
            deletedIds.push(transaction.id);
          } else {
            skipped.push({
              id: transaction.id,
              note: transaction.note,
              reason: bulkSkipReasonForFailure(result.code, result.message),
            });
          }
        } catch {
          skipped.push({
            id: transaction.id,
            note: transaction.note,
            reason: BULK_SKIP_OFFLINE,
          });
        }
      }
      if (deletedIds.length > 0) {
        const gone = new Set(deletedIds);
        setTransactions((current) =>
          current.filter((transaction) => !gone.has(transaction.id)),
        );
      }
      return { ok: true, updatedIds: deletedIds, skipped };
    } finally {
      setIsMutating(false);
    }
  }

  return {
    transactions: optimisticTransactions,
    addTransaction,
    addTransfer,
    addSplitExpense,
    updateTransaction,
    deleteTransaction,
    restoreTransaction,
    bulkSetReviewStatus,
    bulkUpdateCategory,
    bulkUpdateDate,
    bulkDeleteTransactions,
    isMutating,
  };
}
