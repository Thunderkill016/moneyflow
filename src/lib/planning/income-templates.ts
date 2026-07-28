/**
 * Recurring income templates (lương định kỳ) — separate from bill commitments.
 *
 * Commitments = expense outflows that reserve safe-to-spend.
 * Income templates = expected inflows; they do NOT reduce reserved totals.
 * Recording posts a real income ledger row (integer minor units).
 */

import type { Transaction } from "../sample-data.ts";

export type RecurringIncomeTemplate = {
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
  /** True when this month’s income was posted to the ledger. */
  isReceived: boolean;
  transactionId: string | null;
};

export type SaveIncomeTemplateInput = {
  id?: string;
  name: string;
  amount: number;
  dueDay: number;
  accountId: string;
  categoryId: string;
};

/** monthStart (YYYY-MM-01) → templateId → income transaction id */
export type IncomeTemplateOccurrenceMap = Record<string, Record<string, string>>;

export function dueDateForMonth(monthStart: string, dueDay: number) {
  const [year, month] = monthStart.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${monthStart.slice(0, 8)}${String(Math.min(dueDay, lastDay)).padStart(2, "0")}`;
}

export function monthStartFromDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate.slice(0, 7) + "-01";
  return `${isoDate.slice(0, 7)}-01`;
}

/**
 * Active templates: expected (not yet received) vs received this month.
 * Never counts as expense reserve — income is inflow only.
 */
export function incomeTemplateTotals(items: RecurringIncomeTemplate[]) {
  return items.reduce(
    (totals, item) => {
      if (item.isArchived) return totals;
      if (item.isReceived) totals.received += item.amount;
      else totals.expected += item.amount;
      return totals;
    },
    { expected: 0, received: 0 },
  );
}

export function pendingActiveCount(items: RecurringIncomeTemplate[]): number {
  return items.filter((item) => !item.isArchived && !item.isReceived).length;
}

/**
 * Build a real income ledger row from a template.
 * Amount is integer minor units; flagged so edit/delete stay on /income-templates.
 */
export function buildIncomeTemplateReceipt(
  template: RecurringIncomeTemplate,
  receivedOn: string,
  transactionId: string,
  occurredAt: string = new Date().toISOString(),
): Transaction {
  if (!Number.isSafeInteger(template.amount) || template.amount <= 0) {
    throw new Error("invalid_income_template_amount");
  }
  return {
    id: transactionId,
    kind: "income",
    categoryId: template.categoryId,
    category: template.categoryName,
    note: template.name,
    accountId: template.accountId,
    account: template.accountName,
    amount: template.amount,
    occurredOn: receivedOn,
    occurredAt,
    relativeDate: "Vừa xong",
    isRecurringPayment: true,
  };
}

export function markIncomeReceived(
  items: RecurringIncomeTemplate[],
  templateId: string,
  transactionId: string,
): RecurringIncomeTemplate[] {
  return items.map((item) =>
    item.id === templateId
      ? { ...item, isReceived: true, transactionId }
      : item,
  );
}

export function markIncomeUnreceived(
  items: RecurringIncomeTemplate[],
  templateId: string,
): RecurringIncomeTemplate[] {
  return items.map((item) =>
    item.id === templateId
      ? { ...item, isReceived: false, transactionId: null }
      : item,
  );
}

export function applyIncomeOccurrenceMap(
  items: RecurringIncomeTemplate[],
  monthStart: string,
  map: IncomeTemplateOccurrenceMap,
  options: { preferMapOnly?: boolean } = {},
): RecurringIncomeTemplate[] {
  const month = map[monthStart];
  if (!month) return items;
  return items.map((item) => {
    if (item.isArchived) return item;
    if (Object.prototype.hasOwnProperty.call(month, item.id)) {
      const transactionId = month[item.id] ?? null;
      if (transactionId) {
        return { ...item, isReceived: true, transactionId };
      }
      return options.preferMapOnly
        ? { ...item, isReceived: false, transactionId: null }
        : item;
    }
    if (options.preferMapOnly) {
      return { ...item, isReceived: false, transactionId: null };
    }
    return item;
  });
}

export function recordIncomeOccurrence(
  map: IncomeTemplateOccurrenceMap,
  monthStart: string,
  templateId: string,
  transactionId: string,
): IncomeTemplateOccurrenceMap {
  return {
    ...map,
    [monthStart]: {
      ...(map[monthStart] ?? {}),
      [templateId]: transactionId,
    },
  };
}

export function clearIncomeOccurrence(
  map: IncomeTemplateOccurrenceMap,
  monthStart: string,
  templateId: string,
): IncomeTemplateOccurrenceMap {
  const month = { ...(map[monthStart] ?? {}) };
  delete month[templateId];
  const next = { ...map };
  if (Object.keys(month).length === 0) delete next[monthStart];
  else next[monthStart] = month;
  return next;
}

export function appendIncomeReceipt(
  transactions: Transaction[],
  income: Transaction,
): Transaction[] {
  if (transactions.some((item) => item.id === income.id)) return transactions;
  return [income, ...transactions];
}

export function removeIncomeReceipt(
  transactions: Transaction[],
  transactionId: string | null,
): Transaction[] {
  if (!transactionId) return transactions;
  return transactions.filter((item) => item.id !== transactionId);
}
