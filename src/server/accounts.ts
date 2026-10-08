import "server-only";

import { createClient } from "@/lib/supabase/server";
import { mapAccountRow, type AccountSummary } from "@/lib/accounts";
import { requireViewer } from "@/server/auth";

export { mapAccountRow };

export type AccountsWorkspace = {
  accounts: AccountSummary[];
  dataError: string | null;
};

export { demoAccountRows } from "@/lib/demo/transaction-fixtures";
import { demoAccountRows } from "@/lib/demo/transaction-fixtures";

export async function getAccountsWorkspace(): Promise<AccountsWorkspace> {
  const viewer = await requireViewer();
  if (viewer.isDemo) return { accounts: demoAccountRows, dataError: null };

  const supabase = await createClient();
  if (!supabase)
    return { accounts: [], dataError: "Không thể kết nối dữ liệu tài khoản." };

  const [accountsResult, balancesResult] = await Promise.all([
    supabase
      .from("accounts")
      .select(
        "id,name,kind,currency_code,initial_balance_minor,is_archived,icon,color,updated_at",
      )
      .order("is_archived")
      .order("created_at"),
    supabase.from("account_balances").select("account_id,balance_minor"),
  ]);

  if (accountsResult.error || balancesResult.error) {
    return { accounts: [], dataError: "Chưa tải được tài khoản. Hãy thử lại." };
  }

  try {
    const balances = new Map(
      (balancesResult.data ?? []).map((item) => [
        item.account_id,
        item.balance_minor,
      ]),
    );
    const accounts = (accountsResult.data ?? []).map((row) =>
      mapAccountRow(row, balances.get(row.id)),
    );
    return { accounts, dataError: null };
  } catch {
    return {
      accounts: [],
      dataError: "Dữ liệu tài khoản không đúng định dạng.",
    };
  }
}
