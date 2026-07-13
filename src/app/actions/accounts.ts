"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { AccountSummary, SaveAccountInput } from "@/lib/accounts";
import { requireViewer } from "@/server/auth";
import { mapAccountRow } from "@/server/accounts";

export type AccountActionResult =
  | { ok: true; account?: AccountSummary }
  | { ok: false; message: string };

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  kind: z.enum(["cash", "bank", "e_wallet", "credit_card", "savings"]),
  initialBalance: z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
});
const archiveSchema = z.object({ id: z.string().uuid(), archived: z.boolean() });

function refreshAccountPages() {
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/transactions");
}

function accountError(message: string) {
  if (message.includes("account_limit_reached")) return "Bạn đã đạt giới hạn 30 tài khoản.";
  if (message.includes("last_active_account")) return "Cần giữ lại ít nhất một tài khoản hoạt động.";
  return "Không thể cập nhật tài khoản. Hãy thử lại.";
}

export async function saveAccountAction(input: SaveAccountInput): Promise<AccountActionResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Thông tin tài khoản chưa hợp lệ." };

  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: false, message: "Chế độ demo không lưu tài khoản mới." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  let accountId = parsed.data.id;
  if (accountId) {
    const { data, error } = await supabase.rpc("update_financial_account", {
      p_account_id: accountId,
      p_name: parsed.data.name,
      p_kind: parsed.data.kind,
      p_initial_balance_minor: parsed.data.initialBalance,
    });
    if (error) return { ok: false, message: accountError(error.message) };
    if (data !== true) return { ok: false, message: "Không tìm thấy tài khoản." };
  } else {
    const { data, error } = await supabase.rpc("create_financial_account", {
      p_name: parsed.data.name,
      p_kind: parsed.data.kind,
      p_initial_balance_minor: parsed.data.initialBalance,
    });
    if (error || typeof data !== "string") {
      return { ok: false, message: accountError(error?.message ?? "create_failed") };
    }
    accountId = data;
  }

  const [accountResult, balanceResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("id,name,kind,currency_code,initial_balance_minor,is_archived")
      .eq("id", accountId)
      .single(),
    supabase.from("account_balances").select("balance_minor").eq("account_id", accountId).single(),
  ]);
  if (accountResult.error || !accountResult.data) {
    refreshAccountPages();
    return { ok: false, message: "Đã lưu nhưng chưa tải lại được tài khoản." };
  }

  try {
    const account = mapAccountRow(accountResult.data, balanceResult.data?.balance_minor);
    refreshAccountPages();
    return { ok: true, account };
  } catch {
    refreshAccountPages();
    return { ok: false, message: "Dữ liệu tài khoản trả về không hợp lệ." };
  }
}

export async function setAccountArchivedAction(id: string, archived: boolean): Promise<AccountActionResult> {
  const parsed = archiveSchema.safeParse({ id, archived });
  if (!parsed.success) return { ok: false, message: "Yêu cầu chưa hợp lệ." };

  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: false, message: "Chế độ demo không thay đổi tài khoản." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const { data, error } = await supabase.rpc("set_financial_account_archived", {
    p_account_id: parsed.data.id,
    p_archived: parsed.data.archived,
  });
  if (error) return { ok: false, message: accountError(error.message) };
  if (data !== true) return { ok: false, message: "Tài khoản đã ở trạng thái này hoặc không tồn tại." };

  refreshAccountPages();
  return { ok: true };
}
