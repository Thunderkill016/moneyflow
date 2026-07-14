/**
 * Split one expense across 2+ categories (ledger multi-entry).
 * Amounts are integer minor units (VND đồng). Lines must sum to the total.
 */

import type {
  AccountOption,
  CategoryOption,
  CreateSplitExpenseInput,
  Transaction,
  TransactionSplitLine,
} from "./sample-data.ts";

export type { CreateSplitExpenseInput };

export const SPLIT_MIN_LINES = 2;
export const SPLIT_MAX_LINES = 12;

export type SplitLineInput = {
  categoryId: string;
  amount: number;
};

export type SplitLine = TransactionSplitLine;

export type SplitValidationError =
  | "too_few_lines"
  | "too_many_lines"
  | "invalid_amount"
  | "duplicate_category"
  | "empty_category"
  | "unsafe_total"
  | "zero_total";

export type SplitValidationResult =
  | { ok: true; total: number; lines: SplitLineInput[] }
  | { ok: false; error: SplitValidationError };

/** Normalize & validate split lines (integer minor units only). */
export function validateSplitLines(lines: SplitLineInput[]): SplitValidationResult {
  if (!Array.isArray(lines) || lines.length < SPLIT_MIN_LINES) {
    return { ok: false, error: "too_few_lines" };
  }
  if (lines.length > SPLIT_MAX_LINES) {
    return { ok: false, error: "too_many_lines" };
  }

  const seen = new Set<string>();
  const normalized: SplitLineInput[] = [];
  let total = 0;

  for (const line of lines) {
    if (!line || typeof line.categoryId !== "string" || !line.categoryId.trim()) {
      return { ok: false, error: "empty_category" };
    }
    const categoryId = line.categoryId.trim();
    if (seen.has(categoryId)) {
      return { ok: false, error: "duplicate_category" };
    }
    seen.add(categoryId);

    const amount = line.amount;
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return { ok: false, error: "invalid_amount" };
    }

    const next = total + amount;
    if (!Number.isSafeInteger(next)) {
      return { ok: false, error: "unsafe_total" };
    }
    total = next;
    normalized.push({ categoryId, amount });
  }

  if (total <= 0) {
    return { ok: false, error: "zero_total" };
  }

  return { ok: true, total, lines: normalized };
}

export function splitValidationMessage(error: SplitValidationError): string {
  switch (error) {
    case "too_few_lines":
      return "Cần ít nhất 2 danh mục để chia khoản chi.";
    case "too_many_lines":
      return `Tối đa ${SPLIT_MAX_LINES} dòng chia.`;
    case "invalid_amount":
      return "Mỗi dòng cần số tiền nguyên dương (đồng).";
    case "duplicate_category":
      return "Mỗi danh mục chỉ được chọn một lần.";
    case "empty_category":
      return "Chọn danh mục cho mọi dòng chia.";
    case "unsafe_total":
      return "Tổng số tiền quá lớn.";
    case "zero_total":
      return "Tổng chia phải lớn hơn 0.";
    default:
      return "Thông tin chia khoản chi chưa hợp lệ.";
  }
}

/** Category label for a multi-line split expense. */
export function splitCategoryLabel(lineCount: number): string {
  const n = Math.max(SPLIT_MIN_LINES, lineCount);
  return `Chia · ${n} danh mục`;
}

/**
 * Expense amounts by category name.
 * Expands multi-entry splits so reports/budgets-style rollups stay correct.
 * Transfers and income return empty.
 */
export function expenseCategoryAmounts(
  transaction: Transaction,
): { name: string; amount: number }[] {
  if (transaction.kind !== "expense") return [];
  if (transaction.splits && transaction.splits.length >= SPLIT_MIN_LINES) {
    return transaction.splits
      .filter(
        (line) =>
          typeof line.category === "string" &&
          line.category.length > 0 &&
          Number.isSafeInteger(line.amount) &&
          line.amount > 0,
      )
      .map((line) => ({ name: line.category, amount: line.amount }));
  }
  if (!transaction.category || !Number.isSafeInteger(transaction.amount) || transaction.amount <= 0) {
    return [];
  }
  return [{ name: transaction.category, amount: transaction.amount }];
}

export function isSplitExpense(transaction: Transaction): boolean {
  return (
    transaction.kind === "expense" &&
    Array.isArray(transaction.splits) &&
    transaction.splits.length >= SPLIT_MIN_LINES
  );
}

export function sumSplitAmounts(lines: { amount: number }[]): number {
  let total = 0;
  for (const line of lines) {
    if (!Number.isSafeInteger(line.amount) || line.amount <= 0) return 0;
    const next = total + line.amount;
    if (!Number.isSafeInteger(next)) return 0;
    total = next;
  }
  return total;
}

/**
 * Build a demo/local ledger row for a split expense (one transaction, multi category).
 * Caller must pass expense categories only.
 */
export function buildSplitExpenseTransaction(options: {
  id: string;
  input: CreateSplitExpenseInput;
  account: AccountOption;
  categories: CategoryOption[];
  occurredAt?: string;
  relativeDate?: string;
}): { ok: true; transaction: Transaction } | { ok: false; message: string } {
  const validated = validateSplitLines(options.input.lines);
  if (!validated.ok) {
    return { ok: false, message: splitValidationMessage(validated.error) };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.input.occurredOn)) {
    return { ok: false, message: "Chọn ngày giao dịch hợp lệ." };
  }

  if (options.account.id !== options.input.accountId) {
    return { ok: false, message: "Tài khoản chưa hợp lệ." };
  }

  const byId = new Map(options.categories.map((c) => [c.id, c]));
  const resolved: SplitLine[] = [];

  for (const line of validated.lines) {
    const cat = byId.get(line.categoryId);
    if (!cat || cat.kind !== "expense") {
      return { ok: false, message: "Chỉ chia sang danh mục chi tiêu." };
    }
    resolved.push({
      categoryId: cat.id,
      category: cat.name,
      amount: line.amount,
    });
  }

  const note =
    options.input.note.trim() ||
    resolved.map((l) => l.category).join(" · ") ||
    "Khoản chi chia danh mục";

  const transaction: Transaction = {
    id: options.id,
    kind: "expense",
    categoryId: resolved[0]!.categoryId,
    category: splitCategoryLabel(resolved.length),
    note,
    accountId: options.account.id,
    account: options.account.name,
    amount: validated.total,
    occurredOn: options.input.occurredOn,
    occurredAt: options.occurredAt ?? new Date().toISOString(),
    relativeDate: options.relativeDate ?? "Vừa xong",
    splits: resolved,
  };

  return { ok: true, transaction };
}

export function isSplitLine(value: unknown): value is SplitLine {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SplitLine>;
  return (
    typeof item.categoryId === "string" &&
    item.categoryId.length > 0 &&
    typeof item.category === "string" &&
    item.category.length > 0 &&
    typeof item.amount === "number" &&
    Number.isSafeInteger(item.amount) &&
    item.amount > 0
  );
}
