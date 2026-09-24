import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DEMO_SAVINGS_GOALS, goalTotals, type GoalAllocation, type SavingsGoal } from "@/lib/planning/goals";
import { mapCommitmentRow } from "@/server/commitments";
import { reservePicture, type ReservePicture } from "@/lib/planning/reserve";
import { currentMonthStart } from "@/server/budgets";
import { requireViewer } from "@/server/auth";
import { dateInVietnam, todayInVietnam } from "@/lib/vietnam-date";

export type GoalsWorkspace = {
  goals: SavingsGoal[];
  /**
   * Recorded funding events behind `allocated` — every adjust RPC writes one.
   * Null when the read fails or the mode cannot have real history (demo):
   * the card then withholds the history line rather than seeding fiction,
   * matching the `reserve: null` convention below.
   */
  allocations: GoalAllocation[] | null;
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
  /**
   * Count of live transactions tagged to each goal — informational history
   * ("Giao dịch liên quan"), never progress. Null when the read fails or in
   * demo, so the card withholds the line rather than inventing zero.
   */
  relatedCounts: Record<string, number> | null;
  dataError: string | null;
};
const goalSchema = z.object({ id: z.string().uuid(), name: z.string().min(1), target_minor: z.union([z.number(), z.string()]), allocated_minor: z.union([z.number(), z.string()]), deadline: z.string().nullable(), created_at: z.string().nullish(), is_archived: z.boolean() });
const allocationSchema = z.object({ goal_id: z.string().uuid(), amount_minor: z.union([z.number(), z.string()]), created_at: z.string() });

function safeMoney(value: unknown) { const amount = Number(value); if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("invalid_goal_money"); return amount; }

/** `timestamptz` text → Vietnam calendar day; null stays null. */
function vietnamDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? null : dateInVietnam(instant);
}

export function mapGoalRow(value: unknown): SavingsGoal { const row = goalSchema.parse(value); const target = safeMoney(row.target_minor); const allocated = safeMoney(row.allocated_minor); if (target <= 0 || allocated > target) throw new Error("invalid_goal_progress"); return { id: row.id, name: row.name, target, allocated, deadline: row.deadline, createdAt: vietnamDay(row.created_at), isArchived: row.is_archived }; }

function mapAllocationRow(value: unknown): GoalAllocation { const row = allocationSchema.parse(value); const amount = Number(row.amount_minor); if (!Number.isSafeInteger(amount)) throw new Error("invalid_goal_allocation"); const createdAt = vietnamDay(row.created_at); if (!createdAt) throw new Error("invalid_goal_allocation_date"); return { goalId: row.goal_id, amount, createdAt }; }

function demoWorkspace(today: string): GoalsWorkspace {
  const goals: SavingsGoal[] = DEMO_SAVINGS_GOALS;
  const totals = goalTotals(goals, today);
  /*
   * Demo balances and commitments live in browser storage owned by other
   * surfaces, so the server cannot derive the reserve here. Null rather than an
   * invented figure — demo money is fictional, but the arithmetic shown about
   * it should not be.
   */
  return { goals, allocations: null, today, allocatedTotal: totals.allocated, plannedDaily: totals.plannedDaily, reserve: null, relatedCounts: null, dataError: null };
}

export async function getGoalsWorkspace(): Promise<GoalsWorkspace> {
  const viewer = await requireViewer(); const today = todayInVietnam(); if (viewer.isDemo) return demoWorkspace(today);
  const supabase = await createClient(); if (!supabase) return { goals: [], allocations: null, today, allocatedTotal: 0, plannedDaily: 0, reserve: null, relatedCounts: null, dataError: "Không thể kết nối dữ liệu mục tiêu." };
  /*
   * The three reads the RPC's own guard makes, so the figure shown matches the
   * figure enforced. The commitment month is the current one from
   * `currentMonthStart()`, mirroring `date_trunc('month', now())` in the SQL.
   */
  const monthStart = currentMonthStart();
  const [{ data, error }, allocationsResult, balancesResult, commitmentsResult, occurrencesResult, taggedResult] = await Promise.all([
    supabase.from("savings_goals").select("id,name,target_minor,allocated_minor,deadline,created_at,is_archived").order("is_archived").order("deadline", { nullsFirst: false }),
    /*
     * The adjust RPC has always written this ledger; the goals screen is the
     * first read of it. A failed or malformed read degrades to null — the
     * page then withholds the history line rather than fabricating one.
     */
    supabase.from("savings_goal_allocations").select("goal_id,amount_minor,created_at").eq("user_id", viewer.id).order("created_at", { ascending: true }),
    supabase.from("account_balances").select("balance_minor").eq("user_id", viewer.id),
    supabase
      .from("recurring_commitment_feed")
      .select("id,name,amount_minor,due_day,account_id,account_name,category_id,category_name,category_icon,category_color,is_archived"),
    supabase
      .from("commitment_occurrences")
      .select("commitment_id,transaction_id")
      .eq("month_start", monthStart),
    /*
     * Live rows carrying a goal tag — counted per goal client-side. A failed
     * read degrades to null so the card withholds the line.
     */
    supabase
      .from("financial_transactions")
      .select("goal_id")
      .eq("user_id", viewer.id)
      .is("deleted_at", null)
      .not("goal_id", "is", null),
  ]);
  if (error) return { goals: [], allocations: null, today, allocatedTotal: 0, plannedDaily: 0, reserve: null, relatedCounts: null, dataError: "Chưa tải được mục tiêu tiết kiệm. Hãy thử lại." };
  let allocations: GoalAllocation[] | null = null;
  if (!allocationsResult.error) {
    try { allocations = z.array(z.unknown()).parse(allocationsResult.data).map(mapAllocationRow); } catch { allocations = null; }
  }
  let relatedCounts: Record<string, number> | null = null;
  if (!taggedResult.error) {
    relatedCounts = {};
    for (const row of taggedResult.data ?? []) {
      const goalId = String(row.goal_id);
      relatedCounts[goalId] = (relatedCounts[goalId] ?? 0) + 1;
    }
  }
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
    return { goals, allocations, today, allocatedTotal: totals.allocated, plannedDaily: totals.plannedDaily, reserve, relatedCounts, dataError: null };
  }
  catch { return { goals: [], allocations: null, today, allocatedTotal: 0, plannedDaily: 0, reserve: null, relatedCounts: null, dataError: "Dữ liệu mục tiêu không đúng định dạng." }; }
}
