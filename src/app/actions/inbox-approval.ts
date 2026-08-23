"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseInboxDryRunResult, type InboxDryRunResult } from "@/lib/inbox/provenance";
import { createClient } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/transactions/contracts";
import { requireViewer } from "@/server/auth";
import { mapTransactionFeedRow } from "@/server/finance";

const candidateIdSchema = z.string().uuid();
const existingMatchSchema = z.object({
  candidateId: z.string().uuid(),
  transactionId: z.string().uuid(),
});

const approvalSchema = z
  .object({
    candidateId: z.string().uuid(),
    kind: z.enum(["income", "expense", "transfer"]),
    accountId: z.string().uuid(),
    categoryId: z.string().uuid().nullable(),
    destinationAccountId: z.string().uuid().nullable(),
    amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    note: z.string().trim().max(500),
    idempotencyKey: z.string().uuid(),
    allowHeuristicDuplicate: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "transfer") {
      if (!value.destinationAccountId || value.destinationAccountId === value.accountId) {
        ctx.addIssue({
          code: "custom",
          path: ["destinationAccountId"],
          message: "different_accounts_required",
        });
      }
      return;
    }
    if (!value.categoryId) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "category_required",
      });
    }
  });

const feedColumns =
  "id,kind,note,occurred_on,created_at,amount_minor,account_id,account_name,category_id,category_name,destination_account_id,destination_account_name,is_recurring_payment,split_lines";

export type AtomicInboxApprovalInput = z.input<typeof approvalSchema>;

export type InboxDryRunActionResult =
  | { ok: true; plan: InboxDryRunResult }
  | { ok: false; message: string };

export type InboxApprovalActionResult =
  | { ok: true; transaction: Transaction }
  | { ok: false; message: string };

function refreshInboxAndFinancePages() {
  revalidatePath("/inbox");
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/timeline");
  revalidatePath("/accounts");
  revalidatePath("/budgets");
  revalidatePath("/reports");
}

function approvalErrorMessage(message: string): string {
  if (message.includes("source_observation_unchanged")) {
    return "Nguồn không thay đổi so với bằng chứng gốc nên không cần ghi nhận một cập nhật nguồn mới.";
  }
  if (
    message.includes("changed_source_match_required") ||
    message.includes("source_lifecycle_review_match_required") ||
    message.includes("candidate_not_source_observation") ||
    message.includes("candidate_not_source_lifecycle_observation")
  ) {
    return "Cập nhật nguồn không còn khớp với giao dịch đã kiểm tra. Hãy tải lại Inbox và đối chiếu lại.";
  }
  if (message.includes("source_observation_changed")) {
    return "Nguồn gửi lại cùng mã giao dịch nhưng bằng chứng đã thay đổi. MoneyFlow không khôi phục hoặc ghi đè trong thao tác này.";
  }
  if (message.includes("source_external_id_duplicate")) {
    return "Giao dịch này đã được nhập từ cùng mã nguồn.";
  }
  if (message.includes("source_provenance_not_found")) {
    return "Không tìm thấy bằng chứng nguồn chuẩn cho giao dịch này. Hãy tải lại Inbox và kiểm tra lại.";
  }
  if (
    message.includes("deleted_source_match_required") ||
    message.includes("transaction_not_deleted") ||
    message.includes("candidate_not_restoreable") ||
    message.includes("transaction_restore_race")
  ) {
    return "Giao dịch đã xóa không còn đủ điều kiện để khôi phục từ nguồn này. Hãy tải lại Inbox và kiểm tra lại.";
  }
  if (message.includes("transaction_deleted")) {
    return "Giao dịch đã bị xóa. Hãy tải lại Inbox và dùng đúng luồng xử lý giao dịch đã xóa.";
  }
  if (message.includes("existing_transaction_match_ambiguous")) {
    return "Có nhiều giao dịch đã có cùng tài khoản, ngày và số tiền. MoneyFlow không tự chọn để tránh gắn nhầm.";
  }
  if (
    message.includes("existing_transaction_match_required") ||
    message.includes("transaction_not_eligible") ||
    message.includes("transaction_already_provenanced")
  ) {
    return "Giao dịch đã có không còn đủ điều kiện để gắn nguồn. Hãy tải lại Inbox và kiểm tra lại.";
  }
  if (message.includes("candidate_not_attachable")) {
    return "Nguồn này không dùng được thao tác gắn vào giao dịch đã có.";
  }
  if (message.includes("candidate_duplicate")) {
    return "Có giao dịch rất giống đã tồn tại. Mở từng mục để kiểm tra trước khi duyệt.";
  }
  if (message.includes("candidate_requires_transfer_review")) {
    return "Mục này có dấu hiệu chuyển khoản nội bộ. Hãy chọn loại chuyển tiền và hai tài khoản.";
  }
  if (message.includes("candidate_not_found") || message.includes("candidate_not_pending")) {
    return "Mục Inbox không còn ở trạng thái chờ duyệt. Hãy tải lại danh sách.";
  }
  if (message.includes("currency_mismatch")) {
    return "Chỉ chuyển được giữa hai tài khoản cùng loại tiền.";
  }
  if (message.includes("account_not_found") || message.includes("transaction_not_found")) {
    return "Tài khoản hoặc giao dịch không hợp lệ cho workspace hiện tại.";
  }
  if (message.includes("category_kind_mismatch") || message.includes("category_archived")) {
    return "Danh mục không hợp lệ cho loại giao dịch đã chọn.";
  }
  if (message.includes("idempotency_key_in_use")) {
    return "Yêu cầu ghi sổ đã được dùng cho một giao dịch khác. Hãy tải lại và thử lại.";
  }
  return "Không thể duyệt mục Inbox. Hãy kiểm tra dữ liệu rồi thử lại.";
}

async function readTransactionById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  transactionId: string,
): Promise<Transaction | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("transaction_feed")
    .select(feedColumns)
    .eq("id", transactionId)
    .single();
  if (error || !data) return null;
  try {
    return mapTransactionFeedRow(data);
  } catch {
    return null;
  }
}

export async function planInboxCandidateAction(
  candidateId: string,
): Promise<InboxDryRunActionResult> {
  const parsedId = candidateIdSchema.safeParse(candidateId);
  if (!parsedId.success) return { ok: false, message: "Mục Inbox không hợp lệ." };

  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return { ok: false, message: "Dry-run phía server chỉ áp dụng cho workspace đã đăng nhập." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const { data, error } = await supabase.rpc("plan_inbox_candidate", {
    p_candidate_id: parsedId.data,
  });
  if (error) return { ok: false, message: approvalErrorMessage(error.message) };

  try {
    return { ok: true, plan: parseInboxDryRunResult(data) };
  } catch {
    return { ok: false, message: "Kết quả kiểm tra Inbox không đúng định dạng." };
  }
}

export async function attachInboxCandidateToExistingTransactionAction(input: {
  candidateId: string;
  transactionId: string;
}): Promise<InboxApprovalActionResult> {
  const parsed = existingMatchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Thông tin gắn nguồn chưa hợp lệ." };
  }

  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return { ok: false, message: "Gắn nguồn phía server chỉ áp dụng cho workspace đã đăng nhập." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const { data: transactionId, error } = await supabase.rpc(
    "attach_inbox_candidate_to_existing_transaction",
    {
      p_candidate_id: parsed.data.candidateId,
      p_transaction_id: parsed.data.transactionId,
    },
  );

  if (error || typeof transactionId !== "string") {
    return {
      ok: false,
      message: approvalErrorMessage(error?.message ?? "invalid_transaction_id"),
    };
  }

  const transaction = await readTransactionById(supabase, transactionId);
  refreshInboxAndFinancePages();
  if (!transaction) {
    return {
      ok: false,
      message: "Đã gắn nguồn nhưng chưa tải lại được giao dịch. Hãy làm mới trang trước khi thử lại.",
    };
  }
  return { ok: true, transaction };
}

export async function restoreDeletedImportedTransactionAction(input: {
  candidateId: string;
  transactionId: string;
}): Promise<InboxApprovalActionResult> {
  const parsed = existingMatchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Thông tin khôi phục giao dịch chưa hợp lệ." };
  }

  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return { ok: false, message: "Khôi phục từ nguồn phía server chỉ áp dụng cho workspace đã đăng nhập." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const { data: transactionId, error } = await supabase.rpc(
    "restore_deleted_imported_transaction_from_candidate",
    {
      p_candidate_id: parsed.data.candidateId,
      p_transaction_id: parsed.data.transactionId,
    },
  );

  if (error || typeof transactionId !== "string") {
    return {
      ok: false,
      message: approvalErrorMessage(error?.message ?? "invalid_transaction_id"),
    };
  }

  const transaction = await readTransactionById(supabase, transactionId);
  refreshInboxAndFinancePages();
  if (!transaction) {
    return {
      ok: false,
      message: "Khôi phục có thể đã hoàn tất nhưng chưa tải lại được giao dịch. Hãy làm mới trang trước khi thực hiện lại.",
    };
  }
  return { ok: true, transaction };
}

export async function recordChangedSourceObservationAction(input: {
  candidateId: string;
  transactionId: string;
}): Promise<InboxApprovalActionResult> {
  const parsed = existingMatchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Thông tin cập nhật nguồn chưa hợp lệ." };
  }

  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return { ok: false, message: "Ghi nhận cập nhật nguồn phía server chỉ áp dụng cho workspace đã đăng nhập." };
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
  const transactionId = payload?.transaction_id;
  if (error || typeof transactionId !== "string") {
    return {
      ok: false,
      message: approvalErrorMessage(error?.message ?? "invalid_transaction_id"),
    };
  }

  const transaction = await readTransactionById(supabase, transactionId);
  refreshInboxAndFinancePages();
  if (!transaction) {
    return {
      ok: false,
      message: "Ghi nhận cập nhật nguồn có thể đã hoàn tất nhưng chưa tải lại được giao dịch. Hãy làm mới trang trước khi thực hiện lại.",
    };
  }
  return { ok: true, transaction };
}

export async function approveInboxCandidateAction(
  input: AtomicInboxApprovalInput,
): Promise<InboxApprovalActionResult> {
  const parsed = approvalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Thông tin duyệt giao dịch chưa hợp lệ." };
  }

  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return { ok: false, message: "Hãy dùng bộ nhớ demo trên thiết bị." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const value = parsed.data;
  const { data: transactionId, error } = await supabase.rpc(
    "approve_inbox_candidate",
    {
      p_candidate_id: value.candidateId,
      p_kind: value.kind,
      p_account_id: value.accountId,
      p_category_id: value.kind === "transfer" ? null : value.categoryId,
      p_destination_account_id:
        value.kind === "transfer" ? value.destinationAccountId : null,
      p_amount_minor: value.amount,
      p_occurred_on: value.occurredOn,
      p_note: value.note,
      p_idempotency_key: value.idempotencyKey,
      p_allow_heuristic_duplicate: value.allowHeuristicDuplicate,
    },
  );

  if (error || typeof transactionId !== "string") {
    return {
      ok: false,
      message: approvalErrorMessage(error?.message ?? "invalid_transaction_id"),
    };
  }

  const transaction = await readTransactionById(supabase, transactionId);
  refreshInboxAndFinancePages();
  if (!transaction) {
    return {
      ok: false,
      message: "Đã duyệt nhưng chưa tải lại được giao dịch. Hãy làm mới trang.",
    };
  }
  return { ok: true, transaction };
}