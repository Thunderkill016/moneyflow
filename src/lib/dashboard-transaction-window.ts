import { reportRange } from "./reports.ts";

/** Recent rows shown even when the reporting window has no activity. */
export const DASHBOARD_RECENT_TRANSACTION_LIMIT = 5;

/**
 * Earliest transaction date required by the dashboard.
 *
 * The dashboard needs:
 * - every row in the current month for monthly totals and categories;
 * - the current week plus its equal-length previous period for weekly compare.
 *
 * Returning the earlier boundary preserves both calculations without loading the
 * user's complete ledger history.
 */
export function dashboardTransactionStart(today: string): string {
  const monthStart = `${today.slice(0, 7)}-01`;
  const weeklyComparisonStart = reportRange(today, "week").previousStart;
  return monthStart < weeklyComparisonStart ? monthStart : weeklyComparisonStart;
}
