"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";

const sourceReviewSchema = z.object({
  candidateId: z.string().uuid(),
  transactionId: z.string().uuid(),
});

export type SourceReplacementActionResult =
  | { ok: true }
  | { ok: false; message: string };

export type SourceLifecycleReviewActionResult =
  | {
      ok: true;
      effect: "cleared" | "unchanged" | "observation_only";
      reason: string;
    }
  | { ok: false; message: string };

function lifecycleReviewErrorMessage(message: string): string {
  if (
    message.includes("source_lifecycle_review_match_required") ||
    message.includes("candidate_not_source_lifecycle_observation")
  ) {
    return "Cập nhật nguồn không còn khớp với giao dịch đã đối chiếu. Hãy tải lại Inbox và kiểm tra lại.";
  }
  if (message.includes("source_identity_conflict")) {
    return "Mã nguồn này đã được liên kết với một giao dịch khác. MoneyFlow không tự chọn lại.";
  }
  if (message.includes("candidate_already_approved")) {
    return "Mục nguồn đã được xử lý theo một quyết định khác. Hãy tải lại Inbox.";
  }
  if (message.includes("candidate_not_found") || message.includes("candidate_not_pending")) {
    return "Mục Inbox không còn ở trạng thái có thể xử lý. Hãy tải lại danh sách.";
  }
  if (message.includes("transaction_not_found")) {
    return "Giao dịch không còn hợp lệ cho workspace hiện tại.";
  }
  return "Không thể ghi nhận trạng thái mới từ nguồn. Hãy tải lại Inbox và kiểm tra lại.";
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

export async function reviewSourceLifecycleObservationAction(input: {
  candidateId: string;
  transactionId: string;
}): Promise<SourceLifecycleReviewActionResult> {
  const parsed = sourceReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Thông tin cập nhật nguồn chưa hợp lệ." };
  }

  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return {
      ok: false,
      message: "Đối chiếu trạng thái nguồn phía server chỉ áp dụng cho workspace đã đăng nhập.",
    };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const { data, error } = await supabase.rpc(
    "review_source_lifecycle_observation_from_candidate",
    {
      p_candidate_id: parsed.data.candidateId,
      p_transaction_id: parsed.data.transactionId,
    },
  );

  const payload = data as Record<string, unknown> | null;
  const effect = payload?.reconciliation_effect;
  const reason = payload?.reason;

  if (
    error ||
    !payload ||
    (effect !== "cleared" && effect !== "unchanged" && effect !== "observation_only") ||
    typeof reason !== "string"
  ) {
    return {
      ok: false,
      message: lifecycleReviewErrorMessage(error?.message ?? "invalid_source_lifecycle_result"),
    };
  }

  refreshInboxAndFinancePages();
  return { ok: true, effect, reason };
}

export async function recordSourceReplacementObservationAction(input: {
  candidateId: string;
  transactionId: string;
}): Promise<SourceReplacementActionResult> {
  const reviewed = await reviewSourceLifecycleObservationAction(input);
  if (!reviewed.ok) return reviewed;
  return { ok: true };
}