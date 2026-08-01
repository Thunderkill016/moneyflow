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
    id: input.id ?? `imp-${crypto.randomUUID()}`,
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

export function getStoredImportBatch(id: string): ImportBatch | null {
  if (!id) return null;
  return readStoredImportBatches().find((item) => item.id === id) ?? null;
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

export function markImportBatchCancelled(id: string): ImportBatch | null {
  const list = readStoredImportBatches();
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const current = list[index]!;
  if (current.status === "committed") return current;
  const updated: ImportBatch = {
    ...current,
    status: "cancelled",
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

/** Status label for import preview / history UI (Vietnamese). */
export function importBatchStatusLabel(status: ImportBatchStatus): string {
  if (status === "parsed") return "Chờ xác nhận";
  if (status === "committed") return "Đã vào Inbox";
  return "Đã hủy";
}

/** Source badge for import history list (Vietnamese-friendly). */
export function importBatchSourceLabel(source: ImportBatchSource): string {
  if (source === "csv") return "CSV";
  if (source === "xlsx") return "Excel";
  if (source === "pdf") return "PDF";
  return "Dán text";
}

/** Short date for history rows, e.g. 14/07 (local timezone). */
export function formatImportBatchDateShort(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  const d = new Date(ms);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

/**
 * Stats line for history: "120 dòng · 4 lỗi" (wireframes §15).
 * Cancelled batches show status only.
 */
export function formatImportBatchStats(
  batch: Pick<
    ImportBatch,
    "rowCount" | "warningCount" | "skippedRows" | "status"
  >,
): string {
  if (batch.status === "cancelled") return "Đã hủy";
  const parts = [`${batch.rowCount} dòng`, `${batch.warningCount} lỗi`];
  if (batch.skippedRows > 0) {
    parts.push(`bỏ ${batch.skippedRows}`);
  }
  return parts.join(" · ");
}

/** Newest first by createdAt (stable for equal timestamps). */
export function sortImportBatchesNewestFirst(
  batches: ImportBatch[],
): ImportBatch[] {
  return [...batches].sort((a, b) => {
    const diff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (diff !== 0) return diff;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}
