import type { Transaction } from "../sample-data.ts";
import { formatMoney } from "../money.ts";

export type BudgetSummary = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  monthStart: string;
  limit: number;
  spent: number;
};

export type BudgetMonthAdjustment = "invalid" | "future" | null;

export type BudgetMonthResolution = {
  monthKey: string;
  monthStart: string;
  monthEnd: string;
  previousMonthStart: string;
  nextMonthStart: string;
  canGoNext: boolean;
  adjustment: BudgetMonthAdjustment;
};

export type BudgetAmountComparison =
  | { state: "unavailable"; difference: null }
  | { state: "same"; difference: 0 }
  | { state: "increase" | "decrease"; difference: number };

const monthKeyPattern = /^(\d{4})-(\d{2})$/;
const monthStartPattern = /^(\d{4})-(\d{2})-01$/;

function parseMonthParts(value: string, pattern: RegExp) {
  const match = pattern.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function monthStartFromParts(year: number, month: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
}

export function budgetMonthKey(monthStart: string) {
  const parts = parseMonthParts(monthStart, monthStartPattern);
  if (!parts) throw new Error("invalid_budget_month_start");
  return monthStart.slice(0, 7);
}

export function shiftBudgetMonth(monthStart: string, offset: number) {
  const parts = parseMonthParts(monthStart, monthStartPattern);
  if (!parts || !Number.isInteger(offset)) {
    throw new Error("invalid_budget_month_shift");
  }
  const absoluteMonth = parts.year * 12 + (parts.month - 1) + offset;
  const year = Math.floor(absoluteMonth / 12);
  const month = ((absoluteMonth % 12) + 12) % 12;
  if (year < 1 || year > 9999) throw new Error("budget_month_out_of_range");
  return monthStartFromParts(year, month + 1);
}

export function budgetMonthEnd(monthStart: string) {
  const nextMonthStart = shiftBudgetMonth(monthStart, 1);
  const nextParts = parseMonthParts(nextMonthStart, monthStartPattern);
  if (!nextParts) throw new Error("invalid_budget_month_end");
  const lastDay = new Date(Date.UTC(nextParts.year, nextParts.month - 1, 0)).getUTCDate();
  return `${monthStart.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
}

export function resolveBudgetMonth(
  requestedMonth: string | null | undefined,
  currentMonthStart: string,
): BudgetMonthResolution {
  const currentParts = parseMonthParts(currentMonthStart, monthStartPattern);
  if (!currentParts) throw new Error("invalid_current_budget_month");

  const requestedParts = requestedMonth
    ? parseMonthParts(requestedMonth, monthKeyPattern)
    : null;
  const requestedStart = requestedParts
    ? monthStartFromParts(requestedParts.year, requestedParts.month)
    : null;

  let monthStart = currentMonthStart;
  let adjustment: BudgetMonthAdjustment = null;

  if (requestedMonth && !requestedStart) {
    adjustment = "invalid";
  } else if (requestedStart && requestedStart > currentMonthStart) {
    adjustment = "future";
  } else if (requestedStart) {
    monthStart = requestedStart;
  }

  return {
    monthKey: budgetMonthKey(monthStart),
    monthStart,
    monthEnd: budgetMonthEnd(monthStart),
    previousMonthStart: shiftBudgetMonth(monthStart, -1),
    nextMonthStart: shiftBudgetMonth(monthStart, 1),
    canGoNext: monthStart < currentMonthStart,
    adjustment,
  };
}

export function compareBudgetAmount(
  current: number,
  previous: number | null,
): BudgetAmountComparison {
  if (!Number.isSafeInteger(current)) throw new Error("invalid_current_budget_amount");
  if (previous === null) return { state: "unavailable", difference: null };
  if (!Number.isSafeInteger(previous)) throw new Error("invalid_previous_budget_amount");
  const difference = current - previous;
  if (!Number.isSafeInteger(difference)) throw new Error("invalid_budget_difference");
  if (difference === 0) return { state: "same", difference: 0 };
  return {
    state: difference > 0 ? "increase" : "decrease",
    difference,
  };
}

export function budgetTransactionsHref(monthStart: string, categoryName: string) {
  const params = new URLSearchParams({
    from: monthStart,
    to: budgetMonthEnd(monthStart),
    category: categoryName,
    kind: "expense",
  });
  return `/transactions?${params.toString()}`;
}

/**
 * Sum of expense amounts for a category in a month (YYYY-MM…).
 * Transfers and income never count toward budget spent.
 * Soft-deleted rows must already be excluded from `transactions`.
 */
export function sumBudgetSpent(
  transactions: Transaction[],
  categoryId: string,
  monthStart: string,
): number {
  const monthPrefix = monthStart.slice(0, 7);
  let spent = 0;
  for (const item of transactions) {
    if (item.kind !== "expense") continue;
    if (!item.occurredOn.startsWith(monthPrefix)) continue;

    // Multi-entry split: only the portion for this category counts.
    if (item.splits && item.splits.length >= 2) {
      for (const line of item.splits) {
        if (line.categoryId !== categoryId) continue;
        if (!Number.isSafeInteger(line.amount) || line.amount <= 0) continue;
        const next = spent + line.amount;
        if (!Number.isSafeInteger(next)) continue;
        spent = next;
      }
      continue;
    }

    if (item.categoryId !== categoryId) continue;
    if (!Number.isSafeInteger(item.amount) || item.amount <= 0) continue;
    const next = spent + item.amount;
    if (!Number.isSafeInteger(next)) continue;
    spent = next;
  }
  return spent;
}

export type SaveBudgetInput = {
  categoryId: string;
  monthStart: string;
  limit: number;
};

/** Calm threshold bands — colors must pair with text, never color alone. */
export type BudgetThreshold = "ok" | "watch" | "near" | "over";

export function budgetProgress(budget: Pick<BudgetSummary, "spent" | "limit">) {
  if (budget.limit <= 0) return 0;
  return Math.max(0, Math.round((budget.spent / budget.limit) * 100));
}

export function budgetRemaining(budget: Pick<BudgetSummary, "spent" | "limit">) {
  return budget.limit - budget.spent;
}

/**
 * Threshold from progress %:
 * - ok: under 50%
 * - watch: 50–79%
 * - near: 80–99% → UI "Gần hạn mức"
 * - over: 100%+ → UI "Đã vượt X"
 */
export function budgetThreshold(budget: Pick<BudgetSummary, "spent" | "limit">): BudgetThreshold {
  const progress = budgetProgress(budget);
  if (progress >= 100) return "over";
  if (progress >= 80) return "near";
  if (progress >= 50) return "watch";
  return "ok";
}

/**
 * Non-judgmental Vietnamese status (no guilt language).
 * Always returns text so status is not color-only.
 */
export function budgetStatusLabel(
  budget: Pick<BudgetSummary, "spent" | "limit">,
  format: (minorUnits: number) => string = formatMoney,
): string {
  const remaining = budgetRemaining(budget);
  const level = budgetThreshold(budget);
  if (level === "over") {
    return `Đã vượt ${format(Math.abs(remaining))}`;
  }
  if (level === "near") {
    return "Gần hạn mức";
  }
  return `Còn ${format(Math.max(0, remaining))}`;
}

/** CSS-friendly bar fill for threshold (pair with `budgetStatusLabel`). */
export function budgetBarColor(level: BudgetThreshold): string {
  switch (level) {
    case "over":
      return "var(--color-danger-default)";
    case "near":
      return "#f97316";
    case "watch":
      return "var(--color-warning-default)";
    default:
      return "var(--color-success-default)";
  }
}
