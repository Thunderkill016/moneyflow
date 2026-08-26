import type { Transaction } from "./sample-data.ts";

export type ReportPeriod = "week" | "month" | "year" | "custom";

/**
 * Longest custom window, in days.
 *
 * The server loads `previousStart..currentEnd`, so a custom range costs twice its
 * own span in rows. Three years is already longer than the `year` preset and keeps
 * the worst case bounded; anything beyond it is an export job, not a report.
 */
export const CUSTOM_RANGE_MAX_DAYS = 1_096;

/**
 * Span at which the trend switches from one bar per day to one per month.
 *
 * 62 is two months — twice what the `month` preset can already produce (31 bars),
 * and the chart already scrolls horizontally and thins its labels above 14, so
 * this stays inside behaviour the UI demonstrably handles. Above it, monthly
 * buckets match what `year` has always done.
 */
export const TREND_DAILY_MAX_DAYS = 62;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** R7 — month view is the default reports landing (JTBD: tháng này tiền đi đâu). */
export const REPORTS_PATH = "/reports" as const;
export const REPORTS_MONTH_HREF = "/reports?period=month" as const;
/** Insights → reports deep-link label (discoverable month view). */
export const REPORTS_MONTH_LINK_LABEL = "Báo cáo tháng" as const;

export type ReportRange = {
  period: ReportPeriod;
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
};

export type FinancialReport = {
  range: ReportRange;
  totals: { income: number; expense: number; net: number; transactions: number };
  previous: { income: number; expense: number; net: number };
  expenseChangePercent: number | null;
  categories: { name: string; amount: number; share: number }[];
  /**
   * Expense grouped by the account it left from, largest first.
   *
   * Deliberately NOT split-distributed, unlike `categories`. A split row names
   * several categories but is still one payment leaving one account, so its
   * full amount belongs to that account. Distributing it would under-report
   * every account holding split rows, and the figures would quietly disagree
   * with the account register.
   */
  accounts: { name: string; amount: number; share: number }[];
  trend: { key: string; label: string; income: number; expense: number }[];
};

const DAY_MS = 86_400_000;

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

function shiftDate(value: string, days: number) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return dateString(date);
}

export function normalizeReportPeriod(value: string | null | undefined): ReportPeriod {
  if (value === "week" || value === "year" || value === "custom") return value;
  return "month";
}

/** Canonical period switcher href (always includes `period=` for share/bookmark). */
export function reportPeriodHref(period: ReportPeriod, from?: string, to?: string): string {
  if (period !== "custom") return `${REPORTS_PATH}?period=${period}`;
  const params = new URLSearchParams({ period: "custom" });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `${REPORTS_PATH}?${params.toString()}`;
}

function daysBetween(start: string, end: string) {
  return Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / DAY_MS) + 1;
}

/** A real calendar date, not merely `YYYY-MM-DD`-shaped — rejects 2026-02-31. */
function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  return dateString(parseDate(value)) === value;
}

export type CustomRangeInput = { from?: string | null; to?: string | null };

/**
 * Normalise a user-supplied custom window.
 *
 * Every branch returns a usable window rather than throwing, because these values
 * arrive from a query string that anyone can edit. `null` means "unusable — fall
 * back to the month preset", and the caller decides how to say so.
 */
export function normalizeCustomRange(
  input: CustomRangeInput,
  today: string,
): { from: string; to: string; clamped: boolean; swapped: boolean } | null {
  const rawFrom = input.from ?? "";
  const rawTo = input.to ?? "";
  if (!isRealDate(rawFrom) || !isRealDate(rawTo)) return null;

  // A reversed range is a slip, not an attack: honour the intent instead of
  // discarding both dates the reader just typed.
  const swapped = rawFrom > rawTo;
  let from = swapped ? rawTo : rawFrom;
  let to = swapped ? rawFrom : rawTo;

  // A future end reports emptiness as if it were data. Clamp to today.
  if (isRealDate(today) && to > today) to = today;
  if (from > to) from = to;

  let clamped = false;
  if (daysBetween(from, to) > CUSTOM_RANGE_MAX_DAYS) {
    from = shiftDate(to, -(CUSTOM_RANGE_MAX_DAYS - 1));
    clamped = true;
  }
  return { from, to, clamped, swapped };
}

/**
 * Range for an explicit window, with the previous window of equal length
 * immediately before it.
 *
 * The equal-length rule is not new here — `reportRange` already compares each
 * preset against "kỳ liền trước cùng số ngày", and the reports heading says so.
 * A custom window follows the same rule so the comparison keeps meaning the same
 * thing across all four periods.
 */
export function customReportRange(from: string, to: string): ReportRange {
  if (!isRealDate(from) || !isRealDate(to) || from > to) throw new Error("invalid_report_range");
  const span = daysBetween(from, to);
  const previousEnd = shiftDate(from, -1);
  return {
    period: "custom",
    currentStart: from,
    currentEnd: to,
    previousStart: shiftDate(previousEnd, -(span - 1)),
    previousEnd,
  };
}

/**
 * The one range entry point callers should use. Presets keep their existing
 * behaviour; `custom` needs `from`/`to` and falls back to the month preset when
 * they are unusable, so a mangled URL still renders a report.
 */
export function resolveReportRange(
  today: string,
  period: ReportPeriod,
  custom?: CustomRangeInput,
): ReportRange {
  if (period !== "custom") return reportRange(today, period);
  const normalized = normalizeCustomRange(custom ?? {}, today);
  if (!normalized) return reportRange(today, "month");
  return customReportRange(normalized.from, normalized.to);
}

/**
 * Human period title for reports heading.
 * Month is the product default — “Tháng 7/2026”, not a vague range only.
 */
export function formatReportPeriodTitle(
  period: ReportPeriod,
  currentStart: string,
  currentEnd?: string,
): string {
  if (!ISO_DATE.test(currentStart)) return "Báo cáo";
  const year = Number(currentStart.slice(0, 4));
  const month = Number(currentStart.slice(5, 7));
  if (period === "custom") {
    // The dates themselves are the title. The caller passes currentEnd so the
    // heading reads as the window the reader chose, not a preset name.
    if (!currentEnd || !ISO_DATE.test(currentEnd)) return "Khoảng tự chọn";
    const day = (value: string) => `${Number(value.slice(8, 10))}/${Number(value.slice(5, 7))}`;
    const sameYear = currentStart.slice(0, 4) === currentEnd.slice(0, 4);
    return sameYear
      ? `${day(currentStart)} – ${day(currentEnd)}/${currentEnd.slice(0, 4)}`
      : `${day(currentStart)}/${currentStart.slice(0, 4)} – ${day(currentEnd)}/${currentEnd.slice(0, 4)}`;
  }
  if (period === "year") return `Năm ${year}`;
  if (period === "week") return "Tuần này";
  return `Tháng ${month}/${year}`;
}

/** Short period tab labels (segmented control). */
export const REPORT_PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "year", label: "Năm nay" },
];

export function reportRange(today: string, period: ReportPeriod): ReportRange {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error("invalid_report_date");
  const current = parseDate(today);
  let currentStart: string;
  if (period === "week") {
    const daysSinceMonday = (current.getUTCDay() + 6) % 7;
    currentStart = shiftDate(today, -daysSinceMonday);
  } else if (period === "year") {
    currentStart = `${today.slice(0, 4)}-01-01`;
  } else {
    currentStart = `${today.slice(0, 7)}-01`;
  }
  const elapsedDays = Math.round((current.getTime() - parseDate(currentStart).getTime()) / DAY_MS) + 1;
  const previousEnd = shiftDate(currentStart, -1);
  return {
    period,
    currentStart,
    currentEnd: today,
    previousStart: shiftDate(previousEnd, -(elapsedDays - 1)),
    previousEnd,
  };
}

function safeAdd(total: number, amount: number) {
  const next = total + amount;
  if (!Number.isSafeInteger(next)) throw new Error("unsafe_report_total");
  return next;
}

function safeDifference(left: number, right: number) {
  const result = left - right;
  if (!Number.isSafeInteger(result)) throw new Error("unsafe_report_total");
  return result;
}

function sumKind(transactions: Transaction[], kind: "income" | "expense") {
  return transactions.filter((item) => item.kind === kind).reduce((sum, item) => safeAdd(sum, item.amount), 0);
}

function inRange(transaction: Transaction, start: string, end: string) {
  return transaction.occurredOn >= start && transaction.occurredOn <= end;
}

function trendBuckets(range: ReportRange) {
  const buckets: { key: string; label: string }[] = [];
  // Monthly for the year preset, and for any window too long to read one bar per
  // day. Bucketing is chosen by span rather than by period name so a 90-day custom
  // window cannot produce 90 bars the chart was never shaped for.
  const monthly =
    range.period === "year" ||
    daysBetween(range.currentStart, range.currentEnd) > TREND_DAILY_MAX_DAYS;
  if (monthly) {
    let cursor = range.currentStart.slice(0, 7);
    const end = range.currentEnd.slice(0, 7);
    while (cursor <= end) {
      const month = Number(cursor.slice(5, 7));
      buckets.push({ key: cursor, label: `Thg ${month}` });
      const next = parseDate(`${cursor}-01`);
      next.setUTCMonth(next.getUTCMonth() + 1);
      cursor = dateString(next).slice(0, 7);
    }
    return buckets;
  }
  let cursor = range.currentStart;
  while (cursor <= range.currentEnd) {
    const date = parseDate(cursor);
    buckets.push({ key: cursor, label: `${date.getUTCDate()}/${date.getUTCMonth() + 1}` });
    cursor = shiftDate(cursor, 1);
  }
  return buckets;
}

export function buildFinancialReport(transactions: Transaction[], range: ReportRange): FinancialReport {
  const current = transactions.filter((item) => inRange(item, range.currentStart, range.currentEnd));
  const previousTransactions = transactions.filter((item) => inRange(item, range.previousStart, range.previousEnd));
  const income = sumKind(current, "income");
  const expense = sumKind(current, "expense");
  const previousIncome = sumKind(previousTransactions, "income");
  const previousExpense = sumKind(previousTransactions, "expense");
  const categoryTotals = new Map<string, number>();
  for (const item of current) {
    if (item.kind !== "expense") continue;
    if (item.splits && item.splits.length >= 2) {
      for (const line of item.splits) {
        if (!line.category || !Number.isSafeInteger(line.amount) || line.amount <= 0) continue;
        categoryTotals.set(line.category, safeAdd(categoryTotals.get(line.category) ?? 0, line.amount));
      }
      continue;
    }
    categoryTotals.set(item.category, safeAdd(categoryTotals.get(item.category) ?? 0, item.amount));
  }
  const categories = [...categoryTotals.entries()]
    .map(([name, amount]) => ({ name, amount, share: expense ? Math.round((amount / expense) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount);
  /*
   * One pass over the same expense rows, taking each row whole. Transfers are
   * already excluded by matching `kind`, which is what keeps this honest: a
   * transfer moves the user's own money between their own accounts, so counting
   * it as money leaving would inflate the funding account while nothing left
   * the user.
   */
  const accountTotals = new Map<string, number>();
  for (const item of current) {
    if (item.kind !== "expense") continue;
    const name = item.account;
    if (!name) continue;
    accountTotals.set(name, safeAdd(accountTotals.get(name) ?? 0, item.amount));
  }
  const accounts = [...accountTotals.entries()]
    .map(([name, amount]) => ({ name, amount, share: expense ? Math.round((amount / expense) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount);
  const trend = trendBuckets(range).map((bucket) => {
    // A monthly bucket key is `YYYY-MM`; a daily one is a full date. Matching on
    // key length keeps this in step with trendBuckets without repeating its rule.
    const matches = current.filter((item) =>
      bucket.key.length === 7 ? item.occurredOn.startsWith(bucket.key) : item.occurredOn === bucket.key);
    return { ...bucket, income: sumKind(matches, "income"), expense: sumKind(matches, "expense") };
  });
  return {
    range,
    totals: { income, expense, net: safeDifference(income, expense), transactions: current.length },
    previous: { income: previousIncome, expense: previousExpense, net: safeDifference(previousIncome, previousExpense) },
    expenseChangePercent: previousExpense === 0 ? null : Math.round(((expense - previousExpense) / previousExpense) * 100),
    categories,
    accounts,
    trend,
  };
}

/** Escape a CSV cell; prefixes formulas to reduce spreadsheet injection risk. */
export function escapeCsvCell(value: string | number) {
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

/** Build UTF-8 BOM CSV from header + row matrix (integer money as-is). */
export function rowsToCsv(header: string[], rows: Array<Array<string | number>>) {
  return `\uFEFF${[header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}\r\n`;
}

export function transactionsToCsv(transactions: Transaction[]) {
  const header = ["Ngày", "Loại", "Ghi chú", "Danh mục", "Tài khoản nguồn", "Tài khoản đích", "Số tiền (VND)"];
  const rows: Array<Array<string | number>> = [];
  for (const item of transactions) {
    if (item.kind === "expense" && item.splits && item.splits.length >= 2) {
      for (const line of item.splits) {
        rows.push([
          item.occurredOn,
          "Chi tiêu",
          item.note,
          line.category,
          item.account,
          "",
          -line.amount,
        ]);
      }
      continue;
    }
    rows.push([
      item.occurredOn,
      item.kind === "income" ? "Thu nhập" : item.kind === "expense" ? "Chi tiêu" : "Chuyển tiền",
      item.note,
      item.category,
      item.account,
      item.destinationAccount ?? "",
      item.kind === "expense" ? -item.amount : item.kind === "income" ? item.amount : item.amount,
    ]);
  }
  return rowsToCsv(header, rows);
}
