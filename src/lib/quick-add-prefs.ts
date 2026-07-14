/**
 * Quick Add preferences (wireframes-inbox §7).
 * Remember last kind / account / category + keep-open for rapid entry.
 */

import type { TransactionKind } from "@/lib/sample-data";

export const QUICK_ADD_PREFS_KEY = "moneyflow-quick-add-prefs-v1";

export type QuickAddPrefs = {
  kind: TransactionKind;
  accountId: string;
  categoryId: string;
  keepOpen: boolean;
};

const KINDS: TransactionKind[] = ["expense", "income"];

export function isQuickAddPrefs(value: unknown): value is QuickAddPrefs {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<QuickAddPrefs>;
  return (
    typeof item.kind === "string" &&
    (KINDS as string[]).includes(item.kind) &&
    typeof item.accountId === "string" &&
    typeof item.categoryId === "string" &&
    typeof item.keepOpen === "boolean"
  );
}

export function defaultQuickAddPrefs(): QuickAddPrefs {
  return {
    kind: "expense",
    accountId: "",
    categoryId: "",
    keepOpen: false,
  };
}

export function readQuickAddPrefs(): QuickAddPrefs {
  if (typeof window === "undefined") return defaultQuickAddPrefs();
  try {
    const raw = window.localStorage.getItem(QUICK_ADD_PREFS_KEY);
    if (!raw) return defaultQuickAddPrefs();
    const parsed: unknown = JSON.parse(raw);
    if (!isQuickAddPrefs(parsed)) {
      window.localStorage.removeItem(QUICK_ADD_PREFS_KEY);
      return defaultQuickAddPrefs();
    }
    return parsed;
  } catch {
    try {
      window.localStorage.removeItem(QUICK_ADD_PREFS_KEY);
    } catch {
      /* ignore */
    }
    return defaultQuickAddPrefs();
  }
}

export function writeQuickAddPrefs(prefs: QuickAddPrefs): void {
  if (typeof window === "undefined") return;
  if (!isQuickAddPrefs(prefs)) return;
  window.localStorage.setItem(QUICK_ADD_PREFS_KEY, JSON.stringify(prefs));
}

/** Today in Asia/Ho_Chi_Minh as YYYY-MM-DD. */
export function todayInVietnam(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
