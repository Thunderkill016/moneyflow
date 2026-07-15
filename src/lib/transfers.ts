import type { AccountSummary } from "./accounts.ts";
import { canTransferSameCurrency } from "./currency.ts";

/** Best-of Firefly/Actual: transfer is not an expense (TASK-203). */
export const TRANSFER_KIND_LABEL = "Chuyển khoản" as const;
export const TRANSFER_NOT_EXPENSE_HINT = "không tính chi" as const;
/** List / detail helper under a transfer row. */
export const TRANSFER_LIST_HINT = `${TRANSFER_KIND_LABEL} · ${TRANSFER_NOT_EXPENSE_HINT}` as const;

/** Subtitle for transfer rows: path + not-expense badge. */
export function transferRowSubtitle(
  sourceName: string,
  destinationName: string | undefined | null,
): string {
  const dest = destinationName?.trim() || "?";
  return `${sourceName} → ${dest} · ${TRANSFER_LIST_HINT}`;
}

/**
 * Apply a same-currency transfer. Cross-currency returns accounts unchanged
 * (no FX rate engine — TASK-129 read-only multi-currency).
 */
export function applyTransferBalances(accounts: AccountSummary[], sourceId: string, destinationId: string, amount: number) {
  if (sourceId === destinationId || !Number.isSafeInteger(amount) || amount <= 0) return accounts;
  const source = accounts.find((item) => item.id === sourceId);
  const destination = accounts.find((item) => item.id === destinationId);
  if (!source || !destination) return accounts;
  if (!canTransferSameCurrency(source, destination)) return accounts;
  return accounts.map((account) => {
    if (account.id === sourceId) return { ...account, balance: account.balance - amount };
    if (account.id === destinationId) return { ...account, balance: account.balance + amount };
    return account;
  });
}
