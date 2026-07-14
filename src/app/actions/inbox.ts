"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  CreateCandidateInput,
  InboxCandidate,
  UpdateCandidateInput,
} from "@/lib/inbox/candidate-store";
import { isCandidate } from "@/lib/inbox/candidate-store";
import type {
  CreateImportBatchInput,
  ImportBatch,
  ImportBatchStatus,
} from "@/lib/inbox/import-batch-store";
import { isImportBatch } from "@/lib/inbox/import-batch-store";
import {
  batchToInsertRow,
  candidateToInsertRow,
  isUuid,
  mapBatchRow,
  mapCandidateRow,
  optionalUuid,
  prepareBatchForServer,
  prepareCandidateForServer,
  type InboxCandidateRow,
  type ImportBatchRow,
} from "@/lib/inbox/inbox-map";
import { createClient } from "@/lib/supabase/server";
import {
  listInboxFromServer,
  migrateLocalInboxToServer,
  type InboxListResult,
} from "@/server/inbox";
import { requireViewer } from "@/server/auth";

export type InboxActionResult =
  | {
      ok: true;
      candidate?: InboxCandidate;
      candidates?: InboxCandidate[];
      batch?: ImportBatch;
      batches?: ImportBatch[];
    }
  | { ok: false; message: string };

const CANDIDATE_COLUMNS =
  "id,kind,amount_minor,merchant,note,occurred_on,source,confidence,status,possible_duplicate,category_id,category_name,account_id,account_name,raw_snippet,import_batch_id,local_id,created_at";

const BATCH_COLUMNS =
  "id,file_name,source,status,row_count,warning_count,skipped_rows,map_confidence,headers,column_map,local_id,created_at,committed_at";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const sourceSchema = z.enum([
  "paste",
  "csv",
  "xlsx",
  "pdf",
  "manual",
  "notification",
  "email",
]);
const confidenceSchema = z.enum(["high", "medium", "low"]);
const statusSchema = z.enum(["pending", "approved", "rejected"]);
const kindSchema = z.enum(["expense", "income", "transfer"]);

const createCandidateSchema = z.object({
  id: z.string().uuid().optional(),
  kind: kindSchema,
  amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  merchant: z.string().trim().min(1).max(200),
  note: z.string().trim().max(500).optional(),
  occurredOn: dateSchema,
  source: sourceSchema,
  confidence: confidenceSchema,
  status: statusSchema.optional(),
  possibleDuplicate: z.boolean().optional(),
  categoryId: z.string().uuid().optional(),
  category: z.string().max(60).optional(),
  accountId: z.string().uuid().optional(),
  account: z.string().max(80).optional(),
  rawSnippet: z.string().max(2000).optional(),
  importBatchId: z.string().uuid().optional(),
  createdAt: z.string().optional(),
});

const updateCandidateSchema = z
  .object({
    id: z.string().uuid(),
    kind: kindSchema.optional(),
    amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    merchant: z.string().trim().min(1).max(200).optional(),
    note: z.string().trim().max(500).optional(),
    occurredOn: dateSchema.optional(),
    source: sourceSchema.optional(),
    confidence: confidenceSchema.optional(),
    status: statusSchema.optional(),
    possibleDuplicate: z.boolean().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    category: z.string().max(60).nullable().optional(),
    accountId: z.string().uuid().nullable().optional(),
    account: z.string().max(80).nullable().optional(),
    rawSnippet: z.string().max(2000).nullable().optional(),
    importBatchId: z.string().uuid().nullable().optional(),
  })
  .strict();

const batchSourceSchema = z.enum(["csv", "xlsx", "pdf", "paste"]);
const batchStatusSchema = z.enum(["parsed", "committed", "cancelled"]);

const createBatchSchema = z.object({
  id: z.string().uuid().optional(),
  fileName: z.string().trim().min(1).max(260),
  source: batchSourceSchema,
  status: batchStatusSchema.optional(),
  rowCount: z.number().int().min(0).max(1_000_000),
  warningCount: z.number().int().min(0).max(1_000_000),
  skippedRows: z.number().int().min(0).max(1_000_000).optional(),
  mapConfidence: z.number().min(0).max(1),
  headers: z.array(z.string()),
  columnMap: z.object({
    date: z.number().int().min(0).nullable(),
    amount: z.number().int().min(0).nullable(),
    desc: z.number().int().min(0).nullable(),
    debit: z.number().int().min(0).nullable(),
    credit: z.number().int().min(0).nullable(),
  }),
  createdAt: z.string().optional(),
  committedAt: z.string().optional(),
});

function refreshInboxPaths() {
  revalidatePath("/inbox");
  revalidatePath("/imports");
  revalidatePath("/capture");
}

async function requireAuthedClient() {
  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return {
      ok: false as const,
      message: "Chế độ demo dùng bộ nhớ trên thiết bị.",
    };
  }
  const supabase = await createClient();
  if (!supabase) {
    return { ok: false as const, message: "Không thể kết nối Supabase." };
  }
  return { ok: true as const, viewer, supabase };
}

export async function listInboxAction(): Promise<InboxListResult> {
  return listInboxFromServer();
}

export async function migrateLocalInboxAction(input: {
  candidates: InboxCandidate[];
  batches: ImportBatch[];
}): Promise<InboxListResult> {
  if (!Array.isArray(input.candidates) || !Array.isArray(input.batches)) {
    return { ok: false, message: "Dữ liệu đồng bộ không hợp lệ." };
  }
  // Trust only shape-checked domain objects from the client payload.
  const candidates = input.candidates.filter(isCandidate);
  const batches = input.batches.filter(isImportBatch);
  const result = await migrateLocalInboxToServer({ candidates, batches });
  if (result.ok) refreshInboxPaths();
  return result;
}

export async function createInboxCandidatesAction(
  inputs: CreateCandidateInput[],
): Promise<InboxActionResult> {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    return { ok: false, message: "Không có ứng viên để lưu." };
  }
  if (inputs.length > 500) {
    return { ok: false, message: "Quá nhiều ứng viên trong một lần (tối đa 500)." };
  }

  const auth = await requireAuthedClient();
  if (!auth.ok) return { ok: false, message: auth.message };

  const prepared: InboxCandidate[] = [];
  for (const raw of inputs) {
    const parsed = createCandidateSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, message: "Thông tin ứng viên chưa hợp lệ." };
    }
    prepared.push(prepareCandidateForServer(parsed.data));
  }

  const rows = prepared.map((item) =>
    candidateToInsertRow(item, auth.viewer.id, {
      localId: null,
      importBatchId: optionalUuid(item.importBatchId),
    }),
  );

  const { data, error } = await auth.supabase
    .from("inbox_candidates")
    .insert(rows)
    .select(CANDIDATE_COLUMNS);

  if (error || !data) {
    return { ok: false, message: "Không lưu được ứng viên lên máy chủ." };
  }

  try {
    const candidates = data.map((row) => mapCandidateRow(row as InboxCandidateRow));
    refreshInboxPaths();
    return { ok: true, candidates };
  } catch {
    refreshInboxPaths();
    return { ok: false, message: "Đã lưu nhưng dữ liệu trả về không hợp lệ." };
  }
}

export async function updateInboxCandidateAction(
  input: UpdateCandidateInput,
): Promise<InboxActionResult> {
  const parsed = updateCandidateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Thông tin cập nhật chưa hợp lệ." };
  }

  const auth = await requireAuthedClient();
  if (!auth.ok) return { ok: false, message: auth.message };

  const patch: Record<string, unknown> = {};
  const value = parsed.data;
  if (value.kind !== undefined) patch.kind = value.kind;
  if (value.amount !== undefined) patch.amount_minor = value.amount;
  if (value.merchant !== undefined) patch.merchant = value.merchant;
  if (value.note !== undefined) patch.note = value.note;
  if (value.occurredOn !== undefined) patch.occurred_on = value.occurredOn;
  if (value.source !== undefined) patch.source = value.source;
  if (value.confidence !== undefined) patch.confidence = value.confidence;
  if (value.status !== undefined) patch.status = value.status;
  if (value.possibleDuplicate !== undefined) {
    patch.possible_duplicate = value.possibleDuplicate;
  }
  if (value.categoryId !== undefined) {
    patch.category_id = value.categoryId === null ? null : optionalUuid(value.categoryId);
  }
  if (value.category !== undefined) patch.category_name = value.category;
  if (value.accountId !== undefined) {
    patch.account_id = value.accountId === null ? null : optionalUuid(value.accountId);
  }
  if (value.account !== undefined) patch.account_name = value.account;
  if (value.rawSnippet !== undefined) patch.raw_snippet = value.rawSnippet;
  if (value.importBatchId !== undefined) {
    patch.import_batch_id =
      value.importBatchId === null ? null : optionalUuid(value.importBatchId);
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, message: "Không có thay đổi để lưu." };
  }

  const { data, error } = await auth.supabase
    .from("inbox_candidates")
    .update(patch)
    .eq("id", value.id)
    .select(CANDIDATE_COLUMNS)
    .maybeSingle();

  if (error) {
    return { ok: false, message: "Không cập nhật được ứng viên." };
  }
  if (!data) {
    return { ok: false, message: "Ứng viên không còn tồn tại." };
  }

  try {
    const candidate = mapCandidateRow(data as InboxCandidateRow);
    refreshInboxPaths();
    return { ok: true, candidate };
  } catch {
    refreshInboxPaths();
    return { ok: false, message: "Đã cập nhật nhưng dữ liệu trả về không hợp lệ." };
  }
}

export async function bulkUpdateInboxCandidatesAction(
  updates: UpdateCandidateInput[],
): Promise<InboxActionResult> {
  if (!Array.isArray(updates) || updates.length === 0) {
    return { ok: false, message: "Không có mục để cập nhật." };
  }
  if (updates.length > 200) {
    return { ok: false, message: "Quá nhiều mục cập nhật (tối đa 200)." };
  }

  const results: InboxCandidate[] = [];
  for (const update of updates) {
    const result = await updateInboxCandidateAction(update);
    if (!result.ok) return result;
    if (result.candidate) results.push(result.candidate);
  }
  return { ok: true, candidates: results };
}

export async function createImportBatchAction(
  input: CreateImportBatchInput,
): Promise<InboxActionResult> {
  const parsed = createBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Thông tin lượt import chưa hợp lệ." };
  }

  const auth = await requireAuthedClient();
  if (!auth.ok) return { ok: false, message: auth.message };

  const batch = prepareBatchForServer(parsed.data);
  const row = batchToInsertRow(batch, auth.viewer.id, { localId: null });

  const { data, error } = await auth.supabase
    .from("import_batches")
    .insert(row)
    .select(BATCH_COLUMNS)
    .single();

  if (error || !data) {
    return { ok: false, message: "Không lưu được lượt import lên máy chủ." };
  }

  try {
    const mapped = mapBatchRow(data as ImportBatchRow);
    refreshInboxPaths();
    return { ok: true, batch: mapped };
  } catch {
    refreshInboxPaths();
    return { ok: false, message: "Đã lưu nhưng dữ liệu trả về không hợp lệ." };
  }
}

export async function updateImportBatchStatusAction(
  id: string,
  status: ImportBatchStatus,
  committedAt?: string,
): Promise<InboxActionResult> {
  if (!isUuid(id) || !["parsed", "committed", "cancelled"].includes(status)) {
    return { ok: false, message: "Trạng thái import không hợp lệ." };
  }

  const auth = await requireAuthedClient();
  if (!auth.ok) return { ok: false, message: auth.message };

  const patch: Record<string, unknown> = { status };
  if (status === "committed") {
    patch.committed_at = committedAt ?? new Date().toISOString();
  }

  const { data, error } = await auth.supabase
    .from("import_batches")
    .update(patch)
    .eq("id", id)
    .select(BATCH_COLUMNS)
    .maybeSingle();

  if (error) return { ok: false, message: "Không cập nhật được lượt import." };
  if (!data) return { ok: false, message: "Lượt import không còn tồn tại." };

  try {
    const batch = mapBatchRow(data as ImportBatchRow);
    refreshInboxPaths();
    return { ok: true, batch };
  } catch {
    refreshInboxPaths();
    return { ok: false, message: "Đã cập nhật nhưng dữ liệu trả về không hợp lệ." };
  }
}

export async function deleteImportBatchAction(id: string): Promise<InboxActionResult> {
  if (!isUuid(id)) return { ok: false, message: "Mã import không hợp lệ." };

  const auth = await requireAuthedClient();
  if (!auth.ok) return { ok: false, message: auth.message };

  // Candidates keep import_batch_id null via ON DELETE SET NULL.
  const { error, count } = await auth.supabase
    .from("import_batches")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) return { ok: false, message: "Không xóa được meta import." };
  if (count === 0) return { ok: false, message: "Lượt import không còn tồn tại." };

  refreshInboxPaths();
  return { ok: true };
}

/** Apply local list mutations (approve/reject helpers) then persist patches. */
export async function applyCandidateListMutationAction(
  nextList: InboxCandidate[],
  changedIds: string[],
): Promise<InboxActionResult> {
  if (!Array.isArray(nextList) || !Array.isArray(changedIds)) {
    return { ok: false, message: "Dữ liệu cập nhật không hợp lệ." };
  }
  const auth = await requireAuthedClient();
  if (!auth.ok) return { ok: false, message: auth.message };

  const byId = new Map(nextList.filter(isCandidate).map((c) => [c.id, c]));
  for (const id of changedIds) {
    if (!isUuid(id)) continue;
    const item = byId.get(id);
    if (!item) continue;
    const result = await updateInboxCandidateAction({
      id: item.id,
      kind: item.kind,
      amount: item.amount,
      merchant: item.merchant,
      note: item.note,
      occurredOn: item.occurredOn,
      source: item.source,
      confidence: item.confidence,
      status: item.status,
      possibleDuplicate: item.possibleDuplicate ?? false,
      categoryId: item.categoryId,
      category: item.category,
      accountId: item.accountId,
      account: item.account,
      rawSnippet: item.rawSnippet,
      importBatchId: item.importBatchId,
    });
    if (!result.ok) return result;
  }

  const listed = await listInboxFromServer();
  if (!listed.ok) return { ok: false, message: listed.message };
  return { ok: true, candidates: listed.candidates };
}
