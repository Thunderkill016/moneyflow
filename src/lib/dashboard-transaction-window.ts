import { reportRange } from "./reports.ts";

/** Recent rows shown even when the reporting window has no activity. */
export const DASHBOARD_RECENT_TRANSACTION_LIMIT = 5;

/**
 * Earliest transaction date required by the dashboard.
 *
 * The dashboard needs:
 * - every row in the current month for monthly totals, categories and the
 *   statement's daily spending-rhythm strip;
 * - the current month and week plus their equal-length previous periods for
 *   the factual compare lines (`reportRange` "kỳ liền trước cùng số ngày").
 *
 * The monthly previous period always starts before the current month, so the
 * earlier of the two comparison starts bounds everything. That keeps the
 * loaded window under roughly two months rather than the complete ledger.
 */
export function dashboardTransactionStart(today: string): string {
  const monthlyComparisonStart = reportRange(today, "month").previousStart;
  const weeklyComparisonStart = reportRange(today, "week").previousStart;
  return monthlyComparisonStart < weeklyComparisonStart
    ? monthlyComparisonStart
    : weeklyComparisonStart;
}
