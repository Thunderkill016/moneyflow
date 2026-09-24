/**
 * Named transaction-filter presets (client-local).
 *
 * A preset is a UI convenience — "give this exact filter combination a name so
 * it can be re-applied in one tap". It is not ledger data, so it lives in
 * localStorage in both modes, the same class as `ledger-duplicate-dismissals`.
 *
 * The preset name is the identity: saving again under the same name replaces
 * the stored values (an update), never duplicates. Names stay short and human;
 * the list is capped so the chip row stays a fast path, not a second registry.
 *
 * Storage is scoped per viewer: presets carry readable names, free-text
 * queries and account/category names, so an unscoped key would leak them to
 * the next person signing into the same browser. The caller passes a stable
 * viewer id (the Supabase sub, or "demo-user" in demo); scoped keys mean the
 * second viewer simply sees an empty list and cannot touch the first's.
 */

import type { TransactionFilterValues } from "./transaction-filters.ts";

export const SAVED_TRANSACTION_FILTERS_KEY =
  "moneyflow-saved-transaction-filters-v1";
export const SAVED_TRANSACTION_FILTERS_LIMIT = 8;
export const SAVED_TRANSACTION_FILTER_NAME_MAX = 40;

export type SavedTransactionFilter = {
  name: string;
  values: TransactionFilterValues;
};

export type SavedFilterStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
> | null;

export type SavedFilterWriteResult =
  | { ok: true; filters: SavedTransactionFilter[] }
  | {
      ok: false;
      reason: "empty_name" | "limit" | "storage";
      filters: SavedTransactionFilter[];
    };

const KINDS = new Set(["all", "expense", "income", "transfer"]);
const REVIEWS = new Set(["all", "needs_review", "reviewed"]);

/** The full storage key for one viewer's preset list. */
export function savedTransactionFiltersKey(scope: string): string {
  return `${SAVED_TRANSACTION_FILTERS_KEY}:${scope}`;
}

function isValidValues(value: unknown): value is TransactionFilterValues {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.query === "string" &&
    typeof v.kind === "string" &&
    KINDS.has(v.kind) &&
    typeof v.account === "string" &&
    typeof v.category === "string" &&
    typeof v.review === "string" &&
    REVIEWS.has(v.review) &&
    typeof v.fromDate === "string" &&
    typeof v.toDate === "string" &&
    typeof v.minAmountInput === "string" &&
    typeof v.maxAmountInput === "string"
  );
}

function isValidEntry(value: unknown): value is SavedTransactionFilter {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.name === "string" &&
    entry.name.trim().length > 0 &&
    entry.name.length <= SAVED_TRANSACTION_FILTER_NAME_MAX &&
    isValidValues(entry.values)
  );
}

function defaultStorage(): SavedFilterStorage {
  if (typeof window === "undefined") return null;
  try {
    // Browser policy can deny the getter itself (SecurityError) before any
    // getItem/setItem runs — treat it the same as "no storage available".
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSavedTransactionFilters(
  scope: string,
  storage: SavedFilterStorage = defaultStorage(),
): SavedTransactionFilter[] {
  if (!storage) return [];
  const key = savedTransactionFiltersKey(scope);
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      storage.removeItem(key);
      return [];
    }
    // One bad entry must not kill the rest of the user's presets: valid
    // entries survive, malformed ones are silently dropped at read time.
    // The key is only removed when nothing valid remains.
    const valid = parsed.filter(isValidEntry);
    if (valid.length === 0) {
      storage.removeItem(key);
    }
    return valid;
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      /* ignore */
    }
    return [];
  }
}

export function saveTransactionFilter(
  name: string,
  values: TransactionFilterValues,
  scope: string,
  storage: SavedFilterStorage = defaultStorage(),
): SavedFilterWriteResult {
  const current = readSavedTransactionFilters(scope, storage);
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > SAVED_TRANSACTION_FILTER_NAME_MAX) {
    return { ok: false, reason: "empty_name", filters: current };
  }
  const existing = current.findIndex((f) => f.name === trimmed);
  if (existing === -1 && current.length >= SAVED_TRANSACTION_FILTERS_LIMIT) {
    return { ok: false, reason: "limit", filters: current };
  }
  const entry: SavedTransactionFilter = {
    name: trimmed,
    values: { ...values, query: values.query.trim() },
  };
  const next =
    existing === -1
      ? [...current, entry]
      : current.map((f, i) => (i === existing ? entry : f));
  if (!storage) return { ok: false, reason: "storage", filters: current };
  try {
    storage.setItem(savedTransactionFiltersKey(scope), JSON.stringify(next));
  } catch {
    // Quota/private-mode denial: report it — never claim a write that did
    // not happen, and never let a convenience feature crash the ledger UI.
    return { ok: false, reason: "storage", filters: current };
  }
  return { ok: true, filters: next };
}

/**
 * Structural equality used to mark the preset currently in effect. Query is
 * compared trimmed because saveTransactionFilter trims it before persisting.
 */
export function sameSavedFilterValues(
  a: TransactionFilterValues,
  b: TransactionFilterValues,
): boolean {
  return (
    a.query.trim() === b.query.trim() &&
    a.kind === b.kind &&
    a.account === b.account &&
    a.category === b.category &&
    a.review === b.review &&
    a.fromDate === b.fromDate &&
    a.toDate === b.toDate &&
    a.minAmountInput === b.minAmountInput &&
    a.maxAmountInput === b.maxAmountInput
  );
}

export function deleteSavedTransactionFilter(
  name: string,
  scope: string,
  storage: SavedFilterStorage = defaultStorage(),
): SavedFilterWriteResult {
  const current = readSavedTransactionFilters(scope, storage);
  const next = current.filter((f) => f.name !== name);
  if (!storage) return { ok: false, reason: "storage", filters: current };
  try {
    storage.setItem(savedTransactionFiltersKey(scope), JSON.stringify(next));
  } catch {
    return { ok: false, reason: "storage", filters: current };
  }
  return { ok: true, filters: next };
}
