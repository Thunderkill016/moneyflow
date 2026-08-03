import "server-only";

import type { InboxCandidate } from "@/lib/inbox/candidate-store";
import type { ImportBatch } from "@/lib/inbox/import-batch-store";
import {
  buildMigratePayloads,
  mapBatchRow,
  mapCandidateRow,
  shouldMigrateLocal,
  type InboxCandidateRow,
  type ImportBatchRow,
} from "@/lib/inbox/inbox-map";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";

const CANDIDATE_BASE_COLUMNS =
  "id,kind,amount_minor,merchant,note,occurred_on,source,confidence,status,possible_duplicate,category_id,category_name,account_id,account_name,raw_snippet,import_batch_id,local_id,created_at,source_row_index,source_external_id,fingerprint_version,fingerprint,parser_version,mapping_version,match_status,match_reason,match_confidence,possible_transfer,transfer_pair_id,approved_transaction_id,approved_at";
const CANDIDATE_RULE_COLUMNS =
  `${CANDIDATE_BASE_COLUMNS},applied_rule_id,applied_rule_version`;

const BATCH_COLUMNS =
  "id,file_name,source,status,row_count,warning_count,skipped_rows,map_confidence,headers,column_map,local_id,created_at,committed_at,parser_version,mapping_version";

export type InboxListResult =
  | { ok: true; candidates: InboxCandidate[]; batches: ImportBatch[] }
  | { ok: false; message: string };

type InboxQueryError = { code?: string; message?: string } | null;

function isMissingRuleProvenanceColumn(error: InboxQueryError) {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("applied_rule_id") ||
    message.includes("applied_rule_version")
  );
}

/**
 * Authenticated Dashboard attention count. Returning null means the count is
 * unavailable, so callers must render no badge rather than a stale local value.
 */
export async function getPendingInboxCountFromServer(): Promise<number | null> {
  const viewer = await requireViewer();
  if (viewer.isDemo) return 0;

  const supabase = await createClient();
  if (!supabase) return null;

  const { count, error } = await supabase
    .from("inbox_candidates")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) return null;
  return count ?? 0;
}

export async function listInboxFromServer(): Promise<InboxListResult> {
  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return { ok: false, message: "Chế độ demo dùng bộ nhớ trên thiết bị." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const ruleColumnResult = await supabase
    .from("inbox_candidates")
    .select(CANDIDATE_RULE_COLUMNS)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  let candidateRows: unknown[] = ruleColumnResult.data ?? [];
  let candidateError: InboxQueryError = ruleColumnResult.error;

  // Application-first rollout: old production schemas still serve the Inbox.
  if (isMissingRuleProvenanceColumn(candidateError)) {
    const legacyResult = await supabase
      .from("inbox_candidates")
      .select(CANDIDATE_BASE_COLUMNS)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false });
    candidateRows = legacyResult.data ?? [];
    candidateError = legacyResult.error;
  }

  const batchResult = await supabase
    .from("import_batches")
    .select(BATCH_COLUMNS)
    .order("created_at", { ascending: false });

  if (candidateError || batchResult.error) {
    return { ok: false, message: "Không tải được Inbox từ máy chủ." };
  }

  try {
    const candidates = candidateRows.map((row) =>
      mapCandidateRow(row as InboxCandidateRow),
    );
    const batches = (batchResult.data ?? []).map((row) =>
      mapBatchRow(row as ImportBatchRow),
    );
    return { ok: true, candidates, batches };
  } catch {
    return { ok: false, message: "Dữ liệu Inbox trên máy chủ không hợp lệ." };
  }
}

export async function migrateLocalInboxToServer(input: {
  candidates: InboxCandidate[];
  batches: ImportBatch[];
}): Promise<InboxListResult> {
  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return { ok: false, message: "Chế độ demo dùng bộ nhớ trên thiết bị." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const listed = await listInboxFromServer();
  if (!listed.ok) return listed;

  if (
    !shouldMigrateLocal(
      listed.candidates.length,
      listed.batches.length,
      input.candidates,
      input.batches,
    )
  ) {
    return listed;
  }

  const { batchRows, candidateRows: migrationRows } = buildMigratePayloads(
    input.batches,
    input.candidates,
    viewer.id,
  );

  if (batchRows.length > 0) {
    const { error } = await supabase.from("import_batches").insert(batchRows);
    if (error) {
      return {
        ok: false,
        message: "Không đồng bộ được lượt import lên máy chủ.",
      };
    }
  }

  if (migrationRows.length > 0) {
    const { error } = await supabase.from("inbox_candidates").insert(migrationRows);
    if (error) {
      return {
        ok: false,
        message: "Không đồng bộ được ứng viên Inbox lên máy chủ.",
      };
    }
  }

  return listInboxFromServer();
}
