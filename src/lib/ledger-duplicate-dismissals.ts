/**
 * Dismissed ledger-duplicate suggestions (client-local).
 *
 * Stores pattern keys only — a duplicate group whose key was dismissed stays
 * dismissed because the key hashes `account|kind|amount|desc` and ignores the
 * member rows inside the group. Dismissing therefore means "this exact
 * combination is a known repeat", not "these rows are fine": a genuinely new
 * duplicate of a dismissed combination stays suppressed, the same trade-off
 * `planning/recurring-dismissals.ts` documents for pattern keys.
 */

export const LEDGER_DUPE_DISMISSALS_STORAGE_KEY =
  "moneyflow-ledger-dupe-dismissals-v1";

const KEY_SHAPE = /^[0-9a-f]{8}$/;

export function isLedgerDupeDismissalList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && KEY_SHAPE.test(item))
  );
}

export function readLedgerDupeDismissals(
  storage: Pick<Storage, "getItem" | "removeItem"> | null = typeof window !==
    "undefined"
    ? window.localStorage
    : null,
): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(LEDGER_DUPE_DISMISSALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isLedgerDupeDismissalList(parsed)) {
      storage.removeItem(LEDGER_DUPE_DISMISSALS_STORAGE_KEY);
      return [];
    }
    return parsed;
  } catch {
    try {
      storage.removeItem(LEDGER_DUPE_DISMISSALS_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return [];
  }
}

/**
 * Record one or more dismissals. Returns the stored list (sorted, deduped) so
 * callers can sync state from the write result.
 */
export function dismissLedgerDupePatterns(
  keys: string | readonly string[],
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null =
    typeof window !== "undefined" ? window.localStorage : null,
): string[] {
  const current = readLedgerDupeDismissals(storage);
  const additions = [...new Set(Array.isArray(keys) ? keys : [keys])].filter(
    (key) => KEY_SHAPE.test(key) && !current.includes(key),
  );
  if (!storage || additions.length === 0) {
    return current;
  }
  const next = [...current, ...additions].sort();
  storage.setItem(LEDGER_DUPE_DISMISSALS_STORAGE_KEY, JSON.stringify(next));
  return next;
}
