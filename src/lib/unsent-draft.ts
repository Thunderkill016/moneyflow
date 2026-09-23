/**
 * Unsent capture draft (resilience audit — failed save retention).
 *
 * When a save fails, the add-transaction dialog already keeps the typed input
 * in component state — but only while it stays mounted. Closing the tab or
 * navigating away threw that work away. This store writes the failed draft to
 * localStorage so the next mount can offer it back.
 *
 * This is draft retention, not an offline write queue: nothing here retries,
 * syncs or sends anything on its own. The draft only reappears as form input
 * the reader can still edit or discard, and a successful save clears it.
 *
 * Fail-closed like every MoneyFlow local store: a malformed or unreadable
 * value is dropped rather than trusted, and a storage write failure never
 * breaks the error path it was trying to protect.
 */

import type { TransactionKind } from "./transactions/contracts.ts";

export const UNSENT_DRAFT_STORAGE_KEY = "moneyflow-unsent-draft-v1";

/**
 * The failed capture form, as submitted. `amount` is integer đồng (the parsed
 * field value), `note`/`payee` the trimmed submitted text, `occurredOn` a
 * YYYY-MM-DD ledger day and `savedAt` the ISO timestamp of the failed attempt.
 */
export type UnsentCaptureDraft = {
  kind: TransactionKind;
  amount: number;
  note: string;
  payee: string;
  categoryId: string;
  accountId: string;
  occurredOn: string;
  savedAt: string;
};

const KINDS: TransactionKind[] = ["expense", "income"];
/* Same ceilings as the fields the draft was typed into. */
const PAYEE_MAX_LENGTH = 200;
const NOTE_MAX_LENGTH = 500;
/* ids are opaque strings; bounded so hostile payloads fail closed. */
const ID_MAX_LENGTH = 200;
const OCCURRED_ON_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isUnsentCaptureDraft(
  value: unknown,
): value is UnsentCaptureDraft {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<UnsentCaptureDraft>;
  return (
    typeof item.kind === "string" &&
    (KINDS as string[]).includes(item.kind) &&
    typeof item.amount === "number" &&
    Number.isSafeInteger(item.amount) &&
    item.amount > 0 &&
    typeof item.note === "string" &&
    item.note.length <= NOTE_MAX_LENGTH &&
    typeof item.payee === "string" &&
    item.payee.length <= PAYEE_MAX_LENGTH &&
    typeof item.categoryId === "string" &&
    item.categoryId.length > 0 &&
    item.categoryId.length <= ID_MAX_LENGTH &&
    typeof item.accountId === "string" &&
    item.accountId.length > 0 &&
    item.accountId.length <= ID_MAX_LENGTH &&
    typeof item.occurredOn === "string" &&
    OCCURRED_ON_PATTERN.test(item.occurredOn) &&
    typeof item.savedAt === "string" &&
    Number.isFinite(Date.parse(item.savedAt))
  );
}

function defaultStorage() {
  return typeof window !== "undefined" ? window.localStorage : null;
}

/**
 * The retained draft, or null when none exists or the stored value fails
 * validation. A bad value is removed so one corrupt write cannot pin an
 * unusable draft in front of every future capture.
 */
export function readUnsentCaptureDraft(
  storage: Pick<Storage, "getItem" | "removeItem"> | null = defaultStorage(),
): UnsentCaptureDraft | null {
  if (!storage) return null;
  try {
    const saved = storage.getItem(UNSENT_DRAFT_STORAGE_KEY);
    if (!saved) return null;
    const parsed: unknown = JSON.parse(saved);
    if (!isUnsentCaptureDraft(parsed)) {
      storage.removeItem(UNSENT_DRAFT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    try {
      storage.removeItem(UNSENT_DRAFT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

/**
 * Retain a failed capture. Invalid input and storage failure both no-op —
 * keeping the draft is best-effort and must never fault the save-failure
 * path that calls it.
 */
export function writeUnsentCaptureDraft(
  draft: UnsentCaptureDraft,
  storage: Pick<Storage, "setItem"> | null = defaultStorage(),
): void {
  if (!storage || !isUnsentCaptureDraft(draft)) return;
  try {
    storage.setItem(UNSENT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* storage full or blocked — the in-memory form still holds the input */
  }
}

export function clearUnsentCaptureDraft(
  storage: Pick<Storage, "removeItem"> | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(UNSENT_DRAFT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
