"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type {
  BulkTransactionCategoryInput,
  BulkTransactionReviewInput,
} from "@/lib/transactions/contracts";
import { requireViewer } from "@/server/auth";

export type BulkTransactionActionResult =
  | { ok: true; updatedIds: string[] }
  | { ok: false; message: string };

const idsSchema = z
  .array(z.string().uuid())
  .min(1)
  .max(100)
  .refine((ids) => new Set(ids).size === ids.length);
const reviewSchema = z.object({
  ids: idsSchema,
  reviewStatus: z.enum(["needs_review", "reviewed"]),
});
const categorySchema = z.object({
  ids: idsSchema,
  categoryId: z.string().uuid(),
});

function refreshTransactionSurfaces() {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/timeline");
  revalidatePath("/accounts");
  revalidatePath("/budgets");
  revalidatePath("/reports");
}

function isMissingReviewContract(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    error.message?.includes("set_transaction_review_status_bulk") ||
    error.message?.includes("bulk_update_transaction_category") ||
    error.message?.includes("Could not find the function")
  );
}

function reviewErrorMessage(error: { code?: string; message?: string } | null) {
  if (isMissingReviewContract(error)) {
    return "Tính năng kiểm tra giao dịch chưa được bật trên máy chủ.";
  }
  const message = error?.message ?? "";
  if (message.includes("transaction_selection_not_found")) {
    return "Một số giao dịch đã thay đổi hoặc không còn trong sổ.";
  }
  if (
    message.includes("transaction_selection_invalid") ||
    message.includes("transaction_selection_required") ||
    message.includes("transaction_selection_limit")
  ) {
    return "Danh sách giao dịch đã chọn chưa hợp lệ.";
  }
  return "Không cập nhật được trạng thái kiểm tra. Hãy thử lại.";
}

function categoryErrorMessage(error: { code?: string; message?: string } | null) {
  if (isMissingReviewContract(error)) {
    return "Tính năng sửa hàng loạt chưa được bật trên máy chủ.";
  }
  const message = error?.message ?? "";
  if (message.includes("transaction_selection_not_found")) {
    return "Một số giao dịch đã thay đổi hoặc không còn trong sổ.";
  }
  if (message.includes("category_not_found")) {
    return "Danh mục không còn tồn tại hoặc không thuộc tài khoản này.";
  }
  if (message.includes("category_archived")) {
    return "Danh mục đã lưu trữ. Hãy chọn danh mục đang hoạt động.";
  }
  if (message.includes("category_kind_mismatch")) {
    return "Danh mục không cùng loại thu hoặc chi với nhóm đã chọn.";
  }
  if (message.includes("bulk_transaction_kind_mismatch")) {
    return "Chỉ sửa danh mục cho một nhóm cùng loại thu hoặc chi.";
  }
  if (message.includes("bulk_transfer_category_locked")) {
    return "Không sửa danh mục hàng loạt cho giao dịch chuyển tiền.";
  }
  if (message.includes("bulk_split_transaction_locked")) {
    return "Khoản chia danh mục phải được sửa theo từng dòng.";
  }
  if (message.includes("recurring_payment_locked")) {
    return "Khoản định kỳ phải được quản lý tại trang Định kỳ tương ứng.";
  }
  if (
    message.includes("transaction_selection_invalid") ||
    message.includes("transaction_selection_required") ||
    message.includes("transaction_selection_limit")
  ) {
    return "Danh sách giao dịch đã chọn chưa hợp lệ.";
  }
  return "Không đổi được danh mục cho nhóm giao dịch. Hãy thử lại.";
}

export async function bulkSetTransactionReviewAction(
  input: BulkTransactionReviewInput,
): Promise<BulkTransactionActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Danh sách giao dịch đã chọn chưa hợp lệ." };
  }

  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return { ok: false, message: "Hãy dùng bộ nhớ demo trên thiết bị." };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const { error } = await supabase.rpc("set_transaction_review_status_bulk", {
    p_transaction_ids: parsed.data.ids,
    p_review_status: parsed.data.reviewStatus,
  });
  if (error) return { ok: false, message: reviewErrorMessage(error) };

  refreshTransactionSurfaces();
  return { ok: true, updatedIds: parsed.data.ids };
}

export async function bulkUpdateTransactionCategoryAction(
  input: BulkTransactionCategoryInput,
): Promise<BulkTransactionActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Thông tin sửa hàng loạt chưa hợp lệ." };
  }

  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return { ok: false, message: "Hãy dùng bộ nhớ demo trên thiết bị." };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const { error } = await supabase.rpc("bulk_update_transaction_category", {
    p_transaction_ids: parsed.data.ids,
    p_category_id: parsed.data.categoryId,
  });
  if (error) return { ok: false, message: categoryErrorMessage(error) };

  refreshTransactionSurfaces();
  return { ok: true, updatedIds: parsed.data.ids };
}
