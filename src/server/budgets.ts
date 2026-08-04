import "server-only";

import { z } from "zod";
import {
  resolveBudgetMonth,
  type BudgetMonthAdjustment,
  type BudgetMonthResolution,
  type BudgetSummary,
} from "@/lib/planning/budgets";
import type { CategoryOption } from "@/lib/transactions/contracts";
import { demoCategories } from "@/lib/demo/transaction-fixtures";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";

export type BudgetsWorkspace = {
  budgets: BudgetSummary[];
  previousBudgets: BudgetSummary[];
  categories: CategoryOption[];
  monthStart: string;
  monthEnd: string;
  previousMonthStart: string;
  nextMonthStart: string;
  canGoNext: boolean;
  adjustment: BudgetMonthAdjustment;
  dataError: string | null;
};

const budgetSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  category_name: z.string(),
  category_icon: z.string().nullable(),
  category_color: z.string().nullable(),
  month_start: z.string(),
  limit_minor: z.union([z.number(), z.string()]),
  spent_minor: z.union([z.number(), z.string()]),
});
const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  kind: z.literal("expense"),
  icon: z.string().nullable(),
  color: z.string().nullable(),
});

export function currentMonthStart() {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  return `${date}-01`;
}

function safePositiveMoney(value: unknown) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error("invalid_budget_money");
  }
  return amount;
}

export function mapBudgetRow(value: unknown): BudgetSummary {
  const row = budgetSchema.parse(value);
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
    categoryColor: row.category_color,
    monthStart: row.month_start,
    limit: safePositiveMoney(row.limit_minor),
    spent: safePositiveMoney(row.spent_minor),
  };
}

function workspaceMetadata(resolution: BudgetMonthResolution) {
  return {
    monthStart: resolution.monthStart,
    monthEnd: resolution.monthEnd,
    previousMonthStart: resolution.previousMonthStart,
    nextMonthStart: resolution.nextMonthStart,
    canGoNext: resolution.canGoNext,
    adjustment: resolution.adjustment,
  };
}

function demoRows(monthStart: string, variant: "current" | "previous") {
  const category = (name: string) =>
    demoCategories.find((item) => item.name === name)!;
  const food = category("Ăn uống");
  const transport = category("Di chuyển");
  const shopping = category("Mua sắm");
  const values =
    variant === "current"
      ? {
          food: { limit: 4_000_000, spent: 2_760_000 },
          transport: { limit: 1_200_000, spent: 420_000 },
          shopping: { limit: 2_000_000, spent: 1_100_000 },
        }
      : {
          food: { limit: 3_800_000, spent: 2_940_000 },
          transport: { limit: 1_100_000, spent: 510_000 },
          shopping: { limit: 2_200_000, spent: 980_000 },
        };

  return [
    {
      id: `demo-budget-food-${monthStart}`,
      categoryId: food.id,
      categoryName: food.name,
      categoryIcon: food.icon,
      categoryColor: food.color,
      monthStart,
      ...values.food,
    },
    {
      id: `demo-budget-transport-${monthStart}`,
      categoryId: transport.id,
      categoryName: transport.name,
      categoryIcon: transport.icon,
      categoryColor: transport.color,
      monthStart,
      ...values.transport,
    },
    {
      id: `demo-budget-shopping-${monthStart}`,
      categoryId: shopping.id,
      categoryName: shopping.name,
      categoryIcon: shopping.icon,
      categoryColor: shopping.color,
      monthStart,
      ...values.shopping,
    },
  ] satisfies BudgetSummary[];
}

function demoWorkspace(
  resolution: BudgetMonthResolution,
  currentStart: string,
): BudgetsWorkspace {
  const selectedIsCurrent = resolution.monthStart === currentStart;
  const selectedIsImmediatePrevious = resolution.nextMonthStart === currentStart;

  return {
    ...workspaceMetadata(resolution),
    categories: demoCategories.filter((item) => item.kind === "expense"),
    budgets: selectedIsCurrent
      ? demoRows(resolution.monthStart, "current")
      : selectedIsImmediatePrevious
        ? demoRows(resolution.monthStart, "previous")
        : [],
    previousBudgets: selectedIsCurrent
      ? demoRows(resolution.previousMonthStart, "previous")
      : [],
    dataError: null,
  };
}

export async function getBudgetsWorkspace(
  requestedMonth?: string | null,
): Promise<BudgetsWorkspace> {
  const viewer = await requireViewer();
  const currentStart = currentMonthStart();
  const resolution = resolveBudgetMonth(requestedMonth, currentStart);
  if (viewer.isDemo) return demoWorkspace(resolution, currentStart);

  const supabase = await createClient();
  if (!supabase) {
    return {
      ...workspaceMetadata(resolution),
      budgets: [],
      previousBudgets: [],
      categories: [],
      dataError: "Không thể kết nối dữ liệu ngân sách.",
    };
  }

  const [budgetsResult, categoriesResult] = await Promise.all([
    supabase
      .from("budget_progress")
      .select(
        "id,category_id,category_name,category_icon,category_color,month_start,limit_minor,spent_minor",
      )
      .eq("user_id", viewer.id)
      .in("month_start", [resolution.monthStart, resolution.previousMonthStart])
      .order("month_start", { ascending: false })
      .order("category_name"),
    supabase
      .from("categories")
      .select("id,name,kind,icon,color")
      .eq("user_id", viewer.id)
      .eq("kind", "expense")
      .eq("is_archived", false)
      .order("created_at"),
  ]);

  if (budgetsResult.error || categoriesResult.error) {
    return {
      ...workspaceMetadata(resolution),
      budgets: [],
      previousBudgets: [],
      categories: [],
      dataError: "Chưa tải được ngân sách. Hãy thử lại.",
    };
  }

  try {
    const rows = (budgetsResult.data ?? []).map(mapBudgetRow);
    return {
      ...workspaceMetadata(resolution),
      budgets: rows.filter((item) => item.monthStart === resolution.monthStart),
      previousBudgets: rows.filter(
        (item) => item.monthStart === resolution.previousMonthStart,
      ),
      categories: z.array(categorySchema).parse(categoriesResult.data),
      dataError: null,
    };
  } catch {
    return {
      ...workspaceMetadata(resolution),
      budgets: [],
      previousBudgets: [],
      categories: [],
      dataError: "Dữ liệu ngân sách không đúng định dạng.",
    };
  }
}
