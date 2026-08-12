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
      pendingKey: input.idempotencyKey,
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

/**
 * Adds one pending transaction while keeping the newest canonical list.
 *
 * The id filter alone was not enough. A confirmed row arrives with a
 * server-generated id, so filtering by the *pending* id never removed it, and
 * during the transition both rows were present — every balance and total counted
 * the amount twice, then corrected itself when the transition ended. A financial
 * figure that flashes a wrong number and settles is a trust defect, not a
 * cosmetic one.
 *
 * So supersession is matched on the idempotency key both rows carry: once the
 * canonical list holds the confirmation, the pending row is dropped rather than
 * stacked on top of it.
 */
export function reduceOptimisticTransactions(
  current: Transaction[],
  transaction: Transaction,
): Transaction[] {
  const superseded =
    transaction.pendingKey !== undefined &&
    current.some(
      (item) => item.id !== transaction.id && item.pendingKey === transaction.pendingKey,
    );
  if (superseded) return current;
  return [transaction, ...current.filter((item) => item.id !== transaction.id)];
}
