import type { Transaction } from "./sample-data.ts";

export type ReportPeriod = "week" | "month" | "year";

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
  return value === "week" || value === "year" ? value : "month";
}

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
  if (range.period === "year") {
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
    categoryTotals.set(item.category, safeAdd(categoryTotals.get(item.category) ?? 0, item.amount));
  }
  const categories = [...categoryTotals.entries()]
    .map(([name, amount]) => ({ name, amount, share: expense ? Math.round((amount / expense) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount);
  const trend = trendBuckets(range).map((bucket) => {
    const matches = current.filter((item) => range.period === "year" ? item.occurredOn.startsWith(bucket.key) : item.occurredOn === bucket.key);
    return { ...bucket, income: sumKind(matches, "income"), expense: sumKind(matches, "expense") };
  });
  return {
    range,
    totals: { income, expense, net: safeDifference(income, expense), transactions: current.length },
    previous: { income: previousIncome, expense: previousExpense, net: safeDifference(previousIncome, previousExpense) },
    expenseChangePercent: previousExpense === 0 ? null : Math.round(((expense - previousExpense) / previousExpense) * 100),
    categories,
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
  const rows = transactions.map((item) => [
    item.occurredOn,
    item.kind === "income" ? "Thu nhập" : item.kind === "expense" ? "Chi tiêu" : "Chuyển tiền",
    item.note,
    item.category,
    item.account,
    item.destinationAccount ?? "",
    item.kind === "expense" ? -item.amount : item.kind === "income" ? item.amount : item.amount,
  ]);
  return rowsToCsv(header, rows);
}
