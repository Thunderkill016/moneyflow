"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  batchToInsertRow,
  candidateToInsertRow,
  prepareBatchForServer,
  prepareCandidateForServer,
} from "@/lib/inbox/inbox-map";
import {
  CURRENT_IMPORT_MAPPING_VERSION,
  parserVersionForSource,
} from "@/lib/inbox/provenance";
import {
  importActionLimiter,
  importRateKey,
  rateLimitUserMessage,
} from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";

const MAX_DIRECT_IMPORT_ROWS = 5_000;

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
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
});
const directCommitSchema = z.object({
  fileName: z.string().trim().min(1).max(260),
  warningCount: z.number().int().min(0).max(1_000_000),
  skippedRows: z.number().int().min(0).max(1_000_000),
  mapConfidence: z.number().min(0).max(1),
  headers: z.array(z.string().max(260)).max(200),
  columnMap: columnMapSchema,
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
  const parserVersion = parserVersionForSource("csv");
  const mappingVersion = CURRENT_IMPORT_MAPPING_VERSION;
  const batch = prepareBatchForServer({
    fileName: value.fileName,
    source: "csv",
    status: "parsed",
    rowCount: value.rows.length,
    warningCount: value.warningCount,
    skippedRows: value.skippedRows,
    mapConfidence: value.mapConfidence,
    headers: value.headers,
    columnMap: value.columnMap,
    parserVersion,
    mappingVersion,
  });

  const { data: batchRow, error: batchError } = await supabase
    .from("import_batches")
    .insert(batchToInsertRow(batch, viewer.id, { localId: null }))
    .select("id")
    .single();

  if (batchError || !batchRow || typeof batchRow.id !== "string") {
    return { ok: false, message: "Không tạo được lượt import để ghi sổ." };
  }

  const batchId = batchRow.id;
  const candidates = value.rows.map((row) =>
    prepareCandidateForServer({
      kind: row.kind,
      amount: row.amount,
      merchant: row.merchant || row.note || "Giao dịch CSV",
      note: row.note,
      occurredOn: row.occurredOn,
      source: "csv",
      confidence: row.confidence,
      status: "pending",
      categoryId: row.categoryId,
      accountId: row.accountId,
      rawSnippet: row.rawSnippet,
      importBatchId: batchId,
      sourceRowIndex: row.rowIndex,
      parserVersion,
      mappingVersion,
    }),
  );

  const candidateRows = candidates.map((candidate) =>
    candidateToInsertRow(candidate, viewer.id, {
      localId: null,
      importBatchId: batchId,
    }),
  );

  const { data: insertedCandidates, error: candidateError } = await supabase
    .from("inbox_candidates")
    .insert(candidateRows)
    .select("id");

  if (
    candidateError ||
    !Array.isArray(insertedCandidates) ||
    insertedCandidates.length !== value.rows.length ||
    insertedCandidates.some((row) => typeof row.id !== "string")
  ) {
    // Candidate insertion is one PostgreSQL statement, so there cannot be a
    // partially inserted candidate list. Remove the orphan batch best-effort.
    await supabase.from("import_batches").delete().eq("id", batchId);
    return { ok: false, message: "Không lưu được dữ liệu import để kiểm tra." };
  }

  const approvalItems = insertedCandidates.map((candidate, index) => {
    const row = value.rows[index]!;
    return {
      candidate_id: candidate.id,
      kind: row.kind,
      account_id: row.accountId,
      category_id: row.categoryId,
      destination_account_id: null,
      amount_minor: row.amount,
      occurred_on: row.occurredOn,
      note: row.note,
      idempotency_key: randomUUID(),
      allow_heuristic_duplicate: false,
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