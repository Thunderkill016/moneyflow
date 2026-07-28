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

const CANDIDATE_COLUMNS =
  "id,kind,amount_minor,merchant,note,occurred_on,source,confidence,status,possible_duplicate,category_id,category_name,account_id,account_name,raw_snippet,import_batch_id,source_row_index,local_id,created_at";

const BATCH_COLUMNS =
  "id,file_name,source,status,row_count,warning_count,skipped_rows,map_confidence,headers,column_map,parser_version,mapping_version,local_id,created_at,committed_at";

export type InboxListResult =
  | { ok: true; candidates: InboxCandidate[]; batches: ImportBatch[] }
  | { ok: false; message: string };

export async function listInboxFromServer(): Promise<InboxListResult> {
  const viewer = await requireViewer();
  if (viewer.isDemo) {
    return { ok: false, message: "Chế độ demo dùng bộ nhớ trên thiết bị." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không thể kết nối Supabase." };

  const [candResult, batchResult] = await Promise.all([
    supabase
      .from("inbox_candidates")
      .select(CANDIDATE_COLUMNS)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("import_batches")
      .select(BATCH_COLUMNS)
      .order("created_at", { ascending: false }),
  ]);

  if (candResult.error || batchResult.error) {
    return { ok: false, message: "Không tải được Inbox từ máy chủ." };
  }

  try {
    const candidates = (candResult.data ?? []).map((row) =>
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

  const { batchRows, candidateRows } = buildMigratePayloads(
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

  if (candidateRows.length > 0) {
    const { error } = await supabase.from("inbox_candidates").insert(candidateRows);
    if (error) {
      return {
        ok: false,
        message: "Không đồng bộ được ứng viên Inbox lên máy chủ.",
      };
    }
  }

  return listInboxFromServer();
}
