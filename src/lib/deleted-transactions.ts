import type {
  DeletedTransaction,
  Transaction,
} from "./transactions/contracts.ts";
import { isTransaction } from "./transaction-store.ts";

/**
 * Demo-mode tombstone store ("đã xóa").
 *
 * The authenticated ledger keeps soft-deleted rows in `deleted_at` and serves
 * them through `deleted_transaction_feed`; the demo ledger is localStorage,
 * so its deletes would otherwise be unrecoverable once the undo toast
 * expired. Tombstones live under a separate key so the live-store validator
 * (`isTransaction`/`readStoredTransactions`) never has to know deleted rows
 * exist — and account deletion wipes this key along with the live one.
 */
export const DELETED_TRANSACTION_STORAGE_KEY =
  "moneyflow-demo-transactions-deleted-v1";

export function isDeletedTransactionRecord(
  value: unknown,
): value is DeletedTransaction {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<DeletedTransaction>;
  return (
    isTransaction(item.transaction) &&
    typeof item.deletedAt === "string" &&
    Number.isFinite(Date.parse(item.deletedAt))
  );
}

function defaultStorage() {
  return typeof window !== "undefined" ? window.localStorage : null;
}

function sortNewestDeletedFirst(
  records: DeletedTransaction[],
): DeletedTransaction[] {
  return [...records].sort(
    (left, right) =>
      right.deletedAt.localeCompare(left.deletedAt) ||
      right.transaction.id.localeCompare(left.transaction.id),
  );
}

/**
 * Valid tombstones only, newest-deleted first. A corrupt key is dropped so a
 * bad write can never wedge the trash surface.
 */
export function readStoredDeletedTransactions(
  storage: Pick<Storage, "getItem" | "removeItem"> | null = defaultStorage(),
): DeletedTransaction[] {
  if (!storage) return [];
  try {
    const saved = storage.getItem(DELETED_TRANSACTION_STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return sortNewestDeletedFirst(parsed.filter(isDeletedTransactionRecord));
  } catch {
    storage.removeItem(DELETED_TRANSACTION_STORAGE_KEY);
    return [];
  }
}

export function writeStoredDeletedTransactions(
  records: DeletedTransaction[],
  storage: Pick<Storage, "setItem"> | null = defaultStorage(),
) {
  if (!storage) return;
  storage.setItem(
    DELETED_TRANSACTION_STORAGE_KEY,
    JSON.stringify(sortNewestDeletedFirst(records)),
  );
}

/**
 * Move rows into the tombstone store. Re-deleting an already-tombstoned id
 * refreshes its deletedAt instead of duplicating the record.
 */
export function tombstoneTransactions(
  transactions: Transaction[],
  deletedAt = new Date().toISOString(),
  storage: Pick<
    Storage,
    "getItem" | "setItem" | "removeItem"
  > | null = defaultStorage(),
): DeletedTransaction[] {
  if (transactions.length === 0) return readStoredDeletedTransactions(storage);
  const fresh = new Set(transactions.map((transaction) => transaction.id));
  const next = [
    ...transactions.map((transaction) => ({ transaction, deletedAt })),
    ...readStoredDeletedTransactions(storage).filter(
      (record) => !fresh.has(record.transaction.id),
    ),
  ];
  writeStoredDeletedTransactions(next, storage);
  return next;
}

/** Drop tombstones for restored (or otherwise resurrected) ids. */
export function releaseDeletedTransactions(
  ids: string[],
  storage: Pick<
    Storage,
    "getItem" | "setItem" | "removeItem"
  > | null = defaultStorage(),
): DeletedTransaction[] {
  const gone = new Set(ids);
  const next = readStoredDeletedTransactions(storage).filter(
    (record) => !gone.has(record.transaction.id),
  );
  writeStoredDeletedTransactions(next, storage);
  return next;
}

/**
 * "HH:MM · DD/MM/YYYY" in Vietnam time for the "Đã xóa lúc …" line.
 * Parts are assembled explicitly so the output does not depend on ICU
 * locale-data drift between browsers.
 */
export function formatDeletedAtLabel(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("hour")}:${get("minute")} · ${get("day")}/${get("month")}/${get("year")}`;
}
