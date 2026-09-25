import type { TransactionKind } from "./contracts.ts";

export const categories = {
  expense: ["Ăn uống", "Di chuyển", "Mua sắm", "Nhà ở", "Hóa đơn", "Giải trí", "Sức khỏe", "Giáo dục"],
  income: ["Lương", "Thưởng", "Thu nhập khác"],
} satisfies Record<TransactionKind, string[]>;

export const CATEGORY_COLORS = [
  "amber",
  "blue",
  "coral",
  "cyan",
  "green",
  "pink",
  "red",
  "violet",
] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export function isCategoryColor(value: unknown): value is CategoryColor {
  return (CATEGORY_COLORS as readonly unknown[]).includes(value);
}

/*
 * Icons the picker offers today. The write path validates against this list,
 * so a name may only leave it when no stored row can still reference it.
 */
export const PICKABLE_CATEGORY_ICONS = [
  "bowl",
  "coffee",
  "car",
  "fuel",
  "bus",
  "bike",
  "parking",
  "bag",
  "shirt",
  "laundry",
  "home",
  "wifi",
  "phone",
  "receipt",
  "tax",
  "heart",
  "pill",
  "baby",
  "paw",
  "book",
  "study",
  "gym",
  "music",
  "film",
  "plane",
  "gift",
  "charity",
  "ticket",
  "briefcase",
  "piggy",
  "coins",
  "wallet",
  "bank",
  "spark",
] as const;

/*
 * Stored by schema seeds ("Thu nhập khác") before the picker existed —
 * renderable and writable so legacy rows stay editable, but not offered.
 * "arrows" is deliberately absent: it is the internal transfer glyph.
 */
export const LEGACY_CATEGORY_ICONS = ["plus"] as const;

export const CATEGORY_ICON_NAMES = [
  ...PICKABLE_CATEGORY_ICONS,
  ...LEGACY_CATEGORY_ICONS,
] as const;
export type CategoryIconName = (typeof CATEGORY_ICON_NAMES)[number];
export type PickableCategoryIcon = (typeof PICKABLE_CATEGORY_ICONS)[number];

export function isCategoryIconName(value: unknown): value is CategoryIconName {
  return (CATEGORY_ICON_NAMES as readonly unknown[]).includes(value);
}

export type CategoryPresentationMeta = { icon: string; color: CategoryColor };

/**
 * Resolve the visible identity of one category. A stored icon/color on the
 * user's own category row always wins over the name-keyed defaults — the icon
 * picked in the category dialog must be the icon shown everywhere else.
 * Unknown names degrade to the generic meta, never to a missing glyph; a stored
 * color outside the known palette degrades to the name-keyed default.
 */
export function resolveCategoryMeta(
  name: string,
  stored?: { icon?: string | null; color?: string | null } | null,
  fallback?: CategoryPresentationMeta,
): CategoryPresentationMeta {
  const named = categoryMeta[name] ?? fallback ?? categoryMeta["Thu nhập khác"];
  return {
    icon: stored?.icon ?? named.icon,
    color: isCategoryColor(stored?.color) ? stored.color : named.color,
  };
}

/**
 * Index is keyed `kind:name` — category names are only unique per kind, so a
 * user may legitimately hold "Quà tặng" as both an expense and an income
 * category with different identities.
 */
export type CategoryMetaIndex = ReadonlyMap<string, CategoryPresentationMeta>;

export function categoryMetaIndex(
  categories: readonly {
    name: string;
    kind: TransactionKind | string;
    icon: string | null;
    color: string | null;
  }[],
): CategoryMetaIndex {
  const index = new Map<string, CategoryPresentationMeta>();
  for (const category of categories) {
    index.set(
      `${category.kind}:${category.name}`,
      resolveCategoryMeta(category.name, category),
    );
  }
  return index;
}

/** Look a stored icon/color up by kind+name; falls back to the name-keyed
 * defaults for categories the index does not carry (e.g. the virtual
 * "Chuyển tiền" row or surfaces without a categories list). */
export function categoryMetaFor(
  index: CategoryMetaIndex | undefined,
  kind: TransactionKind | string,
  name: string,
  fallback?: CategoryPresentationMeta,
): CategoryPresentationMeta {
  return (
    index?.get(`${kind}:${name}`) ??
    categoryMeta[name] ??
    fallback ??
    categoryMeta["Thu nhập khác"]
  );
}

export const categoryMeta: Record<string, CategoryPresentationMeta> = {
  "Ăn uống": { icon: "bowl", color: "coral" },
  "Di chuyển": { icon: "car", color: "blue" },
  "Mua sắm": { icon: "bag", color: "violet" },
  "Nhà ở": { icon: "home", color: "amber" },
  "Hóa đơn": { icon: "receipt", color: "cyan" },
  "Giải trí": { icon: "spark", color: "pink" },
  "Sức khỏe": { icon: "heart", color: "red" },
  "Giáo dục": { icon: "book", color: "blue" },
  "Lương": { icon: "wallet", color: "green" },
  "Thưởng": { icon: "spark", color: "green" },
  "Thu nhập khác": { icon: "bank", color: "green" },
  "Chuyển tiền": { icon: "arrows", color: "blue" }
};
