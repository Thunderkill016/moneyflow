import type {
  AccountOption,
  CategoryOption,
  CreateTransactionInput,
  GoalOption,
  Transaction,
  UpdateMoneyTransactionInput,
  UpdateTransferInput,
} from "@/lib/sample-data";
import { TRANSACTION_STATUS } from "./transaction-status.ts";

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
  goals: GoalOption[] = [],
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
      payee: input.payee?.trim() || undefined,
      goalId: input.goalId ?? undefined,
      goalName: input.goalId
        ? goals.find((goal) => goal.id === input.goalId)?.name
        : undefined,
      accountId: account.id,
      account: account.name,
      amount: input.amount,
      occurredOn: input.occurredOn,
      occurredAt: now.toISOString(),
      relativeDate: TRANSACTION_STATUS.saving,
    },
  };
}

/**
 * Builds the row an edit should display while the update RPC is in flight —
 * and the same merged row demo mode commits immediately. One builder keeps
 * the optimistic preview and the local-store write byte-identical.
 *
 * `existing` is spread first so fields the edit dialog does not touch
 * (`splits`, `isRecurringPayment`, `reviewStatus`, `pendingKey`) survive
 * the draft. The server-confirmed row replaces it when the transition ends.
 */
export function buildUpdatedTransaction(
  existing: Transaction,
  input: UpdateMoneyTransactionInput | UpdateTransferInput,
  accounts: AccountOption[],
  categories: CategoryOption[],
  goals: GoalOption[] = [],
): OptimisticTransactionResult {
  if (input.kind === "transfer") {
    const source = accounts.find((item) => item.id === input.sourceAccountId);
    const destination = accounts.find(
      (item) => item.id === input.destinationAccountId,
    );
    if (!source || !destination || source.id === destination.id) {
      return { ok: false, message: "Chọn hai tài khoản khác nhau." };
    }
    return {
      ok: true,
      transaction: {
        ...existing,
        kind: "transfer",
        categoryId: "",
        category: "Chuyển tiền",
        note: input.note || "Chuyển tiền",
        accountId: source.id,
        account: source.name,
        destinationAccountId: destination.id,
        destinationAccount: destination.name,
        amount: input.amount,
        occurredOn: input.occurredOn,
        relativeDate: TRANSACTION_STATUS.edited,
      },
    };
  }

  const account = accounts.find((item) => item.id === input.accountId);
  const category = categories.find((item) => item.id === input.categoryId);
  if (!account || !category || category.kind !== input.kind) {
    return { ok: false, message: "Tài khoản hoặc danh mục chưa hợp lệ." };
  }
  const goalId =
    input.goalId === undefined ? existing.goalId : (input.goalId ?? undefined);
  const goalName =
    goalId === undefined
      ? undefined
      : goalId === existing.goalId
        ? existing.goalName
        : goals.find((goal) => goal.id === goalId)?.name;
  return {
    ok: true,
    transaction: {
      ...existing,
      kind: input.kind,
      categoryId: category.id,
      category: category.name,
      note: input.note || category.name,
      payee: input.payee?.trim() || undefined,
      goalId,
      goalName,
      accountId: account.id,
      account: account.name,
      destinationAccountId: undefined,
      destinationAccount: undefined,
      amount: input.amount,
      occurredOn: input.occurredOn,
      relativeDate: TRANSACTION_STATUS.edited,
    },
  };
}

/**
 * Mutations the optimistic layer can overlay on the base transaction list
 * while a server action is in flight. React replays every queued mutation
 * over each new base snapshot until its transition settles, then drops the
 * overlay — which is also the rollback path when the action fails.
 */
export type OptimisticTransactionMutation =
  | { type: "add"; transaction: Transaction }
  | { type: "remove"; id: string }
  | { type: "update"; transaction: Transaction };

/**
 * Applies one optimistic mutation while keeping the newest canonical list.
 *
 * `add`: the id filter alone was not enough. A confirmed row arrives with a
 * server-generated id, so filtering by the *pending* id never removed it, and
 * during the transition both rows were present — every balance and total
 * counted the amount twice, then corrected itself when the transition ended.
 * A financial figure that flashes a wrong number and settles is a trust
 * defect, not a cosmetic one. So supersession is matched on the idempotency
 * key both rows carry: once the canonical list holds the confirmation, the
 * pending row is dropped rather than stacked on top of it.
 *
 * `remove`: hides the row the moment deletion is confirmed in the UI. There
 * is no pendingKey retirement to mirror here — `transaction_feed` excludes
 * `deleted_at` rows, so a refreshed feed never carries the deleted row back;
 * the op simply filters by id over whatever base it is replayed on. On action
 * failure the overlay is dropped and the row reappears untouched.
 *
 * `update`: shows the edited draft in place of the stored row. The confirmed
 * row written to the base list carries the same id, so the replayed op lands
 * on it harmlessly for the remainder of the transition.
 */
export function reduceOptimisticTransactions(
  current: Transaction[],
  mutation: OptimisticTransactionMutation,
): Transaction[] {
  switch (mutation.type) {
    case "remove":
      return current.filter((item) => item.id !== mutation.id);
    case "update":
      return current.map((item) =>
        item.id === mutation.transaction.id ? mutation.transaction : item,
      );
    case "add": {
      const transaction = mutation.transaction;
      const superseded =
        transaction.pendingKey !== undefined &&
        current.some(
          (item) =>
            item.id !== transaction.id && item.pendingKey === transaction.pendingKey,
        );
      if (superseded) return current;
      return [transaction, ...current.filter((item) => item.id !== transaction.id)];
    }
  }
}
