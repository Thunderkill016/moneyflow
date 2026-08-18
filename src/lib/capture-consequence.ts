import { formatMoney } from "./money.ts";
import type { Transaction } from "./sample-data.ts";

/*
 * What a save is worth, said at the moment of saving.
 *
 * The highest-attention moment in the app is the instant after a user records
 * something: they just did work and are looking at the screen. Today that moment
 * returns "Đã lưu giao dịch." on the quick-capture surface — four words carrying
 * no information — and a bare amount on the dashboard. Five consecutive releases
 * made recording cheaper; none made it pay off. This is the payoff.
 *
 * The line is built ONLY from what the user themselves recorded: the amount they
 * just entered, and the running total for that category this month. It restates
 * their own data. It is not guidance, and `capture-consequence.test.ts` asserts
 * that in the strongest way available — by forbidding prescriptive vocabulary
 * outright, so the boundary is enforced rather than promised.
 *
 * The withheld safe-to-spend figure stays withheld. `docs/product/PRINCIPLES.md`
 * requires a researched contract and reliable income-cycle, commitment and reserve
 * data before MoneyFlow tells anyone what they may spend, and none of that is
 * needed to say "here is what you have recorded so far".
 */

const MONTH_PREFIX_LENGTH = 7; // "YYYY-MM"

export type CaptureConsequenceInput = {
  /** The transaction that was just saved. */
  saved: Pick<Transaction, "kind" | "category" | "amount" | "occurredOn">;
  /** The ledger after the save, so the running total includes it. */
  transactions: Transaction[];
};

/**
 * Running total for one category within the month of a given date.
 *
 * Deliberately mirrors `topExpenseCategories` in `finance.ts`: same month-prefix
 * window, same exact `kind` match so transfers stay neutral, and the same handling
 * of split rows, which contribute only their own line to a category. A figure that
 * disagreed with the dashboard would be worse than no figure at all.
 */
export function categoryMonthTotal(
  transactions: Transaction[],
  category: string,
  kind: Transaction["kind"],
  withinMonth: string,
): number {
  const monthPrefix = withinMonth.slice(0, MONTH_PREFIX_LENGTH);
  let total = 0;

  for (const item of transactions) {
    if (item.kind !== kind) continue;
    if (!item.occurredOn.startsWith(monthPrefix)) continue;
    if (!Number.isSafeInteger(item.amount) || item.amount <= 0) continue;

    if (item.splits && item.splits.length >= 2) {
      for (const line of item.splits) {
        if (line.category !== category) continue;
        if (!Number.isSafeInteger(line.amount) || line.amount <= 0) continue;
        total += line.amount;
      }
      continue;
    }

    if (item.category === category) total += item.amount;
  }

  return Number.isSafeInteger(total) ? total : 0;
}

/**
 * One Vietnamese sentence pair: what was recorded, and what it adds up to.
 *
 * Returns the plain confirmation alone when there is no useful running total to
 * add — a transfer, an uncategorised row, or the first entry in a category, where
 * "tháng này: 50.000 ₫" after saving 50.000 ₫ would be noise rather than payoff.
 */
export function captureConsequence({
  saved,
  transactions,
}: CaptureConsequenceInput): string {
  const verb =
    saved.kind === "expense"
      ? "Đã ghi khoản chi"
      : saved.kind === "income"
        ? "Đã ghi khoản thu"
        : "Đã chuyển tiền";

  const confirmation = `${verb} ${formatMoney(saved.amount)}.`;

  // A transfer belongs to no category total, and inventing one would break the
  // transfer-neutrality the whole ledger depends on.
  if (saved.kind === "transfer") return confirmation;
  if (!saved.category.trim()) return confirmation;

  const total = categoryMonthTotal(
    transactions,
    saved.category,
    saved.kind,
    saved.occurredOn,
  );

  // Nothing to add when this row is the whole total.
  if (total <= saved.amount) return confirmation;

  return `${confirmation} ${saved.category} tháng này: ${formatMoney(total)}.`;
}
