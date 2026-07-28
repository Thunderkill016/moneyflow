"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { RecurringIncomeTemplate, SaveIncomeTemplateInput } from "@/lib/planning/income-templates";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";
import { mapIncomeTemplateRow } from "@/server/income-templates";

export type IncomeTemplateActionResult =
  | { ok: true; template?: RecurringIncomeTemplate; transactionId?: string }
  | { ok: false; message: string };

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  dueDay: z.number().int().min(1).max(31),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
});
const idSchema = z.string().uuid();
const monthSchema = z.string().regex(/^\d{4}-\d{2}-01$/);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function refresh() {
  revalidatePath("/");
  revalidatePath("/income-templates");
  revalidatePath("/transactions");
  revalidatePath("/insights");
}

export async function saveIncomeTemplateAction(
  input: SaveIncomeTemplateInput,
  monthStart: string,
): Promise<IncomeTemplateActionResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success || !monthSchema.safeParse(monthStart).success) {
    return { ok: false, message: "Thông tin lương định kỳ chưa hợp lệ." };
  }
  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: false, message: "Chế độ demo không lưu lên máy chủ." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };
  const value = parsed.data;
  const { data: id, error } = await supabase.rpc("upsert_recurring_income_template", {
    p_template_id: value.id ?? null,
    p_name: value.name,
    p_amount_minor: value.amount,
    p_due_day: value.dueDay,
    p_account_id: value.accountId,
    p_category_id: value.categoryId,
  });
  if (error || typeof id !== "string") {
    return { ok: false, message: "Không thể lưu lương định kỳ." };
  }
  const { data, error: readError } = await supabase
    .from("recurring_income_template_feed")
    .select(
      "id,name,amount_minor,due_day,account_id,account_name,category_id,category_name,category_icon,category_color,is_archived",
    )
    .eq("id", id)
    .single();
  if (readError || !data) {
    refresh();
    return { ok: false, message: "Đã lưu nhưng chưa tải lại được dữ liệu." };
  }
  const existingTransaction = input.id
    ? await supabase
        .from("income_template_occurrences")
        .select("transaction_id")
        .eq("template_id", id)
        .eq("month_start", monthStart)
        .maybeSingle()
    : null;
  try {
    const template = mapIncomeTemplateRow(
      data,
      monthStart,
      existingTransaction?.data?.transaction_id ?? null,
    );
    refresh();
    return { ok: true, template };
  } catch {
    refresh();
    return { ok: false, message: "Dữ liệu trả về không hợp lệ." };
  }
}

export async function archiveIncomeTemplateAction(
  id: string,
  archived: boolean,
): Promise<IncomeTemplateActionResult> {
  if (!idSchema.safeParse(id).success) {
    return { ok: false, message: "Mã lương định kỳ không hợp lệ." };
  }
  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: false, message: "Chế độ demo không lưu lên máy chủ." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };
  const { data, error } = await supabase.rpc("set_recurring_income_template_archived", {
    p_template_id: id,
    p_archived: archived,
  });
  if (error || data !== true) {
    return { ok: false, message: "Không thể cập nhật lương định kỳ." };
  }
  refresh();
  return { ok: true };
}

export async function recordIncomeTemplateAction(
  id: string,
  monthStart: string,
  receivedOn: string,
  idempotencyKey: string,
): Promise<IncomeTemplateActionResult> {
  if (
    !idSchema.safeParse(id).success ||
    !monthSchema.safeParse(monthStart).success ||
    !dateSchema.safeParse(receivedOn).success ||
    !idSchema.safeParse(idempotencyKey).success
  ) {
    return { ok: false, message: "Thông tin ghi nhận thu không hợp lệ." };
  }
  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: false, message: "Chế độ demo không lưu lên máy chủ." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };
  const { data, error } = await supabase.rpc("record_recurring_income_template", {
    p_template_id: id,
    p_month_start: monthStart,
    p_received_on: receivedOn,
    p_idempotency_key: idempotencyKey,
  });
  if (error || typeof data !== "string") {
    return { ok: false, message: "Không thể ghi khoản thu. Kiểm tra lại tài khoản nhận." };
  }
  refresh();
  return { ok: true, transactionId: data };
}

export async function undoIncomeTemplateReceiptAction(
  id: string,
  monthStart: string,
): Promise<IncomeTemplateActionResult> {
  if (!idSchema.safeParse(id).success || !monthSchema.safeParse(monthStart).success) {
    return { ok: false, message: "Thông tin hoàn tác không hợp lệ." };
  }
  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: false, message: "Chế độ demo không lưu lên máy chủ." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };
  const { data, error } = await supabase.rpc("undo_recurring_income_template_receipt", {
    p_template_id: id,
    p_month_start: monthStart,
  });
  if (error || data !== true) {
    return { ok: false, message: "Không thể hoàn tác ghi nhận thu." };
  }
  refresh();
  return { ok: true };
}
