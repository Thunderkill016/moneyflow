/**
 * Map between domain inbox types and Supabase row shapes (TASK-024).
 * Money = integer minor units (VND đồng). Pure helpers — unit-tested.
 */

import type {
  CandidateConfidence,
  CandidateKind,
  CandidateSource,
  CandidateStatus,
  InboxCandidate,
} from "./candidate-store.ts";
import {
  createCandidate,
  isCandidate,
} from "./candidate-store.ts";
import type {
  ImportBatch,
  ImportBatchSource,
  ImportBatchStatus,
} from "./import-batch-store.ts";
import { createImportBatch, isImportBatch } from "./import-batch-store.ts";
import type { CsvColumnMap } from "./parse-csv.ts";
import {
  batchProvenanceFromRow,
  batchProvenanceInsertPatch,
  candidateProvenanceFromRow,
  candidateProvenanceInsertPatch,
  type BatchProvenanceRow,
  type CandidateProvenanceRow,
  type CreateCandidateWithProvenanceInput,
  type CreateImportBatchWithProvenanceInput,
  type PersistedInboxCandidate,
  type PersistedImportBatch,
} from "./provenance.ts";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): boolean {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Demo seed rows must not upload to the server. */
export function isDemoSampleCandidate(candidate: Pick<InboxCandidate, "id">): boolean {
  return candidate.id.startsWith("cand-demo-");
}

export function candidatesForMigrate(list: InboxCandidate[]): InboxCandidate[] {
  return list.filter((item) => !isDemoSampleCandidate(item) && isCandidate(item));
}

export function batchesForMigrate(list: ImportBatch[]): ImportBatch[] {
  return list.filter((item) => isImportBatch(item));
}

export type InboxCandidateRow = {
  id: string;
  kind: CandidateKind;
  amount_minor: number | string;
  merchant: string;
  note: string;
  occurred_on: string;
  source: CandidateSource;
  confidence: CandidateConfidence;
  status: CandidateStatus;
  possible_duplicate: boolean;
  category_id: string | null;
  category_name: string | null;
  account_id: string | null;
  account_name: string | null;
  raw_snippet: string | null;
  import_batch_id: string | null;
  local_id: string | null;
  created_at: string;
} & CandidateProvenanceRow;

export type ImportBatchRow = {
  id: string;
  file_name: string;
  source: ImportBatchSource;
  status: ImportBatchStatus;
  row_count: number;
  warning_count: number;
  skipped_rows: number;
  map_confidence: number;
  headers: unknown;
  column_map: unknown;
  local_id: string | null;
  created_at: string;
  committed_at: string | null;
} & BatchProvenanceRow;

function safePositiveMoney(value: unknown): number {
  const amount = typeof value === "string" ? Number(value) : value;
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("invalid_amount_minor");
  }
  return amount;
}

function asColumnMap(value: unknown): CsvColumnMap {
  if (!value || typeof value !== "object") {
    return { date: null, amount: null, desc: null, debit: null, credit: null };
  }
  const m = value as Record<string, unknown>;
  const idx = (v: unknown): number | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number" && Number.isInteger(v) && v >= 0) return v;
    return null;
  };
  return {
    date: idx(m.date),
    amount: idx(m.amount),
    desc: idx(m.desc),
    debit: idx(m.debit),
    credit: idx(m.credit),
  };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function mapCandidateRow(row: InboxCandidateRow): PersistedInboxCandidate {
  const candidate: PersistedInboxCandidate = {
    id: row.id,
    kind: row.kind,
    amount: safePositiveMoney(row.amount_minor),
    merchant: row.merchant,
    note: row.note ?? "",
    occurredOn:
      typeof row.occurred_on === "string" && row.occurred_on.length >= 10
        ? row.occurred_on.slice(0, 10)
        : row.occurred_on,
    source: row.source,
    confidence: row.confidence,
    status: row.status,
    possibleDuplicate: row.possible_duplicate === true ? true : undefined,
    categoryId: row.category_id ?? undefined,
    category: row.category_name ?? undefined,
    accountId: row.account_id ?? undefined,
    account: row.account_name ?? undefined,
    rawSnippet: row.raw_snippet ?? undefined,
    importBatchId: row.import_batch_id ?? undefined,
    createdAt: row.created_at,
    ...candidateProvenanceFromRow(row),
  };
  if (!isCandidate(candidate)) {
    throw new Error("invalid_candidate_row");
  }
  return candidate;
}

export function mapBatchRow(row: ImportBatchRow): PersistedImportBatch {
  const batch: PersistedImportBatch = {
    id: row.id,
    fileName: row.file_name,
    source: row.source,
    status: row.status,
    rowCount: row.row_count,
    warningCount: row.warning_count,
    skippedRows: row.skipped_rows,
    mapConfidence: row.map_confidence,
    headers: asStringArray(row.headers),
    columnMap: asColumnMap(row.column_map),
    createdAt: row.created_at,
    committedAt: row.committed_at ?? undefined,
    ...batchProvenanceFromRow(row),
  };
  if (!isImportBatch(batch)) {
    throw new Error("invalid_batch_row");
  }
  return batch;
}

/** Optional UUID refs only — local demo IDs must not hit FK columns. */
export function optionalUuid(value: string | undefined | null): string | null {
  if (!value || !isUuid(value)) return null;
  return value;
}

function localIdFromClientId(id: string): string | null {
  return isUuid(id) ? null : id.slice(0, 80);
}

export function candidateToInsertRow(
  candidate: PersistedInboxCandidate,
  userId: string,
  options?: { localId?: string | null; importBatchId?: string | null },
): Record<string, unknown> {
  const id = isUuid(candidate.id) ? candidate.id : undefined;
  return {
    ...(id ? { id } : {}),
    user_id: userId,
    kind: candidate.kind,
    amount_minor: candidate.amount,
    merchant: candidate.merchant.slice(0, 200) || "Không rõ",
    note: candidate.note.slice(0, 500),
    occurred_on: candidate.occurredOn,
    source: candidate.source,
    confidence: candidate.confidence,
    status: candidate.status,
    possible_duplicate: candidate.possibleDuplicate === true,
    category_id: optionalUuid(candidate.categoryId),
    category_name: candidate.category?.slice(0, 60) ?? null,
    account_id: optionalUuid(candidate.accountId),
    account_name: candidate.account?.slice(0, 80) ?? null,
    raw_snippet: candidate.rawSnippet?.slice(0, 2000) ?? null,
    import_batch_id:
      options?.importBatchId !== undefined
        ? options.importBatchId
        : optionalUuid(candidate.importBatchId),
    ...candidateProvenanceInsertPatch(candidate),
    local_id: options?.localId === undefined ? null : options.localId,
    created_at: candidate.createdAt,
  };
}

export function batchToInsertRow(
  batch: PersistedImportBatch,
  userId: string,
  options?: { localId?: string | null },
): Record<string, unknown> {
  const id = isUuid(batch.id) ? batch.id : undefined;
  return {
    ...(id ? { id } : {}),
    user_id: userId,
    file_name: batch.fileName.slice(0, 260) || "statement.csv",
    source: batch.source,
    status: batch.status,
    row_count: batch.rowCount,
    warning_count: batch.warningCount,
    skipped_rows: batch.skippedRows,
    map_confidence: batch.mapConfidence,
    headers: batch.headers,
    column_map: batch.columnMap,
    ...batchProvenanceInsertPatch(batch),
    local_id: options?.localId === undefined ? null : options.localId,
    created_at: batch.createdAt,
    committed_at: batch.committedAt ?? null,
  };
}

export function buildMigratePayloads(
  batches: ImportBatch[],
  candidates: InboxCandidate[],
  userId: string,
): {
  batchRows: Record<string, unknown>[];
  candidateRows: Record<string, unknown>[];
  batchIdMap: Map<string, string>;
} {
  const safeBatches = batchesForMigrate(batches);
  const safeCandidates = candidatesForMigrate(candidates);
  const batchIdMap = new Map<string, string>();
  const batchRows: Record<string, unknown>[] = [];

  for (const batch of safeBatches) {
    const serverId = isUuid(batch.id) ? batch.id : cryptoRandomUuid();
    batchIdMap.set(batch.id, serverId);
    const localId = localIdFromClientId(batch.id);
    batchRows.push({
      ...batchToInsertRow({ ...batch, id: serverId }, userId, { localId }),
      id: serverId,
    });
  }

  const candidateRows: Record<string, unknown>[] = [];
  for (const candidate of safeCandidates) {
    const serverId = isUuid(candidate.id) ? candidate.id : cryptoRandomUuid();
    const localId = localIdFromClientId(candidate.id);
    let importBatchId: string | null = null;
    if (candidate.importBatchId) {
      importBatchId =
        batchIdMap.get(candidate.importBatchId) ??
        optionalUuid(candidate.importBatchId);
    }
    candidateRows.push({
      ...candidateToInsertRow(
        { ...candidate, id: serverId },
        userId,
        { localId, importBatchId },
      ),
      id: serverId,
    });
  }

  return { batchRows, candidateRows, batchIdMap };
}

export function cryptoRandomUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function prepareCandidateForServer(
  input: CreateCandidateWithProvenanceInput,
): PersistedInboxCandidate {
  const id = input.id && isUuid(input.id) ? input.id : cryptoRandomUuid();
  const candidate = createCandidate({
    ...input,
    id,
    importBatchId: optionalUuid(input.importBatchId) ?? undefined,
    accountId: optionalUuid(input.accountId) ?? undefined,
    categoryId: optionalUuid(input.categoryId) ?? undefined,
  });
  return {
    ...candidate,
    sourceRowIndex: input.sourceRowIndex,
    sourceExternalId: input.sourceExternalId,
    sourceLifecycleState: input.sourceLifecycleState,
    sourcePredecessorExternalId: input.sourcePredecessorExternalId,
    parserVersion: input.parserVersion,
    mappingVersion: input.mappingVersion,
  };
}

export function prepareBatchForServer(
  input: CreateImportBatchWithProvenanceInput,
): PersistedImportBatch {
  const id = input.id && isUuid(input.id) ? input.id : cryptoRandomUuid();
  const batch = createImportBatch({ ...input, id });
  return {
    ...batch,
    parserVersion: input.parserVersion,
    mappingVersion: input.mappingVersion,
  };
}

export function shouldMigrateLocal(
  serverCandidateCount: number,
  serverBatchCount: number,
  localCandidates: InboxCandidate[],
  localBatches: ImportBatch[],
): boolean {
  if (serverCandidateCount > 0 || serverBatchCount > 0) return false;
  return (
    candidatesForMigrate(localCandidates).length > 0 ||
    batchesForMigrate(localBatches).length > 0
  );
}
