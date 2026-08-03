import assert from "node:assert/strict";
import test from "node:test";
import type { CategoryOption, Transaction } from "./transactions/contracts.ts";
import {
  applyBulkCategoryCorrection,
  applyBulkReviewStatus,
  evaluateBulkCategorySelection,
  getTransactionReviewStatus,
  normalizeTransactionIds,
} from "./transaction-review.ts";

const expenseCategory: CategoryOption = {
  id: "food",
  name: "Ăn uống",
  kind: "expense",
  icon: null,
  color: null,
};
const shoppingCategory: CategoryOption = {
  id: "shopping",
  name: "Mua sắm",
  kind: "expense",
  icon: null,
  color: null,
};
const incomeCategory: CategoryOption = {
  id: "salary",
  name: "Lương",
  kind: "income",
  icon: null,
  color: null,
};

function transaction(
  id: string,
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id,
    kind: "expense",
    categoryId: expenseCategory.id,
    category: expenseCategory.name,
    note: id,
    accountId: "cash",
    account: "Tiền mặt",
    amount: 100_000,
    occurredOn: "2026-08-03",
    occurredAt: "2026-08-03T01:00:00.000Z",
    relativeDate: "Hôm nay",
    ...overrides,
  };
}

const base = [
  transaction("expense-1"),
  transaction("expense-2"),
  transaction("income-1", {
    kind: "income",
    categoryId: incomeCategory.id,
    category: incomeCategory.name,
  }),
  transaction("transfer-1", {
    kind: "transfer",
    categoryId: "",
    category: "Chuyển tiền",
    destinationAccountId: "bank",
    destinationAccount: "Ngân hàng",
  }),
  transaction("split-1", {
    categoryId: "split",
    category: "Chia · 2 danh mục",
    amount: 100_000,
    splits: [
      { categoryId: "food", category: "Ăn uống", amount: 60_000 },
      { categoryId: "shopping", category: "Mua sắm", amount: 40_000 },
    ],
  }),
  transaction("recurring-1", { isRecurringPayment: true }),
];

test("legacy transactions default to reviewed", () => {
  assert.equal(getTransactionReviewStatus(base[0]!), "reviewed");
  assert.equal(
    getTransactionReviewStatus({ reviewStatus: "needs_review" }),
    "needs_review",
  );
});

test("normalizes duplicate and blank selection ids", () => {
  assert.deepEqual(normalizeTransactionIds(["a", "", "a", "b"]), ["a", "b"]);
});

test("eligible bulk category selection preserves input order and kind", () => {
  const result = evaluateBulkCategorySelection(base, ["expense-2", "expense-1"]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.kind, "expense");
  assert.deepEqual(result.ids, ["expense-2", "expense-1"]);
  assert.deepEqual(
    result.transactions.map((item) => item.id),
    ["expense-2", "expense-1"],
  );
});

test("bulk category selection rejects mixed, transfer, split and recurring rows", () => {
  assert.match(
    (evaluateBulkCategorySelection(base, ["expense-1", "income-1"]) as {
      ok: false;
      message: string;
    }).message,
    /cùng loại/,
  );
  assert.match(
    (evaluateBulkCategorySelection(base, ["transfer-1"]) as {
      ok: false;
      message: string;
    }).message,
    /chuyển tiền/,
  );
  assert.match(
    (evaluateBulkCategorySelection(base, ["split-1"]) as {
      ok: false;
      message: string;
    }).message,
    /chia danh mục/,
  );
  assert.match(
    (evaluateBulkCategorySelection(base, ["recurring-1"]) as {
      ok: false;
      message: string;
    }).message,
    /Định kỳ/,
  );
});

test("bulk review changes only selected rows", () => {
  const result = applyBulkReviewStatus(base, ["expense-2", "expense-2"], "needs_review");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.updatedIds, ["expense-2"]);
  assert.equal(
    result.transactions.find((item) => item.id === "expense-2")?.reviewStatus,
    "needs_review",
  );
  assert.equal(
    result.transactions.find((item) => item.id === "expense-1")?.reviewStatus,
    undefined,
  );
});

test("bulk category correction changes no financial value or unrelated row", () => {
  const result = applyBulkCategoryCorrection(
    base,
    ["expense-1", "expense-2"],
    shoppingCategory,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  for (const id of ["expense-1", "expense-2"]) {
    const before = base.find((item) => item.id === id)!;
    const after = result.transactions.find((item) => item.id === id)!;
    assert.equal(after.categoryId, shoppingCategory.id);
    assert.equal(after.category, shoppingCategory.name);
    assert.equal(after.amount, before.amount);
    assert.equal(after.accountId, before.accountId);
    assert.equal(after.occurredOn, before.occurredOn);
  }
  assert.deepEqual(
    result.transactions.find((item) => item.id === "income-1"),
    base.find((item) => item.id === "income-1"),
  );
});

test("bulk category correction rejects a wrong-kind category", () => {
  const result = applyBulkCategoryCorrection(base, ["expense-1"], incomeCategory);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.message, /danh mục chi/);
});
