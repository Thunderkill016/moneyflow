"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AccountReconciliationStateData } from "@/lib/reconciliation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";
import { reloadAuthenticatedAccountReconciliationState } from "@/server/reconciliation";

export type ReconciliationActionResult =
  | { ok: true; stateData: AccountReconciliationStateData }
  | { ok: false; message: string };

const safeMoneySchema = z
  .number()
  .int()
  .min(-Number.MAX_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);
const accountIdSchema = z.string().uuid();
const startSchema = z.object({
  accountId: accountIdSchema,
  statementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  statementBalance: safeMoneySchema,
});
const entryStateSchema = z.object({
  accountId: accountIdSchema,
  entryId: z.string().uuid(),
  state: z.enum(["pending", "cleared"]),
});
const sessionSchema = z.object({
  accountId: accountIdSchema,
  reconciliationId: z.string().uuid(),
});

type RpcError = { code?: string; message?: string } | null;

function refreshReconciliationSurfaces(accountId: string) {
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath(`/accounts/${accountId}/reconcile`);
  revalidatePath("/transactions");
  revalidatePath("/timeline");
}

function isMissingContract(error: RpcError) {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "42883" ||
    error.code === "PGRST202" ||
    message.includes("start_account_reconciliation") ||
    message.includes("set_account_entry_reconciliation_state") ||
    message.includes("complete_account_reconciliation") ||
    message.includes("reopen_account_reconciliation") ||
    message.includes("Could not find the function")
  );
}

function reconciliationError(error: RpcError) {
  if (isMissingContract(error)) {
    return "Tính năng đối soát chưa được bật trên máy chủ.";
  }
  const message = error?.message ?? "";
  if (message.includes("invalid_statement_date")) return "Ngày sao kê chưa hợp lệ.";
  if (message.includes("invalid_statement_balance")) return "Số dư sao kê chưa hợp lệ.";
  if (message.includes("account_not_found")) return "Tài khoản không còn hoạt động hoặc không tồn tại.";
  if (message.includes("open_reconciliation_exists")) return "Tài khoản đang có một kỳ đối soát mở.";
  if (message.includes("statement_date_not_after_previous_reconciliation")) {
    return "Ngày sao kê phải sau kỳ đối soát đã hoàn tất gần nhất.";
  }
  if (message.includes("entry_not_found") || message.includes("transaction_not_found")) {
    return "Giao dịch đã thay đổi hoặc không còn trong sổ tài khoản.";
  }
  if (message.includes("transaction_deleted")) return "Giao dịch đã bị xóa nên không thể đối soát.";
  if (message.includes("entry_reconciled")) return "Giao dịch đã đối soát nên không thể đổi tại đây.";
  if (message.includes("open_reconciliation_not_found")) return "Kỳ đối soát không còn mở.";
  if (message.includes("reconciliation_difference_nonzero")) {
    return "Chênh lệch phải bằng 0 trước khi hoàn tất.";
  }
  if (message.includes("completed_reconciliation_not_found")) {
    return "Không tìm thấy kỳ đối soát đã hoàn tất.";
  }
  if (message.includes("only_latest_reconciliation_can_reopen")) {
    return "Chỉ kỳ đã hoàn tất gần nhất mới có thể mở lại.";
  }
  return "Không cập nhật được đối soát. Hãy thử lại.";
}

async function authenticatedClient() {
  const viewer = await requireViewer();
  if (viewer.isDemo) return null;
  return createClient();
}

async function canonicalState(accountId: string): Promise<ReconciliationActionResult> {
  refreshReconciliationSurfaces(accountId);
  const stateData = await reloadAuthenticatedAccountReconciliationState(accountId);
  if (!stateData.featureAvailable) {
    return { ok: false, message: "Đã cập nhật nhưng máy chủ chưa tải lại được hợp đồng đối soát." };
  }
  if (stateData.dataError) {
    return { ok: false, message: "Đã cập nhật nhưng chưa tải lại được trạng thái mới." };
  }
  return { ok: true, stateData };
}

export async function startAccountReconciliationAction(input: {
  accountId: string;
  statementDate: string;
  statementBalance: number;
}): Promise<ReconciliationActionResult> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Thông tin sao kê chưa hợp lệ." };
  const supabase = await authenticatedClient();
  if (!supabase) return { ok: false, message: "Hãy dùng bộ nhớ demo trên thiết bị." };

  const { error } = await supabase.rpc("start_account_reconciliation", {
    p_account_id: parsed.data.accountId,
    p_statement_date: parsed.data.statementDate,
    p_statement_balance_minor: parsed.data.statementBalance,
  });
  if (error) return { ok: false, message: reconciliationError(error) };
  return canonicalState(parsed.data.accountId);
}

export async function setAccountEntryReconciliationStateAction(input: {
  accountId: string;
  entryId: string;
  state: "pending" | "cleared";
}): Promise<ReconciliationActionResult> {
  const parsed = entryStateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Giao dịch đối soát chưa hợp lệ." };
  const supabase = await authenticatedClient();
  if (!supabase) return { ok: false, message: "Hãy dùng bộ nhớ demo trên thiết bị." };

  const { error } = await supabase.rpc("set_account_entry_reconciliation_state", {
    p_entry_id: parsed.data.entryId,
    p_state: parsed.data.state,
  });
  if (error) return { ok: false, message: reconciliationError(error) };
  return canonicalState(parsed.data.accountId);
}

export async function completeAccountReconciliationAction(input: {
  accountId: string;
  reconciliationId: string;
}): Promise<ReconciliationActionResult> {
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Kỳ đối soát chưa hợp lệ." };
  const supabase = await authenticatedClient();
  if (!supabase) return { ok: false, message: "Hãy dùng bộ nhớ demo trên thiết bị." };

  const { error } = await supabase.rpc("complete_account_reconciliation", {
    p_reconciliation_id: parsed.data.reconciliationId,
  });
  if (error) return { ok: false, message: reconciliationError(error) };
  return canonicalState(parsed.data.accountId);
}

export async function reopenAccountReconciliationAction(input: {
  accountId: string;
  reconciliationId: string;
}): Promise<ReconciliationActionResult> {
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Kỳ đối soát chưa hợp lệ." };
  const supabase = await authenticatedClient();
  if (!supabase) return { ok: false, message: "Hãy dùng bộ nhớ demo trên thiết bị." };

  const { error } = await supabase.rpc("reopen_account_reconciliation", {
    p_reconciliation_id: parsed.data.reconciliationId,
  });
  if (error) return { ok: false, message: reconciliationError(error) };
  return canonicalState(parsed.data.accountId);
}
