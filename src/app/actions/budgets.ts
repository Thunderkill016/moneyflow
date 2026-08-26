"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { BudgetSummary, SaveBudgetInput } from "@/lib/planning/budgets";
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
  revalidatePath("/insights");
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

export type CarryForwardResult =
  | { ok: true; budgets: BudgetSummary[] }
  | { ok: false; message: string };

/**
 * Apply last month's limits to categories the target month has no budget for.
 *
 * The caller decides *what* to carry through `budgetsToCarryForward`, which
 * refuses to touch a category the user has already budgeted this month. This
 * action re-derives nothing: it validates the list it is given and writes it
 * through the same `upsert_monthly_budget` RPC a single save uses, so there is
 * one write path for budgets rather than two that can drift apart.
 *
 * A partial failure returns what was written rather than discarding it. These
 * are plans, not ledger facts — leaving four of six categories filled is a
 * recoverable, visible state, whereas rolling back would silently undo work the
 * user asked for.
 */
export async function carryForwardBudgetsAction(
  inputs: SaveBudgetInput[],
): Promise<CarryForwardResult> {
  const parsed = z.array(saveSchema).min(1).max(100).safeParse(inputs);
  if (!parsed.success) return { ok: false, message: "Danh sách ngân sách chưa hợp lệ." };

  const months = new Set(parsed.data.map((item) => item.monthStart));
  if (months.size > 1) {
    return { ok: false, message: "Chỉ áp dụng cho một tháng mỗi lần." };
  }
  const categories = new Set(parsed.data.map((item) => item.categoryId));
  if (categories.size !== parsed.data.length) {
    return { ok: false, message: "Một danh mục chỉ được đặt một hạn mức." };
  }

  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: false, message: "Chế độ demo không lưu lên máy chủ." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const budgets: BudgetSummary[] = [];
  for (const input of parsed.data) {
    const { data: budgetId, error } = await supabase.rpc("upsert_monthly_budget", {
      p_category_id: input.categoryId,
      p_month_start: input.monthStart,
      p_limit_minor: input.limit,
    });
    if (error || typeof budgetId !== "string") break;

    const { data, error: readError } = await supabase
      .from("budget_progress")
      .select(
        "id,category_id,category_name,category_icon,category_color,month_start,limit_minor,spent_minor",
      )
      .eq("id", budgetId)
      .single();
    if (readError || !data) break;

    try {
      budgets.push(mapBudgetRow(data));
    } catch {
      break;
    }
  }

  if (budgets.length === 0) {
    return { ok: false, message: "Không thể áp dụng ngân sách tháng trước." };
  }
  refreshBudgetPages();
  return { ok: true, budgets };
}
