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
