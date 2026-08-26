import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { goalTotals, type SavingsGoal } from "@/lib/planning/goals";
import { mapCommitmentRow } from "@/server/commitments";
import { reservePicture, type ReservePicture } from "@/lib/planning/reserve";
import { currentMonthStart } from "@/server/budgets";
import { requireViewer } from "@/server/auth";
import { todayInVietnam } from "@/lib/vietnam-date";

export type GoalsWorkspace = {
  goals: SavingsGoal[];
  today: string;
  allocatedTotal: number;
  plannedDaily: number;
  /**
   * What the user's money is actually free for, restating the arithmetic
   * `adjust_savings_goal` already enforces. Null when it cannot be derived —
   * showing a guessed figure would be worse than showing none, because the RPC
   * would then refuse an allocation the screen had promised.
   */
  reserve: ReservePicture | null;
  dataError: string | null;
};
const goalSchema = z.object({ id: z.string().uuid(), name: z.string().min(1), target_minor: z.union([z.number(), z.string()]), allocated_minor: z.union([z.number(), z.string()]), deadline: z.string().nullable(), is_archived: z.boolean() });

function safeMoney(value: unknown) { const amount = Number(value); if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("invalid_goal_money"); return amount; }
export function mapGoalRow(value: unknown): SavingsGoal { const row = goalSchema.parse(value); const target = safeMoney(row.target_minor); const allocated = safeMoney(row.allocated_minor); if (target <= 0 || allocated > target) throw new Error("invalid_goal_progress"); return { id: row.id, name: row.name, target, allocated, deadline: row.deadline, isArchived: row.is_archived }; }

function demoWorkspace(today: string): GoalsWorkspace {
  const goals: SavingsGoal[] = [
    { id: "demo-goal-emergency", name: "Quỹ khẩn cấp", target: 6_000_000, allocated: 2_400_000, deadline: "2026-09-30", isArchived: false },
    { id: "demo-goal-laptop", name: "Laptop mới", target: 20_000_000, allocated: 5_000_000, deadline: "2027-01-31", isArchived: false },
  ];
  const totals = goalTotals(goals, today);
  /*
   * Demo balances and commitments live in browser storage owned by other
   * surfaces, so the server cannot derive the reserve here. Null rather than an
   * invented figure — demo money is fictional, but the arithmetic shown about
   * it should not be.
   */
  return { goals, today, allocatedTotal: totals.allocated, plannedDaily: totals.plannedDaily, reserve: null, dataError: null };
}

export async function getGoalsWorkspace(): Promise<GoalsWorkspace> {
  const viewer = await requireViewer(); const today = todayInVietnam(); if (viewer.isDemo) return demoWorkspace(today);
  const supabase = await createClient(); if (!supabase) return { goals: [], today, allocatedTotal: 0, plannedDaily: 0, reserve: null, dataError: "Không thể kết nối dữ liệu mục tiêu." };
  /*
   * The three reads the RPC's own guard makes, so the figure shown matches the
   * figure enforced. The commitment month is the current one from
   * `currentMonthStart()`, mirroring `date_trunc('month', now())` in the SQL.
   */
  const monthStart = currentMonthStart();
  const [{ data, error }, balancesResult, commitmentsResult, occurrencesResult] = await Promise.all([
    supabase.from("savings_goals").select("id,name,target_minor,allocated_minor,deadline,is_archived").order("is_archived").order("deadline", { nullsFirst: false }),
    supabase.from("account_balances").select("balance_minor").eq("user_id", viewer.id),
    supabase
      .from("recurring_commitment_feed")
      .select("id,name,amount_minor,due_day,account_id,account_name,category_id,category_name,category_icon,category_color,is_archived"),
    supabase
      .from("commitment_occurrences")
      .select("commitment_id,transaction_id")
      .eq("month_start", monthStart),
  ]);
  if (error) return { goals: [], today, allocatedTotal: 0, plannedDaily: 0, reserve: null, dataError: "Chưa tải được mục tiêu tiết kiệm. Hãy thử lại." };
  try {
    const goals = z.array(z.unknown()).parse(data).map(mapGoalRow);
    const totals = goalTotals(goals, today);
    /*
     * Null rather than a guess when any input read failed: a figure that
     * disagreed with the RPC would promise money the user is then refused.
     */
    let reserve = null;
    if (!balancesResult.error && !commitmentsResult.error && !occurrencesResult.error) {
      const paid = new Map(
        (occurrencesResult.data ?? []).map((row) => [row.commitment_id, row.transaction_id]),
      );
      const commitments = (commitmentsResult.data ?? []).map((row) =>
        mapCommitmentRow(row, monthStart, paid.get(row.id) ?? null),
      );
      const balance = (balancesResult.data ?? []).reduce((sum, row) => {
        const next = sum + Number(row.balance_minor);
        if (!Number.isSafeInteger(next)) throw new Error("unsafe_balance_total");
        return next;
      }, 0);
      reserve = reservePicture({ balance, commitments, goals });
    }
    return { goals, today, allocatedTotal: totals.allocated, plannedDaily: totals.plannedDaily, reserve, dataError: null };
  }
  catch { return { goals: [], today, allocatedTotal: 0, plannedDaily: 0, reserve: null, dataError: "Dữ liệu mục tiêu không đúng định dạng." }; }
}
