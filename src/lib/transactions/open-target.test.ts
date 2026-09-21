import assert from "node:assert/strict";
import test from "node:test";

import type { Transaction } from "./contracts.ts";
import { resolveTransactionOpenTarget } from "./open-target.ts";

function transaction(patch: Partial<Transaction> = {}): Transaction {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    kind: "expense",
    categoryId: "cat-1",
    category: "Ăn uống",
    note: "Bữa trưa",
    accountId: "acc-1",
    account: "Vietcombank",
    amount: 85_000,
    occurredOn: "2026-09-13",
    occurredAt: "2026-09-13T05:00:00.000Z",
    relativeDate: "Hôm nay",
    reviewStatus: "reviewed",
    ...patch,
  };
}

test("resolves an editable transaction for the open dialog", () => {
  const target = transaction();
  const resolution = resolveTransactionOpenTarget(target.id, [target]);
  assert.equal(resolution.type, "edit");
  assert.equal(resolution.type === "edit" && resolution.transaction.id, target.id);
});

test("split expenses resolve to the same notice as the row action", () => {
  const target = transaction({
    splits: [
      { categoryId: "cat-1", category: "Ăn uống", amount: 50_000 },
      { categoryId: "cat-2", category: "Khác", amount: 35_000 },
    ],
  });
  const resolution = resolveTransactionOpenTarget(target.id, [target]);
  assert.equal(resolution.type, "notice");
});

test("recurring-payment rows resolve to the commitments notice, never the editor", () => {
  const target = transaction({ isRecurringPayment: true });
  const resolution = resolveTransactionOpenTarget(target.id, [target]);
  assert.equal(resolution.type, "notice");
});

test("stale or foreign ids resolve to missing without inventing a target", () => {
  assert.equal(
    resolveTransactionOpenTarget("does-not-exist", [transaction()]).type,
    "missing",
  );
  assert.equal(resolveTransactionOpenTarget(undefined, [transaction()]).type, "missing");
  assert.equal(resolveTransactionOpenTarget("", [transaction()]).type, "missing");
});
