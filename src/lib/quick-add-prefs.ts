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
  /** Most recent category ids for this kind (expense/income), newest first. */
  recentCategoryIds?: string[];
};

const KINDS: TransactionKind[] = ["expense", "income"];

export function isQuickAddPrefs(value: unknown): value is QuickAddPrefs {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<QuickAddPrefs>;
  if (
    typeof item.kind !== "string" ||
    !(KINDS as string[]).includes(item.kind) ||
    typeof item.accountId !== "string" ||
    typeof item.categoryId !== "string" ||
    typeof item.keepOpen !== "boolean"
  ) {
    return false;
  }
  if (item.recentCategoryIds !== undefined) {
    if (!Array.isArray(item.recentCategoryIds)) return false;
    if (!item.recentCategoryIds.every((id) => typeof id === "string")) return false;
  }
  return true;
}

/** Push category to front of recent list (max 6). */
export function pushRecentCategoryId(
  recent: string[] | undefined,
  categoryId: string,
  max = 6,
): string[] {
  const next = [categoryId, ...(recent ?? []).filter((id) => id !== categoryId)];
  return next.slice(0, max);
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

/** Order categories with recent ids first (best-of Ivy recent chips). */
export function orderCategoriesByRecent<T extends { id: string }>(
  categories: T[],
  recentIds: string[] | undefined,
): T[] {
  if (!recentIds?.length) return categories;
  const rank = new Map(recentIds.map((id, index) => [id, index]));
  return [...categories].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id)! : 999;
    const rb = rank.has(b.id) ? rank.get(b.id)! : 999;
    return ra - rb;
  });
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
