import type { ReportRange } from "./reports.ts";
import {
  type TransactionFilterKind,
  type TransactionFilterValues,
  transactionFilterSearch,
} from "./transaction-filters.ts";

/*
 * Report drill-down: turn a report figure into the exact rows behind it.
 *
 * `/reports` is the page whose whole job is understanding where money went, and
 * until now not one of its figures linked to the transactions behind it. A
 * number nobody can check is a number people stop trusting, which is why
 * `PRINCIPLES.md` requires a figure and its rows to agree or the drill-down not
 * to ship.
 *
 * This is deliberately NOT `dashboard-drilldown.ts`. That module derives a whole
 * calendar month, which is right for a dashboard figure and wrong here: reports
 * carry week, month, year and custom windows, and the rows must be bounded by
 * the report's own `currentStart..currentEnd` or they will not sum to what the
 * reader clicked.
 *
 * Two traps in `filterTransactions` shape the rest:
 *
 * 1. The account filter matches BOTH `transaction.account` and
 *    `transaction.destinationAccount`. An account figure on a report is expense
 *    only, so an account drill-down must carry `kind: "expense"` — otherwise
 *    transfers *into* that account appear in a list opened from an expense
 *    number and the total silently disagrees.
 * 2. Category and account are resolved by NAME, and `/transactions` falls back
 *    to showing everything when a name does not resolve. A link built from an
 *    unresolvable name would open the whole ledger while looking like one
 *    slice, so those cases return null and the caller renders plain text.
 */

export type ReportDrilldown = {
  range: ReportRange;
  kind?: TransactionFilterKind;
  /** Category NAME; see the module note on name resolution. */
  category?: string;
  /** Account NAME; see the module note on name resolution. */
  account?: string;
};

export function reportDrilldownFilters({
  range,
  kind = "all",
  category,
  account,
}: ReportDrilldown): TransactionFilterValues {
  return {
    query: "",
    kind,
    account: account ?? "all",
    category: category ?? "all",
    review: "all",
    fromDate: range.currentStart,
    toDate: range.currentEnd,
    minAmountInput: "",
    maxAmountInput: "",
  };
}

/**
 * `/transactions` href for the rows behind a report figure.
 *
 * Returns null when a slice was requested without a name to carry it, rather
 * than emitting a link that would open everything.
 */
export function reportDrilldownHref(
  drilldown: ReportDrilldown & { requiresCategory?: boolean; requiresAccount?: boolean },
): string | null {
  if (drilldown.requiresCategory && !drilldown.category?.trim()) return null;
  if (drilldown.requiresAccount && !drilldown.account?.trim()) return null;

  const search = transactionFilterSearch(reportDrilldownFilters(drilldown));
  const query = search.toString();
  return query ? `/transactions?${query}` : "/transactions";
}

/**
 * Href for one account's expense rows in a report window.
 *
 * A named helper rather than a bare options object, because forgetting the
 * `kind` here is the failure mode described above and it would look correct in
 * review.
 */
export function reportAccountDrilldownHref(range: ReportRange, account: string): string | null {
  return reportDrilldownHref({
    range,
    kind: "expense",
    account,
    requiresAccount: true,
  });
}

/** Href for one category's expense rows in a report window. */
export function reportCategoryDrilldownHref(range: ReportRange, category: string): string | null {
  return reportDrilldownHref({
    range,
    kind: "expense",
    category,
    requiresCategory: true,
  });
}
