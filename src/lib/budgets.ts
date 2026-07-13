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

export function budgetProgress(budget: Pick<BudgetSummary, "spent" | "limit">) {
  if (budget.limit <= 0) return 0;
  return Math.max(0, Math.round((budget.spent / budget.limit) * 100));
}

export function budgetRemaining(budget: Pick<BudgetSummary, "spent" | "limit">) {
  return budget.limit - budget.spent;
}
