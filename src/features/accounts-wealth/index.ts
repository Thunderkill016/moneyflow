import type { Account, AccountGroup } from "../../core/schema/account.schema.ts";

export interface GroupedAccounts {
  group: AccountGroup;
  accounts: Account[];
  subtotalBalance: number;
}

export function groupAccountsByType(accounts: readonly Account[]): GroupedAccounts[] {
  const order: AccountGroup[] = ["LIQUID", "INVESTMENT", "DEBT"];
  return order.map((group) => {
    const items = accounts.filter((acc) => !acc.isArchived && acc.group === group);
    return {
      group,
      accounts: items,
      subtotalBalance: items.reduce((sum, acc) => sum + acc.currentBalance, 0),
    };
  });
}
