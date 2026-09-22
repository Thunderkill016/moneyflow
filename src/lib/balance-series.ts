import { normalizeCurrencyCode } from "./currency.ts";
import { TREND_DAILY_MAX_DAYS } from "./reports.ts";
import type { Transaction } from "./transactions/contracts.ts";

/**
 * Balance-over-time series derived from the ledger.
 *
 * The product stores no balance history — only the current `account_balances`
 * value and the transaction entries behind it. The honest way to draw the past
 * is therefore to replay backwards from the current balance:
 *
 *   balance at end of day D = current balance − Σ entries dated after D.
 *
 * Entries before the series window never need loading for this: they are
 * already inside the anchor balance, so they surface through the opening value
 * (`opening`). Entries after the window matter — a custom report range in the
 * past is reconstructed by subtracting everything that happened since.
 *
 * Money rules honoured here:
 * - all amounts stay integer minor units (VND đồng / FX cents), never float;
 * - a transfer posts −amount on the source and +amount on the destination, so
 *   it moves money between account series but nets to zero in net worth;
 * - net worth sums VND accounts only. FX accounts keep a per-currency series
 *   and are listed separately — folding cents into đồng would be invented data.
 */

/** Signed movement on one account, in that account's integer minor units. */
export type BalanceSeriesEntry = {
  accountId: string;
  /** `YYYY-MM-DD` — the ledger day the movement belongs to. */
  occurredOn: string;
  /** + into the account, − out of it. */
  amount: number;
};

export type BalanceSeriesAccount = {
  id: string;
  name: string;
  currencyCode: string;
  /** Current balance — the anchor every point is derived from. */
  balance: number;
  isArchived?: boolean;
};

/** Inclusive `YYYY-MM-DD` window the series is drawn across. */
export type BalanceSeriesWindow = { start: string; end: string };

export type BalanceSeriesPoint = {
  /** `YYYY-MM-DD` for daily buckets, `YYYY-MM` for monthly ones. */
  key: string;
  /** Short axis label — same wording the spending-trend chart uses. */
  label: string;
  /** ISO day the value is measured at: end of that bucket, inside the window. */
  end: string;
  value: number;
};

export type AccountBalanceSeries = {
  accountId: string;
  name: string;
  currencyCode: string;
  isArchived: boolean;
  /** Balance at the day before `window.start` — where the window opens from. */
  opening: number;
  points: BalanceSeriesPoint[];
};

export type BalanceSeries = {
  window: BalanceSeriesWindow;
  /** Daily for short windows, monthly past `TREND_DAILY_MAX_DAYS` — same rule as the spending trend. */
  granularity: "day" | "month";
  accounts: AccountBalanceSeries[];
  /**
   * Sum across VND accounts per bucket, or `null` when the ledger holds no VND
   * account at all — an all-FX wallet has no VND net worth, and a zero line
   * would claim a history the ledger does not contain.
   */
  netWorthVnd: { opening: number; points: BalanceSeriesPoint[] } | null;
  /** Non-VND currencies present; those accounts are excluded from net worth. */
  foreignCurrencyCodes: string[];
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

function parseDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function dayString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDay(value: string, days: number) {
  const date = parseDay(value);
  date.setUTCDate(date.getUTCDate() + days);
  return dayString(date);
}

function daysBetween(start: string, end: string) {
  return Math.round((parseDay(end).getTime() - parseDay(start).getTime()) / DAY_MS) + 1;
}

/** A real calendar date, not merely `YYYY-MM-DD`-shaped — rejects 2026-02-31. */
function isRealDay(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = parseDay(value);
  return !Number.isNaN(date.getTime()) && dayString(date) === value;
}

/** Last calendar day of a `YYYY-MM` month key. */
function monthEnd(monthKey: string) {
  const date = parseDay(`${monthKey}-01`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);
  return dayString(date);
}

function safeAdd(total: number, amount: number) {
  const next = total + amount;
  if (!Number.isSafeInteger(next)) throw new Error("unsafe_balance_total");
  return next;
}

function safeSubtract(left: number, right: number) {
  const result = left - right;
  if (!Number.isSafeInteger(result)) throw new Error("unsafe_balance_total");
  return result;
}

/**
 * One point per day up to `TREND_DAILY_MAX_DAYS`, one per calendar month beyond
 * — the same switching rule the spending-trend chart uses, so both charts on
 * /reports describe the window the same way.
 */
function seriesBuckets(window: BalanceSeriesWindow): {
  granularity: BalanceSeries["granularity"];
  buckets: { key: string; label: string; end: string }[];
} {
  const buckets: { key: string; label: string; end: string }[] = [];
  if (daysBetween(window.start, window.end) > TREND_DAILY_MAX_DAYS) {
    let cursor = window.start.slice(0, 7);
    const lastMonth = window.end.slice(0, 7);
    while (cursor <= lastMonth) {
      const lastDay = monthEnd(cursor);
      buckets.push({
        key: cursor,
        label: `Thg ${Number(cursor.slice(5, 7))}`,
        end: lastDay < window.end ? lastDay : window.end,
      });
      const next = parseDay(`${cursor}-01`);
      next.setUTCMonth(next.getUTCMonth() + 1);
      cursor = dayString(next).slice(0, 7);
    }
    return { granularity: "month", buckets };
  }
  let cursor = window.start;
  while (cursor <= window.end) {
    const date = parseDay(cursor);
    buckets.push({
      key: cursor,
      label: `${date.getUTCDate()}/${date.getUTCMonth() + 1}`,
      end: cursor,
    });
    cursor = shiftDay(cursor, 1);
  }
  return { granularity: "day", buckets };
}

/**
 * Signed per-account movements from feed transactions. An expense leaves the
 * account, income enters it, a transfer does both legs. Split expenses keep
 * their whole amount on the one account that paid — the split lines only divide
 * categories, not the balance effect.
 */
export function balanceEntriesFromTransactions(
  transactions: Transaction[],
): BalanceSeriesEntry[] {
  const entries: BalanceSeriesEntry[] = [];
  for (const transaction of transactions) {
    if (!Number.isSafeInteger(transaction.amount)) {
      throw new Error("unsafe_balance_entry");
    }
    if (transaction.kind === "transfer") {
      if (transaction.accountId) {
        entries.push({
          accountId: transaction.accountId,
          occurredOn: transaction.occurredOn,
          amount: -transaction.amount,
        });
      }
      // A feed row without a destination leg still moved the source — the
      // account_balances view sees the same single-sided movement.
      if (transaction.destinationAccountId) {
        entries.push({
          accountId: transaction.destinationAccountId,
          occurredOn: transaction.occurredOn,
          amount: transaction.amount,
        });
      }
      continue;
    }
    entries.push({
      accountId: transaction.accountId,
      occurredOn: transaction.occurredOn,
      amount: transaction.kind === "income" ? transaction.amount : -transaction.amount,
    });
  }
  return entries;
}

export function buildBalanceSeries(
  accounts: BalanceSeriesAccount[],
  entries: BalanceSeriesEntry[],
  window: BalanceSeriesWindow,
): BalanceSeries {
  if (!isRealDay(window.start) || !isRealDay(window.end) || window.start > window.end) {
    throw new Error("invalid_balance_window");
  }
  const { granularity, buckets } = seriesBuckets(window);

  // Signed deltas per account per day — the only part of an entry the replay uses.
  const deltasByAccount = new Map<string, Map<string, number>>();
  for (const entry of entries) {
    if (!Number.isSafeInteger(entry.amount)) throw new Error("unsafe_balance_entry");
    const deltas = deltasByAccount.get(entry.accountId) ?? new Map<string, number>();
    deltas.set(entry.occurredOn, safeAdd(deltas.get(entry.occurredOn) ?? 0, entry.amount));
    deltasByAccount.set(entry.accountId, deltas);
  }

  const accountSeries = accounts.map<AccountBalanceSeries>((account) => {
    const deltas = deltasByAccount.get(account.id) ?? new Map<string, number>();
    const datesDesc = [...deltas.keys()].sort().reverse();
    /*
     * Walk bucket ends newest → oldest, accumulating `after` = Σ entries dated
     * later than the bucket end. value(E) = current balance − after. A day
     * inside the bucket (≤ end) is already inside the end-of-day balance, which
     * is why a movement shows up on its own day, not the day before.
     */
    const points = new Array<BalanceSeriesPoint>(buckets.length);
    let after = 0;
    let cursor = 0;
    for (let index = buckets.length - 1; index >= 0; index -= 1) {
      const end = buckets[index].end;
      while (cursor < datesDesc.length && datesDesc[cursor] > end) {
        after = safeAdd(after, deltas.get(datesDesc[cursor]) ?? 0);
        cursor += 1;
      }
      points[index] = { ...buckets[index], value: safeSubtract(account.balance, after) };
    }
    // Opening = balance at the day before the window: also subtract everything
    // dated inside the window itself (d ≥ start, all of it still unconsumed).
    while (cursor < datesDesc.length && datesDesc[cursor] >= window.start) {
      after = safeAdd(after, deltas.get(datesDesc[cursor]) ?? 0);
      cursor += 1;
    }
    const opening = safeSubtract(account.balance, after);
    return {
      accountId: account.id,
      name: account.name,
      currencyCode: normalizeCurrencyCode(account.currencyCode),
      isArchived: Boolean(account.isArchived),
      opening,
      points,
    };
  });

  const vndSeries = accountSeries.filter((series) => series.currencyCode === "VND");
  const netWorthVnd = vndSeries.length
    ? {
        opening: vndSeries.reduce((sum, series) => safeAdd(sum, series.opening), 0),
        points: buckets.map((bucket, index) => ({
          ...bucket,
          value: vndSeries.reduce(
            (sum, series) => safeAdd(sum, series.points[index]?.value ?? 0),
            0,
          ),
        })),
      }
    : null;
  const foreignCurrencyCodes = [
    ...new Set(
      accountSeries
        .map((series) => series.currencyCode)
        .filter((code) => code !== "VND"),
    ),
  ].sort();

  return {
    window: { ...window },
    granularity,
    accounts: accountSeries,
    netWorthVnd,
    foreignCurrencyCodes,
  };
}
