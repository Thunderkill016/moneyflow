import "server-only";

import { z } from "zod";
import {
  emptyReconciliationImportEvidence,
  type ReconciliationImportEvidenceData,
} from "@/lib/reconciliation-import-evidence";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";

const PROVENANCE_COLUMNS =
  "transaction_id,source,source_row_index,original_description,import_batch_id";
const QUERY_CHUNK_SIZE = 100;

const provenanceRowSchema = z.object({
  transaction_id: z.string().uuid(),
  /* Must mirror the live inbox_candidate_source enum — 'agent' was added by
     20260920120000_agent_candidate_proposals.sql; a source the schema does
     not know would fail the whole evidence read instead of one row. */
  source: z.enum([
    "paste",
    "csv",
    "xlsx",
    "pdf",
    "manual",
    "notification",
    "email",
    "agent",
  ]),
  source_row_index: z.number().int().nonnegative().nullable(),
  original_description: z.string(),
  import_batch_id: z.string().uuid().nullable(),
});

function uniqueIds(transactionIds: string[]) {
  return [...new Set(transactionIds.filter(Boolean))];
}

export async function getReconciliationImportEvidence(
  transactionIds: string[],
): Promise<ReconciliationImportEvidenceData> {
  const viewer = await requireViewer();
  const ids = uniqueIds(transactionIds);
  if (viewer.isDemo || ids.length === 0) {
    return emptyReconciliationImportEvidence();
  }

  const supabase = await createClient();
  if (!supabase) {
    return emptyReconciliationImportEvidence(
      "Chưa tải được nguồn nhập của giao dịch.",
    );
  }

  const rawRows: unknown[] = [];
  for (let start = 0; start < ids.length; start += QUERY_CHUNK_SIZE) {
    const chunk = ids.slice(start, start + QUERY_CHUNK_SIZE);
    const { data, error } = await supabase
      .from("transaction_import_provenance")
      .select(PROVENANCE_COLUMNS)
      .in("transaction_id", chunk);

    if (error) {
      return emptyReconciliationImportEvidence(
        "Đối soát vẫn dùng được, nhưng chưa tải được nguồn nhập của giao dịch.",
      );
    }
    rawRows.push(...(data ?? []));
  }

  try {
    const rows = z.array(provenanceRowSchema).parse(rawRows);
    return {
      byTransactionId: Object.fromEntries(
        rows.map((row) => [
          row.transaction_id,
          {
            source: row.source,
            sourceRowIndex: row.source_row_index,
            originalDescription: row.original_description,
            importBatchId: row.import_batch_id,
          },
        ]),
      ),
      dataError: null,
    };
  } catch {
    return emptyReconciliationImportEvidence(
      "Đối soát vẫn dùng được, nhưng nguồn nhập trả về dữ liệu không hợp lệ.",
    );
  }
}
