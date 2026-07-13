"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { BudgetSummary, SaveBudgetInput } from "@/lib/budgets";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";
import { mapBudgetRow } from "@/server/budgets";

export type BudgetActionResult =
  | { ok: true; budget?: BudgetSummary }
  | { ok: false; message: string };

const saveSchema = z.object({
  categoryId: z.string().uuid(),
  monthStart: z.string().regex(/^\d{4}-\d{2}-01$/),
  limit: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});
const idSchema = z.string().uuid();

function refreshBudgetPages() {
  revalidatePath("/");
  revalidatePath("/budgets");
}

export async function saveBudgetAction(input: SaveBudgetInput): Promise<BudgetActionResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Thông tin ngân sách chưa hợp lệ." };
  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: false, message: "Chế độ demo không lưu lên máy chủ." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const { data: budgetId, error } = await supabase.rpc("upsert_monthly_budget", {
    p_category_id: parsed.data.categoryId,
    p_month_start: parsed.data.monthStart,
    p_limit_minor: parsed.data.limit,
  });
  if (error || typeof budgetId !== "string") {
    return { ok: false, message: "Không thể lưu ngân sách. Hãy thử lại." };
  }

  const { data, error: readError } = await supabase
    .from("budget_progress")
    .select("id,category_id,category_name,category_icon,category_color,month_start,limit_minor,spent_minor")
    .eq("id", budgetId)
    .single();
  if (readError || !data) {
    refreshBudgetPages();
    return { ok: false, message: "Đã lưu nhưng chưa tải lại được ngân sách." };
  }

  try {
    const budget = mapBudgetRow(data);
    refreshBudgetPages();
    return { ok: true, budget };
  } catch {
    refreshBudgetPages();
    return { ok: false, message: "Dữ liệu ngân sách trả về không hợp lệ." };
  }
}

export async function deleteBudgetAction(id: string): Promise<BudgetActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, message: "Mã ngân sách không hợp lệ." };
  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: false, message: "Chế độ demo không xóa trên máy chủ." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const { data, error } = await supabase.rpc("delete_monthly_budget", { p_budget_id: parsed.data });
  if (error) return { ok: false, message: "Không thể xóa ngân sách." };
  if (data !== true) return { ok: false, message: "Ngân sách không còn tồn tại." };
  refreshBudgetPages();
  return { ok: true };
}
