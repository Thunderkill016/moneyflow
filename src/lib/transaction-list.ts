/**
 * Client-side windowing for ledger / timeline lists.
 * Filters stay on the full set; only the visible slice is rendered.
 */

/** Default page size — never paint 1000 rows at once (TASK-122). */
export const TRANSACTION_PAGE_SIZE = 50;

export type TransactionListWindow<T> = {
  /** Items to render (first `visibleCount`, capped to list length). */
  visible: T[];
  /** How many are shown now. */
  shown: number;
  /** Total matching the current filters. */
  total: number;
  /** Remaining after the visible window. */
  remaining: number;
  /** True when more rows exist beyond the window. */
  hasMore: boolean;
};

/**
 * Slice a filtered list for progressive "load more" rendering.
 * `visibleCount` is the desired cap (typically PAGE_SIZE * n); not an index.
 */
export function windowTransactions<T>(
  items: readonly T[],
  visibleCount: number,
): TransactionListWindow<T> {
  const total = items.length;
  const safeCount =
    typeof visibleCount === "number" && Number.isFinite(visibleCount)
      ? Math.max(0, Math.floor(visibleCount))
      : 0;
  const shown = Math.min(safeCount, total);
  const visible = items.slice(0, shown) as T[];
  const remaining = total - shown;
  return {
    visible,
    shown,
    total,
    remaining,
    hasMore: remaining > 0,
  };
}

/** Next visible count after a "load more" click (grows by page size). */
export function nextVisibleCount(
  currentVisible: number,
  pageSize: number = TRANSACTION_PAGE_SIZE,
): number {
  const size =
    typeof pageSize === "number" && Number.isFinite(pageSize) && pageSize > 0
      ? Math.floor(pageSize)
      : TRANSACTION_PAGE_SIZE;
  const current =
    typeof currentVisible === "number" && Number.isFinite(currentVisible)
      ? Math.max(0, Math.floor(currentVisible))
      : 0;
  return current + size;
}
