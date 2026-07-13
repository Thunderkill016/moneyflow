import assert from "node:assert/strict";
import test from "node:test";
import { isTransaction } from "./transaction-store.ts";

const validTransaction = {
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
