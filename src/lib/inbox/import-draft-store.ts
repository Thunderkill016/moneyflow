/**
 * Draft rows for an import batch awaiting preview confirm (wireframes §9).
 * The original file is never persisted. Parsed rows are either session-only or
 * retained for a bounded period according to the user's privacy preference.
 */

import {
  rawRetentionMaxAgeMs,
  readPrivacyPrefs,
  type RawRetention,
} from "../privacy-prefs.ts";
import type {
  CandidateConfidence,
  CandidateKind,
} from "./candidate-store.ts";
import type { ParsedCsvRow, UncertainCsvField } from "./parse-csv.ts";
import type { SourceLifecycleState } from "./provenance.ts";

export const IMPORT_DRAFT_STORAGE_KEY = "moneyflow-import-drafts-v1";
export const IMPORT_SESSION_DRAFT_STORAGE_KEY =
  "moneyflow-import-drafts-session-v1";

export type ImportDraft = {
  batchId: string;
  rows: ParsedCsvRow[];
  updatedAt: string;
};

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const CONFIDENCES: CandidateConfidence[] = ["high", "medium", "low"];
const KINDS: CandidateKind[] = ["expense", "income", "transfer"];
const UNCERTAIN: UncertainCsvField[] = ["amount", "merchant", "date", "kind"];
const SOURCE_LIFECYCLE_STATES: SourceLifecycleState[] = [
  "pending",
  "posted",
  "removed",
];

function optionalBoundedString(
  value: unknown,
  maxLength: number,
): boolean {
  return (
    value === undefined ||
    (typeof value === "string" &&
      value.trim().length > 0 &&
      value.length <= maxLength)
  );
}

function validOptionalProvenance(row: Partial<ParsedCsvRow>): boolean {
  if (
    row.sourceRowIndex !== undefined &&
    (!Number.isSafeInteger(row.sourceRowIndex) || row.sourceRowIndex < 0)
  ) {
    return false;
  }
  if (!optionalBoundedString(row.sourceExternalId, 200)) return false;
  if (!optionalBoundedString(row.sourcePredecessorExternalId, 200)) return false;
  if (!optionalBoundedString(row.parserVersion, 80)) return false;
  if (
    row.mappingVersion !== undefined &&
    (!Number.isSafeInteger(row.mappingVersion) || row.mappingVersion < 1)
  ) {
    return false;
  }
  if (
    row.sourceLifecycleState !== undefined &&
    !(SOURCE_LIFECYCLE_STATES as string[]).includes(row.sourceLifecycleState)
  ) {
    return false;
  }
  if (
    (row.sourceLifecycleState !== undefined ||
      row.sourcePredecessorExternalId !== undefined) &&
    row.sourceExternalId === undefined
  ) {
    return false;
  }
  if (
    row.sourcePredecessorExternalId !== undefined &&
    row.sourcePredecessorExternalId.trim() === row.sourceExternalId?.trim()
  ) {
    return false;
  }
  return true;
}

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
    Number.isSafeInteger(row.rowIndex) &&
    row.rowIndex >= 0 &&
    validOptionalProvenance(row)
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

function browserStorage(kind: "local" | "session"): BrowserStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function readMap(
  storage: BrowserStorage | null,
  key: string,
): Record<string, ImportDraft> {
  if (!storage) return {};
  try {
    const saved = storage.getItem(key);
    if (saved === null) return {};
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      storage.removeItem(key);
      return {};
    }

    const out: Record<string, ImportDraft> = {};
    for (const [entryKey, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (isImportDraft(value) && value.batchId === entryKey) {
        out[entryKey] = value;
      }
    }
    return out;
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      /* ignore */
    }
    return {};
  }
}

function writeMap(
  storage: BrowserStorage | null,
  key: string,
  map: Record<string, ImportDraft>,
): void {
  if (!storage) throw new Error("import_draft_storage_unavailable");
  if (Object.keys(map).length === 0) {
    storage.removeItem(key);
    return;
  }
  storage.setItem(key, JSON.stringify(map));
}

/**
 * Remove invalid or expired persistent drafts. `delete_now` means persistent
 * storage must be empty; sessionStorage is handled separately.
 */
export function pruneImportDraftMap(
  map: Record<string, ImportDraft>,
  retention: RawRetention,
  now: Date = new Date(),
): Record<string, ImportDraft> {
  const maxAgeMs = rawRetentionMaxAgeMs(retention);
  if (maxAgeMs === null) return {};

  const cutoff = now.getTime() - maxAgeMs;
  const out: Record<string, ImportDraft> = {};
  for (const [key, draft] of Object.entries(map)) {
    if (!isImportDraft(draft) || draft.batchId !== key) continue;
    const updatedAt = Date.parse(draft.updatedAt);
    if (!Number.isFinite(updatedAt) || updatedAt < cutoff) continue;
    out[key] = draft;
  }
  return out;
}

function readPersistentDrafts(now: Date = new Date()): Record<string, ImportDraft> {
  const storage = browserStorage("local");
  const map = readMap(storage, IMPORT_DRAFT_STORAGE_KEY);
  const retention = readPrivacyPrefs().rawRetention;
  const pruned = pruneImportDraftMap(map, retention, now);

  if (storage && JSON.stringify(pruned) !== JSON.stringify(map)) {
    writeMap(storage, IMPORT_DRAFT_STORAGE_KEY, pruned);
  }
  return pruned;
}

function readSessionDrafts(): Record<string, ImportDraft> {
  return readMap(
    browserStorage("session"),
    IMPORT_SESSION_DRAFT_STORAGE_KEY,
  );
}

function readAll(): Record<string, ImportDraft> {
  return {
    ...readPersistentDrafts(),
    ...readSessionDrafts(),
  };
}

export function writeImportDraft(
  batchId: string,
  rows: ParsedCsvRow[],
  updatedAt = new Date().toISOString(),
): ImportDraft {
  const draft: ImportDraft = {
    batchId,
    rows: rows.map((row) => ({
      ...row,
      uncertainFields: [...row.uncertainFields],
      explanations: [...row.explanations],
    })),
    updatedAt,
  };

  const retention = readPrivacyPrefs().rawRetention;
  const localStorage = browserStorage("local");
  const sessionStorage = browserStorage("session");
  const persistent = readPersistentDrafts();
  const session = readSessionDrafts();

  if (retention === "delete_now") {
    delete persistent[batchId];
    session[batchId] = draft;
    writeMap(localStorage, IMPORT_DRAFT_STORAGE_KEY, persistent);
    writeMap(sessionStorage, IMPORT_SESSION_DRAFT_STORAGE_KEY, session);
  } else {
    delete session[batchId];
    persistent[batchId] = draft;
    writeMap(sessionStorage, IMPORT_SESSION_DRAFT_STORAGE_KEY, session);
    writeMap(localStorage, IMPORT_DRAFT_STORAGE_KEY, persistent);
  }

  return draft;
}

export function readImportDraft(batchId: string): ImportDraft | null {
  if (!batchId) return null;
  return readAll()[batchId] ?? null;
}

export function removeImportDraft(batchId: string): void {
  if (!batchId) return;

  const localStorage = browserStorage("local");
  const sessionStorage = browserStorage("session");
  const persistent = readPersistentDrafts();
  const session = readSessionDrafts();
  let changedPersistent = false;
  let changedSession = false;

  if (batchId in persistent) {
    delete persistent[batchId];
    changedPersistent = true;
  }
  if (batchId in session) {
    delete session[batchId];
    changedSession = true;
  }

  if (changedPersistent) {
    writeMap(localStorage, IMPORT_DRAFT_STORAGE_KEY, persistent);
  }
  if (changedSession) {
    writeMap(sessionStorage, IMPORT_SESSION_DRAFT_STORAGE_KEY, session);
  }
}

export function previewDraftRows(
  rows: ParsedCsvRow[],
  limit = 10,
): ParsedCsvRow[] {
  if (limit <= 0) return [];
  return rows.slice(0, limit);
}

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

export function columnHeaderLabel(
  headers: string[],
  index: number | null,
): string {
  if (index === null || index < 0) return "—";
  const label = headers[index]?.trim();
  if (label) return label;
  return `Cột ${index + 1}`;
}
