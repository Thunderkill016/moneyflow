import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { AccountKind, AccountSummary } from "@/lib/accounts";
import { demoAccountSummaries } from "@/lib/demo-master-data-store";
import { requireViewer } from "@/server/auth";

export type AccountsWorkspace = {
  accounts: AccountSummary[];
  dataError: string | null;
};

const accountRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  kind: z.enum(["cash", "bank", "e_wallet", "credit_card", "savings"]),
  currency_code: z.string().length(3),
  initial_balance_minor: z.union([z.number(), z.string()]),
  is_archived: z.boolean(),
});

function safeMoney(value: unknown) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount)) throw new Error("invalid_money");
  return amount;
}

export function mapAccountRow(value: unknown, balanceValue?: unknown): AccountSummary {
  const row = accountRowSchema.parse(value);
  const initialBalance = safeMoney(row.initial_balance_minor);
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as AccountKind,
    currencyCode: row.currency_code,
    initialBalance,
    balance: balanceValue === undefined ? initialBalance : safeMoney(balanceValue),
    isArchived: row.is_archived,
  };
}

export async function getAccountsWorkspace(): Promise<AccountsWorkspace> {
  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return { accounts: demoAccountSummaries, dataError: null };
  }

  const supabase = await createClient();
  if (!supabase) return { accounts: [], dataError: "Không thể kết nối dữ liệu tài khoản." };

  const [accountsResult, balancesResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("id,name,kind,currency_code,initial_balance_minor,is_archived")
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
