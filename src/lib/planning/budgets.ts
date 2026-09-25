import type { Transaction } from "../sample-data.ts";
import { formatMoney } from "../money.ts";

export type BudgetSummary = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  monthStart: string;
  limit: number;
  spent: number;
};

export type BudgetMonthAdjustment = "invalid" | "future" | null;

export type BudgetMonthResolution = {
  monthKey: string;
  monthStart: string;
  monthEnd: string;
  previousMonthStart: string;
  nextMonthStart: string;
  canGoNext: boolean;
  adjustment: BudgetMonthAdjustment;
};

export type BudgetAmountComparison =
  | { state: "unavailable"; difference: null }
  | { state: "same"; difference: 0 }
  | { state: "increase" | "decrease"; difference: number };

const monthKeyPattern = /^(\d{4})-(\d{2})$/;
const monthStartPattern = /^(\d{4})-(\d{2})-01$/;

function parseMonthParts(value: string, pattern: RegExp) {
  const match = pattern.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  // Year 0001-01 has no representable previous comparison month.
  if (!Number.isInteger(year) || year < 2 || year > 9999) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function monthStartFromParts(year: number, month: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
}

export function budgetMonthKey(monthStart: string) {
  const parts = parseMonthParts(monthStart, monthStartPattern);
  if (!parts) throw new Error("invalid_budget_month_start");
  return monthStart.slice(0, 7);
}

export function shiftBudgetMonth(monthStart: string, offset: number) {
  const parts = parseMonthParts(monthStart, monthStartPattern);
  if (!parts || !Number.isInteger(offset)) {
    throw new Error("invalid_budget_month_shift");
  }
  const absoluteMonth = parts.year * 12 + (parts.month - 1) + offset;
  const year = Math.floor(absoluteMonth / 12);
  const month = ((absoluteMonth % 12) + 12) % 12;
  if (year < 1 || year > 9999) throw new Error("budget_month_out_of_range");
  return monthStartFromParts(year, month + 1);
}

export function budgetMonthEnd(monthStart: string) {
  const nextMonthStart = shiftBudgetMonth(monthStart, 1);
  const nextParts = parseMonthParts(nextMonthStart, monthStartPattern);
  if (!nextParts) throw new Error("invalid_budget_month_end");
  const lastDay = new Date(Date.UTC(nextParts.year, nextParts.month - 1, 0)).getUTCDate();
  return `${monthStart.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
}

export function resolveBudgetMonth(
  requestedMonth: string | null | undefined,
  currentMonthStart: string,
): BudgetMonthResolution {
  const currentParts = parseMonthParts(currentMonthStart, monthStartPattern);
  if (!currentParts) throw new Error("invalid_current_budget_month");

  const requestedParts = requestedMonth
    ? parseMonthParts(requestedMonth, monthKeyPattern)
    : null;
  const requestedStart = requestedParts
    ? monthStartFromParts(requestedParts.year, requestedParts.month)
    : null;

  let monthStart = currentMonthStart;
  let adjustment: BudgetMonthAdjustment = null;

  if (requestedMonth && !requestedStart) {
    adjustment = "invalid";
  } else if (requestedStart && requestedStart > currentMonthStart) {
    adjustment = "future";
  } else if (requestedStart) {
    monthStart = requestedStart;
  }

  return {
    monthKey: budgetMonthKey(monthStart),
    monthStart,
    monthEnd: budgetMonthEnd(monthStart),
    previousMonthStart: shiftBudgetMonth(monthStart, -1),
    nextMonthStart: shiftBudgetMonth(monthStart, 1),
    canGoNext: monthStart < currentMonthStart,
    adjustment,
  };
}

export function compareBudgetAmount(
  current: number,
  previous: number | null,
): BudgetAmountComparison {
  if (!Number.isSafeInteger(current)) throw new Error("invalid_current_budget_amount");
  if (previous === null) return { state: "unavailable", difference: null };
  if (!Number.isSafeInteger(previous)) throw new Error("invalid_previous_budget_amount");
  const difference = current - previous;
  if (!Number.isSafeInteger(difference)) throw new Error("invalid_budget_difference");
  if (difference === 0) return { state: "same", difference: 0 };
  return {
    state: difference > 0 ? "increase" : "decrease",
    difference,
  };
}

export function budgetTransactionsHref(monthStart: string, categoryName: string) {
  const params = new URLSearchParams({
    from: monthStart,
    to: budgetMonthEnd(monthStart),
    category: categoryName,
    kind: "expense",
  });
  return `/transactions?${params.toString()}`;
}

/**
 * Sum of expense amounts for a category in a month (YYYY-MM…).
 * Transfers and income never count toward budget spent.
 * Soft-deleted rows must already be excluded from `transactions`.
 */
export function sumBudgetSpent(
  transactions: Transaction[],
  categoryId: string,
  monthStart: string,
): number {
  const monthPrefix = monthStart.slice(0, 7);
  let spent = 0;
  for (const item of transactions) {
    if (item.kind !== "expense") continue;
    if (!item.occurredOn.startsWith(monthPrefix)) continue;

    // Multi-entry split: only the portion for this category counts.
    if (item.splits && item.splits.length >= 2) {
      for (const line of item.splits) {
        if (line.categoryId !== categoryId) continue;
        if (!Number.isSafeInteger(line.amount) || line.amount <= 0) continue;
        const next = spent + line.amount;
        if (!Number.isSafeInteger(next)) continue;
        spent = next;
      }
      continue;
    }

    if (item.categoryId !== categoryId) continue;
    if (!Number.isSafeInteger(item.amount) || item.amount <= 0) continue;
    const next = spent + item.amount;
    if (!Number.isSafeInteger(next)) continue;
    spent = next;
  }
  return spent;
}

export type SaveBudgetInput = {
  categoryId: string;
  monthStart: string;
  limit: number;
};

/** Calm threshold bands — colors must pair with text, never color alone. */
export type BudgetThreshold = "ok" | "watch" | "near" | "over";

export function budgetProgress(budget: Pick<BudgetSummary, "spent" | "limit">) {
  if (budget.limit <= 0) return 0;
  return Math.max(0, Math.round((budget.spent / budget.limit) * 100));
}

export function budgetRemaining(budget: Pick<BudgetSummary, "spent" | "limit">) {
  return budget.limit - budget.spent;
}

/**
 * Threshold bands:
 * - over: `spent > limit` on raw integer đồng → UI "Đã vượt X". The rounded
 *   percent must not decide this: 99.8% rounds to 100 while 10.000 ₫ still
 *   remain, and "vượt" may only claim an overshoot the ledger shows. Exactly
 *   at the limit nothing has been exceeded, so a fully spent budget stays
 *   "near" — the same convention `budgetEffectiveThreshold` already uses
 *   (`available < 0`).
 * - near: rounded progress ≥ 80% → UI "Gần hạn mức"
 * - watch: rounded progress ≥ 50%
 * - ok: below that
 */
export function budgetThreshold(budget: Pick<BudgetSummary, "spent" | "limit">): BudgetThreshold {
  if (budget.spent > budget.limit) return "over";
  const progress = budgetProgress(budget);
  if (progress >= 80) return "near";
  if (progress >= 50) return "watch";
  return "ok";
}

/**
 * Non-judgmental Vietnamese status (no guilt language).
 * Always returns text so status is not color-only.
 */
export function budgetStatusLabel(
  budget: Pick<BudgetSummary, "spent" | "limit">,
  format: (minorUnits: number) => string = formatMoney,
): string {
  const remaining = budgetRemaining(budget);
  const level = budgetThreshold(budget);
  if (level === "over") {
    return `Đã vượt ${format(Math.abs(remaining))}`;
  }
  if (level === "near") {
    return "Gần hạn mức";
  }
  return `Còn ${format(Math.max(0, remaining))}`;
}

/**
 * Percent of the viewed month already elapsed on the server-resolved date.
 *
 * Returns null when `today` falls outside [monthStart, monthEnd] — pace only
 * means something for the month in progress; a past month is simply done and
 * a future month has not started, and printing 100%/0% for either would dress
 * a tautology up as information.
 */
export function monthElapsedPercent(monthStart: string, today: string): number | null {
  const monthEnd = budgetMonthEnd(monthStart);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || today < monthStart || today > monthEnd) {
    return null;
  }
  const daysInMonth = Number(monthEnd.slice(8, 10));
  const elapsed = Number(today.slice(8, 10));
  return Math.max(1, Math.min(100, Math.round((elapsed / daysInMonth) * 100)));
}

/**
 * Factual pace line for a budget card — usage next to elapsed time, same
 * sentence, no verdict. Null when the viewed month is not in progress, so the
 * card stays quiet instead of comparing a finished month against itself.
 */
export function budgetPaceLine(
  budget: Pick<BudgetSummary, "spent" | "limit">,
  monthStart: string,
  today: string,
): string | null {
  const elapsed = monthElapsedPercent(monthStart, today);
  if (elapsed === null) return null;
  return `Đã dùng ${budgetProgress(budget)}% hạn mức · tháng đã qua ${elapsed}%`;
}

/** CSS-friendly bar fill for threshold (pair with `budgetStatusLabel`). */
export function budgetBarColor(level: BudgetThreshold): string {
  switch (level) {
    case "over":
      return "var(--color-danger-default)";
    case "near":
      return "#f97316";
    case "watch":
      return "var(--color-warning-default)";
    default:
      return "var(--color-success-default)";
  }
}

/**
 * Last month's limits that this month has no decision for yet.
 *
 * A new month opens with no budgets, so without this the user retypes a stable
 * plan every month — and until they do, the unassigned figure reports their
 * whole income as unassigned, which is true and useless. Carrying the plan
 * forward is what makes the monthly loop cheap enough to repeat.
 *
 * The rule is additive only, and that is the whole safety of the feature: a
 * category the user has **already** budgeted this month is never touched. If
 * they set food to 3.000.000 ₫ this month after 5.000.000 ₫ last month, that
 * is a decision, and silently replacing it would overwrite the user's own
 * judgement with history.
 *
 * Non-positive previous limits are skipped rather than carried as zero, since
 * `upsert_monthly_budget` treats a limit as a real cap and a zero-limit budget
 * would read as "you may spend nothing here" rather than "not planned".
 */
export function budgetsToCarryForward({
  previousBudgets,
  currentBudgets,
  monthStart,
}: {
  previousBudgets: BudgetSummary[];
  currentBudgets: BudgetSummary[];
  monthStart: string;
}): SaveBudgetInput[] {
  // Rejects a malformed target month before anything is written.
  budgetMonthKey(monthStart);

  const alreadyDecided = new Set(
    currentBudgets
      .filter((budget) => budget.monthStart === monthStart)
      .map((budget) => budget.categoryId),
  );

  return previousBudgets
    .filter(
      (budget) =>
        budget.limit > 0 &&
        Number.isSafeInteger(budget.limit) &&
        !alreadyDecided.has(budget.categoryId),
    )
    .map((budget) => ({
      categoryId: budget.categoryId,
      monthStart,
      limit: budget.limit,
    }));
}

/**
 * How far back a rollover may reach, counted in whole months before the
 * viewed month. A bound must exist somewhere; twelve months covers every
 * budgeted history the product can hold today while keeping the server read
 * and the sum itself bounded no matter how much history accrues. The bound is
 * applied twice — once in the `budget_progress` range read and again inside
 * `budgetRollover` — so a caller that hands over deeper history still gets
 * the same answer.
 */
export const BUDGET_ROLLOVER_LOOKBACK_MONTHS = 12;

/** First month_start inside the rollover window for a viewed month. */
export function budgetRolloverWindowStart(monthStart: string) {
  return shiftBudgetMonth(monthStart, -BUDGET_ROLLOVER_LOOKBACK_MONTHS);
}

export type BudgetRollover = {
  /**
   * Signed đồng carried into the viewed month: prior underspend adds to what
   * the category may still absorb, prior overspend subtracts.
   */
  carry: number;
  /**
   * How many prior budgeted months contributed. Kept for honest labelling —
   * "chuyển từ tháng trước" would be a lie when the carry actually nets three
   * earlier months.
   */
  monthsIncluded: number;
};

/**
 * Carry-forward into `monthStart` for one category.
 *
 * Each prior month that has a budget row contributes `limit − spent` for that
 * month — under- and overspend cancel, which is the rollover contract. Months
 * with no budget row contribute nothing: the category was not being tracked
 * that month, and inventing a deficit for it would charge the user for a
 * decision they never made.
 *
 * `priorBudgets` must hold budget summaries from months before `monthStart`;
 * rows outside the lookback window or at/after the viewed month are ignored,
 * so passing an unfiltered history is safe. Only integer đồng participate;
 * unsafe rows are skipped like `sumBudgetSpent` rather than poisoning the sum.
 */
export function budgetRollover({
  priorBudgets,
  categoryId,
  monthStart,
}: {
  priorBudgets: Pick<
    BudgetSummary,
    "categoryId" | "monthStart" | "limit" | "spent"
  >[];
  categoryId: string;
  monthStart: string;
}): BudgetRollover {
  // Throws on a malformed viewed month before any arithmetic happens.
  const windowStart = budgetRolloverWindowStart(monthStart);

  let carry = 0;
  let monthsIncluded = 0;
  for (const row of priorBudgets) {
    if (row.categoryId !== categoryId) continue;
    if (row.monthStart >= monthStart || row.monthStart < windowStart) continue;
    if (!Number.isSafeInteger(row.limit) || !Number.isSafeInteger(row.spent)) {
      continue;
    }
    const delta = row.limit - row.spent;
    const next = carry + delta;
    if (!Number.isSafeInteger(delta) || !Number.isSafeInteger(next)) continue;
    carry = next;
    monthsIncluded += 1;
  }
  return { carry, monthsIncluded };
}

/**
 * The cap the viewed month effectively works against: `limit + carry`.
 * May fall to zero or below when carried overspend outweighs the month's own
 * limit — callers treat a non-positive effective limit as fully consumed,
 * never as "no budget".
 */
export function budgetEffectiveLimit(
  budget: Pick<BudgetSummary, "limit">,
  carry: number,
): number {
  if (!Number.isSafeInteger(carry)) throw new Error("invalid_budget_carry");
  const effectiveLimit = budget.limit + carry;
  if (!Number.isSafeInteger(effectiveLimit)) {
    throw new Error("invalid_budget_effective_limit");
  }
  return effectiveLimit;
}

/**
 * What the category may still absorb this month once prior under/overspend
 * is folded in: `limit + carry − spent`. Signed — negative means the budget
 * is over even if this month's own spending stayed under its own limit.
 */
export function budgetEffectiveAvailable(
  budget: Pick<BudgetSummary, "spent" | "limit">,
  carry: number,
): number {
  const available = budgetEffectiveLimit(budget, carry) - budget.spent;
  if (!Number.isSafeInteger(available)) {
    throw new Error("invalid_budget_available");
  }
  return available;
}

/**
 * Threshold on the effective figures. A negative available is always "over",
 * which also covers the edge where carried overspend pushes the effective
 * limit to zero or below — a case `budgetThreshold` alone cannot express
 * because progress is undefined on a non-positive limit.
 */
export function budgetEffectiveThreshold(
  budget: Pick<BudgetSummary, "spent" | "limit">,
  carry: number,
): BudgetThreshold {
  if (budgetEffectiveAvailable(budget, carry) < 0) return "over";
  return budgetThreshold({
    spent: budget.spent,
    limit: budgetEffectiveLimit(budget, carry),
  });
}

/**
 * Status on the effective figures, same calm vocabulary as
 * `budgetStatusLabel`. When available is non-negative the effective limit is
 * necessarily ≥ spent ≥ 0, so the shared label sees only states it already
 * handles; the early return covers the carried-overspend edge it cannot.
 */
export function budgetEffectiveStatusLabel(
  budget: Pick<BudgetSummary, "spent" | "limit">,
  carry: number,
  format: (minorUnits: number) => string = formatMoney,
): string {
  const available = budgetEffectiveAvailable(budget, carry);
  if (available < 0) return `Đã vượt ${format(Math.abs(available))}`;
  return budgetStatusLabel(
    { spent: budget.spent, limit: budgetEffectiveLimit(budget, carry) },
    format,
  );
}

/**
 * One honest line explaining where the carry came from, or null when nothing
 * carried — the card stays quiet rather than printing "+0 ₫" noise.
 */
export function budgetRolloverLabel(rollover: BudgetRollover): string | null {
  if (!Number.isSafeInteger(rollover.carry) || rollover.carry === 0) {
    return null;
  }
  const months =
    rollover.monthsIncluded > 1
      ? `${rollover.monthsIncluded} tháng trước đó`
      : "tháng trước";
  const amount = formatMoney(Math.abs(rollover.carry));
  return rollover.carry > 0
    ? `Chuyển từ ${months}: +${amount}`
    : `Trừ vì vượt hạn mức ${months}: −${amount}`;
}
