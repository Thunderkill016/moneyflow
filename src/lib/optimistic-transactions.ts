import type {
  AccountOption,
  CategoryOption,
  CreateTransactionInput,
  Transaction,
} from "@/lib/sample-data";

export const OPTIMISTIC_TRANSACTION_ID_PREFIX = "pending:";

export type OptimisticTransactionResult =
  | { ok: true; transaction: Transaction }
  | { ok: false; message: string };

/**
 * Builds a client-only transaction preview for the short period before the
 * server confirms the canonical row. The idempotency key keeps the temporary
 * row stable and lets the confirmed response replace it without duplication.
 */
export function buildOptimisticTransaction(
  input: CreateTransactionInput,
  accounts: AccountOption[],
  categories: CategoryOption[],
  now = new Date(),
): OptimisticTransactionResult {
  const account = accounts.find((item) => item.id === input.accountId);
  const category = categories.find((item) => item.id === input.categoryId);

  if (!account || !category || category.kind !== input.kind) {
    return { ok: false, message: "Tài khoản hoặc danh mục chưa hợp lệ." };
  }

  return {
    ok: true,
    transaction: {
      id: `${OPTIMISTIC_TRANSACTION_ID_PREFIX}${input.idempotencyKey}`,
      kind: input.kind,
      categoryId: category.id,
      category: category.name,
      note: input.note || category.name,
      accountId: account.id,
      account: account.name,
      amount: input.amount,
      occurredOn: input.occurredOn,
      occurredAt: now.toISOString(),
      relativeDate: "Đang lưu…",
    },
  };
}

/** Adds one pending transaction while keeping the newest canonical list. */
export function reduceOptimisticTransactions(
  current: Transaction[],
  transaction: Transaction,
): Transaction[] {
  return [transaction, ...current.filter((item) => item.id !== transaction.id)];
}
