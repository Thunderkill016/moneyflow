"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { CreateTransactionInput, CreateTransferInput, Transaction, UpdateMoneyTransactionInput, UpdateTransferInput } from "@/lib/sample-data";
import { requireViewer } from "@/server/auth";
import { mapTransactionFeedRow } from "@/server/finance";

export type TransactionActionResult =
  | { ok: true; transaction?: Transaction }
  | { ok: false; message: string };

const createSchema = z.object({
  kind: z.enum(["income", "expense"]),
  categoryId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  note: z.string().trim().max(500),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  idempotencyKey: z.string().uuid(),
});

const idSchema = z.string().uuid();
const transferFields = z.object({ sourceAccountId: z.string().uuid(), destinationAccountId: z.string().uuid(), amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), note: z.string().trim().max(500), occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), idempotencyKey: z.string().uuid() });
const transferSchema = transferFields.refine((value) => value.sourceAccountId !== value.destinationAccountId);
const updateSchema = createSchema.omit({ idempotencyKey: true }).extend({ id: z.string().uuid() });
const updateTransferSchema = transferFields.omit({ idempotencyKey: true }).extend({ id: z.string().uuid(), kind: z.literal("transfer") }).refine((value) => value.sourceAccountId !== value.destinationAccountId);
const feedColumns = "id,kind,note,occurred_on,created_at,amount_minor,account_id,account_name,category_id,category_name,destination_account_id,destination_account_name,is_recurring_payment";

function refreshFinancePages() {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/budgets");
}

export async function createTransactionAction(
  input: CreateTransactionInput,
): Promise<TransactionActionResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Thông tin giao dịch chưa hợp lệ." };

  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: false, message: "Hãy dùng bộ nhớ demo trên thiết bị." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const { data: transactionId, error } = await supabase.rpc("create_money_transaction", {
    p_account_id: parsed.data.accountId,
    p_category_id: parsed.data.categoryId,
    p_kind: parsed.data.kind,
    p_amount_minor: parsed.data.amount,
    p_occurred_on: parsed.data.occurredOn,
    p_note: parsed.data.note,
    p_idempotency_key: parsed.data.idempotencyKey,
  });

  if (error || typeof transactionId !== "string") {
    return { ok: false, message: "Không thể lưu giao dịch. Hãy kiểm tra và thử lại." };
  }

  const { data, error: readError } = await supabase
    .from("transaction_feed")
    .select(feedColumns)
    .eq("id", transactionId)
    .single();

  if (readError || !data) {
    refreshFinancePages();
    return { ok: false, message: "Đã lưu nhưng chưa tải lại được giao dịch. Hãy làm mới trang." };
  }

  try {
    const transaction = mapTransactionFeedRow(data);
    refreshFinancePages();
    return { ok: true, transaction };
  } catch {
    refreshFinancePages();
    return { ok: false, message: "Đã lưu nhưng dữ liệu trả về không hợp lệ." };
  }
}

export async function createTransferAction(input: CreateTransferInput): Promise<TransactionActionResult> {
  const parsed = transferSchema.safeParse(input); if (!parsed.success) return { ok: false, message: "Thông tin chuyển tiền chưa hợp lệ." };
  const viewer = await requireViewer(); if (viewer.isDemo) return { ok: false, message: "Hãy dùng bộ nhớ demo trên thiết bị." };
  const supabase = await createClient(); if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };
  const value = parsed.data; const { data: transactionId, error } = await supabase.rpc("create_account_transfer", { p_source_account_id: value.sourceAccountId, p_destination_account_id: value.destinationAccountId, p_amount_minor: value.amount, p_occurred_on: value.occurredOn, p_note: value.note, p_idempotency_key: value.idempotencyKey });
  if (error || typeof transactionId !== "string") return { ok: false, message: "Không thể chuyển tiền. Hãy kiểm tra hai tài khoản và thử lại." };
  const { data, error: readError } = await supabase.from("transaction_feed").select(feedColumns).eq("id", transactionId).single();
  if (readError || !data) { refreshFinancePages(); return { ok: false, message: "Đã chuyển nhưng chưa tải lại được giao dịch." }; }
  try { const transaction = mapTransactionFeedRow(data); refreshFinancePages(); revalidatePath("/accounts"); return { ok: true, transaction }; }
  catch { refreshFinancePages(); return { ok: false, message: "Đã chuyển nhưng dữ liệu trả về không hợp lệ." }; }
}

export async function deleteTransactionAction(id: string): Promise<TransactionActionResult> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, message: "Mã giao dịch không hợp lệ." };

  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: false, message: "Hãy dùng bộ nhớ demo trên thiết bị." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const { data, error } = await supabase.rpc("soft_delete_money_transaction", {
    p_transaction_id: parsed.data,
  });
  if (error?.message.includes("recurring_payment_locked")) return { ok: false, message: "Khoản này được tạo từ lịch định kỳ. Hãy hoàn tác thanh toán ở trang Định kỳ." };
  if (error) return { ok: false, message: "Không thể xóa giao dịch. Hãy thử lại." };
  if (data !== true) return { ok: false, message: "Giao dịch không còn tồn tại." };

  refreshFinancePages();
  return { ok: true };
}

export async function updateTransactionAction(input: UpdateMoneyTransactionInput): Promise<TransactionActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Thông tin giao dịch chưa hợp lệ." };
  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: false, message: "Hãy dùng bộ nhớ demo trên thiết bị." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };
  const value = parsed.data;
  const { data: transactionId, error } = await supabase.rpc("update_money_transaction", {
    p_transaction_id: value.id, p_account_id: value.accountId, p_category_id: value.categoryId,
    p_kind: value.kind, p_amount_minor: value.amount, p_occurred_on: value.occurredOn, p_note: value.note,
  });
  if (error?.message.includes("recurring_payment_locked")) return { ok: false, message: "Khoản này được quản lý ở trang Định kỳ." };
  if (error || typeof transactionId !== "string") return { ok: false, message: "Không thể cập nhật giao dịch. Hãy kiểm tra và thử lại." };
  const { data, error: readError } = await supabase.from("transaction_feed").select(feedColumns).eq("id", transactionId).single();
  if (readError || !data) { refreshFinancePages(); return { ok: false, message: "Đã cập nhật nhưng chưa tải lại được giao dịch." }; }
  try { const transaction = mapTransactionFeedRow(data); refreshFinancePages(); return { ok: true, transaction }; }
  catch { refreshFinancePages(); return { ok: false, message: "Đã cập nhật nhưng dữ liệu trả về không hợp lệ." }; }
}

export async function updateTransferAction(input: UpdateTransferInput): Promise<TransactionActionResult> {
  const parsed = updateTransferSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Thông tin chuyển tiền chưa hợp lệ." };
  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: false, message: "Hãy dùng bộ nhớ demo trên thiết bị." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };
  const value = parsed.data;
  const { data: transactionId, error } = await supabase.rpc("update_account_transfer", {
    p_transaction_id: value.id, p_source_account_id: value.sourceAccountId,
    p_destination_account_id: value.destinationAccountId, p_amount_minor: value.amount,
    p_occurred_on: value.occurredOn, p_note: value.note,
  });
  if (error || typeof transactionId !== "string") return { ok: false, message: "Không thể cập nhật chuyển tiền. Hãy kiểm tra hai tài khoản." };
  const { data, error: readError } = await supabase.from("transaction_feed").select(feedColumns).eq("id", transactionId).single();
  if (readError || !data) { refreshFinancePages(); return { ok: false, message: "Đã cập nhật nhưng chưa tải lại được giao dịch." }; }
  try { const transaction = mapTransactionFeedRow(data); refreshFinancePages(); return { ok: true, transaction }; }
  catch { refreshFinancePages(); return { ok: false, message: "Đã cập nhật nhưng dữ liệu trả về không hợp lệ." }; }
}
