"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";

const replacementSchema = z.object({
  candidateId: z.string().uuid(),
  transactionId: z.string().uuid(),
});

export type SourceReplacementActionResult =
  | { ok: true }
  | { ok: false; message: string };

function replacementErrorMessage(message: string): string {
  if (
    message.includes("source_predecessor_match_required") ||
    message.includes("candidate_not_source_replacement")
  ) {
    return "Liên kết thay thế từ nguồn không còn khớp với giao dịch đã kiểm tra. Hãy tải lại Inbox và đối chiếu lại.";
  }
  if (
    message.includes("source_identity_conflict") ||
    message.includes("candidate_already_approved")
  ) {
    return "Mã nguồn mới đã được liên kết theo một quyết định khác. Hãy tải lại Inbox trước khi tiếp tục.";
  }
  if (message.includes("transaction_deleted")) {
    return "Giao dịch liên quan đã bị xóa. MoneyFlow không tự khôi phục qua thao tác thay thế nguồn này.";
  }
  if (message.includes("candidate_not_found") || message.includes("candidate_not_pending")) {
    return "Mục Inbox không còn ở trạng thái chờ duyệt. Hãy tải lại danh sách.";
  }
  if (message.includes("transaction_not_found")) {
    return "Giao dịch không còn hợp lệ cho workspace hiện tại.";
  }
  return "Không thể ghi nhận giao dịch thay thế từ nguồn. Hãy tải lại Inbox và kiểm tra lại.";
}

function refreshInboxAndFinancePages() {
  for (const path of [
    "/inbox",
    "/",
    "/transactions",
    "/timeline",
    "/accounts",
    "/reports",
  ]) {
    revalidatePath(path);
  }
}

export async function recordSourceReplacementObservationAction(input: {
  candidateId: string;
  transactionId: string;
}): Promise<SourceReplacementActionResult> {
  const parsed = replacementSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Thông tin giao dịch thay thế chưa hợp lệ." };
  }

  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return {
      ok: false,
      message: "Ghi nhận thay thế nguồn phía server chỉ áp dụng cho workspace đã đăng nhập.",
    };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const { data, error } = await supabase.rpc(
    "record_source_replacement_observation_from_candidate",
    {
      p_candidate_id: parsed.data.candidateId,
      p_transaction_id: parsed.data.transactionId,
    },
  );

  if (error || typeof data !== "string") {
    return {
      ok: false,
      message: replacementErrorMessage(error?.message ?? "invalid_transaction_id"),
    };
  }

  refreshInboxAndFinancePages();
  return { ok: true };
}
