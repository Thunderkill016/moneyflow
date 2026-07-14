/**
 * Local-first import batches (wireframes-inbox §8–9, §15).
 * Meta only — raw file content is not retained after parse.
 */

import type { CsvColumnMap } from "./parse-csv.ts";

export const IMPORT_BATCH_STORAGE_KEY = "moneyflow-import-batches-v1";

export type ImportBatchSource = "csv" | "xlsx" | "pdf" | "paste";

export type ImportBatchStatus =
  | "parsed"
  | "committed"
  | "cancelled";

export type ImportBatch = {
  id: string;
  fileName: string;
  source: ImportBatchSource;
  status: ImportBatchStatus;
  /** Total candidate rows created from this batch. */
  rowCount: number;
  warningCount: number;
  skippedRows: number;
  /** 0–1 auto-map confidence. */
  mapConfidence: number;
  headers: string[];
  columnMap: CsvColumnMap;
  createdAt: string;
  /** ISO time when candidates were written to inbox. */
  committedAt?: string;
};

export type CreateImportBatchInput = {
  fileName: string;
  source: ImportBatchSource;
  status?: ImportBatchStatus;
  rowCount: number;
  warningCount: number;
  skippedRows?: number;
  mapConfidence: number;
  headers: string[];
  columnMap: CsvColumnMap;
  id?: string;
  createdAt?: string;
  committedAt?: string;
};

function isColumnMap(value: unknown): value is CsvColumnMap {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<CsvColumnMap>;
  const okIndex = (v: unknown) =>
    v === null || (typeof v === "number" && Number.isInteger(v) && v >= 0);
  return (
    okIndex(m.date) &&
    okIndex(m.amount) &&
    okIndex(m.desc) &&
    okIndex(m.debit) &&
    okIndex(m.credit)
  );
}

const SOURCES: ImportBatchSource[] = ["csv", "xlsx", "pdf", "paste"];
const STATUSES: ImportBatchStatus[] = ["parsed", "committed", "cancelled"];

export function isImportBatch(value: unknown): value is ImportBatch {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ImportBatch>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.fileName === "string" &&
    typeof item.source === "string" &&
    (SOURCES as string[]).includes(item.source) &&
    typeof item.status === "string" &&
    (STATUSES as string[]).includes(item.status) &&
    typeof item.rowCount === "number" &&
    Number.isSafeInteger(item.rowCount) &&
    item.rowCount >= 0 &&
    typeof item.warningCount === "number" &&
    Number.isSafeInteger(item.warningCount) &&
    item.warningCount >= 0 &&
    typeof item.skippedRows === "number" &&
    Number.isSafeInteger(item.skippedRows) &&
    item.skippedRows >= 0 &&
    typeof item.mapConfidence === "number" &&
    Number.isFinite(item.mapConfidence) &&
    Array.isArray(item.headers) &&
    item.headers.every((h) => typeof h === "string") &&
    isColumnMap(item.columnMap) &&
    typeof item.createdAt === "string" &&
    Number.isFinite(Date.parse(item.createdAt)) &&
    (item.committedAt === undefined ||
      (typeof item.committedAt === "string" &&
        Number.isFinite(Date.parse(item.committedAt))))
  );
}

export function createImportBatch(input: CreateImportBatchInput): ImportBatch {
  return {
    id:
      input.id ??
      `imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    fileName: input.fileName.trim() || "statement.csv",
    source: input.source,
    status: input.status ?? "parsed",
    rowCount: input.rowCount,
    warningCount: input.warningCount,
    skippedRows: input.skippedRows ?? 0,
    mapConfidence: input.mapConfidence,
    headers: [...input.headers],
    columnMap: { ...input.columnMap },
    createdAt: input.createdAt ?? new Date().toISOString(),
    committedAt: input.committedAt,
  };
}

export function upsertImportBatch(
  list: ImportBatch[],
  batch: ImportBatch,
): ImportBatch[] {
  const index = list.findIndex((item) => item.id === batch.id);
  if (index === -1) return [batch, ...list];
  const next = [...list];
  next[index] = batch;
  return next;
}

export function readStoredImportBatches(): ImportBatch[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(IMPORT_BATCH_STORAGE_KEY);
    if (saved === null) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isImportBatch)) {
      localStorage.removeItem(IMPORT_BATCH_STORAGE_KEY);
      return [];
    }
    return parsed;
  } catch {
    try {
      localStorage.removeItem(IMPORT_BATCH_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return [];
  }
}

export function writeStoredImportBatches(batches: ImportBatch[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(IMPORT_BATCH_STORAGE_KEY, JSON.stringify(batches));
}

export function addStoredImportBatch(input: CreateImportBatchInput): ImportBatch {
  const batch = createImportBatch(input);
  const next = upsertImportBatch(readStoredImportBatches(), batch);
  writeStoredImportBatches(next);
  return batch;
}

export function markImportBatchCommitted(
  id: string,
  committedAt = new Date().toISOString(),
): ImportBatch | null {
  const list = readStoredImportBatches();
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const updated: ImportBatch = {
    ...list[index]!,
    status: "committed",
    committedAt,
  };
  const next = [...list];
  next[index] = updated;
  writeStoredImportBatches(next);
  return updated;
}

export function removeStoredImportBatch(id: string): ImportBatch[] {
  const next = readStoredImportBatches().filter((item) => item.id !== id);
  writeStoredImportBatches(next);
  return next;
}
