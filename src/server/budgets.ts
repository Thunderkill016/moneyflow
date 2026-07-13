import "server-only";

import { z } from "zod";
import type { BudgetSummary } from "@/lib/budgets";
import { demoCategories, type CategoryOption } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";

export type BudgetsWorkspace = {
  budgets: BudgetSummary[];
  categories: CategoryOption[];
  monthStart: string;
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
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("invalid_budget_money");
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

function demoWorkspace(monthStart: string): BudgetsWorkspace {
  const category = (name: string) => demoCategories.find((item) => item.name === name)!;
  const food = category("Ăn uống");
  const transport = category("Di chuyển");
  const shopping = category("Mua sắm");
  return {
    monthStart,
    categories: demoCategories.filter((item) => item.kind === "expense"),
    budgets: [
      { id: "demo-budget-food", categoryId: food.id, categoryName: food.name, categoryIcon: food.icon, categoryColor: food.color, monthStart, limit: 4_000_000, spent: 2_760_000 },
      { id: "demo-budget-transport", categoryId: transport.id, categoryName: transport.name, categoryIcon: transport.icon, categoryColor: transport.color, monthStart, limit: 1_200_000, spent: 420_000 },
      { id: "demo-budget-shopping", categoryId: shopping.id, categoryName: shopping.name, categoryIcon: shopping.icon, categoryColor: shopping.color, monthStart, limit: 2_000_000, spent: 1_100_000 },
    ],
    dataError: null,
  };
}

export async function getBudgetsWorkspace(): Promise<BudgetsWorkspace> {
  const viewer = await requireViewer();
  const monthStart = currentMonthStart();
  if (viewer.isDemo) return demoWorkspace(monthStart);

  const supabase = await createClient();
  if (!supabase) return { budgets: [], categories: [], monthStart, dataError: "Không thể kết nối dữ liệu ngân sách." };

  const [budgetsResult, categoriesResult] = await Promise.all([
    supabase
      .from("budget_progress")
      .select("id,category_id,category_name,category_icon,category_color,month_start,limit_minor,spent_minor")
      .eq("month_start", monthStart)
      .order("category_name"),
    supabase
      .from("categories")
      .select("id,name,kind,icon,color")
      .eq("kind", "expense")
      .order("created_at"),
  ]);

  if (budgetsResult.error || categoriesResult.error) {
    return { budgets: [], categories: [], monthStart, dataError: "Chưa tải được ngân sách. Hãy thử lại." };
  }

  try {
    return {
      budgets: (budgetsResult.data ?? []).map(mapBudgetRow),
      categories: z.array(categorySchema).parse(categoriesResult.data),
      monthStart,
      dataError: null,
    };
  } catch {
    return { budgets: [], categories: [], monthStart, dataError: "Dữ liệu ngân sách không đúng định dạng." };
  }
}
