import assert from "node:assert/strict";
import test from "node:test";
import type { Transaction } from "./sample-data.ts";
import { isTransaction, restoreTransactionInList } from "./transaction-store.ts";

const validTransaction: Transaction = {
  id: "transaction-1",
  kind: "expense",
  categoryId: "category-1",
  category: "Ăn uống",
  note: "Bữa trưa",
  accountId: "account-1",
  account: "Tiền mặt",
  amount: 65_000,
  occurredOn: "2026-07-14",
  occurredAt: "2026-07-14T05:00:00.000Z",
  relativeDate: "Hôm nay",
};

test("accepts a complete integer-money transaction", () => {
  assert.equal(isTransaction(validTransaction), true);
  assert.equal(isTransaction({ ...validTransaction, isRecurringPayment: true }), true);
  assert.equal(isTransaction({ ...validTransaction, isRecurringPayment: "yes" }), false);
});

test("rejects unsafe or incomplete transaction data", () => {
  assert.equal(isTransaction({ ...validTransaction, amount: 12.5 }), false);
  assert.equal(isTransaction({ ...validTransaction, accountId: undefined }), false);
  assert.equal(isTransaction({ ...validTransaction, occurredOn: "14/07/2026" }), false);
});

test("transfer requires a distinct destination account", () => {
  const transfer = { ...validTransaction, kind: "transfer", categoryId: "", category: "Chuyển tiền", destinationAccountId: "account-2", destinationAccount: "Tiết kiệm" };
  assert.equal(isTransaction(transfer), true);
  assert.equal(isTransaction({ ...transfer, destinationAccountId: "account-1" }), false);
  assert.equal(isTransaction({ ...transfer, destinationAccount: undefined }), false);
});

test("restoreTransactionInList re-inserts deleted row idempotently", () => {
  const remaining = [{ ...validTransaction, id: "keep-1", note: "Còn lại" }];
  const deleted = { ...validTransaction, id: "gone-1", note: "Đã xóa" };
  const once = restoreTransactionInList(remaining, deleted);
  assert.equal(once.length, 2);
  assert.equal(once[0]?.id, "gone-1");
  assert.equal(once[1]?.id, "keep-1");
  const twice = restoreTransactionInList(once, deleted);
  assert.equal(twice.length, 2);
  assert.deepEqual(twice, once);
});

test("accepts split expense when line amounts sum to total", () => {
  const split = {
    ...validTransaction,
    category: "Chia · 2 danh mục",
    amount: 90_000,
    splits: [
      { categoryId: "c1", category: "Ăn uống", amount: 50_000 },
      { categoryId: "c2", category: "Di chuyển", amount: 40_000 },
    ],
  };
  assert.equal(isTransaction(split), true);
  assert.equal(isTransaction({ ...split, amount: 100_000 }), false);
  assert.equal(isTransaction({ ...split, splits: [{ categoryId: "c1", category: "Ăn uống", amount: 90_000 }] }), false);
});
