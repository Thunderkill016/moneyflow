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

export type SaveTransactionFilterResult =
  | { ok: true; filters: SavedTransactionFilter[] }
  | { ok: false; reason: "empty_name" | "limit"; filters: SavedTransactionFilter[] };

const KINDS = new Set(["all", "expense", "income", "transfer"]);
const REVIEWS = new Set(["all", "needs_review", "reviewed"]);

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

export function readSavedTransactionFilters(
  storage: Pick<Storage, "getItem" | "removeItem"> | null = typeof window !==
    "undefined"
    ? window.localStorage
    : null,
): SavedTransactionFilter[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(SAVED_TRANSACTION_FILTERS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      storage.removeItem(SAVED_TRANSACTION_FILTERS_KEY);
      return [];
    }
    // One bad entry must not kill the rest of the user's presets: valid
    // entries survive, malformed ones are silently dropped at read time.
    // The key is only removed when nothing valid remains.
    const valid = parsed.filter(isValidEntry);
    if (valid.length === 0) {
      storage.removeItem(SAVED_TRANSACTION_FILTERS_KEY);
    }
    return valid;
  } catch {
    try {
      storage.removeItem(SAVED_TRANSACTION_FILTERS_KEY);
    } catch {
      /* ignore */
    }
    return [];
  }
}

export function saveTransactionFilter(
  name: string,
  values: TransactionFilterValues,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null =
    typeof window !== "undefined" ? window.localStorage : null,
): SaveTransactionFilterResult {
  const current = readSavedTransactionFilters(storage);
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
  storage?.setItem(SAVED_TRANSACTION_FILTERS_KEY, JSON.stringify(next));
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
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null =
    typeof window !== "undefined" ? window.localStorage : null,
): SavedTransactionFilter[] {
  const next = readSavedTransactionFilters(storage).filter(
    (f) => f.name !== name,
  );
  storage?.setItem(SAVED_TRANSACTION_FILTERS_KEY, JSON.stringify(next));
  return next;
}
