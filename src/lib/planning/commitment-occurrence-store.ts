/**
 * Demo-mode persistence for commitment payment occurrences (month → commitment → txn).
 * Server path uses Supabase commitment_occurrences; demo only uses this + transaction-store.
 */

import {
  type CommitmentOccurrenceMap,
  applyOccurrenceMap,
  clearOccurrence,
  recordOccurrence,
  type RecurringCommitment,
} from "./commitments.ts";

export const COMMITMENT_OCCURRENCE_STORAGE_KEY =
  "moneyflow-demo-commitment-occurrences-v1";

function isOccurrenceMap(value: unknown): value is CommitmentOccurrenceMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  for (const [month, rows] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-01$/.test(month)) return false;
    if (!rows || typeof rows !== "object" || Array.isArray(rows)) return false;
    for (const [commitmentId, transactionId] of Object.entries(
      rows as Record<string, unknown>,
    )) {
      if (typeof commitmentId !== "string" || commitmentId.length === 0) return false;
      if (typeof transactionId !== "string" || transactionId.length === 0) return false;
    }
  }
  return true;
}

export function readOccurrenceMap(
  storage: Pick<Storage, "getItem" | "removeItem"> | null = typeof window !==
  "undefined"
    ? window.localStorage
    : null,
): CommitmentOccurrenceMap {
  if (!storage) return {};
  try {
    const raw = storage.getItem(COMMITMENT_OCCURRENCE_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!isOccurrenceMap(parsed)) {
      storage.removeItem(COMMITMENT_OCCURRENCE_STORAGE_KEY);
      return {};
    }
    return parsed;
  } catch {
    try {
      storage.removeItem(COMMITMENT_OCCURRENCE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return {};
  }
}

export function writeOccurrenceMap(
  map: CommitmentOccurrenceMap,
  storage: Pick<Storage, "setItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): void {
  if (!storage) return;
  storage.setItem(COMMITMENT_OCCURRENCE_STORAGE_KEY, JSON.stringify(map));
}

/** Hydrate commitments with demo paid state for a month. */
export function hydrateCommitmentsWithOccurrences(
  items: RecurringCommitment[],
  monthStart: string,
  storage: Pick<Storage, "getItem" | "removeItem"> | null = typeof window !==
  "undefined"
    ? window.localStorage
    : null,
): RecurringCommitment[] {
  const map = readOccurrenceMap(storage);
  if (!map[monthStart]) return items;
  // Once user has any occurrence row for the month, prefer map for listed ids only;
  // seed paid (e.g. demo rent) remains unless explicitly overwritten.
  return applyOccurrenceMap(items, monthStart, map);
}

export function persistPayOccurrence(
  monthStart: string,
  commitmentId: string,
  transactionId: string,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null = typeof window !==
  "undefined"
    ? window.localStorage
    : null,
): CommitmentOccurrenceMap {
  const next = recordOccurrence(
    readOccurrenceMap(storage),
    monthStart,
    commitmentId,
    transactionId,
  );
  writeOccurrenceMap(next, storage);
  return next;
}

export function persistUndoOccurrence(
  monthStart: string,
  commitmentId: string,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null = typeof window !==
  "undefined"
    ? window.localStorage
    : null,
): CommitmentOccurrenceMap {
  const next = clearOccurrence(readOccurrenceMap(storage), monthStart, commitmentId);
  writeOccurrenceMap(next, storage);
  return next;
}
