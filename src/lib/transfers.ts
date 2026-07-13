import type { AccountSummary } from "@/lib/accounts";

export function applyTransferBalances(accounts: AccountSummary[], sourceId: string, destinationId: string, amount: number) {
  if (sourceId === destinationId || !Number.isSafeInteger(amount) || amount <= 0) return accounts;
  return accounts.map((account) => {
    if (account.id === sourceId) return { ...account, balance: account.balance - amount };
    if (account.id === destinationId) return { ...account, balance: account.balance + amount };
    return account;
  });
}
