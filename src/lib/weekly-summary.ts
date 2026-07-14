/**
 * TASK-126 — In-app weekly summary (not email).
 * Calm, non-judgmental copy; money as integer minor units (VND đồng).
 * Transfers never count as income/expense (via buildFinancialReport).
 */
import type { Transaction } from "./sample-data.ts";
import { buildFinancialReport, reportRange } from "./reports.ts";

export type WeeklySummary = {
  /** Inclusive start (Monday of current week). */
  weekStart: string;
  /** Inclusive end (today). */
  weekEnd: string;
  income: number;
  expense: number;
  net: number;
  /** Count of non-transfer rows in the current week range. */
  transactionCount: number;
  /** Top expense category name this week, or null. */
  topCategory: string | null;
  topCategoryAmount: number;
  /**
   * Expense vs previous equal-length period:
   * positive = chi nhiều hơn, negative = chi ít hơn, null = no prior expense.
   */
  expenseChangePercent: number | null;
};

/** Format YYYY-MM-DD as "d/m" (vi short) without floating dates. */
export function formatWeekDayLabel(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const day = Number(isoDate.slice(8, 10));
  const month = Number(isoDate.slice(5, 7));
  return `${day}/${month}`;
}

/** "13/7 – 15/7" range label for the card subtitle. */
export function formatWeekRangeLabel(start: string, end: string): string {
  return `${formatWeekDayLabel(start)} – ${formatWeekDayLabel(end)}`;
}

/**
 * Build weekly summary for Insights card.
 * Uses Mon–today window (same as reports period=week).
 */
export function buildWeeklySummary(
  transactions: Transaction[],
  today: string,
): WeeklySummary {
  const range = reportRange(today, "week");
  const report = buildFinancialReport(transactions, range);
  const top = report.categories[0];
  return {
    weekStart: range.currentStart,
    weekEnd: range.currentEnd,
    income: report.totals.income,
    expense: report.totals.expense,
    net: report.totals.net,
    transactionCount: report.totals.transactions,
    topCategory: top?.name ?? null,
    topCategoryAmount: top?.amount ?? 0,
    expenseChangePercent: report.expenseChangePercent,
  };
}

/**
 * Calm one-line comparison — never guilt ("overspent", "bad week").
 * Empty when no prior period expense to compare.
 */
export function weeklyExpenseCompareLine(
  changePercent: number | null,
): string | null {
  if (changePercent === null) return null;
  if (changePercent === 0) return "Chi tương đương tuần trước (cùng số ngày).";
  if (changePercent > 0) {
    return `Chi cao hơn khoảng ${changePercent}% so với tuần trước (cùng số ngày).`;
  }
  return `Chi thấp hơn khoảng ${Math.abs(changePercent)}% so với tuần trước (cùng số ngày).`;
}

/** Empty-state body when ledger has rows but none this week. */
export const WEEKLY_SUMMARY_EMPTY_WEEK =
  "Tuần này chưa có thu–chi được ghi. Một vài dòng mỗi ngày là đủ để nhìn lại cuối tuần.";

/** Empty when whole ledger is empty (redirect attention to Ghi chi). */
export const WEEKLY_SUMMARY_EMPTY_LEDGER =
  "Ghi vài khoản thu–chi trong tuần để thấy tóm tắt tại đây.";

export const WEEKLY_SUMMARY_TITLE = "Tóm tắt tuần này";
export const WEEKLY_SUMMARY_ARIA = "Tóm tắt thu chi tuần này";
export const WEEKLY_SUMMARY_REPORTS_HREF = "/reports?period=week";
export const WEEKLY_SUMMARY_REPORTS_LABEL = "Xem báo cáo tuần →";
