/**
 * Draft rows for an import batch awaiting preview confirm (wireframes §9).
 * Separated from batch meta so raw file content is never re-stored as a file —
 * only parsed candidate drafts until commit or cancel.
 */

import type {
  CandidateConfidence,
  CandidateKind,
} from "./candidate-store.ts";
import type { ParsedCsvRow, UncertainCsvField } from "./parse-csv.ts";

export const IMPORT_DRAFT_STORAGE_KEY = "moneyflow-import-drafts-v1";

export type ImportDraft = {
  batchId: string;
  rows: ParsedCsvRow[];
  updatedAt: string;
};

const CONFIDENCES: CandidateConfidence[] = ["high", "medium", "low"];
const KINDS: CandidateKind[] = ["expense", "income", "transfer"];
const UNCERTAIN: UncertainCsvField[] = ["amount", "merchant", "date", "kind"];

export function isParsedCsvRow(value: unknown): value is ParsedCsvRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<ParsedCsvRow>;
  return (
    typeof row.kind === "string" &&
    (KINDS as string[]).includes(row.kind) &&
    typeof row.amount === "number" &&
    Number.isSafeInteger(row.amount) &&
    row.amount > 0 &&
    typeof row.merchant === "string" &&
    typeof row.note === "string" &&
    typeof row.occurredOn === "string" &&
    typeof row.confidence === "string" &&
    (CONFIDENCES as string[]).includes(row.confidence) &&
    Array.isArray(row.uncertainFields) &&
    row.uncertainFields.every(
      (f) => typeof f === "string" && (UNCERTAIN as string[]).includes(f),
    ) &&
    Array.isArray(row.explanations) &&
    row.explanations.every((e) => typeof e === "string") &&
    typeof row.rawSnippet === "string" &&
    typeof row.rowIndex === "number" &&
    Number.isSafeInteger(row.rowIndex)
  );
}

export function isImportDraft(value: unknown): value is ImportDraft {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ImportDraft>;
  return (
    typeof item.batchId === "string" &&
    item.batchId.length > 0 &&
    Array.isArray(item.rows) &&
    item.rows.every(isParsedCsvRow) &&
    typeof item.updatedAt === "string" &&
    Number.isFinite(Date.parse(item.updatedAt))
  );
}

function readAll(): Record<string, ImportDraft> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(IMPORT_DRAFT_STORAGE_KEY);
    if (saved === null) return {};
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      localStorage.removeItem(IMPORT_DRAFT_STORAGE_KEY);
      return {};
    }
    const out: Record<string, ImportDraft> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isImportDraft(value) && value.batchId === key) {
        out[key] = value;
      }
    }
    return out;
  } catch {
    try {
      localStorage.removeItem(IMPORT_DRAFT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return {};
  }
}

function writeAll(map: Record<string, ImportDraft>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(IMPORT_DRAFT_STORAGE_KEY, JSON.stringify(map));
}

export function writeImportDraft(
  batchId: string,
  rows: ParsedCsvRow[],
  updatedAt = new Date().toISOString(),
): ImportDraft {
  const draft: ImportDraft = {
    batchId,
    rows: rows.map((r) => ({ ...r, uncertainFields: [...r.uncertainFields], explanations: [...r.explanations] })),
    updatedAt,
  };
  const map = readAll();
  map[batchId] = draft;
  writeAll(map);
  return draft;
}

export function readImportDraft(batchId: string): ImportDraft | null {
  if (!batchId) return null;
  return readAll()[batchId] ?? null;
}

export function removeImportDraft(batchId: string): void {
  if (!batchId) return;
  const map = readAll();
  if (!(batchId in map)) return;
  delete map[batchId];
  writeAll(map);
}

/** Pure helper: first N rows for preview table. */
export function previewDraftRows(
  rows: ParsedCsvRow[],
  limit = 10,
): ParsedCsvRow[] {
  if (limit <= 0) return [];
  return rows.slice(0, limit);
}

/** Pure summary line for import preview (wireframes §9). */
export function formatImportPreviewSummary(input: {
  rowCount: number;
  warningCount: number;
  skippedRows: number;
  possibleDuplicateCount?: number;
}): string {
  const parts = [`${input.rowCount} dòng`];
  if (input.warningCount > 0) {
    parts.push(`${input.warningCount} ⚠`);
  }
  if ((input.possibleDuplicateCount ?? 0) > 0) {
    parts.push(`${input.possibleDuplicateCount} có thể trùng`);
  }
  if (input.skippedRows > 0) {
    parts.push(`bỏ qua ${input.skippedRows}`);
  }
  return parts.join(" · ");
}

/** Label for a mapped column index. */
export function columnHeaderLabel(
  headers: string[],
  index: number | null,
): string {
  if (index === null || index < 0) return "—";
  const label = headers[index]?.trim();
  if (label) return label;
  return `Cột ${index + 1}`;
}
