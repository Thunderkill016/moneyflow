"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
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

const MAX_SHARE_CANDIDATES = 2_500;
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

const candidateSchema = z.object({
  kind: z.enum(["income", "expense", "transfer"]),
  amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  merchant: z.string().trim().min(1).max(200),
  note: z.string().trim().max(500).optional().default(""),
  occurredOn: dateSchema,
  confidence: z.enum(["high", "medium", "low"]),
  categoryId: optionalUuidSchema,
  category: z.string().max(60).optional(),
  accountId: optionalUuidSchema,
  account: z.string().max(80).optional(),
  rawSnippet: z.string().max(2_000).optional(),
  appliedRuleId: z.string().uuid().optional(),
  appliedRuleVersion: z.number().int().min(1).optional(),
}).superRefine((value, ctx) => {
  const hasRuleId = value.appliedRuleId !== undefined;
  const hasRuleVersion = value.appliedRuleVersion !== undefined;
  if (hasRuleId !== hasRuleVersion) {
    ctx.addIssue({
      code: "custom",
      message: "invalid_share_rule_evidence",
    });
  }
});

const csvRowSchema = candidateSchema.extend({
  rowIndex: z.number().int().min(0),
});

const shareTargetSchema = z
  .object({
    pasteCandidates: z.array(candidateSchema).max(500),
    csvPlans: z
      .array(
        z.object({
          fileName: z.string().trim().min(1).max(260),
          warningCount: z.number().int().min(0).max(1_000_000),
          skippedRows: z.number().int().min(0).max(1_000_000),
          mapConfidence: z.number().min(0).max(1),
          headers: z.array(z.string().max(260)).max(200),
          columnMap: columnMapSchema,
          rows: z.array(csvRowSchema).min(1).max(500),
        }),
      )
      .max(5),
  })
  .superRefine((value, ctx) => {
    const count =
      value.pasteCandidates.length +
      value.csvPlans.reduce((sum, plan) => sum + plan.rows.length, 0);
    if (count < 1 || count > MAX_SHARE_CANDIDATES) {
      ctx.addIssue({
        code: "custom",
        message: "invalid_share_candidate_count",
      });
    }
  });

export type ShareTargetIngestInput = z.input<typeof shareTargetSchema>;

export type ShareTargetIngestResult =
  | {
      ok: true;
      batchCount: number;
      candidateCount: number;
    }
  | { ok: false; message: string };

const rpcResultSchema = z.object({
  batch_ids: z.array(z.string().uuid()),
  candidate_ids: z.array(z.string().uuid()),
  batch_count: z.number().int().positive(),
  candidate_count: z.number().int().positive(),
});

function emptyColumnMap() {
  return { date: null, amount: null, desc: null, debit: null, credit: null };
}

function refreshSharePaths() {
  revalidatePath("/capture");
  revalidatePath("/capture/share");
  revalidatePath("/inbox");
  revalidatePath("/imports");
}

export async function ingestShareTargetAction(
  input: ShareTargetIngestInput,
): Promise<ShareTargetIngestResult> {
  const parsed = shareTargetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Nội dung chia sẻ chưa hợp lệ để lưu." };
  }

  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return {
      ok: false,
      message: "Chế độ demo lưu Share vào bộ nhớ trên thiết bị.",
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
  const batches: Record<string, unknown>[] = [];
  const candidates: Record<string, unknown>[] = [];
  const mappingVersion = CURRENT_IMPORT_MAPPING_VERSION;

  if (value.pasteCandidates.length > 0) {
    const batchId = randomUUID();
    const parserVersion = parserVersionForSource("paste");
    batches.push({
      id: batchId,
      file_name: "PWA Share text",
      source: "paste",
      row_count: value.pasteCandidates.length,
      warning_count: value.pasteCandidates.filter((item) => item.confidence === "low").length,
      skipped_rows: 0,
      map_confidence: 1,
      headers: [],
      column_map: emptyColumnMap(),
      parser_version: parserVersion,
      mapping_version: mappingVersion,
    });

    for (const item of value.pasteCandidates) {
      candidates.push({
        id: randomUUID(),
        import_batch_id: batchId,
        kind: item.kind,
        amount_minor: item.amount,
        merchant: item.merchant,
        note: item.note,
        occurred_on: item.occurredOn,
        source: "paste",
        confidence: item.confidence,
        category_id: item.categoryId ?? null,
        category_name: item.category ?? null,
        account_id: item.accountId ?? null,
        account_name: item.account ?? null,
        raw_snippet: item.rawSnippet ?? null,
        ...(item.appliedRuleId
          ? {
              applied_rule_id: item.appliedRuleId,
              applied_rule_version: item.appliedRuleVersion,
            }
          : {}),
        source_row_index: null,
        parser_version: parserVersion,
        mapping_version: mappingVersion,
      });
    }
  }

  for (const plan of value.csvPlans) {
    const batchId = randomUUID();
    const parserVersion = parserVersionForSource("csv");
    batches.push({
      id: batchId,
      file_name: plan.fileName,
      source: "csv",
      row_count: plan.rows.length,
      warning_count: plan.warningCount,
      skipped_rows: plan.skippedRows,
      map_confidence: plan.mapConfidence,
      headers: plan.headers,
      column_map: plan.columnMap,
      parser_version: parserVersion,
      mapping_version: mappingVersion,
    });

    for (const item of plan.rows) {
      candidates.push({
        id: randomUUID(),
        import_batch_id: batchId,
        kind: item.kind,
        amount_minor: item.amount,
        merchant: item.merchant,
        note: item.note,
        occurred_on: item.occurredOn,
        source: "csv",
        confidence: item.confidence,
        category_id: item.categoryId ?? null,
        category_name: item.category ?? null,
        account_id: item.accountId ?? null,
        account_name: item.account ?? null,
        raw_snippet: item.rawSnippet ?? null,
        ...(item.appliedRuleId
          ? {
              applied_rule_id: item.appliedRuleId,
              applied_rule_version: item.appliedRuleVersion,
            }
          : {}),
        source_row_index: item.rowIndex,
        parser_version: parserVersion,
        mapping_version: mappingVersion,
      });
    }
  }

  const { data, error } = await supabase.rpc("ingest_share_target_capture_with_rules", {
    p_batches: batches,
    p_candidates: candidates,
  });

  if (error) {
    return {
      ok: false,
      message:
        "Không lưu được toàn bộ nội dung chia sẻ. Không có phần nào của lần Share này được ghi vào Inbox.",
    };
  }

  const result = rpcResultSchema.safeParse(data);
  if (!result.success || result.data.candidate_count !== candidates.length) {
    refreshSharePaths();
    return {
      ok: false,
      message:
        "Lần Share đã được xử lý nhưng phản hồi máy chủ không đầy đủ. Hãy mở Inbox để kiểm tra trước khi thử lại.",
    };
  }

  refreshSharePaths();
  return {
    ok: true,
    batchCount: result.data.batch_count,
    candidateCount: result.data.candidate_count,
  };
}
