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

export function dueDateForMonth(monthStart: string, dueDay: number) {
  const [year, month] = monthStart.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${monthStart.slice(0, 8)}${String(Math.min(dueDay, lastDay)).padStart(2, "0")}`;
}

export function commitmentTotals(items: RecurringCommitment[]) {
  return items.reduce((totals, item) => {
    if (item.isArchived) return totals;
    if (item.isPaid) totals.paid += item.amount;
    else totals.reserved += item.amount;
    return totals;
  }, { reserved: 0, paid: 0 });
}
