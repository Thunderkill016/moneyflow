/**
 * Dismissed recurring-pattern suggestions (client-local).
 *
 * Stores pattern keys only — a pattern that re-qualifies after dismissal stays
 * dismissed because the key hashes `expense|<normalized note>` and ignores the
 * amounts that moved inside the tolerance.
 */

export const RECURRING_DISMISSALS_STORAGE_KEY =
  "moneyflow-recurring-dismissals-v1";

const KEY_SHAPE = /^[0-9a-f]{8}$/;

export function isRecurringDismissalList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && KEY_SHAPE.test(item))
  );
}

export function readRecurringDismissals(
  storage: Pick<Storage, "getItem" | "removeItem"> | null = typeof window !==
    "undefined"
    ? window.localStorage
    : null,
): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(RECURRING_DISMISSALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isRecurringDismissalList(parsed)) {
      storage.removeItem(RECURRING_DISMISSALS_STORAGE_KEY);
      return [];
    }
    return parsed;
  } catch {
    try {
      storage.removeItem(RECURRING_DISMISSALS_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return [];
  }
}

/**
 * Record a dismissal. Returns the stored list (sorted, deduped) so callers can
 * sync state from the write result.
 */
export function dismissRecurringPattern(
  key: string,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null =
    typeof window !== "undefined" ? window.localStorage : null,
): string[] {
  const current = readRecurringDismissals(storage);
  if (!storage || !KEY_SHAPE.test(key) || current.includes(key)) {
    return current;
  }
  const next = [...current, key].sort();
  storage.setItem(RECURRING_DISMISSALS_STORAGE_KEY, JSON.stringify(next));
  return next;
}
