export type SpendingPaceStatus = "ahead" | "on-track" | "watch" | "over";

export type SpendingPaceInput = {
  /** Amount already spent inside the plan. Integer minor units only. */
  spent: number;
  /** Total amount planned for the same scope and calendar month. */
  budget: number;
  /** Calendar date in YYYY-MM-DD. */
  today: string;
};

export type SpendingPace = {
  status: SpendingPaceStatus;
  elapsedPercent: number;
  spentPercent: number;
  deltaPercentagePoints: number;
  remainingBudget: number;
  remainingDays: number;
  remainingPerDay: number;
};

export const SPENDING_PACE_LABELS: Record<SpendingPaceStatus, string> = {
  ahead: "Còn dư nhịp",
  "on-track": "Đúng nhịp",
  watch: "Hơi nhanh",
  over: "Nhanh hơn kế hoạch",
};

function parseCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Compare how much of a monthly plan has been spent with how much of the
 * calendar month has elapsed.
 *
 * The function deliberately returns null when there is no trustworthy plan.
 * MoneyFlow must not invent a pace status from balance alone or from a zero,
 * fractional, negative, or unsafe budget.
 */
export function calculateSpendingPace({
  spent,
  budget,
  today,
}: SpendingPaceInput): SpendingPace | null {
  if (
    !Number.isSafeInteger(spent) ||
    !Number.isSafeInteger(budget) ||
    spent < 0 ||
    budget <= 0
  ) {
    return null;
  }

  const date = parseCalendarDate(today);
  if (!date) return null;

  const dayOfMonth = date.getUTCDate();
  const daysInMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const remainingDays = Math.max(1, daysInMonth - dayOfMonth + 1);
  const elapsedPercent = Math.round((dayOfMonth / daysInMonth) * 100);
  const spentPercent = Math.max(0, Math.round((spent / budget) * 100));
  const deltaPercentagePoints = spentPercent - elapsedPercent;

  let status: SpendingPaceStatus;
  if (deltaPercentagePoints <= -10) status = "ahead";
  else if (deltaPercentagePoints <= 5) status = "on-track";
  else if (deltaPercentagePoints <= 15) status = "watch";
  else status = "over";

  const remainingBudget = Math.max(0, budget - spent);
  const remainingPerDay = Math.floor(remainingBudget / remainingDays);

  return {
    status,
    elapsedPercent,
    spentPercent,
    deltaPercentagePoints,
    remainingBudget,
    remainingDays,
    remainingPerDay,
  };
}

export function spendingPaceExplanation(pace: SpendingPace): string {
  return `Đã dùng ${pace.spentPercent}% kế hoạch khi tháng đã đi qua ${pace.elapsedPercent}%.`;
}
