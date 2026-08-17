import {
  type TransactionFilterKind,
  type TransactionFilterValues,
  transactionFilterSearch,
} from "./transaction-filters.ts";

/*
 * Dashboard drill-down: turn a displayed aggregate into the exact rows behind it.
 *
 * The only thing that makes a drill-down worth shipping is that the rows it opens
 * add up to the number that was clicked. A number you cannot verify is a number
 * users eventually stop trusting, so a drill-down that disagrees with its own
 * aggregate is worse than no drill-down at all.
 *
 * Two definitions have to line up exactly, and both are load-bearing:
 *
 * 1. `monthExpenseTotal`/`calculateDashboardSummary` in `finance.ts` select on
 *    `occurredOn.startsWith("YYYY-MM")` — the WHOLE calendar month. So the window
 *    must end on the last day of the month, never on `today`: a row dated later
 *    this month is already inside the aggregate, and a `to=today` window would
 *    silently drop it from the list.
 * 2. Those aggregates match `kind` exactly, so transfers are excluded from income
 *    and expense. `filterTransactions` compares `kind` the same way, which keeps
 *    transfer neutrality intact on both sides.
 *
 * The URL is built with `transactionFilterSearch`, the same serializer the
 * transactions workspace uses, so a link always round-trips back into the filter
 * state it describes rather than into a hand-written parallel format.
 */

const MONTH_PREFIX_LENGTH = 7; // "YYYY-MM"

/** Last calendar day of the month containing `date` ("YYYY-MM-DD" in, same out). */
export function monthEndFromDate(date: string): string {
  const year = Number.parseInt(date.slice(0, 4), 10);
  const month = Number.parseInt(date.slice(5, 7), 10);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("invalid_drilldown_date");
  }
  /*
   * Day 0 of the next month is the last day of this one. Built in UTC on purpose:
   * the caller passes a date already resolved in Asia/Ho_Chi_Minh by the server,
   * and re-deriving it through a local-time Date would reintroduce the timezone
   * drift this module exists to prevent.
   */
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${date.slice(0, MONTH_PREFIX_LENGTH)}-${String(lastDay).padStart(2, "0")}`;
}

export function monthStartFromDate(date: string): string {
  return `${date.slice(0, MONTH_PREFIX_LENGTH)}-01`;
}

export type DashboardDrilldown = {
  /** Server-resolved current date, `workspace.today`. Never a client `new Date()`. */
  today: string;
  kind?: TransactionFilterKind;
  /**
   * Category NAME, because `/transactions` resolves the `category` parameter by
   * name against the viewer's categories. Passing an id would silently fall back
   * to "all" and open every transaction — see `dashboardDrilldownHref`.
   */
  category?: string;
  account?: string;
};

export function dashboardDrilldownFilters({
  today,
  kind = "all",
  category,
  account,
}: DashboardDrilldown): TransactionFilterValues {
  return {
    query: "",
    kind,
    account: account ?? "all",
    category: category ?? "all",
    review: "all",
    fromDate: monthStartFromDate(today),
    toDate: monthEndFromDate(today),
    minAmountInput: "",
    maxAmountInput: "",
  };
}

/**
 * `/transactions` href for the rows behind a dashboard aggregate.
 *
 * Returns `null` when a category drill-down has no category name to carry. That
 * is deliberate: `/transactions` matches the `category` parameter by name and
 * falls back to "all" when it does not resolve, so emitting a link for a missing
 * or renamed category would open the full ledger while appearing to open one
 * category — the exact false-confidence this feature exists to remove. Callers
 * render plain text instead of a link in that case.
 */
export function dashboardDrilldownHref(
  drilldown: DashboardDrilldown & { requiresCategory?: boolean },
): string | null {
  if (drilldown.requiresCategory && !drilldown.category?.trim()) return null;
  const search = transactionFilterSearch(dashboardDrilldownFilters(drilldown));
  const query = search.toString();
  return query ? `/transactions?${query}` : "/transactions";
}
