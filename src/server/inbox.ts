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
import { readInboxRowsPaged } from "@/lib/inbox/inbox-paged-read";
import { createClient } from "@/lib/supabase/server";
import { dueDateForMonth } from "@/lib/planning/commitments";
import { todayInVietnam } from "@/lib/vietnam-date";
import { currentMonthStart } from "@/server/budgets";
import { requireViewer } from "@/server/auth";

const CANDIDATE_BASE_COLUMNS =
  "id,kind,amount_minor,merchant,note,occurred_on,source,confidence,status,possible_duplicate,category_id,category_name,account_id,account_name,raw_snippet,import_batch_id,local_id,created_at,source_row_index,source_external_id,source_lifecycle_state,source_predecessor_external_id,fingerprint_version,fingerprint,parser_version,mapping_version,match_status,match_reason,match_confidence,possible_transfer,transfer_pair_id,approved_transaction_id,approved_at";
const CANDIDATE_RULE_COLUMNS =
  `${CANDIDATE_BASE_COLUMNS},applied_rule_id,applied_rule_version`;

const BATCH_BASE_COLUMNS =
  "id,file_name,source,status,row_count,warning_count,skipped_rows,map_confidence,headers,column_map,local_id,created_at,committed_at,parser_version,mapping_version";
const BATCH_MEASUREMENT_COLUMNS =
  `${BATCH_BASE_COLUMNS},commit_attempt_count,commit_replay_count,mapping_evidence`;

/*
 * The inbox list has no row ceiling: candidates and batches are read page by
 * page (`readInboxRowsPaged`), the same paging plan the transaction feeds use.
 * This is what the settings/export download relies on — a single read
 * capped at 1000 rows used to silently drop every candidate past row 1000.
 * RLS (`*_select_own` policies) still restricts every page to the viewer's
 * own rows; nothing here bypasses it.
 *
 * Offset pagination needs a unique final sort key. `id` is appended after
 * the display ordering so pages neither skip nor duplicate rows; the display
 * order itself is unchanged (ties were previously arbitrary).
 */

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

function isMissingMeasurementColumn(error: InboxQueryError) {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("commit_attempt_count") ||
    message.includes("commit_replay_count") ||
    message.includes("mapping_evidence")
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

  /*
   * Due unpaid commitments surface in the Inbox as virtual suggestions, so
   * the badge counts them too — otherwise the badge would under-report what
   * the Inbox actually lists.
   */
  const monthStart = currentMonthStart();
  const today = todayInVietnam();
  const [feed, occurrences] = await Promise.all([
    supabase
      .from("recurring_commitment_feed")
      .select("id,due_day")
      .eq("is_archived", false),
    supabase
      .from("commitment_occurrences")
      .select("commitment_id")
      .eq("month_start", monthStart),
  ]);
  if (feed.error || occurrences.error) return count ?? 0;
  const paidIds = new Set(
    (occurrences.data ?? []).map((row) => row.commitment_id as string),
  );
  const due = (feed.data ?? []).filter(
    (row) =>
      !paidIds.has(row.id as string) &&
      dueDateForMonth(monthStart, row.due_day as number) <= today,
  ).length;

  return (count ?? 0) + due;
}

export async function listInboxFromServer(): Promise<InboxListResult> {
  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return { ok: false, message: "Chế độ demo dùng bộ nhớ trên thiết bị." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const candidateResult = await readInboxRowsPaged(
    (from, to, columns) =>
      supabase
        .from("inbox_candidates")
        .select(columns)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    CANDIDATE_RULE_COLUMNS,
    CANDIDATE_BASE_COLUMNS,
    // Application-first rollout: old production schemas still serve the Inbox.
    (error) => isMissingRuleProvenanceColumn(error as InboxQueryError),
  );

  const candidateRows: unknown[] = candidateResult.data ?? [];
  const candidateError: InboxQueryError =
    candidateResult.error as InboxQueryError;

  const batchResult = await readInboxRowsPaged(
    (from, to, columns) =>
      supabase
        .from("import_batches")
        .select(columns)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    BATCH_MEASUREMENT_COLUMNS,
    BATCH_BASE_COLUMNS,
    (error) => isMissingMeasurementColumn(error as InboxQueryError),
  );

  const batchRows: unknown[] = batchResult.data ?? [];
  const batchError: InboxQueryError = batchResult.error as InboxQueryError;

  if (candidateError || batchError) {
    return { ok: false, message: "Không tải được Inbox từ máy chủ." };
  }

  try {
    const candidates = candidateRows.map((row) =>
      mapCandidateRow(row as InboxCandidateRow),
    );
    const batches = batchRows.map((row) =>
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
