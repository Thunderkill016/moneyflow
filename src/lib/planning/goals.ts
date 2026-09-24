export type SavingsGoal = {
  id: string;
  name: string;
  target: number;
  allocated: number;
  deadline: string | null;
  /**
   * Vietnam calendar day (`YYYY-MM-DD`) the goal was created — the preferred
   * start anchor for pace math. Null when the read path cannot prove it
   * (deploy skew, demo seeds); pace then falls back to the earliest recorded
   * allocation, and withholds entirely when no anchor exists.
   */
  createdAt: string | null;
  isArchived: boolean;
};

/**
 * One row of `savings_goal_allocations` — the ledger of every "Đánh dấu thêm"
 * and "Giảm số đánh dấu" the adjust RPC has ever recorded. `amount` is signed
 * (releases are negative); `createdAt` is the Vietnam calendar day so window
 * and pace math compare the same day-shape as `today`.
 */
export type GoalAllocation = {
  goalId: string;
  amount: number;
  createdAt: string;
};

/** Window length for the per-card funding-history line. */
export const GOAL_FUNDING_WINDOW_DAYS = 30;

export type SaveGoalInput = { id?: string; name: string; target: number; deadline: string | null };

export function goalProgress(goal: SavingsGoal) {
  if (goal.target <= 0) return 0;
  // Floor, not round: 99.6% must not claim "100% hoàn thành" while money is
  // still missing — the card would disable "Đánh dấu thêm" with Còn thiếu > 0.
  if (goal.allocated >= goal.target) return 100;
  return Math.max(0, Math.floor((goal.allocated / goal.target) * 100));
}

/** Remaining minor units until target (never negative). */
export function goalRemaining(goal: SavingsGoal) {
  return Math.max(0, goal.target - goal.allocated);
}

export function daysUntil(date: string, today: string) {
  return Math.max(1, Math.ceil((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000));
}

export function dailyGoalSaving(goal: SavingsGoal, today: string) {
  const remaining = goalRemaining(goal);
  if (!goal.deadline || remaining === 0 || goal.isArchived) return 0;
  // No honest "per day" once the deadline passed — dividing by a clamped
  // single day would tell the user to earmark the whole remainder today.
  if (goal.deadline < today) return 0;
  return Math.ceil(remaining / daysUntil(goal.deadline, today));
}

/** True when the deadline exists and is strictly before today. */
export function goalIsOverdue(goal: SavingsGoal, today: string) {
  return (
    !goal.isArchived &&
    Boolean(goal.deadline) &&
    goal.deadline! < today &&
    goalRemaining(goal) > 0
  );
}

/** Signed whole days from `from` to `to` — both `YYYY-MM-DD` date strings. */
function daysBetweenDates(from: string, to: string) {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

/** `YYYY-MM-DD` shifted by `delta` whole days. */
function shiftDays(date: string, delta: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + delta * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Net-new "đánh dấu" inside the `days`-long window ending at `today`
 * (inclusive, so the window is exactly `days` calendar days). Only positive
 * amounts count: the verb in the copy is the funding act itself, and folding
 * releases into the total would let "N lần" count events that were not marks
 * at all.
 */
export function goalFundingInWindow(
  goal: SavingsGoal,
  allocations: GoalAllocation[],
  today: string,
  days: number = GOAL_FUNDING_WINDOW_DAYS,
) {
  const windowStart = shiftDays(today, -(days - 1));
  let total = 0;
  let count = 0;
  for (const allocation of allocations) {
    if (allocation.goalId !== goal.id || allocation.amount <= 0) continue;
    if (allocation.createdAt < windowStart || allocation.createdAt > today)
      continue;
    total += allocation.amount;
    count += 1;
  }
  if (!Number.isSafeInteger(total)) throw new Error("unsafe_goal_funding_total");
  return { total, count };
}

/**
 * The first day the goal could honestly accumulate marks: its creation date
 * when the read path proves one, otherwise the earliest recorded allocation.
 * Null when neither exists — no anchor means no pace claim.
 */
export function goalPaceStartDate(
  goal: SavingsGoal,
  allocations: GoalAllocation[],
): string | null {
  if (goal.createdAt) return goal.createdAt;
  let earliest: string | null = null;
  for (const allocation of allocations) {
    if (allocation.goalId !== goal.id) continue;
    if (earliest === null || allocation.createdAt < earliest)
      earliest = allocation.createdAt;
  }
  return earliest;
}

/**
 * What a strictly linear plan — same amount every day from `startDate` to the
 * declared deadline — would have accumulated by `today`, clamped to
 * [0, target]. Null when there is no honest slope: no deadline, no start
 * anchor, or a deadline on/before the start (a zero-length plan divides by
 * nothing). The user declared a deadline, not a schedule; the "~" copy must
 * keep naming this as the even-pace assumption.
 */
export function expectedAllocatedByNow(
  goal: SavingsGoal,
  today: string,
  startDate: string | null,
): number | null {
  if (!goal.deadline || !startDate || goal.deadline <= startDate) return null;
  const totalDays = daysBetweenDates(startDate, goal.deadline);
  const elapsed = Math.min(
    Math.max(daysBetweenDates(startDate, today), 0),
    totalDays,
  );
  // Divide before multiplying: targets can approach Number.MAX_SAFE_INTEGER,
  // so `target * elapsed` could leave the safe-integer range on long plans.
  return Math.min(
    goal.target,
    Math.max(0, Math.floor((elapsed / totalDays) * goal.target)),
  );
}

/**
 * Deadline-pace position of one goal. "past-deadline" is reported but the card
 * withholds its own pace line there — the existing overdue context already
 * tells that story, and a saturated linear bar adds no information.
 */
export type GoalPace = {
  /** Floored linear expectation as of `today` — the "~" figure in copy. */
  expected: number;
  /** `goal.allocated` restated so the line cites both numbers plainly. */
  actual: number;
  /** `actual − expected`; negative when behind the even pace. */
  delta: number;
  state: "ahead" | "on-track" | "behind" | "past-deadline";
};

/**
 * Withholds (null) when there is no honest claim to make: archived, no
 * declared deadline, already fully funded, or no start anchor. Otherwise
 * compares `allocated` against the strictly linear expectation — never an
 * extrapolated completion date.
 */
export function goalPaceStatus(
  goal: SavingsGoal,
  today: string,
  allocations: GoalAllocation[],
): GoalPace | null {
  if (goal.isArchived || !goal.deadline) return null;
  if (goal.allocated >= goal.target) return null;
  const startDate = goalPaceStartDate(goal, allocations);
  const expected = expectedAllocatedByNow(goal, today, startDate);
  if (expected === null) return null;
  const delta = goal.allocated - expected;
  const state: GoalPace["state"] =
    goal.deadline < today
      ? "past-deadline"
      : delta < 0
        ? "behind"
        : delta > 0
          ? "ahead"
          : "on-track";
  return { expected, actual: goal.allocated, delta, state };
}

/**
 * Count of active goals that are overdue or behind the even pace — a number,
 * not goal objects, so the dashboard client boundary stays free of goal data.
 * Behind-pace is provable only where a start anchor is readable; goals without
 * one are simply not counted rather than assumed on-track.
 */
export function countGoalPaceAttention(
  goals: SavingsGoal[],
  today: string,
): number {
  return goals.filter(
    (goal) =>
      goalIsOverdue(goal, today) ||
      goalPaceStatus(goal, today, [])?.state === "behind",
  ).length;
}

/**
 * Featured goal for Insights widget: highest progress among active goals
 * (wireframes §2.4). Tie-break: sooner deadline, then name.
 */
export function pickFeaturedGoal(goals: SavingsGoal[]): SavingsGoal | null {
  const active = goals.filter((goal) => !goal.isArchived);
  if (active.length === 0) return null;
  return [...active].sort((a, b) => {
    const progressDelta = goalProgress(b) - goalProgress(a);
    if (progressDelta !== 0) return progressDelta;
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return a.name.localeCompare(b.name, "vi");
  })[0]!;
}

export function goalTotals(goals: SavingsGoal[], today: string) {
  return goals.reduce((totals, goal) => {
    if (goal.isArchived) return totals;
    totals.target += goal.target;
    totals.allocated += goal.allocated;
    totals.plannedDaily += dailyGoalSaving(goal, today);
    return totals;
  }, { target: 0, allocated: 0, plannedDaily: 0 });
}

/**
 * Seeded demo goals — string ids on purpose: demo data is fictional, and a
 * `demo-*` id can never collide with a real uuid in the goal tag column.
 * Shared by the goals workspace and the transaction picker's demo list.
 */
export const DEMO_SAVINGS_GOALS: SavingsGoal[] = [
  { id: "demo-goal-emergency", name: "Quỹ khẩn cấp", target: 6_000_000, allocated: 2_400_000, deadline: "2026-09-30", createdAt: null, isArchived: false },
  { id: "demo-goal-laptop", name: "Laptop mới", target: 20_000_000, allocated: 5_000_000, deadline: "2027-01-31", createdAt: null, isArchived: false },
];
