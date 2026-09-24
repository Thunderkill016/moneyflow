import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildOptimisticTransaction,
  buildUpdatedTransaction,
  OPTIMISTIC_TRANSACTION_ID_PREFIX,
  type OptimisticTransactionMutation,
  reduceOptimisticTransactions,
} from "./optimistic-transactions.ts";
import type { Transaction } from "./sample-data.ts";
import { restoreTransactionInList } from "./transaction-store.ts";

const accounts = [
  { id: "account-1", name: "Tiền mặt", currencyCode: "VND" },
  { id: "account-2", name: "Thẻ", currencyCode: "VND" },
];
const categories = [
  {
    id: "category-food",
    name: "Ăn uống",
    kind: "expense" as const,
    icon: null,
    color: null,
  },
  {
    id: "category-salary",
    name: "Lương",
    kind: "income" as const,
    icon: null,
    color: null,
  },
];

function confirmedRow(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "server-uuid-1",
    kind: "expense",
    categoryId: "category-food",
    category: "Ăn uống",
    note: "Cà phê",
    accountId: "account-1",
    account: "Tiền mặt",
    amount: 25_000,
    occurredOn: "2026-07-25",
    occurredAt: "2026-07-25T10:00:00.000Z",
    relativeDate: "Vừa xong",
    ...overrides,
  };
}

/**
 * Mirrors what `useOptimistic` does: while a transition is open the queued
 * mutations are replayed over the latest base list; when the transition
 * settles the overlay is dropped and the base list itself is the state. A
 * failed action is simply a settle with no base write.
 */
function replayOptimistic(
  base: Transaction[],
  mutations: OptimisticTransactionMutation[],
): Transaction[] {
  return mutations.reduce(reduceOptimisticTransactions, base);
}

test("builds a stable pending transaction from the idempotency key", () => {
  const result = buildOptimisticTransaction(
    {
      kind: "expense",
      accountId: "account-1",
      categoryId: "category-food",
      amount: 52_000,
      note: "Bữa trưa",
      occurredOn: "2026-07-25",
      idempotencyKey: "request-123",
    },
    accounts,
    categories,
    new Date("2026-07-25T12:00:00.000Z"),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(
    result.transaction.id,
    `${OPTIMISTIC_TRANSACTION_ID_PREFIX}request-123`,
  );
  assert.equal(result.transaction.relativeDate, "Đang lưu…");
  assert.equal(result.transaction.occurredAt, "2026-07-25T12:00:00.000Z");
  assert.equal(result.transaction.amount, 52_000);
});

test("rejects an invalid account or category before showing pending data", () => {
  const result = buildOptimisticTransaction(
    {
      kind: "income",
      accountId: "missing",
      categoryId: "category-food",
      amount: 1_000,
      note: "",
      occurredOn: "2026-07-25",
      idempotencyKey: "request-456",
    },
    accounts,
    categories,
  );

  assert.deepEqual(result, {
    ok: false,
    message: "Tài khoản hoặc danh mục chưa hợp lệ.",
  });
});

test("optimistic reducer prepends once and preserves the newest base list", () => {
  const existing: Transaction = {
    id: "confirmed-1",
    kind: "expense",
    categoryId: "category-food",
    category: "Ăn uống",
    note: "Cà phê",
    accountId: "account-1",
    account: "Tiền mặt",
    amount: 25_000,
    occurredOn: "2026-07-25",
    occurredAt: "2026-07-25T10:00:00.000Z",
    relativeDate: "Vừa xong",
  };
  const pending = {
    ...existing,
    id: "pending:request-1",
    relativeDate: "Đang lưu…",
  };

  const next = reduceOptimisticTransactions([existing, pending], {
    type: "add",
    transaction: pending,
  });
  assert.deepEqual(
    next.map((item) => item.id),
    [pending.id, existing.id],
  );
});

// --- Optimistic remove (delete) ---------------------------------------------

test("remove hides the row the moment the delete is dispatched", () => {
  const doomed = confirmedRow({ id: "row-delete-me" });
  const kept = confirmedRow({ id: "row-keeps" });
  const base = [doomed, kept];

  const during = replayOptimistic(base, [{ type: "remove", id: doomed.id }]);
  assert.deepEqual(
    during.map((item) => item.id),
    [kept.id],
    "the row must vanish inside the transition, not after the RPC returns",
  );
});

test("a failed delete restores the row because the base list was never touched", () => {
  const doomed = confirmedRow({ id: "row-delete-me" });
  const kept = confirmedRow({ id: "row-keeps" });
  const base = [doomed, kept];

  replayOptimistic(base, [{ type: "remove", id: doomed.id }]);
  /**
   * `useOptimistic` rolls back by dropping the overlay, so the base list must
   * come out of the reduce untouched — mutating it would make the row stay
   * hidden after a failed action.
   */
  assert.deepEqual(base, [doomed, kept]);
  assert.deepEqual(
    replayOptimistic(base, []),
    [doomed, kept],
    "settling with no base write must show the row again",
  );
});

test("a feed refresh cannot resurrect an optimistically deleted row", () => {
  /**
   * `transaction_feed` filters `deleted_at is null`, so once the soft delete
   * lands the confirmed feed simply no longer carries the row. Replaying the
   * queued remove over that refreshed base must keep it hidden — there is no
   * pendingKey retirement to fire and none is needed.
   */
  const doomed = confirmedRow({ id: "row-delete-me" });
  const kept = confirmedRow({ id: "row-keeps" });

  const refreshedFeed = [kept]; // the deleted row is absent from the view
  const during = replayOptimistic(refreshedFeed, [
    { type: "remove", id: doomed.id },
  ]);
  assert.deepEqual(
    during.map((item) => item.id),
    [kept.id],
  );

  // And a stale base that still carries the row is filtered the same way.
  const staleBase = [doomed, kept];
  const duringStale = replayOptimistic(staleBase, [
    { type: "remove", id: doomed.id },
  ]);
  assert.deepEqual(
    duringStale.map((item) => item.id),
    [kept.id],
  );
});

test("remove does not retire a pending row that only shares the list", () => {
  /**
   * Deleting row A while an unrelated optimistic create is still pending must
   * leave the pending row alone — retirement keys on pendingKey, not on
   * "something left the list".
   */
  const doomed = confirmedRow({ id: "row-delete-me" });
  const pending = {
    ...confirmedRow({ id: "pending:key-9" }),
    pendingKey: "key-9",
  };
  const during = replayOptimistic(
    [pending, doomed],
    [{ type: "remove", id: doomed.id }],
  );
  assert.deepEqual(
    during.map((item) => item.id),
    [pending.id],
  );
});

test("undo re-inserts the deleted snapshot after the delete settles", () => {
  /**
   * The undo window keeps the pre-delete `Transaction` object; restore
   * re-inserts it into the base list — the same path demo and authenticated
   * modes share (`restoreTransactionInList`).
   */
  const doomed = confirmedRow({ id: "row-delete-me" });
  const kept = confirmedRow({ id: "row-keeps" });

  const afterDelete = replayOptimistic(
    [doomed, kept],
    [{ type: "remove", id: doomed.id }],
  );
  const restored = restoreTransactionInList(afterDelete, doomed);
  assert.deepEqual(
    restored.map((item) => item.id),
    [doomed.id, kept.id],
  );

  // Idempotent: a second restore over the same base cannot duplicate it.
  const twice = restoreTransactionInList(restored, doomed);
  assert.equal(twice.length, 2);
});

// --- Optimistic update -------------------------------------------------------

test("buildUpdatedTransaction applies the edit draft to the stored row", () => {
  const existing = confirmedRow({
    id: "row-edit-me",
    note: "Cà phê",
    payee: "Quán cũ",
    isRecurringPayment: false,
  });
  const draft = buildUpdatedTransaction(
    existing,
    {
      id: existing.id,
      kind: "expense",
      accountId: "account-2",
      categoryId: "category-food",
      amount: 40_000,
      note: "Cà phê sáng",
      payee: " Quán mới ",
      occurredOn: "2026-07-26",
    },
    accounts,
    categories,
  );

  assert.equal(draft.ok, true);
  if (!draft.ok) return;
  assert.equal(draft.transaction.id, existing.id);
  assert.equal(draft.transaction.amount, 40_000);
  assert.equal(draft.transaction.note, "Cà phê sáng");
  assert.equal(draft.transaction.payee, "Quán mới");
  assert.equal(draft.transaction.accountId, "account-2");
  assert.equal(draft.transaction.account, "Thẻ");
  assert.equal(draft.transaction.occurredOn, "2026-07-26");
  assert.equal(draft.transaction.relativeDate, "Vừa sửa");
});

test("buildUpdatedTransaction mirrors the demo merge for transfers", () => {
  const existing = confirmedRow({
    id: "row-transfer",
    kind: "transfer",
    categoryId: "",
    category: "Chuyển tiền",
    destinationAccountId: "account-2",
    destinationAccount: "Thẻ",
  });
  const draft = buildUpdatedTransaction(
    existing,
    {
      id: existing.id,
      kind: "transfer",
      sourceAccountId: "account-2",
      destinationAccountId: "account-1",
      amount: 100_000,
      note: "",
      occurredOn: "2026-07-26",
    },
    accounts,
    categories,
  );

  assert.equal(draft.ok, true);
  if (!draft.ok) return;
  assert.equal(draft.transaction.kind, "transfer");
  assert.equal(draft.transaction.accountId, "account-2");
  assert.equal(draft.transaction.destinationAccountId, "account-1");
  assert.equal(draft.transaction.note, "Chuyển tiền");
});

test("buildUpdatedTransaction rejects the same inputs the demo path rejects", () => {
  const existing = confirmedRow({ id: "row-edit-me" });
  const badCategory = buildUpdatedTransaction(
    existing,
    {
      id: existing.id,
      kind: "income",
      accountId: "account-1",
      categoryId: "category-food", // expense category on an income update
      amount: 40_000,
      note: "",
      occurredOn: "2026-07-26",
    },
    accounts,
    categories,
  );
  assert.deepEqual(badCategory, {
    ok: false,
    message: "Tài khoản hoặc danh mục chưa hợp lệ.",
  });

  const sameAccounts = buildUpdatedTransaction(
    existing,
    {
      id: existing.id,
      kind: "transfer",
      sourceAccountId: "account-1",
      destinationAccountId: "account-1",
      amount: 40_000,
      note: "",
      occurredOn: "2026-07-26",
    },
    accounts,
    categories,
  );
  assert.deepEqual(sameAccounts, {
    ok: false,
    message: "Chọn hai tài khoản khác nhau.",
  });
});

test("update shows the draft in place and failure reverts to the stored row", () => {
  const existing = confirmedRow({ id: "row-edit-me", amount: 25_000 });
  const other = confirmedRow({ id: "row-other" });
  const base = [existing, other];
  const draft = buildUpdatedTransaction(
    existing,
    {
      id: existing.id,
      kind: "expense",
      accountId: "account-1",
      categoryId: "category-food",
      amount: 60_000,
      note: "Đã sửa",
      occurredOn: "2026-07-26",
    },
    accounts,
    categories,
  );
  assert.equal(draft.ok, true);
  if (!draft.ok) return;

  const during = replayOptimistic(base, [
    { type: "update", transaction: draft.transaction },
  ]);
  assert.equal(during.length, 2);
  const shown = during.find((item) => item.id === existing.id);
  assert.equal(shown?.amount, 60_000);
  assert.equal(shown?.note, "Đã sửa");

  // Failed action: settle with no base write — the stored row comes back.
  assert.equal(base[0].amount, 25_000, "the base list must stay untouched");
  assert.deepEqual(replayOptimistic(base, [])[0], existing);
});

test("a replayed update op lands harmlessly on the confirmed row", () => {
  /**
   * Inside the transition the confirmed row is written to the base list; the
   * queued update op still replays over it. Both carry the same id and the
   * same edited fields, so the row stays coherent until the overlay drops.
   */
  const existing = confirmedRow({ id: "row-edit-me" });
  const draft = buildUpdatedTransaction(
    existing,
    {
      id: existing.id,
      kind: "expense",
      accountId: "account-1",
      categoryId: "category-food",
      amount: 60_000,
      note: "Đã sửa",
      occurredOn: "2026-07-26",
    },
    accounts,
    categories,
  );
  assert.equal(draft.ok, true);
  if (!draft.ok) return;

  const confirmed = { ...draft.transaction, relativeDate: "Hôm qua" };
  const during = replayOptimistic(
    [confirmed],
    [{ type: "update", transaction: draft.transaction }],
  );
  assert.equal(during.length, 1);
  assert.equal(during[0].id, existing.id);
  assert.equal(during[0].amount, 60_000);
});

// --- Hook wiring contract -----------------------------------------------------

const hookSource = readFileSync("src/hooks/use-transactions.ts", "utf8");

test("delete dispatches the remove op inside the transition before the RPC", () => {
  const deleteBody = /async function deleteTransaction[\s\S]*?\n  \}/u.exec(
    hookSource,
  )?.[0];
  assert.ok(deleteBody, "deleteTransaction must exist");
  const dispatch = deleteBody.indexOf(
    'applyOptimisticMutation({ type: "remove", id })',
  );
  const awaited = deleteBody.indexOf("await deleteTransactionAction(id)");
  const transition = deleteBody.indexOf("startTransition(async () =>");
  assert.ok(transition > -1, "the delete must run inside a transition");
  assert.ok(dispatch > transition, "the remove op must dispatch inside it");
  assert.ok(
    awaited > dispatch,
    "the row must be hidden before the action is awaited",
  );
});

test("update dispatches the draft inside the transition before the RPC", () => {
  const updateBody = /async function updateTransaction[\s\S]*?\n  \}/u.exec(
    hookSource,
  )?.[0];
  assert.ok(updateBody, "updateTransaction must exist");
  const dispatch = updateBody.search(
    /applyOptimisticMutation\(\{\s*type: "update",\s*transaction: draft\.transaction,?\s*\}\)/u,
  );
  const awaited = Math.min(
    updateBody.indexOf("await updateTransferAction(input)"),
    updateBody.indexOf("await updateTransactionAction("),
  );
  const transition = updateBody.indexOf("startTransition(async () =>");
  assert.ok(transition > -1, "the update must run inside a transition");
  assert.ok(dispatch > transition, "the update op must dispatch inside it");
  assert.ok(
    awaited > dispatch,
    "the draft must be visible before the action is awaited",
  );
  // The draft must come from the shared builder, not a second merge.
  assert.match(
    updateBody,
    /buildUpdatedTransaction\(existing, input, accounts, categories\)/u,
  );
});

test("demo mode keeps the synchronous write path for delete and update", () => {
  /**
   * `addTransaction` writes demo rows straight to the local store — already
   * instant — and delete/update must mirror that: `commitDemoTransactions`,
   * not the optimistic overlay.
   */
  const deleteBody =
    /async function deleteTransaction[\s\S]*?\n  \}/u.exec(hookSource)?.[0] ??
    "";
  assert.match(
    deleteBody,
    /if \(isDemo\) \{[\s\S]*commitDemoTransactions\(next\);[\s\S]*return \{ ok: true \};/u,
  );

  const updateBody =
    /async function updateTransaction[\s\S]*?\n  \}/u.exec(hookSource)?.[0] ??
    "";
  assert.match(
    updateBody,
    /if \(isDemo\) \{[\s\S]*buildUpdatedTransaction[\s\S]*commitDemoTransactions\(next\);[\s\S]*return \{ ok: true, transaction \};/u,
  );
});

test("restore still re-inserts the undo snapshot into the base list", () => {
  /**
   * Undo bypasses the optimistic layer on purpose: by the time the notice's
   * `Hoàn tác` is reachable the delete transition has settled, so the snapshot
   * goes straight into the base list via `restoreTransactionInList`.
   */
  const restoreBody = /async function restoreTransaction[\s\S]*?\n  \}/u.exec(
    hookSource,
  )?.[0];
  assert.ok(restoreBody, "restoreTransaction must exist");
  assert.match(
    restoreBody,
    /setTransactions\(\(current\) =>\s*restoreTransactionInList\(current, restored\),?\s*\)/u,
  );
  assert.doesNotMatch(restoreBody, /applyOptimisticMutation/u);
});
