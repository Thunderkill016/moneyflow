/**
 * Quick Add preferences (wireframes-inbox §7).
 * Remember last kind / account / category + keep-open for rapid entry.
 */

import type { TransactionKind } from "@/lib/sample-data";

export const QUICK_ADD_PREFS_KEY = "moneyflow-quick-add-prefs-v1";

export type QuickAddPreset = {
  kind: TransactionKind;
  accountId: string;
  categoryId: string;
};

export type QuickAddPrefs = {
  kind: TransactionKind;
  accountId: string;
  categoryId: string;
  keepOpen: boolean;
  /** Most recent category ids for this kind (expense/income), newest first. */
  recentCategoryIds?: string[];
  /**
   * Successful quick-capture account/category pairs, newest first.
   * Keeping the pair together avoids inventing a combination from two
   * independent "last used" values when the user switches account contexts.
   */
  recentPresets?: QuickAddPreset[];
};

const KINDS: TransactionKind[] = ["expense", "income"];

function isQuickAddPreset(value: unknown): value is QuickAddPreset {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<QuickAddPreset>;
  return (
    typeof item.kind === "string" &&
    (KINDS as string[]).includes(item.kind) &&
    typeof item.accountId === "string" &&
    item.accountId.length > 0 &&
    typeof item.categoryId === "string" &&
    item.categoryId.length > 0
  );
}

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
  if (item.recentPresets !== undefined) {
    if (!Array.isArray(item.recentPresets)) return false;
    if (!item.recentPresets.every(isQuickAddPreset)) return false;
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

/**
 * Remember successful account/category pairs as one coherent preset.
 * Dedupe exact pairs while keeping newest-first order.
 */
export function pushRecentPreset(
  recent: QuickAddPreset[] | undefined,
  preset: QuickAddPreset,
  max = 6,
): QuickAddPreset[] {
  const next = [
    preset,
    ...(recent ?? []).filter(
      (item) =>
        item.kind !== preset.kind ||
        item.accountId !== preset.accountId ||
        item.categoryId !== preset.categoryId,
    ),
  ];
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
    const ra = rank.has(a.id) ? rank.get(a.id)! : Number.POSITIVE_INFINITY;
    const rb = rank.has(b.id) ? rank.get(b.id)! : Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    // Stable among non-recent: keep original relative order
    return categories.indexOf(a) - categories.indexOf(b);
  });
}

/** Whether id is in the recent list (for "Gần đây" chip styling). */
export function isRecentCategoryId(
  categoryId: string,
  recentIds: string[] | undefined,
): boolean {
  if (!recentIds?.length) return false;
  return recentIds.includes(categoryId);
}

/**
 * Pick category when opening dialog / switching kind (Ivy-style).
 * preferred → first recent still available → first in list.
 */
export function pickCategoryForKind<T extends { id: string }>(
  categories: T[],
  recentIds: string[] | undefined,
  preferredId?: string,
): string {
  if (!categories.length) return "";
  if (preferredId && categories.some((item) => item.id === preferredId)) {
    return preferredId;
  }
  if (recentIds?.length) {
    for (const id of recentIds) {
      if (categories.some((item) => item.id === id)) return id;
    }
  }
  return categories[0]!.id;
}

// `todayInVietnam` moved to ./vietnam-date.ts. It decides which calendar day a
// transaction belongs to, which is a financial rule and not a quick-add
// preference; it also had five other copies elsewhere in the codebase.
