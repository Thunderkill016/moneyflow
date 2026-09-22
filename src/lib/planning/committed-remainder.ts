/**
 * Obligations-aware remainder for the dashboard statement.
 *
 * `currentBalance − declared unpaid commitments this month`, with expected
 * income templates reported as their own figure. This is arithmetic on what
 * the user already declared — never a "safe to spend" claim: the line names
 * exactly which inputs produced the number and refuses to exist when any of
 * them is incomplete.
 *
 * Completeness is the contract, not a courtesy. The figure means "of the money
 * the ledger knows about, this much is left after this month's declared bills".
 * A missing amount, a foreign-currency account that cannot be folded into a
 * VND total, or an occurrence that cannot be dated all break that claim, so
 * the module reports `complete: false` and withholds `remainder` rather than
 * emitting a partial number that would imply coverage it does not have.
 *
 * Money is integer đồng throughout. A negative remainder is real signal —
 * declared obligations exceed the recorded balance — and is kept, not clamped.
 */

import { formatMoney } from "../money.ts";
import type { RecurringCommitment } from "./commitments.ts";
import type { RecurringIncomeTemplate } from "./income-templates.ts";

const MONTH_START_PATTERN = /^\d{4}-\d{2}-01$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_CURRENCY_PATTERN = /^[A-Za-z]{3}$/;

/** Why a remainder was withheld — drives tests and honest UI copy. */
export type CommittedRemainderGap =
  | "invalid-month"
  | "unsafe-balance"
  | "account-currency-foreign"
  | "account-currency-unknown"
  | "commitment-amount-invalid"
  | "commitment-occurrence-invalid"
  | "income-amount-invalid"
  | "income-occurrence-invalid";

export type CommittedRemainder = {
  /**
   * `balance − unpaid declared commitments (+ expected income when the caller
   * folds it in)`. Integer đồng; negative means obligations exceed the balance.
   * `null` unless `complete` — no partial number leaves this module.
   */
  remainder: number | null;
  /** Sum of unpaid commitment occurrences due in `monthStart`, integer đồng. */
  obligationTotal: number;
  /** How many unpaid this-month occurrences `obligationTotal` covers. */
  obligationCount: number;
  /** Expected (declared, not yet received) income for `monthStart`, đồng. */
  expectedIncome: number;
  expectedIncomeCount: number;
  /** True when `remainder` already includes `expectedIncome`. */
  expectedIncomeIncluded: boolean;
  /** Every input needed for an honest figure was present and parseable. */
  complete: boolean;
  gaps: CommittedRemainderGap[];
};

export type CommittedRemainderInput = {
  /** VND đồng — the same integer the statement's standing figure shows. */
  currentBalance: number;
  /**
   * Every active account the balance is drawn from. Only the currency code is
   * read: a non-VND account cannot be folded into a đồng remainder, and an
   * unparseable one cannot be proven VND, so both withhold the figure.
   * `AccountOption.currencyCode` may be absent for legacy callers — the domain
   * contract treats an omitted code as VND, so absence alone is not a gap.
   */
  accounts: ReadonlyArray<{ currencyCode?: string | null }>;
  /** Commitments resolved for `monthStart`; `isPaid` is a per-month fact. */
  commitments: readonly RecurringCommitment[];
  /** Income templates resolved for `monthStart`; same per-month contract. */
  incomeTemplates?: readonly RecurringIncomeTemplate[];
  /** `YYYY-MM-01`. */
  monthStart: string;
};

function isValidAmount(amount: number): boolean {
  return Number.isSafeInteger(amount) && amount > 0;
}

/**
 * Occurrence membership for the month being stated. A malformed date is a
 * gap: an unpaid row that cannot be dated cannot be safely counted *or*
 * safely excluded.
 */
function occurrenceInMonth(
  dueDate: string,
  monthPrefix: string,
): "in-month" | "other-month" | "invalid" {
  if (!ISO_DATE_PATTERN.test(dueDate)) return "invalid";
  return dueDate.startsWith(monthPrefix) ? "in-month" : "other-month";
}

export function buildCommittedRemainder(
  input: CommittedRemainderInput,
  options: { includeExpectedIncome?: boolean } = {},
): CommittedRemainder {
  const gaps = new Set<CommittedRemainderGap>();

  if (!MONTH_START_PATTERN.test(input.monthStart)) gaps.add("invalid-month");
  const monthPrefix = input.monthStart.slice(0, 7);

  if (!Number.isSafeInteger(input.currentBalance)) gaps.add("unsafe-balance");

  for (const account of input.accounts) {
    const code = account.currencyCode;
    if (code == null) continue; // domain contract: omitted code means VND.
    const normalized = code.trim().toUpperCase();
    if (!ISO_CURRENCY_PATTERN.test(normalized)) {
      gaps.add("account-currency-unknown");
    } else if (normalized !== "VND") {
      gaps.add("account-currency-foreign");
    }
  }

  /*
   * Recurring commitments are monthly: an occurrence dated in another month
   * belongs to that month and claims nothing here. An unpaid one due in
   * `monthStart` must carry a usable amount — otherwise the honest answer is
   * "we cannot total what is owed", not a partial sum.
   */
  let obligationTotal = 0;
  let obligationCount = 0;
  for (const item of input.commitments) {
    if (item.isArchived || item.isPaid) continue;
    const membership = occurrenceInMonth(item.dueDate, monthPrefix);
    if (membership === "invalid") {
      gaps.add("commitment-occurrence-invalid");
      continue;
    }
    if (membership !== "in-month") continue;
    if (!isValidAmount(item.amount)) {
      gaps.add("commitment-amount-invalid");
      continue;
    }
    obligationTotal += item.amount;
    obligationCount += 1;
  }

  let expectedIncome = 0;
  let expectedIncomeCount = 0;
  for (const item of input.incomeTemplates ?? []) {
    if (item.isArchived || item.isReceived) continue;
    const membership = occurrenceInMonth(item.dueDate, monthPrefix);
    if (membership === "invalid") {
      gaps.add("income-occurrence-invalid");
      continue;
    }
    if (membership !== "in-month") continue;
    if (!isValidAmount(item.amount)) {
      gaps.add("income-amount-invalid");
      continue;
    }
    expectedIncome += item.amount;
    expectedIncomeCount += 1;
  }

  const includeIncome = Boolean(options.includeExpectedIncome);
  const remainder =
    input.currentBalance - obligationTotal + (includeIncome ? expectedIncome : 0);
  const complete = gaps.size === 0 && Number.isSafeInteger(remainder);
  const finalGaps = [...gaps];
  if (gaps.size === 0 && !Number.isSafeInteger(remainder)) {
    finalGaps.push("unsafe-balance");
  }

  return {
    remainder: complete ? remainder : null,
    obligationTotal,
    obligationCount,
    expectedIncome,
    expectedIncomeCount,
    expectedIncomeIncluded: includeIncome,
    complete,
    gaps: finalGaps,
  };
}

/**
 * The dashboard sentence — or `null`, which is the honest answer whenever the
 * inputs are incomplete or nothing was declared this month. Rendering `0 ₫`
 * or the bare balance after "0 khoản" would fake coverage the user never gave;
 * an absent line loses nothing because the standing figure is already beside it.
 */
export function committedRemainderLabel(
  result: CommittedRemainder,
  format: (amount: number) => string = formatMoney,
): string | null {
  if (!result.complete || result.remainder === null) return null;
  if (result.obligationCount === 0) return null;

  const countPhrase = `${result.obligationCount} khoản định kỳ đã khai báo tháng này`;
  const base =
    result.remainder < 0
      ? `Thiếu ${format(Math.abs(result.remainder))} cho ${countPhrase}`
      : `Còn ${format(result.remainder)} sau ${countPhrase}`;

  if (result.expectedIncome > 0) {
    const income = result.expectedIncomeIncluded
      ? `kể cả ${format(result.expectedIncome)} thu dự kiến`
      : `chưa gồm ${format(result.expectedIncome)} thu dự kiến`;
    return `${base} · ${income}`;
  }
  return base;
}
