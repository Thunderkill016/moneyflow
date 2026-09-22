export type SavingsGoal = {
  id: string;
  name: string;
  target: number;
  allocated: number;
  deadline: string | null;
  isArchived: boolean;
};

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
