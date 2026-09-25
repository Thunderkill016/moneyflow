import "server-only";

import { createClient } from "@/lib/supabase/server";
import { mapAccountRow, type AccountSummary } from "@/lib/accounts";
import { requireViewer } from "@/server/auth";

export { mapAccountRow };

export type AccountsWorkspace = {
  accounts: AccountSummary[];
  dataError: string | null;
};

export const demoAccountRows: AccountSummary[] = [
  { id: "demo-account-mb", name: "MB Bank", kind: "bank", currencyCode: "VND", initialBalance: 1_126_000, balance: 15_454_000, isArchived: false, icon: "bank", color: "blue" },
  { id: "demo-account-cash", name: "Tiền mặt", kind: "cash", currencyCode: "VND", initialBalance: 0, balance: 239_000, isArchived: false, icon: "wallet", color: "green" },
  { id: "demo-account-momo", name: "MoMo", kind: "e_wallet", currencyCode: "VND", initialBalance: 0, balance: 42_000, isArchived: false, icon: "spark", color: "pink" },
  /** 200.00 USD in minor units (cents) — display only; no cross-currency transfer. */
  { id: "demo-account-usd", name: "USD du lịch", kind: "cash", currencyCode: "USD", initialBalance: 20_000, balance: 20_000, isArchived: false, icon: "coins", color: "amber" },
];

export async function getAccountsWorkspace(): Promise<AccountsWorkspace> {
  const viewer = await requireViewer();
  if (viewer.isDemo) return { accounts: demoAccountRows, dataError: null };

  const supabase = await createClient();
  if (!supabase) return { accounts: [], dataError: "Không thể kết nối dữ liệu tài khoản." };

  const [accountsResult, balancesResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("id,name,kind,currency_code,initial_balance_minor,is_archived,icon,color")
      .order("is_archived")
      .order("created_at"),
    supabase.from("account_balances").select("account_id,balance_minor"),
  ]);

  if (accountsResult.error || balancesResult.error) {
    return { accounts: [], dataError: "Chưa tải được tài khoản. Hãy thử lại." };
  }

  try {
    const balances = new Map(
      (balancesResult.data ?? []).map((item) => [item.account_id, item.balance_minor]),
    );
    const accounts = (accountsResult.data ?? []).map((row) =>
      mapAccountRow(row, balances.get(row.id)),
    );
    return { accounts, dataError: null };
  } catch {
    return { accounts: [], dataError: "Dữ liệu tài khoản không đúng định dạng." };
  }
}
