import { buildFinancialReport, reportRange } from "./reports.ts";
import type { Transaction } from "./transactions/contracts.ts";

export type MonthStatementDetail = {
  /** One bucket per elapsed day of the current month, expense only. */
  shape: { date: string; expense: number }[];
  prior: {
    /** Expense in the equal-length window immediately before this month. */
    expense: number;
    /**
     * Every kind of row in that window — the caller needs this to tell "no
     * prior month recorded" (stay silent) from "prior month recorded zero
     * expense" (a real fact worth stating).
     */
    transactions: number;
  };
};

/**
 * The statement's month detail, lifted from the one reports computation.
 *
 * `reportRange(today, "month")` defines the windows — current month-to-date
 * plus the equal-length run of days before it, the same rule `/reports` calls
 * "kỳ liền trước cùng số ngày". `buildFinancialReport` then does the actual
 * arithmetic, so the dashboard never re-derives the trend buckets or the
 * prior-window sums it shows.
 *
 * A month window is under `TREND_DAILY_MAX_DAYS`, so `report.trend` is one
 * daily bucket per elapsed day — the shape strip. Only `expense` is lifted:
 * income already has the flow bar and transfers are neutral movements, never
 * spending.
 */
export function monthStatementDetail(
  transactions: Transaction[],
  today: string,
): MonthStatementDetail {
  const range = reportRange(today, "month");
  const report = buildFinancialReport(transactions, range);
  const priorTransactions = transactions.filter(
    (item) =>
      item.occurredOn >= range.previousStart &&
      item.occurredOn <= range.previousEnd,
  ).length;
  return {
    shape: report.trend.map((bucket) => ({ date: bucket.key, expense: bucket.expense })),
    prior: { expense: report.previous.expense, transactions: priorTransactions },
  };
}
