/**
 * Operation-status vocabulary overloaded into `Transaction.relativeDate`.
 *
 * `relativeDate` is polymorphic: a confirmed row carries the calendar label
 * from `formatRelativeDate`, while an optimistic or just-committed row carries
 * one of these state strings instead. Every producer below must write only
 * these constants so a reader (e.g. the dashboard's per-row status slot) can
 * distinguish a state from a date without string-matching by hand — and so a
 * persisted label like "Hôm nay" from yesterday never reads as a status.
 */

export const TRANSACTION_STATUS = {
  /** Optimistic add — the create RPC/local write is still in flight. */
  saving: "Đang lưu…",
  /** Optimistic edit — the update RPC/local write is still in flight. */
  edited: "Vừa sửa",
  /** Demo-mode commit — the local store already holds the confirmed row. */
  completed: "Vừa xong",
} as const;

const STATUS_VALUES: ReadonlySet<string> = new Set(
  Object.values(TRANSACTION_STATUS),
);

/** True when `relativeDate` is an operation state, not a calendar label. */
export function isTransactionStatusLabel(label: string): boolean {
  return STATUS_VALUES.has(label);
}
