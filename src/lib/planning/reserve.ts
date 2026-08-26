import { formatMoney } from "../money.ts";
import type { RecurringCommitment } from "./commitments.ts";
import type { SavingsGoal } from "./goals.ts";

/*
 * What a user's money is actually free for.
 *
 * This is not a new rule. `adjust_savings_goal` has enforced it since the
 * savings-goal migration, and refuses funding when it is breached:
 *
 *     if v_total_allocated + p_amount_minor
 *        > greatest(0, v_total_balance - v_recurring_reserved) then
 *       raise exception 'insufficient_unreserved_balance';
 *
 * Until now the user met that arithmetic only as a rejection — an error naming
 * two possible causes and giving neither figure. The product did the correct
 * calculation and hid it.
 *
 * This module restates the same arithmetic so it can be shown. That makes the
 * agreement load-bearing: a displayed figure that disagreed with the RPC would
 * be worse than showing nothing, because the user would be told they have money
 * free and then refused when they try to use it. Every detail below is mirrored
 * from the SQL on purpose, including the ones that look incidental:
 *
 * - The `greatest(0, …)` clamp applies to balance-minus-bills **before** goal
 *   allocations are subtracted, so bills exceeding the balance cannot make
 *   goal-reserved money look available.
 * - Commitments are the **current** month's, never a month being browsed.
 * - "Unpaid" means no occurrence row exists for that month.
 * - Archived commitments and archived goals are excluded.
 */

export type ReservePicture = {
  /** Sum of account balances, in integer đồng. */
  balance: number;
  /** Unpaid recurring obligations for the current month. */
  protectedForBills: number;
  /** `greatest(0, balance − protectedForBills)`, mirroring the RPC clamp. */
  spendableAfterBills: number;
  /** Already promised to savings goals. */
  reservedForGoals: number;
  /**
   * What is left over and free.
   *
   * May be negative: goals are funded against the balance at the time, so a
   * later drop in balance can leave more promised than held. That is a real
   * state the user should see, not one to clamp away.
   */
  unreserved: number;
};

export function reservePicture({
  balance,
  commitments,
  goals,
}: {
  balance: number;
  /** Resolved for the current month; see the module note. */
  commitments: RecurringCommitment[];
  goals: SavingsGoal[];
}): ReservePicture {
  if (!Number.isSafeInteger(balance)) throw new Error("unsafe_balance");

  return reservePictureFromTotals({
    balance,
    protectedForBills: sumSafely(
      commitments
        .filter((item) => !item.isArchived && !item.isPaid)
        .map((item) => item.amount),
      "unsafe_bill_total",
    ),
    goals,
  });
}

/**
 * The same picture for a caller that already holds the bill total.
 *
 * The goals page funds goals in place, so it must recompute from live goal
 * state after every allocation — otherwise "còn có thể dành" would still show
 * the amount that was free before the user just spent it. Balances and bills do
 * not change from that screen, so only the goal side needs to stay live.
 */
export function reservePictureFromTotals({
  balance,
  protectedForBills,
  goals,
}: {
  balance: number;
  protectedForBills: number;
  goals: SavingsGoal[];
}): ReservePicture {
  if (!Number.isSafeInteger(balance)) throw new Error("unsafe_balance");
  if (!Number.isSafeInteger(protectedForBills)) throw new Error("unsafe_bill_total");

  const reservedForGoals = sumSafely(
    goals.filter((item) => !item.isArchived).map((item) => item.allocated),
    "unsafe_goal_total",
  );

  const spendableAfterBills = Math.max(0, balance - protectedForBills);
  const unreserved = spendableAfterBills - reservedForGoals;
  if (!Number.isSafeInteger(unreserved)) throw new Error("unsafe_unreserved");

  return {
    balance,
    protectedForBills,
    spendableAfterBills,
    reservedForGoals,
    unreserved,
  };
}

/**
 * The largest amount `adjust_savings_goal` will accept into a goal right now.
 *
 * Answers the question the refusal does not: not "why was I stopped" but "how
 * much would go through". Never negative — a shortfall is not a fundable
 * amount.
 */
export function fundableIntoGoals(picture: ReservePicture): number {
  return Math.max(0, picture.unreserved);
}

function sumSafely(values: number[], errorCode: string): number {
  return values.reduce((sum, value) => {
    const next = sum + value;
    if (!Number.isSafeInteger(next)) throw new Error(errorCode);
    return next;
  }, 0);
}

/**
 * The sentence under the figure, naming every operand it came from.
 *
 * The number exists to replace a refusal that named two possible causes and
 * gave neither figure, so hiding the working here would repeat that mistake.
 * It reports and never advises.
 */
export function reserveExplanation(picture: ReservePicture): string {
  const balance = formatMoney(picture.balance);
  const bills = formatMoney(picture.protectedForBills);
  const goals = formatMoney(picture.reservedForGoals);

  if (picture.unreserved < 0) {
    return `Số dư ${balance} − hoá đơn chưa trả ${bills} còn ít hơn ${goals} đã dành cho mục tiêu.`;
  }
  if (picture.protectedForBills === 0 && picture.reservedForGoals === 0) {
    return `Toàn bộ số dư ${balance}; chưa có hoá đơn chưa trả hay mục tiêu nào giữ tiền.`;
  }
  return `Số dư ${balance} − hoá đơn chưa trả ${bills} − đã dành cho mục tiêu ${goals}.`;
}
