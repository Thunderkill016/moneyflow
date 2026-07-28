import type { Transaction } from "../sample-data.ts";

export type RecurringCommitment = {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  dueDate: string;
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  isArchived: boolean;
  isPaid: boolean;
  transactionId: string | null;
};

export type SaveCommitmentInput = {
  id?: string;
  name: string;
  amount: number;
  dueDay: number;
  accountId: string;
  categoryId: string;
};

/** monthStart (YYYY-MM-01) → commitmentId → expense transaction id */
export type CommitmentOccurrenceMap = Record<string, Record<string, string>>;

export function dueDateForMonth(monthStart: string, dueDay: number) {
  const [year, month] = monthStart.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${monthStart.slice(0, 8)}${String(Math.min(dueDay, lastDay)).padStart(2, "0")}`;
}

export function monthStartFromDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate.slice(0, 7) + "-01";
  return `${isoDate.slice(0, 7)}-01`;
}

export function commitmentTotals(items: RecurringCommitment[]) {
  return items.reduce((totals, item) => {
    if (item.isArchived) return totals;
    if (item.isPaid) totals.paid += item.amount;
    else totals.reserved += item.amount;
    return totals;
  }, { reserved: 0, paid: 0 });
}

/** Active unpaid count — used for empty/insights copy. */
export function unpaidActiveCount(items: RecurringCommitment[]): number {
  return items.filter((item) => !item.isArchived && !item.isPaid).length;
}

/**
 * Build a real expense ledger row for a commitment payment.
 * Amount is integer minor units; flagged so edit/delete stay on /commitments.
 */
export function buildCommitmentPaymentExpense(
  commitment: RecurringCommitment,
  paidOn: string,
  transactionId: string,
  occurredAt: string = new Date().toISOString(),
): Transaction {
  if (!Number.isSafeInteger(commitment.amount) || commitment.amount <= 0) {
    throw new Error("invalid_commitment_amount");
  }
  return {
    id: transactionId,
    kind: "expense",
    categoryId: commitment.categoryId,
    category: commitment.categoryName,
    note: commitment.name,
    accountId: commitment.accountId,
    account: commitment.accountName,
    amount: commitment.amount,
    occurredOn: paidOn,
    occurredAt,
    relativeDate: "Vừa xong",
    isRecurringPayment: true,
  };
}

export function markCommitmentPaid(
  items: RecurringCommitment[],
  commitmentId: string,
  transactionId: string,
): RecurringCommitment[] {
  return items.map((item) =>
    item.id === commitmentId
      ? { ...item, isPaid: true, transactionId }
      : item,
  );
}

export function markCommitmentUnpaid(
  items: RecurringCommitment[],
  commitmentId: string,
): RecurringCommitment[] {
  return items.map((item) =>
    item.id === commitmentId
      ? { ...item, isPaid: false, transactionId: null }
      : item,
  );
}

/**
 * Overlay demo/local occurrence map onto server (or seed) commitments for a month.
 * Explicit occurrence wins; missing key keeps seed isPaid / transactionId.
 */
export function applyOccurrenceMap(
  items: RecurringCommitment[],
  monthStart: string,
  map: CommitmentOccurrenceMap,
  options: { preferMapOnly?: boolean } = {},
): RecurringCommitment[] {
  const month = map[monthStart];
  if (!month) return items;
  return items.map((item) => {
    if (item.isArchived) return item;
    if (Object.prototype.hasOwnProperty.call(month, item.id)) {
      const transactionId = month[item.id] ?? null;
      if (transactionId) {
        return { ...item, isPaid: true, transactionId };
      }
      // Explicit unpaid (undo stored as empty/null removed key — treat absent as unpaid only if preferMapOnly)
      return options.preferMapOnly
        ? { ...item, isPaid: false, transactionId: null }
        : item;
    }
    if (options.preferMapOnly) {
      return { ...item, isPaid: false, transactionId: null };
    }
    return item;
  });
}

/** Record payment occurrence; returns next map (immutable). */
export function recordOccurrence(
  map: CommitmentOccurrenceMap,
  monthStart: string,
  commitmentId: string,
  transactionId: string,
): CommitmentOccurrenceMap {
  return {
    ...map,
    [monthStart]: {
      ...(map[monthStart] ?? {}),
      [commitmentId]: transactionId,
    },
  };
}

/** Clear payment occurrence for undo. */
export function clearOccurrence(
  map: CommitmentOccurrenceMap,
  monthStart: string,
  commitmentId: string,
): CommitmentOccurrenceMap {
  const month = { ...(map[monthStart] ?? {}) };
  delete month[commitmentId];
  const next = { ...map };
  if (Object.keys(month).length === 0) delete next[monthStart];
  else next[monthStart] = month;
  return next;
}

/**
 * Insert payment expense if not already present (idempotent by transaction id).
 */
export function appendPaymentExpense(
  transactions: Transaction[],
  expense: Transaction,
): Transaction[] {
  if (transactions.some((item) => item.id === expense.id)) return transactions;
  return [expense, ...transactions];
}

/** Remove linked payment expense by id (idempotent). */
export function removePaymentExpense(
  transactions: Transaction[],
  transactionId: string | null,
): Transaction[] {
  if (!transactionId) return transactions;
  return transactions.filter((item) => item.id !== transactionId);
}
