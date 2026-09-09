"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { InboxCandidate } from "@/lib/inbox/candidate-store";
import type { ImportBatch } from "@/lib/inbox/import-batch-store";
import { serializeImportCommitIntent } from "@/lib/inbox/import-commit";
import {
  candidateToInsertRow,
  isUuid,
  mapBatchRow,
  mapCandidateRow,
  prepareCandidateForServer,
  type InboxCandidateRow,
  type ImportBatchRow,
} from "@/lib/inbox/inbox-map";
import type { CreateCandidateWithProvenanceInput } from "@/lib/inbox/provenance";
import {
  importActionLimiter,
  importRateKey,
  rateLimitUserMessage,
} from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";

const CANDIDATE_COLUMNS =
  "id,kind,amount_minor,merchant,note,occurred_on,source,confidence,status,possible_duplicate,category_id,category_name,account_id,account_name,raw_snippet,import_batch_id,local_id,created_at,source_row_index,source_external_id,source_lifecycle_state,source_predecessor_external_id,fingerprint_version,fingerprint,parser_version,mapping_version,match_status,match_reason,match_confidence,possible_transfer,transfer_pair_id,approved_transaction_id,approved_at,applied_rule_id,applied_rule_version";
const BATCH_COLUMNS =
  "id,file_name,source,status,row_count,warning_count,skipped_rows,map_confidence,headers,column_map,local_id,created_at,committed_at,parser_version,mapping_version";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const sourceSchema = z.enum(["paste", "csv", "xlsx", "pdf"]);
const confidenceSchema = z.enum(["high", "medium", "low"]);
const kindSchema = z.enum(["expense", "income", "transfer"]);
const sourceLifecycleSchema = z.enum(["pending", "posted", "removed"]);

const commitCandidateSchema = z
  .object({
    id: z.string().uuid().optional(),
    kind: kindSchema,
    amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    merchant: z.string().trim().min(1).max(200),
    note: z.string().trim().max(500).optional(),
    occurredOn: dateSchema,
    source: sourceSchema,
    confidence: confidenceSchema,
    status: z.literal("pending").optional(),
    possibleDuplicate: z.boolean().optional(),
    categoryId: z.string().uuid().optional(),
    category: z.string().max(60).optional(),
    accountId: z.string().uuid().optional(),
    account: z.string().max(80).optional(),
    rawSnippet: z.string().max(2000).optional(),
    importBatchId: z.string().uuid().optional(),
    sourceRowIndex: z.number().int().min(0).optional(),
    sourceExternalId: z.string().trim().min(1).max(200).optional(),
    sourceLifecycleState: sourceLifecycleSchema.optional(),
    sourcePredecessorExternalId: z.string().trim().min(1).max(200).optional(),
    parserVersion: z.string().trim().min(1).max(80).optional(),
    mappingVersion: z.number().int().min(1).optional(),
    appliedRuleId: z.string().uuid().optional(),
    appliedRuleVersion: z.number().int().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.importBatchId !== undefined &&
      !isUuid(value.importBatchId)
    ) {
      ctx.addIssue({ code: "custom", path: ["importBatchId"], message: "invalid batch" });
    }
    const hasRuleId = value.appliedRuleId !== undefined;
    const hasRuleVersion = value.appliedRuleVersion !== undefined;
    if (hasRuleId !== hasRuleVersion) {
      ctx.addIssue({
        code: "custom",
        path: ["appliedRuleId"],
        message: "rule evidence must be paired",
      });
    }
    const hasLineage =
      value.sourceLifecycleState !== undefined ||
      value.sourcePredecessorExternalId !== undefined;
    if (hasLineage && value.sourceExternalId === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceExternalId"],
        message: "source lineage requires sourceExternalId",
      });
    }
    if (
      value.sourceExternalId !== undefined &&
      value.sourcePredecessorExternalId === value.sourceExternalId
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["sourcePredecessorExternalId"],
        message: "source predecessor must differ from current identity",
      });
    }
  });

export type ImportCommitActionResult =
  | {
      ok: true;
      candidates: InboxCandidate[];
      batch: ImportBatch;
      replayed: boolean;
    }
  | { ok: false; message: string; retrySafe: boolean };

function refreshInboxPaths() {
  revalidatePath("/inbox");
  revalidatePath("/imports");
  revalidatePath("/capture");
}

function rpcErrorMessage(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? "";
  if (message.includes("import_batch_replay_mismatch")) {
    return {
      message:
        "Nội dung batch đã thay đổi so với lần gửi trước. Tải lại file thay vì dùng lại batch cũ.",
      retrySafe: false,
    };
  }
  if (message.includes("import_batch_cancelled")) {
    return { message: "Batch này đã bị hủy.", retrySafe: false };
  }
  if (message.includes("import_batch_commit_identity_unavailable")) {
    return {
      message:
        "Batch cũ chưa có danh tính retry an toàn. Mở Inbox để kiểm tra kết quả trước khi nhập lại.",
      retrySafe: false,
    };
  }
  if (message.includes("import_batch_not_found")) {
    return { message: "Batch import không còn tồn tại.", retrySafe: false };
  }
  if (
    message.includes("invalid_import_") ||
    message.includes("candidate_rule_evidence_invalid") ||
    error?.code === "23503" ||
    error?.code === "23514"
  ) {
    return {
      message: "Dữ liệu batch không còn hợp lệ để đưa vào Inbox.",
      retrySafe: false,
    };
  }
  return {
    message:
      "Chưa xác nhận được kết quả gửi. Bạn có thể thử lại an toàn; MoneyFlow sẽ đối chiếu chính batch này trước khi tạo thêm ứng viên.",
    retrySafe: true,
  };
}

function parseReplayFlag(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return (value as Record<string, unknown>).replayed === true;
}

export async function commitImportBatchCandidatesAction(
  batchId: string,
  inputs: CreateCandidateWithProvenanceInput[],
): Promise<ImportCommitActionResult> {
  if (!isUuid(batchId) || !Array.isArray(inputs) || inputs.length < 1 || inputs.length > 500) {
    return { ok: false, message: "Batch import không hợp lệ.", retrySafe: false };
  }

  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return {
      ok: false,
      message: "Chế độ demo dùng bộ nhớ trên thiết bị.",
      retrySafe: false,
    };
  }

  const limited = importActionLimiter.check(importRateKey(viewer.id));
  if (!limited.ok) {
    return {
      ok: false,
      message: rateLimitUserMessage(limited.retryAfterMs),
      retrySafe: true,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Không thể kết nối Supabase. Bạn có thể thử lại an toàn.",
      retrySafe: true,
    };
  }

  const rows: Record<string, unknown>[] = [];
  for (const raw of inputs) {
    const parsed = commitCandidateSchema.safeParse(raw);
    if (!parsed.success || (parsed.data.importBatchId && parsed.data.importBatchId !== batchId)) {
      return {
        ok: false,
        message: "Thông tin ứng viên chưa hợp lệ cho batch này.",
        retrySafe: false,
      };
    }

    const candidate = prepareCandidateForServer({
      ...parsed.data,
      status: "pending",
      importBatchId: batchId,
    });
    rows.push(
      candidateToInsertRow(candidate, viewer.id, {
        localId: null,
        importBatchId: batchId,
      }),
    );
  }

  const intent = serializeImportCommitIntent(batchId, rows);
  const intentHash = createHash("sha256").update(intent).digest("hex");

  const rpcResult = await supabase.rpc("commit_import_batch_candidates", {
    p_batch_id: batchId,
    p_intent_hash: intentHash,
    p_candidates: rows,
  });

  if (rpcResult.error) {
    const mapped = rpcErrorMessage(rpcResult.error);
    return { ok: false, ...mapped };
  }

  const [candidateResult, batchResult] = await Promise.all([
    supabase
      .from("inbox_candidates")
      .select(CANDIDATE_COLUMNS)
      .eq("import_batch_id", batchId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("import_batches")
      .select(BATCH_COLUMNS)
      .eq("id", batchId)
      .maybeSingle(),
  ]);

  if (candidateResult.error || batchResult.error || !batchResult.data) {
    refreshInboxPaths();
    return {
      ok: false,
      message:
        "Batch đã được xử lý nhưng chưa đọc lại được kết quả. Bạn có thể thử lại an toàn.",
      retrySafe: true,
    };
  }

  try {
    const candidates = (candidateResult.data ?? []).map((row) =>
      mapCandidateRow(row as InboxCandidateRow),
    );
    const batch = mapBatchRow(batchResult.data as ImportBatchRow);
    refreshInboxPaths();
    return {
      ok: true,
      candidates,
      batch,
      replayed: parseReplayFlag(rpcResult.data),
    };
  } catch {
    refreshInboxPaths();
    return {
      ok: false,
      message:
        "Batch đã được xử lý nhưng dữ liệu trả về chưa hợp lệ. Bạn có thể thử lại an toàn.",
      retrySafe: true,
    };
  }
}
