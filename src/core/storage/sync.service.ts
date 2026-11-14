import type { Transaction } from "../schema/transaction.schema.ts";

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
    if (tx.syncStatus === "DELETED") {
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
    .filter((tx) => tx.syncStatus !== "DELETED")
    .map((tx) =>
      tx.syncStatus === "PENDING"
        ? { ...tx, syncStatus: "SYNCED", updatedAt: now }
        : tx,
    );
}
