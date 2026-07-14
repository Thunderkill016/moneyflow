import type { Transaction } from "./sample-data.ts";
import { formatMoney } from "./money.ts";

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
    if (item.categoryId !== categoryId) continue;
    if (!item.occurredOn.startsWith(monthPrefix)) continue;
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
