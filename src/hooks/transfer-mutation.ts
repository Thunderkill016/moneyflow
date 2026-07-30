"use client";

import {
  createTransferAction,
  type TransactionActionResult,
} from "@/app/actions/transactions";
import type { CreateTransferInput, Transaction } from "@/lib/sample-data";
import {
  buildDemoTransferTransaction,
  prepareTransferMutation,
  type TransferAccount,
} from "@/lib/transfer-mutation";
import {
  readStoredTransactions,
  writeStoredTransactions,
} from "@/lib/transaction-store";

export type TransferMutationResult =
  | {
      ok: true;
      transaction: Transaction;
      source: TransferAccount;
      destination: TransferAccount;
      isNew: boolean;
    }
  | { ok: false; message: string };

type TransferMutationDependencies = {
  createAuthenticatedTransfer?: (
    input: CreateTransferInput,
  ) => Promise<TransactionActionResult>;
  readTransactions?: () => Transaction[];
  writeTransactions?: (transactions: Transaction[]) => void;
  now?: () => Date;
};

export async function executeTransferMutation({
  input,
  accounts,
  isDemo,
  dependencies = {},
}: {
  input: CreateTransferInput;
  accounts: readonly TransferAccount[];
  isDemo: boolean;
  dependencies?: TransferMutationDependencies;
}): Promise<TransferMutationResult> {
  const prepared = prepareTransferMutation(accounts, input);
  if (!prepared.ok) return prepared;

  const { source, destination } = prepared.value;
  if (isDemo) {
    const readTransactions = dependencies.readTransactions ?? readStoredTransactions;
    const writeTransactions = dependencies.writeTransactions ?? writeStoredTransactions;
    const current = readTransactions();
    const existing = current.find(
      (transaction) => transaction.id === prepared.value.input.idempotencyKey,
    );
    const transaction =
      existing ??
      buildDemoTransferTransaction(prepared.value, {
        id: prepared.value.input.idempotencyKey,
        occurredAt: (dependencies.now ?? (() => new Date()))().toISOString(),
      });

    if (!existing) writeTransactions([transaction, ...current]);
    return {
      ok: true,
      transaction,
      source,
      destination,
      isNew: !existing,
    };
  }

  try {
    const createAuthenticatedTransfer =
      dependencies.createAuthenticatedTransfer ?? createTransferAction;
    const result = await createAuthenticatedTransfer(prepared.value.input);
    if (!result.ok) {
      return {
        ok: false,
        message: result.message || "Không chuyển được. Thử lại.",
      };
    }
    if (!result.transaction) {
      return {
        ok: false,
        message: "Đã chuyển nhưng chưa tải lại được giao dịch.",
      };
    }
    return {
      ok: true,
      transaction: result.transaction,
      source,
      destination,
      isNew: true,
    };
  } catch {
    return { ok: false, message: "Mất kết nối. Kiểm tra mạng rồi thử lại." };
  }
}
