"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  importActionLimiter,
  importRateKey,
  rateLimitUserMessage,
} from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";

const MAX_DIRECT_IMPORT_ROWS = 5_000;

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optionalUuidSchema = z.string().uuid().optional();
const columnIndexSchema = z.number().int().min(0).nullable();
const columnMapSchema = z.object({
  date: columnIndexSchema,
  amount: columnIndexSchema,
  desc: columnIndexSchema,
  debit: columnIndexSchema,
  credit: columnIndexSchema,
});
const directRowSchema = z.object({
  rowIndex: z.number().int().min(0),
  kind: z.enum(["income", "expense"]),
  amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  occurredOn: dateSchema,
  note: z.string().trim().max(500),
  merchant: z.string().trim().max(200),
  categoryId: z.string().uuid(),
  accountId: z.string().uuid(),
  confidence: z.enum(["high", "medium", "low"]),
  rawSnippet: z.string().max(2_000),
  appliedRuleId: optionalUuidSchema,
  appliedRuleVersion: z.number().int().min(1).optional(),
}).superRefine((value, context) => {
  if ((value.appliedRuleId === undefined) !== (value.appliedRuleVersion === undefined)) {
    context.addIssue({ code: "custom", message: "invalid_direct_csv_rule_evidence" });
  }
});
const directCommitSchema = z.object({
  fileName: z.string().trim().min(1).max(260),
  warningCount: z.number().int().min(0).max(1_000_000),
  skippedRows: z.number().int().min(0).max(1_000_000),
  mapConfidence: z.number().min(0).max(1),
  headers: z.array(z.string().max(260)).max(200),
  columnMap: columnMapSchema,
  allowHeuristicDuplicates: z.boolean().default(false),
  rows: z.array(directRowSchema).min(1).max(MAX_DIRECT_IMPORT_ROWS),
});

export type DirectCsvCommitInput = z.input<typeof directCommitSchema>;

export type DirectCsvCommitResult =
  | {
      ok: true;
      batchId: string;
      transactionIds: string[];
    }
  | {
      ok: false;
      message: string;
      batchId?: string;
    };

function refreshFinanceAndImportPaths() {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/timeline");
  revalidatePath("/accounts");
  revalidatePath("/budgets");
  revalidatePath("/inbox");
  revalidatePath("/imports");
}

function calmApprovalError(message: string): string {
  if (message.includes("source_external_id_duplicate")) {
    return "Giao dịch từ cùng mã nguồn đã tồn tại. Chưa ghi dòng nào; hãy kiểm tra lịch sử import trước khi thử lại.";
  }
  if (message.includes("candidate_duplicate")) {
    return "Có dòng trùng với dữ liệu đã có. Chưa ghi dòng nào; hãy tải lại và kiểm tra trước khi thử lại.";
  }
  if (message.includes("category_archived")) {
    return "Có danh mục đã được lưu trữ. Chưa ghi dòng nào; hãy chọn danh mục đang dùng rồi thử lại.";
  }
  if (message.includes("category_kind_mismatch")) {
    return "Có dòng dùng sai loại danh mục thu/chi. Chưa ghi dòng nào; hãy kiểm tra lựa chọn rồi thử lại.";
  }
  if (message.includes("account_not_found")) {
    return "Có tài khoản không còn dùng được. Chưa ghi dòng nào; hãy tải lại trang rồi thử lại.";
  }
  if (message.includes("candidate_requires_transfer_review")) {
    return "Có dòng cần xem như chuyển khoản. Chưa ghi dòng nào; hãy xử lý dòng đó trong Inbox.";
  }
  return "Không ghi được toàn bộ lượt import. Chưa có giao dịch nào từ lần ghi này; dữ liệu import đã được giữ để kiểm tra.";
}

function calmPreparationError(message: string): string {
  if (
    message.includes("invalid_direct_csv_rule_evidence") ||
    message.includes("rule_not_available") ||
    message.includes("rule_no_longer_matches") ||
    message.includes("rule_category_kind_mismatch")
  ) {
    return "Quy tắc đã thay đổi hoặc không còn khớp. Chưa lưu lượt import nào; hãy tải lại và kiểm tra dry-run trước khi ghi sổ.";
  }
  if (message.includes("account_not_found") || message.includes("category_kind_mismatch")) {
    return "Tài khoản hoặc danh mục đã thay đổi. Chưa lưu lượt import nào; hãy tải lại và kiểm tra dry-run trước khi ghi sổ.";
  }
  return "Không chuẩn bị được toàn bộ lượt import. Chưa có giao dịch nào được ghi; hãy kiểm tra CSV và thử lại.";
}

export async function commitDirectCsvImportAction(
  input: DirectCsvCommitInput,
): Promise<DirectCsvCommitResult> {
  const parsed = directCommitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Dữ liệu import chưa hợp lệ." };
  }

  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return {
      ok: false,
      message: "Chế độ demo ghi vào bộ nhớ trên thiết bị, không dùng commit máy chủ.",
    };
  }

  const limited = importActionLimiter.check(importRateKey(viewer.id));
  if (!limited.ok) {
    return { ok: false, message: rateLimitUserMessage(limited.retryAfterMs) };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, message: "Không thể kết nối Supabase." };
  }

  const value = parsed.data;
  const batchId = randomUUID();
  const candidateIds = value.rows.map(() => randomUUID());
  const { data: preparationData, error: preparationError } = await supabase.rpc(
    "prepare_direct_csv_candidates_with_rules",
    {
      p_batch: {
        id: batchId,
        file_name: value.fileName,
        warning_count: value.warningCount,
        skipped_rows: value.skippedRows,
        map_confidence: value.mapConfidence,
        headers: value.headers,
        column_map: value.columnMap,
      },
      p_candidates: value.rows.map((row, index) => ({
        id: candidateIds[index],
        row_index: row.rowIndex,
        kind: row.kind,
        amount_minor: row.amount,
        merchant: row.merchant || row.note || "Giao dịch CSV",
        note: row.note,
        occurred_on: row.occurredOn,
        confidence: row.confidence,
        category_id: row.categoryId,
        account_id: row.accountId,
        raw_snippet: row.rawSnippet,
        ...(row.appliedRuleId
          ? {
              applied_rule_id: row.appliedRuleId,
              applied_rule_version: row.appliedRuleVersion,
            }
          : {}),
      })),
    },
  );

  if (preparationError) {
    return { ok: false, message: calmPreparationError(preparationError.message ?? "") };
  }

  const preparation = z
    .object({
      batch_id: z.string().uuid(),
      candidate_ids: z.array(z.string().uuid()).length(value.rows.length),
      candidate_count: z.number().int().min(1),
    })
    .safeParse(preparationData);
  if (
    !preparation.success ||
    preparation.data.batch_id !== batchId ||
    preparation.data.candidate_count !== value.rows.length
  ) {
    refreshFinanceAndImportPaths();
    return {
      ok: false,
      batchId,
      message:
        "Lượt import đã được chuẩn bị nhưng phản hồi máy chủ không đầy đủ. Hãy mở Inbox hoặc Lịch sử import để kiểm tra trước khi thử lại.",
    };
  }

  const { data: preparedCandidates, error: preparedCandidatesError } = await supabase
    .from("inbox_candidates")
    .select("id,category_id")
    .in("id", preparation.data.candidate_ids);
  const categoryByCandidateId = new Map(
    (preparedCandidates ?? []).flatMap((candidate) =>
      typeof candidate.id === "string" && typeof candidate.category_id === "string"
        ? [[candidate.id, candidate.category_id] as const]
        : [],
    ),
  );
  if (
    preparedCandidatesError ||
    categoryByCandidateId.size !== preparation.data.candidate_ids.length
  ) {
    refreshFinanceAndImportPaths();
    return {
      ok: false,
      batchId,
      message:
        "Lượt import đã được chuẩn bị nhưng chưa đọc được kết quả quy tắc. Hãy mở Inbox hoặc Lịch sử import để kiểm tra trước khi thử lại.",
    };
  }

  const approvalItems = preparation.data.candidate_ids.map((candidateId, index) => {
    const row = value.rows[index]!;
    return {
      candidate_id: candidateId,
      kind: row.kind,
      account_id: row.accountId,
      category_id: categoryByCandidateId.get(candidateId),
      destination_account_id: null,
      amount_minor: row.amount,
      occurred_on: row.occurredOn,
      note: row.note,
      idempotency_key: randomUUID(),
      allow_heuristic_duplicate: value.allowHeuristicDuplicates,
    };
  });

  const { data: transactionIds, error: approvalError } = await supabase.rpc(
    "approve_inbox_candidates_batch",
    {
      p_import_batch_id: batchId,
      p_items: approvalItems,
    },
  );

  if (approvalError) {
    // Keep parsed batch + pending candidates as recoverable evidence. The RPC is
    // one DB transaction, so no ledger/provenance/approval mutation survives.
    refreshFinanceAndImportPaths();
    return {
      ok: false,
      batchId,
      message: calmApprovalError(approvalError.message ?? ""),
    };
  }

  const ids = z.array(z.string().uuid()).safeParse(transactionIds);
  if (!ids.success || ids.data.length !== value.rows.length) {
    // Do not advise a blind retry: the database call may already have committed.
    refreshFinanceAndImportPaths();
    return {
      ok: false,
      batchId,
      message:
        "Lượt import đã được xử lý nhưng phản hồi máy chủ không đầy đủ. Hãy mở Giao dịch hoặc Lịch sử import để kiểm tra trước khi thử lại.",
    };
  }

  refreshFinanceAndImportPaths();
  return {
    ok: true,
    batchId,
    transactionIds: ids.data,
  };
}
