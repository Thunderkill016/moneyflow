import {
  accountTransactionImpact,
  reconcileAccountBalanceSnapshot,
  type AccountRegisterEntry,
} from "./account-register.ts";
import { normalizeCurrencyCode } from "./currency.ts";
import type { AccountOption, Transaction } from "./transactions/contracts.ts";

/**
 * Per-row running balance for the single-account register view.
 *
 * Semantics — "Số dư sau giao dịch" (balance after the transaction): each row
 * carries the scoped account's balance immediately *after* that transaction
 * posted, anchored at the account's current balance. The column is a property
 * of the account register, not of the visible window, so search/kind/date
 * filters may hide rows but never change a row's number.
 *
 * Direction: the ledger displays newest first, so the walk starts at the
 * anchor (the newest row's balance-after IS the current balance) and subtracts
 * each entry's impact to reach the next row down.
 */

export type RegisterBalanceScope = {
  accountId: string;
  accountName: string;
  currencyCode: string;
  /**
   * Account balance (integer minor units) consistent with the baseline
   * transaction list the caller passes to `buildRunningBalance`.
   */
  snapshotBalance: number;
};

/**
 * Resolve the account filter value to a single account.
 *
 * The ledger filter selects by account *name* and matches both transfer legs,
 * so a running total is only honest when the name maps to exactly one account.
 * Anything else — "all", an unknown name, a name shared by two accounts, or an
 * account whose balance was never loaded — returns null and hides the column
 * rather than mixing ledgers or inventing a starting point.
 */
export function resolveRegisterBalanceScope(
  selectedAccount: string,
  accounts: readonly AccountOption[],
): RegisterBalanceScope | null {
  if (selectedAccount === "all") return null;
  const matches = accounts.filter((item) => item.name === selectedAccount);
  if (matches.length !== 1) return null;
  const account = matches[0];
  if (
    typeof account.balance !== "number" ||
    !Number.isSafeInteger(account.balance)
  ) {
    return null;
  }
  return {
    accountId: account.id,
    accountName: account.name,
    currencyCode: normalizeCurrencyCode(account.currencyCode),
    snapshotBalance: account.balance,
  };
}

export type RunningBalance = {
  accountId: string;
  currencyCode: string;
  /**
   * transaction id → scoped-account balance immediately after that
   * transaction, in integer minor units. `null` marks a row the ledger cannot
   * vouch for (below a cross-currency leg or an unsafe intermediate value).
   * Transactions outside the scoped register are absent from the map.
   */
  balanceAfter: ReadonlyMap<string, number | null>;
};

function transferCounterpartyId(entry: AccountRegisterEntry): string | null {
  const { transaction } = entry;
  if (transaction.kind !== "transfer") return null;
  return entry.direction === "out"
    ? (transaction.destinationAccountId ?? null)
    : transaction.accountId;
}

/**
 * Same-currency guarantee for one register entry. The ledger enforces
 * same-currency transfers at write time, so an *unknown* counterparty (e.g. an
 * archived account missing from the workspace list) stays trusted; only a
 * counterparty that resolves to a *different* currency poisons the column.
 */
function entryCurrencyTrusted(
  entry: AccountRegisterEntry,
  currencyByAccountId: ReadonlyMap<string, string>,
  currencyCode: string,
): boolean {
  const counterpartyId = transferCounterpartyId(entry);
  if (counterpartyId === null) return true;
  const counterpartyCurrency = currencyByAccountId.get(counterpartyId);
  return (
    counterpartyCurrency === undefined || counterpartyCurrency === currencyCode
  );
}

/**
 * Build the running-balance column for one account register.
 *
 * `liveTransactions` must arrive in display order (newest first — the same
 * array the rows render from). `baselineTransactions` is the ledger state the
 * `scope.snapshotBalance` was taken against: the anchor reconciles the two so
 * session mutations and optimistic rows shift the whole column consistently
 * instead of silently sliding past the real balance.
 *
 * Returns null when no honest anchor exists (snapshot arithmetic overflow).
 * Individual rows degrade to `null` — never a guessed number — below an
 * entry whose impact cannot be expressed in the account's currency.
 */
export function buildRunningBalance(
  liveTransactions: readonly Transaction[],
  baselineTransactions: readonly Transaction[],
  scope: RegisterBalanceScope,
  accounts: readonly AccountOption[],
): RunningBalance | null {
  const liveEntries: AccountRegisterEntry[] = [];
  for (const transaction of liveTransactions) {
    const entry = accountTransactionImpact(transaction, scope.accountId);
    if (entry) liveEntries.push(entry);
  }

  const baselineEntries: AccountRegisterEntry[] = [];
  for (const transaction of baselineTransactions) {
    const entry = accountTransactionImpact(transaction, scope.accountId);
    if (entry) baselineEntries.push(entry);
  }

  let anchor: number;
  try {
    anchor = reconcileAccountBalanceSnapshot(
      scope.snapshotBalance,
      baselineEntries,
      liveEntries,
    );
  } catch {
    return null;
  }

  const currencyByAccountId = new Map<string, string>(
    accounts.map((item) => [item.id, normalizeCurrencyCode(item.currencyCode)]),
  );

  const balanceAfter = new Map<string, number | null>();
  let running = anchor;
  let poisoned = !Number.isSafeInteger(anchor);

  for (const entry of liveEntries) {
    if (poisoned) {
      balanceAfter.set(entry.transaction.id, null);
      continue;
    }
    /*
     * The anchor already includes this entry's own impact, so the row's
     * balance-after is the running value *before* subtracting it. An
     * untrusted or overflowing entry therefore keeps its own number exact
     * and only voids the rows below it.
     */
    balanceAfter.set(entry.transaction.id, running);
    const next = running - entry.impact;
    if (
      !Number.isSafeInteger(next) ||
      !entryCurrencyTrusted(entry, currencyByAccountId, scope.currencyCode)
    ) {
      poisoned = true;
      continue;
    }
    running = next;
  }

  return {
    accountId: scope.accountId,
    currencyCode: scope.currencyCode,
    balanceAfter,
  };
}
