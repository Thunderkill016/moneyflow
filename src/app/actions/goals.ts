"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SaveGoalInput, SavingsGoal } from "@/lib/planning/goals";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";
import { mapGoalRow } from "@/server/goals";

export type GoalActionResult = { ok: true; goal?: SavingsGoal; allocated?: number } | { ok: false; message: string };
const saveSchema = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1).max(80), target: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable() });
const idSchema = z.string().uuid();
function refresh() { revalidatePath("/"); revalidatePath("/goals"); revalidatePath("/insights"); }

export async function saveGoalAction(input: SaveGoalInput): Promise<GoalActionResult> {
  const parsed = saveSchema.safeParse(input); if (!parsed.success) return { ok: false, message: "Thông tin mục tiêu chưa hợp lệ." };
  const viewer = await requireViewer(); if (viewer.isDemo) return { ok: false, message: "Chế độ demo không lưu lên máy chủ." };
  const supabase = await createClient(); if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };
  const value = parsed.data; const { data: id, error } = await supabase.rpc("upsert_savings_goal", { p_goal_id: value.id ?? null, p_name: value.name, p_target_minor: value.target, p_deadline: value.deadline });
  if (error || typeof id !== "string") return { ok: false, message: "Không thể lưu mục tiêu. Mức đích không được thấp hơn tiền đã dành." };
  const { data, error: readError } = await supabase.from("savings_goals").select("id,name,target_minor,allocated_minor,deadline,is_archived").eq("id", id).single();
  if (readError || !data) { refresh(); return { ok: false, message: "Đã lưu nhưng chưa tải lại được mục tiêu." }; }
  try { const goal = mapGoalRow(data); refresh(); return { ok: true, goal }; } catch { refresh(); return { ok: false, message: "Dữ liệu mục tiêu trả về không hợp lệ." }; }
}

export async function adjustGoalAction(id: string, amount: number): Promise<GoalActionResult> {
  if (!idSchema.safeParse(id).success || !Number.isSafeInteger(amount) || amount === 0) return { ok: false, message: "Số tiền điều chỉnh chưa hợp lệ." };
  const viewer = await requireViewer(); if (viewer.isDemo) return { ok: false, message: "Chế độ demo không lưu lên máy chủ." };
  const supabase = await createClient(); if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };
  const { data, error } = await supabase.rpc("adjust_savings_goal", { p_goal_id: id, p_amount_minor: amount });
  const allocated = Number(data); if (error || !Number.isSafeInteger(allocated) || allocated < 0) return { ok: false, message: amount > 0 ? "Không đủ số dư chưa được giữ trước hoặc số tiền vượt mục tiêu." : "Không thể rút quá số tiền đã dành." };
  refresh(); return { ok: true, allocated };
}

export async function archiveGoalAction(id: string, archived: boolean): Promise<GoalActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Mã mục tiêu không hợp lệ." };
  const viewer = await requireViewer(); if (viewer.isDemo) return { ok: false, message: "Chế độ demo không lưu lên máy chủ." };
  const supabase = await createClient(); if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };
  const { data, error } = await supabase.rpc("set_savings_goal_archived", { p_goal_id: id, p_archived: archived });
  if (error || data !== true) return { ok: false, message: archived ? "Hãy rút hết tiền đã dành trước khi lưu trữ." : "Không thể khôi phục mục tiêu." };
  refresh(); return { ok: true };
}
