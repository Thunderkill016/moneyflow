/**
 * "Đúng nhịp tháng" — ports mobile/lib/domain/month_pace.dart so the web
 * dashboard reads the same pace story the mobile card draws: cumulative
 * month-to-date expense against a linear ideal-pace line, plus a ±10%
 * status band labelled in words (never colour alone). Expense nets
 * refunds, transfers never count, excluded_from_reports rows still
 * spent real money and stay in. Integer đồng throughout; no monthly
 * budget for this month → null, and the caller renders its absence.
 */
import type { Transaction } from "./transactions/contracts.ts";
import type { BudgetSummary } from "./planning/budgets.ts";

export type MonthPaceStatus = "under" | "on" | "over";

export type MonthPace = {
  /** Cumulative expense through each elapsed day; index 0 is the 1st. */
  cumulativeMinor: number[];
  /** Month-to-date expense (net of refunds) — last cumulative value. */
  actualToDateMinor: number;
  /** Ideal line today: limit × elapsed ÷ daysInMonth, floored. */
  idealToDateMinor: number;
  /** Sum of this month's monthly budget limits. */
  budgetLimitMinor: number;
  daysInMonth: number;
  elapsedDays: number;
  status: MonthPaceStatus;
};

export function buildMonthPace({
  rows,
  budgets,
  today,
}: {
  rows: readonly Transaction[];
  budgets: readonly BudgetSummary[];
  today: string;
}): MonthPace | null {
  const [year, month] = today.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const elapsedDays = Number(today.slice(8, 10));
  const monthStart = `${today.slice(0, 8)}01`;

  let limit = 0;
  for (const budget of budgets) {
    if (budget.monthStart !== monthStart) continue;
    limit += budget.limit;
  }
  if (limit <= 0) return null;

  const perDay = new Array<number>(elapsedDays).fill(0);
  for (const t of rows) {
    if (t.occurredOn < monthStart || t.occurredOn > today) continue;
    const dayIdx = Number(t.occurredOn.slice(8, 10)) - 1;
    if (dayIdx < 0 || dayIdx >= elapsedDays) continue;
    if (t.kind === "expense") {
      perDay[dayIdx] += t.amount;
    } else if (t.kind === "income" && t.isRefund === true) {
      perDay[dayIdx] -= t.amount;
    }
  }
  const cumulative = new Array<number>(elapsedDays);
  let running = 0;
  for (let i = 0; i < elapsedDays; i++) {
    running += perDay[i];
    cumulative[i] = running;
  }
  const actual = running;

  const ideal = Math.floor((limit * elapsedDays) / daysInMonth);
  const status: MonthPaceStatus =
    ideal <= 0
      ? actual > 0
        ? "over"
        : "on"
      : actual * 10 > ideal * 11
        ? "over"
        : actual * 10 < ideal * 9
          ? "under"
          : "on";

  return {
    cumulativeMinor: cumulative,
    actualToDateMinor: actual,
    idealToDateMinor: ideal,
    budgetLimitMinor: limit,
    daysInMonth,
    elapsedDays,
    status,
  };
}
