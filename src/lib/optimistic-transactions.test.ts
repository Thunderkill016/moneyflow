import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOptimisticTransaction,
  OPTIMISTIC_TRANSACTION_ID_PREFIX,
  reduceOptimisticTransactions,
} from "./optimistic-transactions.ts";
import type { Transaction } from "./sample-data.ts";

const accounts = [{ id: "account-1", name: "Tiền mặt", currencyCode: "VND" }];
const categories = [
  {
    id: "category-food",
    name: "Ăn uống",
    kind: "expense" as const,
    icon: null,
    color: null,
  },
];

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
  assert.equal(result.transaction.id, `${OPTIMISTIC_TRANSACTION_ID_PREFIX}request-123`);
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
  const pending = { ...existing, id: "pending:request-1", relativeDate: "Đang lưu…" };

  const next = reduceOptimisticTransactions([existing, pending], pending);
  assert.deepEqual(next.map((item) => item.id), [pending.id, existing.id]);
});
