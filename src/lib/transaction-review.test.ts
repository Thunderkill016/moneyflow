import assert from "node:assert/strict";
import test from "node:test";
import type { CategoryOption, Transaction } from "./transactions/contracts.ts";
import {
  applyBulkCategoryCorrection,
  applyBulkDateChange,
  applyBulkReviewStatus,
  BULK_SELECTION_LIMIT,
  bulkOccurredOnLabel,
  bulkSkipReasonForFailure,
  evaluateBulkCategorySelection,
  getTransactionReviewStatus,
  normalizeTransactionIds,
  planBulkDateChange,
  planBulkDelete,
  summarizeBulkSkips,
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
    const before: Transaction = base.find((item) => item.id === id)!;
    const after: Transaction = result.transactions.find((item) => item.id === id)!;
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

test("bulk date plan keeps single-row locks and reports per-row skips", () => {
  const result = planBulkDateChange(
    base,
    ["expense-1", "transfer-1", "split-1", "recurring-1"],
    "2026-08-10",
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.eligible.map((item) => item.id),
    ["expense-1", "transfer-1"],
  );
  assert.deepEqual(
    result.skipped.map((item) => ({ id: item.id, reason: item.reason })),
    [
      { id: "split-1", reason: "khoản chia danh mục" },
      { id: "recurring-1", reason: "khoản định kỳ" },
    ],
  );
});

test("bulk date plan skips no-op dates and transfers missing a destination", () => {
  const rows = [
    transaction("same-date", { occurredOn: "2026-08-10" }),
    transaction("broken-transfer", {
      kind: "transfer",
      categoryId: "",
      category: "Chuyển tiền",
      destinationAccountId: undefined,
      destinationAccount: undefined,
    }),
  ];
  const result = planBulkDateChange(
    rows,
    ["same-date", "broken-transfer"],
    "2026-08-10",
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.eligible.length, 0);
  assert.deepEqual(
    result.skipped.map((item) => item.reason),
    ["đã đúng ngày", "chuyển tiền thiếu tài khoản đích"],
  );
});

test("bulk date plan rejects invalid dates and oversized selections", () => {
  assert.equal(planBulkDateChange(base, ["expense-1"], "10/08/2026").ok, false);
  assert.equal(planBulkDateChange(base, [], "2026-08-10").ok, false);
  const oversized = Array.from(
    { length: BULK_SELECTION_LIMIT + 1 },
    (_, index) => `id-${index}`,
  );
  const oversizedPlan = planBulkDateChange(base, oversized, "2026-08-10");
  assert.equal(oversizedPlan.ok, false);
  if (oversizedPlan.ok) return;
  assert.match(oversizedPlan.message, /100/);
});

test("bulk plans skip stale ids with a reason instead of failing the batch", () => {
  const datePlan = planBulkDateChange(
    base,
    ["expense-1", "missing-id"],
    "2026-08-10",
  );
  assert.equal(datePlan.ok, true);
  if (!datePlan.ok) return;
  assert.deepEqual(
    datePlan.eligible.map((item) => item.id),
    ["expense-1"],
  );
  assert.deepEqual(
    datePlan.skipped.map((item) => item.reason),
    ["không còn trong sổ"],
  );

  const deletePlan = planBulkDelete(base, ["missing-id"]);
  assert.equal(deletePlan.ok, true);
  if (!deletePlan.ok) return;
  assert.equal(deletePlan.eligible.length, 0);
  assert.deepEqual(
    deletePlan.skipped.map((item) => item.reason),
    ["không còn trong sổ"],
  );
});

test("bulk delete plan skips recurring rows but keeps transfers and splits", () => {
  const result = planBulkDelete(base, [
    "expense-1",
    "transfer-1",
    "split-1",
    "recurring-1",
  ]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.eligible.map((item) => item.id),
    ["expense-1", "transfer-1", "split-1"],
  );
  assert.deepEqual(
    result.skipped.map((item) => ({ id: item.id, reason: item.reason })),
    [{ id: "recurring-1", reason: "khoản định kỳ" }],
  );
});

test("bulk delete plan rejects an empty selection", () => {
  assert.equal(planBulkDelete(base, []).ok, false);
});

test("summarizeBulkSkips groups rows by reason in selection order", () => {
  const summary = summarizeBulkSkips([
    { id: "a", note: "A", reason: "khoản định kỳ" },
    { id: "b", note: "B", reason: "đã đối soát" },
    { id: "c", note: "C", reason: "khoản định kỳ" },
  ]);
  assert.equal(summary, "2 khoản định kỳ, 1 đã đối soát");
});

test("bulkSkipReasonForFailure maps known RPC codes and falls back to the message", () => {
  assert.equal(
    bulkSkipReasonForFailure("transaction_reconciled", "ignored"),
    "đã đối soát",
  );
  assert.equal(
    bulkSkipReasonForFailure("recurring_payment_locked", "ignored"),
    "khoản định kỳ",
  );
  assert.equal(
    bulkSkipReasonForFailure("transaction_not_found", "ignored"),
    "không còn trong sổ",
  );
  assert.equal(
    bulkSkipReasonForFailure(undefined, "Không thể cập nhật giao dịch."),
    "Không thể cập nhật giao dịch.",
  );
});

test("applyBulkDateChange moves only selected rows and rewrites the label", () => {
  const result = applyBulkDateChange(
    base,
    ["expense-1", "expense-2", "expense-1"],
    "2026-08-10",
    "2026-08-11",
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.updatedIds, ["expense-1", "expense-2"]);
  for (const id of ["expense-1", "expense-2"]) {
    const after: Transaction | undefined = result.transactions.find(
      (item) => item.id === id,
    );
    assert.equal(after?.occurredOn, "2026-08-10");
    assert.equal(after?.relativeDate, "Hôm qua");
  }
  assert.equal(
    result.transactions.find((item) => item.id === "income-1")?.occurredOn,
    "2026-08-03",
  );
});

test("bulkOccurredOnLabel mirrors the demo seed label style", () => {
  assert.equal(bulkOccurredOnLabel("2026-08-11", "2026-08-11"), "Hôm nay");
  assert.equal(bulkOccurredOnLabel("2026-08-10", "2026-08-11"), "Hôm qua");
  assert.equal(bulkOccurredOnLabel("2026-07-03", "2026-08-11"), "3 thg 7");
});
