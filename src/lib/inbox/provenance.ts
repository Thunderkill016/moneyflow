import type {
  CandidateSource,
  CreateCandidateInput,
  InboxCandidate,
} from "./candidate-store.ts";
import type {
  CreateImportBatchInput,
  ImportBatch,
} from "./import-batch-store.ts";

export type ImportMatchStatus =
  | "would_create"
  | "duplicate"
  | "suspected_transfer"
  | "invalid";

export type CandidateProvenance = {
  sourceRowIndex?: number;
  sourceExternalId?: string;
  fingerprintVersion?: number;
  fingerprint?: string;
  parserVersion?: string;
  mappingVersion?: number;
  matchStatus?: ImportMatchStatus;
  matchReason?: string;
  matchConfidence?: number;
  possibleTransfer?: boolean;
  transferPairId?: string;
  approvedTransactionId?: string;
  approvedAt?: string;
  /** Deterministic candidate normalization evidence. */
  appliedRuleId?: string;
  appliedRuleVersion?: number;
};

export type ImportBatchProvenance = {
  parserVersion?: string;
  mappingVersion?: number;
};

export type PersistedInboxCandidate = InboxCandidate & CandidateProvenance;
export type CreateCandidateWithProvenanceInput = CreateCandidateInput & CandidateProvenance;
export type PersistedImportBatch = ImportBatch & ImportBatchProvenance;
export type CreateImportBatchWithProvenanceInput =
  CreateImportBatchInput & ImportBatchProvenance;

export type InboxDryRunResult = {
  status: ImportMatchStatus;
  reason: string;
  confidence: number;
  matchedCandidateId?: string;
  matchedTransactionId?: string;
};

export type CandidateProvenanceRow = {
  source_row_index?: number | null;
  source_external_id?: string | null;
  fingerprint_version?: number | null;
  fingerprint?: string | null;
  parser_version?: string | null;
  mapping_version?: number | null;
  match_status?: ImportMatchStatus | null;
  match_reason?: string | null;
  match_confidence?: number | null;
  possible_transfer?: boolean | null;
  transfer_pair_id?: string | null;
  approved_transaction_id?: string | null;
  approved_at?: string | null;
  applied_rule_id?: string | null;
  applied_rule_version?: number | string | null;
};

export type BatchProvenanceRow = {
  parser_version?: string | null;
  mapping_version?: number | null;
};

const MATCH_STATUSES: ImportMatchStatus[] = [
  "would_create",
  "duplicate",
  "suspected_transfer",
  "invalid",
];

const REVIEWABLE_DUPLICATE_REASONS = new Set([
  "fingerprint_transaction_match",
  "fingerprint_candidate_match",
  "existing_transaction_match",
  "existing_transaction_ambiguous",
]);

const PARSER_VERSION_BY_SOURCE: Record<CandidateSource, string> = {
  paste: "paste_text@1.0",
  csv: "csv_import@1.0",
  xlsx: "xlsx_import@1.0",
  pdf: "pdf_import@1.0",
  manual: "manual_entry@1.0",
  notification: "notification@1.0",
  email: "email@1.0",
};

export const CURRENT_IMPORT_MAPPING_VERSION = 1;

export function parserVersionForSource(source: CandidateSource): string {
  return PARSER_VERSION_BY_SOURCE[source];
}

function optionalPositiveInteger(value: number | string | null | undefined) {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : undefined;
}

export function candidateProvenanceFromRow(
  row: CandidateProvenanceRow,
): CandidateProvenance {
  return {
    sourceRowIndex: row.source_row_index ?? undefined,
    sourceExternalId: row.source_external_id ?? undefined,
    fingerprintVersion: row.fingerprint_version ?? undefined,
    fingerprint: row.fingerprint ?? undefined,
    parserVersion: row.parser_version ?? undefined,
    mappingVersion: row.mapping_version ?? undefined,
    matchStatus: row.match_status ?? undefined,
    matchReason: row.match_reason ?? undefined,
    matchConfidence: row.match_confidence ?? undefined,
    possibleTransfer:
      row.possible_transfer === true ? true : undefined,
    transferPairId: row.transfer_pair_id ?? undefined,
    approvedTransactionId: row.approved_transaction_id ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    appliedRuleId: row.applied_rule_id ?? undefined,
    appliedRuleVersion: optionalPositiveInteger(row.applied_rule_version),
  };
}

export function batchProvenanceFromRow(
  row: BatchProvenanceRow,
): ImportBatchProvenance {
  return {
    parserVersion: row.parser_version ?? undefined,
    mappingVersion: row.mapping_version ?? undefined,
  };
}

export function candidateProvenanceInsertPatch(
  candidate: CreateCandidateWithProvenanceInput | PersistedInboxCandidate,
): Record<string, unknown> {
  const hasRuleEvidence =
    typeof candidate.appliedRuleId === "string" &&
    Number.isSafeInteger(candidate.appliedRuleVersion) &&
    (candidate.appliedRuleVersion ?? 0) >= 1;
  return {
    source_row_index: candidate.sourceRowIndex ?? null,
    source_external_id: candidate.sourceExternalId?.slice(0, 200) ?? null,
    parser_version:
      candidate.parserVersion?.slice(0, 80) ??
      parserVersionForSource(candidate.source),
    mapping_version:
      candidate.mappingVersion ?? CURRENT_IMPORT_MAPPING_VERSION,
    ...(hasRuleEvidence
      ? {
          applied_rule_id: candidate.appliedRuleId,
          applied_rule_version: candidate.appliedRuleVersion,
        }
      : {}),
  };
}

export function batchProvenanceInsertPatch(
  batch: CreateImportBatchWithProvenanceInput | PersistedImportBatch,
): Record<string, unknown> {
  return {
    parser_version: batch.parserVersion?.slice(0, 80) ?? null,
    mapping_version: batch.mappingVersion ?? null,
  };
}

export function parseInboxDryRunResult(value: unknown): InboxDryRunResult {
  if (!value || typeof value !== "object") {
    throw new Error("invalid_inbox_dry_run");
  }
  const row = value as Record<string, unknown>;
  const status = row.status;
  const reason = row.reason;
  const confidence =
    typeof row.confidence === "string"
      ? Number(row.confidence)
      : row.confidence;

  if (
    typeof status !== "string" ||
    !(MATCH_STATUSES as string[]).includes(status) ||
    typeof reason !== "string" ||
    typeof confidence !== "number" ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    throw new Error("invalid_inbox_dry_run");
  }

  const matchedCandidateId =
    typeof row.matched_candidate_id === "string"
      ? row.matched_candidate_id
      : undefined;
  const matchedTransactionId =
    typeof row.matched_transaction_id === "string"
      ? row.matched_transaction_id
      : undefined;

  return {
    status: status as ImportMatchStatus,
    reason,
    confidence,
    matchedCandidateId,
    matchedTransactionId,
  };
}

export function allowsExplicitDuplicateOverride(
  result: InboxDryRunResult | null | undefined,
): boolean {
  return (
    result?.status === "duplicate" &&
    REVIEWABLE_DUPLICATE_REASONS.has(result.reason)
  );
}

export function dryRunUserMessage(result: InboxDryRunResult): string {
  if (result.status === "would_create") return "Sẵn sàng ghi vào sổ.";
  if (result.status === "suspected_transfer") {
    return "Có dấu hiệu chuyển khoản nội bộ. Hãy chọn đúng hai tài khoản.";
  }
  if (result.status === "duplicate") {
    if (result.reason === "source_external_id_match") {
      return "Giao dịch này đã được nhập từ cùng mã nguồn.";
    }
    if (result.reason === "source_external_id_changed") {
      return "Nguồn gửi lại cùng mã giao dịch nhưng bằng chứng đã thay đổi. MoneyFlow không tự ghi đè dữ liệu đang có; bạn có thể ghi nhận cập nhật nguồn và giữ nguyên sổ.";
    }
    if (result.reason === "source_external_id_deleted_match") {
      return "Giao dịch từ cùng mã nguồn đã từng được nhập rồi xóa. Bạn có thể khôi phục chính giao dịch đó mà không ghi đè các chỉnh sửa đang lưu trong MoneyFlow.";
    }
    if (result.reason === "source_external_id_deleted_changed") {
      return "Nguồn gửi lại cùng mã giao dịch nhưng nội dung đã thay đổi so với bằng chứng gốc. MoneyFlow không tự khôi phục hoặc ghi đè; mục này cần được xử lý theo quy tắc cập nhật nguồn riêng.";
    }
    if (result.reason === "existing_transaction_match") {
      return "Đã có một giao dịch cùng tài khoản, ngày và số tiền. Bạn có thể gắn nguồn vào giao dịch đó mà không sửa dữ liệu trong sổ.";
    }
    if (result.reason === "existing_transaction_ambiguous") {
      return "Có nhiều giao dịch đã có cùng tài khoản, ngày và số tiền. MoneyFlow không tự chọn để tránh gắn nhầm.";
    }
    return "Có giao dịch rất giống đã tồn tại. Hãy kiểm tra trước khi duyệt.";
  }
  if (result.reason === "account_required") return "Hãy chọn tài khoản.";
  if (result.reason === "category_required") return "Hãy chọn danh mục.";
  return "Ứng viên chưa đủ điều kiện để ghi sổ.";
}