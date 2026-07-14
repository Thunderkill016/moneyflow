import assert from "node:assert/strict";
import test from "node:test";
import type { Transaction } from "./sample-data.ts";
import {
  buildSplitExpenseTransaction,
  expenseCategoryAmounts,
  isSplitExpense,
  splitCategoryLabel,
  sumSplitAmounts,
  validateSplitLines,
} from "./splits.ts";

const expenseCategories = [
  { id: "c-food", name: "Ăn uống", kind: "expense" as const, icon: null, color: null },
  { id: "c-move", name: "Di chuyển", kind: "expense" as const, icon: null, color: null },
  { id: "c-shop", name: "Mua sắm", kind: "expense" as const, icon: null, color: null },
  { id: "c-salary", name: "Lương", kind: "income" as const, icon: null, color: null },
];

test("validateSplitLines requires 2+ positive integer lines and unique categories", () => {
  assert.equal(validateSplitLines([]).ok, false);
  assert.equal(validateSplitLines([{ categoryId: "a", amount: 1000 }]).ok, false);
  assert.equal(
    validateSplitLines([
      { categoryId: "a", amount: 1000 },
      { categoryId: "a", amount: 2000 },
    ]).ok,
    false,
  );
  assert.equal(
    validateSplitLines([
      { categoryId: "a", amount: 12.5 },
      { categoryId: "b", amount: 1000 },
    ]).ok,
    false,
  );
  const ok = validateSplitLines([
    { categoryId: "a", amount: 30_000 },
    { categoryId: "b", amount: 20_000 },
  ]);
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.total, 50_000);
});

test("buildSplitExpenseTransaction creates multi-entry expense with total = sum", () => {
  const result = buildSplitExpenseTransaction({
    id: "split-1",
    account: { id: "acc-1", name: "Tiền mặt" },
    categories: expenseCategories,
    input: {
      accountId: "acc-1",
      note: "Siêu thị cuối tuần",
      occurredOn: "2026-07-14",
      idempotencyKey: "00000000-0000-4000-8000-000000000001",
      lines: [
        { categoryId: "c-food", amount: 120_000 },
        { categoryId: "c-shop", amount: 80_000 },
      ],
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const tx = result.transaction;
  assert.equal(tx.kind, "expense");
  assert.equal(tx.amount, 200_000);
  assert.equal(tx.category, splitCategoryLabel(2));
  assert.equal(tx.splits?.length, 2);
  assert.equal(sumSplitAmounts(tx.splits ?? []), 200_000);
  assert.equal(isSplitExpense(tx), true);
});

test("buildSplitExpenseTransaction rejects income category lines", () => {
  const result = buildSplitExpenseTransaction({
    id: "split-bad",
    account: { id: "acc-1", name: "Tiền mặt" },
    categories: expenseCategories,
    input: {
      accountId: "acc-1",
      note: "",
      occurredOn: "2026-07-14",
      idempotencyKey: "00000000-0000-4000-8000-000000000002",
      lines: [
        { categoryId: "c-food", amount: 10_000 },
        { categoryId: "c-salary", amount: 10_000 },
      ],
    },
  });
  assert.equal(result.ok, false);
});

test("expenseCategoryAmounts expands splits for category reports", () => {
  const split: Transaction = {
    id: "s1",
    kind: "expense",
    categoryId: "c-food",
    category: "Chia · 2 danh mục",
    note: "Chợ",
    accountId: "a1",
    account: "MB",
    amount: 90_000,
    occurredOn: "2026-07-14",
    occurredAt: "2026-07-14T01:00:00.000Z",
    relativeDate: "Hôm nay",
    splits: [
      { categoryId: "c-food", category: "Ăn uống", amount: 50_000 },
      { categoryId: "c-move", category: "Di chuyển", amount: 40_000 },
    ],
  };
  const parts = expenseCategoryAmounts(split);
  assert.deepEqual(parts, [
    { name: "Ăn uống", amount: 50_000 },
    { name: "Di chuyển", amount: 40_000 },
  ]);
  assert.deepEqual(
    expenseCategoryAmounts({
      ...split,
      splits: undefined,
      category: "Ăn uống",
      amount: 50_000,
    }),
    [{ name: "Ăn uống", amount: 50_000 }],
  );
  assert.deepEqual(
    expenseCategoryAmounts({ ...split, kind: "transfer", category: "Chuyển tiền" }),
    [],
  );
});
