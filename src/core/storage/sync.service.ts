import { deduplicateTransactions, computeAccountBalances } from "../engine/ledger.engine.ts";
import type { Transaction } from "../schema/transaction.schema.ts";
import type { MoneyFlowSnapshot } from "./db.local.ts";

export interface SyncSummary {
  syncedCount: number;
  pendingCount: number;
  deletedCount: number;
  isDirty: boolean;
  statusLabel: string;
}

export function summarizeSyncState(
  transactions: readonly Transaction[],
): SyncSummary {
  let syncedCount = 0;
  let pendingCount = 0;
  let deletedCount = 0;

  for (const tx of transactions) {
    if (tx.syncStatus === "DELETED" || Boolean(tx.deletedAt)) {
      deletedCount += 1;
    } else if (tx.syncStatus === "PENDING") {
      pendingCount += 1;
    } else {
      syncedCount += 1;
    }
  }

  const isDirty = pendingCount > 0 || deletedCount > 0;
  const statusLabel = isDirty
    ? `Local-First · ${pendingCount + deletedCount} chờ đồng bộ`
    : "Local-First 0ms · Đã lưu an toàn";

  return {
    syncedCount,
    pendingCount,
    deletedCount,
    isDirty,
    statusLabel,
  };
}

export function markAllPendingSynced(
  transactions: readonly Transaction[],
  now = Date.now(),
): Transaction[] {
  return transactions
    .filter((tx) => tx.syncStatus !== "DELETED" && !tx.deletedAt)
    .map((tx) =>
      tx.syncStatus === "PENDING"
        ? { ...tx, syncStatus: "SYNCED", updatedAt: now }
        : tx,
    );
}

/**
 * Idempotently merges a remote snapshot into the local snapshot using both
 * transaction IDs and deterministic fingerprints without losing edits.
 */
export function mergeSnapshotsWithDedupe(
  local: MoneyFlowSnapshot,
  incoming: MoneyFlowSnapshot,
  now = Date.now(),
): MoneyFlowSnapshot {
  const accMap = new Map(local.accounts.map((acc) => [acc.id, acc]));
  for (const remoteAcc of incoming.accounts) {
    const existing = accMap.get(remoteAcc.id);
    if (!existing || remoteAcc.updatedAt > existing.updatedAt) {
      accMap.set(remoteAcc.id, remoteAcc);
    }
  }

  const deduped = deduplicateTransactions(
    incoming.transactions,
    local.transactions,
  );
  const transactions = [...deduped.unique, ...local.transactions];
  const accounts = computeAccountBalances(
    Array.from(accMap.values()),
    transactions,
  );

  return {
    version: 3,
    accounts,
    transactions,
    budget:
      incoming.budget.updatedAt > local.budget.updatedAt
        ? incoming.budget
        : local.budget,
    updatedAt: now,
  };
}
