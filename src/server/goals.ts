import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { goalTotals, type SavingsGoal } from "@/lib/goals";
import { requireViewer } from "@/server/auth";
import { currentDateInVietnam } from "@/server/commitments";

export type GoalsWorkspace = { goals: SavingsGoal[]; today: string; allocatedTotal: number; plannedDaily: number; dataError: string | null };
const goalSchema = z.object({ id: z.string().uuid(), name: z.string().min(1), target_minor: z.union([z.number(), z.string()]), allocated_minor: z.union([z.number(), z.string()]), deadline: z.string().nullable(), is_archived: z.boolean() });

function safeMoney(value: unknown) { const amount = Number(value); if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("invalid_goal_money"); return amount; }
export function mapGoalRow(value: unknown): SavingsGoal { const row = goalSchema.parse(value); const target = safeMoney(row.target_minor); const allocated = safeMoney(row.allocated_minor); if (target <= 0 || allocated > target) throw new Error("invalid_goal_progress"); return { id: row.id, name: row.name, target, allocated, deadline: row.deadline, isArchived: row.is_archived }; }

function demoWorkspace(today: string): GoalsWorkspace {
  const goals: SavingsGoal[] = [
    { id: "demo-goal-emergency", name: "Quỹ khẩn cấp", target: 6_000_000, allocated: 2_400_000, deadline: "2026-09-30", isArchived: false },
    { id: "demo-goal-laptop", name: "Laptop mới", target: 20_000_000, allocated: 5_000_000, deadline: "2027-01-31", isArchived: false },
  ];
  const totals = goalTotals(goals, today); return { goals, today, allocatedTotal: totals.allocated, plannedDaily: totals.plannedDaily, dataError: null };
}

export async function getGoalsWorkspace(): Promise<GoalsWorkspace> {
  const viewer = await requireViewer(); const today = currentDateInVietnam(); if (viewer.isDemo) return demoWorkspace(today);
  const supabase = await createClient(); if (!supabase) return { goals: [], today, allocatedTotal: 0, plannedDaily: 0, dataError: "Không thể kết nối dữ liệu mục tiêu." };
  const { data, error } = await supabase.from("savings_goals").select("id,name,target_minor,allocated_minor,deadline,is_archived").order("is_archived").order("deadline", { nullsFirst: false });
  if (error) return { goals: [], today, allocatedTotal: 0, plannedDaily: 0, dataError: "Chưa tải được mục tiêu tiết kiệm. Hãy thử lại." };
  try { const goals = z.array(z.unknown()).parse(data).map(mapGoalRow); const totals = goalTotals(goals, today); return { goals, today, allocatedTotal: totals.allocated, plannedDaily: totals.plannedDaily, dataError: null }; }
  catch { return { goals: [], today, allocatedTotal: 0, plannedDaily: 0, dataError: "Dữ liệu mục tiêu không đúng định dạng." }; }
}
