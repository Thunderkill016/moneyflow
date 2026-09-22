"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { RecurringCommitment, SaveCommitmentInput } from "@/lib/planning/commitments";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";
import { mapCommitmentRow } from "@/server/commitments";
import { currentMonthStart } from "@/server/budgets";

export type CommitmentActionResult = { ok: true; commitment?: RecurringCommitment; transactionId?: string } | { ok: false; message: string };
const saveSchema = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1).max(80), amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), dueDay: z.number().int().min(1).max(31), accountId: z.string().uuid(), categoryId: z.string().uuid() });
const idSchema = z.string().uuid();
const monthSchema = z.string().regex(/^\d{4}-\d{2}-01$/);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
function refresh() { revalidatePath("/"); revalidatePath("/commitments"); revalidatePath("/transactions"); revalidatePath("/insights"); }

export async function saveCommitmentAction(input: SaveCommitmentInput, monthStart: string): Promise<CommitmentActionResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success || !monthSchema.safeParse(monthStart).success) return { ok: false, message: "Thông tin khoản định kỳ chưa hợp lệ." };
  const viewer = await requireViewer(); if (viewer.isDemo) return { ok: false, message: "Chế độ demo không lưu lên máy chủ." };
  const supabase = await createClient(); if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };
  const value = parsed.data;
  const { data: id, error } = await supabase.rpc("upsert_recurring_commitment", { p_commitment_id: value.id ?? null, p_name: value.name, p_amount_minor: value.amount, p_due_day: value.dueDay, p_account_id: value.accountId, p_category_id: value.categoryId });
  if (error || typeof id !== "string") return { ok: false, message: "Không thể lưu khoản định kỳ." };
  const { data, error: readError } = await supabase.from("recurring_commitment_feed").select("id,name,amount_minor,due_day,account_id,account_name,category_id,category_name,category_icon,category_color,is_archived").eq("id", id).single();
  if (readError || !data) { refresh(); return { ok: false, message: "Đã lưu nhưng chưa tải lại được dữ liệu." }; }
  const existingTransaction = input.id ? await supabase.from("commitment_occurrences").select("transaction_id").eq("commitment_id", id).eq("month_start", monthStart).maybeSingle() : null;
  try { const commitment = mapCommitmentRow(data, monthStart, existingTransaction?.data?.transaction_id ?? null); refresh(); return { ok: true, commitment }; }
  catch { refresh(); return { ok: false, message: "Dữ liệu trả về không hợp lệ." }; }
}

export async function archiveCommitmentAction(id: string, archived: boolean): Promise<CommitmentActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Mã khoản định kỳ không hợp lệ." };
  const viewer = await requireViewer(); if (viewer.isDemo) return { ok: false, message: "Chế độ demo không lưu lên máy chủ." };
  const supabase = await createClient(); if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };
  const { data, error } = await supabase.rpc("set_recurring_commitment_archived", { p_commitment_id: id, p_archived: archived });
  if (error || data !== true) return { ok: false, message: "Không thể cập nhật khoản định kỳ." }; refresh(); return { ok: true };
}

export async function payCommitmentAction(id: string, monthStart: string, paidOn: string, idempotencyKey: string): Promise<CommitmentActionResult> {
  if (!idSchema.safeParse(id).success || !monthSchema.safeParse(monthStart).success || !dateSchema.safeParse(paidOn).success || !idSchema.safeParse(idempotencyKey).success) return { ok: false, message: "Thông tin thanh toán không hợp lệ." };
  const viewer = await requireViewer(); if (viewer.isDemo) return { ok: false, message: "Chế độ demo không lưu lên máy chủ." };
  const supabase = await createClient(); if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };
  const { data, error } = await supabase.rpc("pay_recurring_commitment", { p_commitment_id: id, p_month_start: monthStart, p_paid_on: paidOn, p_idempotency_key: idempotencyKey });
  if (error || typeof data !== "string") return { ok: false, message: "Không thể ghi thanh toán. Kiểm tra lại tài khoản nguồn." }; refresh(); return { ok: true, transactionId: data };
}

export type DueCommitmentsResult =
  | { ok: true; commitments: RecurringCommitment[]; monthStart: string }
  | { ok: false; message: string };

/**
 * Current-month active commitments with their paid state — the raw material
 * for Inbox commitment suggestions. Demo returns an empty list because demo
 * seeds and occurrence state live on the device.
 */
export async function listDueCommitmentsAction(): Promise<DueCommitmentsResult> {
  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: true, commitments: [], monthStart: "" };
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };
  const monthStart = currentMonthStart();
  const [feed, occurrences] = await Promise.all([
    supabase
      .from("recurring_commitment_feed")
      .select("id,name,amount_minor,due_day,account_id,account_name,category_id,category_name,category_icon,category_color,is_archived")
      .eq("is_archived", false),
    supabase
      .from("commitment_occurrences")
      .select("commitment_id,transaction_id,paid_at")
      .eq("month_start", monthStart),
  ]);
  if (feed.error || occurrences.error) {
    return { ok: false, message: "Chưa tải được khoản định kỳ." };
  }
  try {
    const paid = new Map(
      (occurrences.data ?? []).map((item) => [
        item.commitment_id as string,
        item.transaction_id as string,
      ]),
    );
    const commitments = (feed.data ?? []).map((row) =>
      mapCommitmentRow(row, monthStart, paid.get(row.id as string) ?? null),
    );
    return { ok: true, commitments, monthStart };
  } catch {
    return { ok: false, message: "Dữ liệu khoản định kỳ không hợp lệ." };
  }
}

export async function undoCommitmentPaymentAction(id: string, monthStart: string): Promise<CommitmentActionResult> {
  if (!idSchema.safeParse(id).success || !monthSchema.safeParse(monthStart).success) return { ok: false, message: "Thông tin hoàn tác không hợp lệ." };
  const viewer = await requireViewer(); if (viewer.isDemo) return { ok: false, message: "Chế độ demo không lưu lên máy chủ." };
  const supabase = await createClient(); if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };
  const { data, error } = await supabase.rpc("undo_recurring_commitment_payment", { p_commitment_id: id, p_month_start: monthStart });
  if (error || data !== true) return { ok: false, message: "Không thể hoàn tác thanh toán." }; refresh(); return { ok: true };
}
