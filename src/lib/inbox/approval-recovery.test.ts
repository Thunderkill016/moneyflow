import assert from "node:assert/strict";
import test from "node:test";
import type { Transaction } from "@/lib/sample-data";
import {
  approvalIdempotencyKey,
  findDemoApprovalTransaction,
  reconcileDemoApprovalTransaction,
} from "./approval-recovery.ts";

function transaction(id: string): Transaction {
  return {
    id,
    kind: "expense",
    categoryId: "category-1",
    category: "Ăn uống",
    note: "Cà phê",
    accountId: "account-1",
    account: "Tiền mặt",
    amount: 45_000,
    occurredOn: "2026-08-06",
    occurredAt: "2026-08-06T08:00:00.000Z",
    relativeDate: "Hôm nay",
    reviewStatus: "reviewed",
  };
}

test("candidate identity is the stable approval idempotency key", () => {
  assert.equal(approvalIdempotencyKey("candidate-123"), "candidate-123");
});

test("demo retry finds an already linked ledger transaction", () => {
  const existing = transaction("candidate-123");
  assert.equal(findDemoApprovalTransaction([existing], "candidate-123"), existing);
  assert.equal(findDemoApprovalTransaction([existing], "candidate-456"), null);
});

test("demo approval re-keys the first successful random row to candidate identity", () => {
  const created = transaction("random-transaction-id");
  const next = reconcileDemoApprovalTransaction(
    [created],
    "candidate-123",
    created.id,
  );

  assert.equal(next.length, 1);
  assert.equal(next[0]?.id, "candidate-123");
  assert.equal(next[0]?.amount, created.amount);
});

test("demo approval retry does not create or re-key a second ledger row", () => {
  const linked = transaction("candidate-123");
  const unrelated = transaction("other-transaction");
  const next = reconcileDemoApprovalTransaction(
    [linked, unrelated],
    "candidate-123",
    "new-random-id",
  );

  assert.deepEqual(next, [linked, unrelated]);
});
