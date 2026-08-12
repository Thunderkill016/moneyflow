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
  applyBulkCategoryCorrection,
  applyBulkReviewStatus,
  getTransactionReviewStatus,
} from "@/lib/transaction-review";
import {
  buildOptimisticTransaction,
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

export function useTransactions({ initialTransactions, accounts, categories, isDemo }: Options) {
  const [transactions, setTransactions] = useState(
    initialTransactions.map(withReviewStatus),
  );
  const [optimisticTransactions, addOptimisticTransaction] = useOptimistic(
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
        addOptimisticTransaction(withReviewStatus(optimistic.transaction));
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
      const next = readStoredTransactions().filter(
        (transaction) => transaction.id !== id,
      );
      commitDemoTransactions(next);
      return { ok: true };
    }

    setIsMutating(true);
    try {
      const result = await deleteTransactionAction(id);
      if (result.ok) setTransactions((current) => current.filter((item) => item.id !== id));
      return result.ok
        ? result
        : { ok: false, message: result.message || "Không xóa được giao dịch. Thử lại." };
    } catch {
      return { ok: false, message: "Mất kết nối. Kiểm tra mạng rồi thử lại." };
    } finally {
      setIsMutating(false);
    }
  }

  /** Undo soft-delete: demo re-inserts snapshot; server clears deleted_at via RPC. */
  async function restoreTransaction(transaction: Transaction): Promise<TransactionActionResult> {
    if (isDemo) {
      const next = restoreTransactionInList(
        readStoredTransactions(),
        transaction,
      );
      commitDemoTransactions(next);
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
      let transaction: Transaction;
      if (input.kind === "transfer") {
        const source = accounts.find((item) => item.id === input.sourceAccountId);
        const destination = accounts.find((item) => item.id === input.destinationAccountId);
        if (!source || !destination || source.id === destination.id) {
          return { ok: false, message: "Chọn hai tài khoản khác nhau." };
        }
        transaction = {
          ...existing,
          kind: "transfer",
          categoryId: "",
          category: "Chuyển tiền",
          note: input.note || "Chuyển tiền",
          accountId: source.id,
          account: source.name,
          destinationAccountId: destination.id,
          destinationAccount: destination.name,
          amount: input.amount,
          occurredOn: input.occurredOn,
          relativeDate: "Vừa sửa",
        };
      } else {
        const account = accounts.find((item) => item.id === input.accountId);
        const category = categories.find((item) => item.id === input.categoryId);
        if (!account || !category || category.kind !== input.kind) {
          return { ok: false, message: "Tài khoản hoặc danh mục chưa hợp lệ." };
        }
        transaction = {
          ...existing,
          kind: input.kind,
          categoryId: category.id,
          category: category.name,
          note: input.note || category.name,
          accountId: account.id,
          account: account.name,
          destinationAccountId: undefined,
          destinationAccount: undefined,
          amount: input.amount,
          occurredOn: input.occurredOn,
          relativeDate: "Vừa sửa",
        };
      }
      const next = current.map((item) =>
        item.id === transaction.id ? transaction : item,
      );
      commitDemoTransactions(next);
      return { ok: true, transaction };
    }
    setIsMutating(true);
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
      return result.ok
        ? result
        : { ok: false, message: result.message || "Không cập nhật được. Thử lại." };
    } catch {
      return { ok: false, message: "Mất kết nối. Kiểm tra mạng rồi thử lại." };
    } finally {
      setIsMutating(false);
    }
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
    isMutating,
  };
}
