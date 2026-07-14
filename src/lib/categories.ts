import type { TransactionKind } from "@/lib/sample-data";

export type CategorySummary = {
  id: string;
  name: string;
  kind: TransactionKind;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  isArchived: boolean;
};

export type SaveCategoryInput = {
  id?: string;
  name: string;
  kind: TransactionKind;
  icon?: string | null;
  color?: string | null;
};

export const categoryKindLabels: Record<TransactionKind, string> = {
  expense: "Chi tiêu",
  income: "Thu nhập",
};

export const CATEGORY_NAME_MAX = 60;

/** Trim + collapse internal whitespace. */
export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function isValidCategoryName(name: string): boolean {
  const normalized = normalizeCategoryName(name);
  return normalized.length >= 1 && normalized.length <= CATEGORY_NAME_MAX;
}

/**
 * Name must be unique per kind (matches DB unique (user_id, name, kind)).
 * Comparison is case-sensitive after normalize, same as Postgres unique text.
 */
export function isCategoryNameUnique(
  name: string,
  kind: TransactionKind,
  categories: ReadonlyArray<Pick<CategorySummary, "id" | "name" | "kind">>,
  excludeId?: string,
): boolean {
  const normalized = normalizeCategoryName(name);
  if (!normalized) return false;
  return !categories.some(
    (item) =>
      item.kind === kind &&
      item.id !== excludeId &&
      normalizeCategoryName(item.name) === normalized,
  );
}

export function validateSaveCategory(
  input: SaveCategoryInput,
  categories: ReadonlyArray<Pick<CategorySummary, "id" | "name" | "kind">>,
): { ok: true; name: string; kind: TransactionKind } | { ok: false; message: string } {
  if (input.kind !== "expense" && input.kind !== "income") {
    return { ok: false, message: "Loại danh mục chưa hợp lệ." };
  }
  const name = normalizeCategoryName(input.name);
  if (!isValidCategoryName(name)) {
    return {
      ok: false,
      message: `Tên danh mục cần từ 1 đến ${CATEGORY_NAME_MAX} ký tự.`,
    };
  }
  if (!isCategoryNameUnique(name, input.kind, categories, input.id)) {
    return {
      ok: false,
      message:
        input.kind === "expense"
          ? "Đã có danh mục chi tiêu cùng tên."
          : "Đã có danh mục thu nhập cùng tên.",
    };
  }
  return { ok: true, name, kind: input.kind };
}

/** Active (non-archived) categories for pickers / budgets. */
export function activeCategories<T extends { isArchived: boolean }>(
  categories: readonly T[],
): T[] {
  return categories.filter((item) => !item.isArchived);
}

export function defaultCategoryMeta(kind: TransactionKind): {
  icon: string;
  color: string;
} {
  return kind === "income"
    ? { icon: "wallet", color: "green" }
    : { icon: "spark", color: "violet" };
}
