import assert from "node:assert/strict";
import test from "node:test";
import {
  isTransactionAccountCleared,
  matchesClearingFilter,
  setTransactionAccountCleared,
  transactionClearingState,
  transactionSourceLabel,
} from "./transaction-metadata.ts";

const expense = {
  accountId: "bank",
  clearedAccountIds: [] as string[],
};

const transfer = {
  accountId: "bank",
  destinationAccountId: "cash",
  clearedAccountIds: [] as string[],
};

test("transaction source labels remain factual and non-judgmental", () => {
  assert.equal(transactionSourceLabel("manual"), "Nhập tay");
  assert.equal(transactionSourceLabel("transfer"), "Chuyển tiền");
  assert.equal(transactionSourceLabel("split"), "Chia danh mục");
  assert.equal(transactionSourceLabel("recurring_commitment"), "Lịch định kỳ");
  assert.equal(transactionSourceLabel("recurring_income"), "Thu nhập định kỳ");
  assert.equal(transactionSourceLabel("import"), "Nhập dữ liệu");
});

test("one account transaction moves between uncleared and cleared", () => {
  assert.equal(transactionClearingState(expense), "uncleared");
  const cleared = setTransactionAccountCleared(expense, "bank", true);
  assert.equal(transactionClearingState(cleared), "cleared");
  assert.equal(isTransactionAccountCleared(cleared, "bank"), true);
  assert.equal(transactionClearingState(setTransactionAccountCleared(cleared, "bank", false)), "uncleared");
});

test("transfer account sides clear independently", () => {
  const sourceCleared = setTransactionAccountCleared(transfer, "bank", true);
  assert.equal(transactionClearingState(sourceCleared), "partial");
  assert.equal(isTransactionAccountCleared(sourceCleared, "bank"), true);
  assert.equal(isTransactionAccountCleared(sourceCleared, "cash"), false);

  const bothCleared = setTransactionAccountCleared(sourceCleared, "cash", true);
  assert.equal(transactionClearingState(bothCleared), "cleared");
});

test("unknown accounts cannot alter clearing state", () => {
  assert.equal(setTransactionAccountCleared(transfer, "other", true), transfer);
});

test("clearing filter is evaluated for the selected account side", () => {
  const sourceCleared = setTransactionAccountCleared(transfer, "bank", true);
  assert.equal(matchesClearingFilter(sourceCleared, "bank", "cleared"), true);
  assert.equal(matchesClearingFilter(sourceCleared, "cash", "cleared"), false);
  assert.equal(matchesClearingFilter(sourceCleared, "cash", "uncleared"), true);
  assert.equal(matchesClearingFilter(sourceCleared, "cash", "all"), true);
});
