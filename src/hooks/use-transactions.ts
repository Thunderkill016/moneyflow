"use client";

import { startTransition, useEffect, useOptimistic, useState } from "react";
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
  buildOptimisticTransaction,
  reduceOptimisticTransactions,
} from "@/lib/optimistic-transactions";

type Options = {
  initialTransactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  isDemo: boolean;
};

export function useTransactions({ initialTransactions, accounts, categories, isDemo }: Options) {
  const [transactions, setTransactions] = useState(initialTransactions);
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
      };
      setTransactions((current) => {
        const next = [transaction, ...current];
        writeStoredTransactions(next);
        return next;
      });
      return { ok: true, transaction };
    }

    const optimistic = buildOptimisticTransaction(input, accounts, categories);
    if (!optimistic.ok) return optimistic;

    setIsMutating(true);
    return await new Promise<TransactionActionResult>((resolve) => {
      startTransition(async () => {
        addOptimisticTransaction(optimistic.transaction);
        try {
          const result = await createTransactionAction(input);
          if (result.ok && result.transaction) {
            setTransactions((current) => [
              result.transaction as Transaction,
              ...current.filter((item) => item.id !== result.transaction?.id),
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
      setTransactions((current) => {
        const next = current.filter((transaction) => transaction.id !== id);
        writeStoredTransactions(next);
        return next;
      });
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
      setTransactions((current) => {
        const next = restoreTransactionInList(current, transaction);
        writeStoredTransactions(next);
        return next;
      });
      return { ok: true, transaction };
    }

    setIsMutating(true);
    try {
      const result = await restoreTransactionAction(transaction.id);
      if (result.ok) {
        const restored = result.transaction ?? transaction;
        setTransactions((current) => restoreTransactionInList(current, restored));
        return { ok: true, transaction: result.transaction ?? transaction };
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
      const result = await executeTransferMutation({ input, accounts, isDemo });
      if (result.ok) {
        setTransactions((current) => [
          result.transaction,
          ...current.filter((item) => item.id !== result.transaction.id),
        ]);
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
      setTransactions((current) => {
        const next = [built.transaction, ...current];
        writeStoredTransactions(next);
        return next;
      });
      return { ok: true, transaction: built.transaction };
    }

    setIsMutating(true);
    try {
      const result = await createSplitExpenseAction(input);
      if (result.ok && result.transaction) {
        setTransactions((current) => [
          result.transaction as Transaction,
          ...current.filter((item) => item.id !== result.transaction?.id),
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
      const existing = transactions.find((item) => item.id === input.id);
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
      setTransactions((current) => {
        const next = current.map((item) =>
          item.id === transaction.id ? transaction : item,
        );
        writeStoredTransactions(next);
        return next;
      });
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
              ? (result.transaction as Transaction)
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

  return {
    transactions: optimisticTransactions,
    addTransaction,
    addTransfer,
    addSplitExpense,
    updateTransaction,
    deleteTransaction,
    restoreTransaction,
    isMutating,
  };
}
