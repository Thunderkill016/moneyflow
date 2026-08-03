import assert from "node:assert/strict";
import test from "node:test";
import {
  filterTransactions,
  normalizeTransactionAmountInput,
  normalizeTransactionDateParam,
  normalizeTransactionReviewParam,
  transactionFilterError,
  transactionFilterSearch,
  type TransactionFilterValues,
} from "./transaction-filters.ts";
import type { Transaction } from "./transactions/contracts.ts";

const transactions: Transaction[] = [
  {
    id: "expense-small",
    kind: "expense",
    categoryId: "food",
    category: "Ăn uống",
    note: "Cà phê",
    accountId: "cash",
    account: "Tiền mặt",
    amount: 45_000,
    occurredOn: "2026-07-10",
    occurredAt: "2026-07-10T02:00:00.000Z",
    relativeDate: "10 thg 7",
    reviewStatus: "needs_review",
  },
  {
    id: "expense-split",
    kind: "expense",
    categoryId: "split",
    category: "Chia danh mục",
    note: "Đi siêu thị",
    accountId: "bank",
    account: "MB Bank",
    amount: 280_000,
    occurredOn: "2026-07-15",
    occurredAt: "2026-07-15T02:00:00.000Z",
    relativeDate: "15 thg 7",
    reviewStatus: "reviewed",
    splits: [
      { categoryId: "food", category: "Ăn uống", amount: 180_000 },
      { categoryId: "shopping", category: "Mua sắm", amount: 100_000 },
    ],
  },
  {
    id: "transfer",
    kind: "transfer",
    categoryId: "transfer",
    category: "Chuyển tiền",
    note: "Chuyển sang ví",
    accountId: "bank",
    account: "MB Bank",
    destinationAccountId: "wallet",
    destinationAccount: "MoMo",
    amount: 500_000,
    occurredOn: "2026-07-20",
    occurredAt: "2026-07-20T02:00:00.000Z",
    relativeDate: "20 thg 7",
  },
  {
    id: "income",
    kind: "income",
    categoryId: "salary",
    category: "Lương",
    note: "Lương tháng 7",
    accountId: "bank",
    account: "MB Bank",
    amount: 15_000_000,
    occurredOn: "2026-07-25",
    occurredAt: "2026-07-25T02:00:00.000Z",
    relativeDate: "25 thg 7",
    reviewStatus: "reviewed",
  },
];

function filters(overrides: Partial<TransactionFilterValues> = {}) {
  return {
    query: "",
    kind: "all" as const,
    account: "all",
    category: "all",
    review: "all" as const,
    fromDate: "",
    toDate: "",
    minAmountInput: "",
    maxAmountInput: "",
    ...overrides,
  };
}

test("normalizes only valid date, review and safe amount parameters", () => {
  assert.equal(normalizeTransactionDateParam("2026-07-15"), "2026-07-15");
  assert.equal(normalizeTransactionDateParam("2026-02-30"), "");
  assert.equal(normalizeTransactionDateParam("15/07/2026"), "");
  assert.equal(normalizeTransactionReviewParam("needs_review"), "needs_review");
  assert.equal(normalizeTransactionReviewParam("reviewed"), "reviewed");
  assert.equal(normalizeTransactionReviewParam("unknown"), "all");
  assert.equal(normalizeTransactionAmountInput("125000"), "125.000");
  assert.equal(normalizeTransactionAmountInput("125.000 ₫"), "125.000");
  assert.equal(normalizeTransactionAmountInput(""), "");
  assert.equal(normalizeTransactionAmountInput("99999999999999999999"), "");
});

test("date range is inclusive", () => {
  const result = filterTransactions(
    transactions,
    filters({ fromDate: "2026-07-15", toDate: "2026-07-20" }),
  );
  assert.deepEqual(
    result.map((item) => item.id),
    ["expense-split", "transfer"],
  );
});

test("amount range is inclusive", () => {
  const result = filterTransactions(
    transactions,
    filters({ minAmountInput: "280.000", maxAmountInput: "500.000" }),
  );
  assert.deepEqual(
    result.map((item) => item.id),
    ["expense-split", "transfer"],
  );
});

test("review state composes with existing filters and legacy rows default reviewed", () => {
  const needsReview = filterTransactions(
    transactions,
    filters({ review: "needs_review", kind: "expense" }),
  );
  assert.deepEqual(needsReview.map((item) => item.id), ["expense-small"]);

  const reviewed = filterTransactions(
    transactions,
    filters({ review: "reviewed", account: "MB Bank" }),
  );
  assert.deepEqual(
    reviewed.map((item) => item.id),
    ["expense-split", "transfer", "income"],
  );
});

test("existing account and split-category filters compose with ranges", () => {
  const result = filterTransactions(
    transactions,
    filters({
      account: "MB Bank",
      category: "Mua sắm",
      fromDate: "2026-07-01",
      toDate: "2026-07-31",
      minAmountInput: "100.000",
    }),
  );
  assert.deepEqual(result.map((item) => item.id), ["expense-split"]);
});

test("destination account still matches transfer filtering", () => {
  const result = filterTransactions(
    transactions,
    filters({ account: "MoMo", minAmountInput: "500.000" }),
  );
  assert.deepEqual(result.map((item) => item.id), ["transfer"]);
});

test("invalid date or amount ranges return an explicit error and no rows", () => {
  const badDate = filters({
    fromDate: "2026-07-20",
    toDate: "2026-07-10",
  });
  assert.equal(
    transactionFilterError(badDate),
    "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.",
  );
  assert.deepEqual(filterTransactions(transactions, badDate), []);

  const badAmount = filters({
    minAmountInput: "500.000",
    maxAmountInput: "100.000",
  });
  assert.equal(
    transactionFilterError(badAmount),
    "Số tiền tối thiểu phải nhỏ hơn hoặc bằng số tiền tối đa.",
  );
  assert.deepEqual(filterTransactions(transactions, badAmount), []);

  const unsafeAmount = filters({
    minAmountInput: "99999999999999999999",
  });
  assert.equal(
    transactionFilterError(unsafeAmount),
    "Số tiền lọc vượt quá giới hạn được hỗ trợ.",
  );
  assert.deepEqual(filterTransactions(transactions, unsafeAmount), []);
});

test("serializes only active filters with canonical amount values", () => {
  const params = transactionFilterSearch(
    filters({
      query: "  cà phê  ",
      kind: "expense",
      account: "Tiền mặt",
      review: "needs_review",
      fromDate: "2026-07-01",
      minAmountInput: "45.000 ₫",
    }),
  );
  assert.equal(params.get("q"), "cà phê");
  assert.equal(params.get("kind"), "expense");
  assert.equal(params.get("account"), "Tiền mặt");
  assert.equal(params.get("review"), "needs_review");
  assert.equal(params.get("from"), "2026-07-01");
  assert.equal(params.get("min"), "45000");
  assert.equal(params.has("category"), false);
  assert.equal(params.has("max"), false);
});
