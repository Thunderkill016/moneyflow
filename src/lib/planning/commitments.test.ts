import assert from "node:assert/strict";
import test from "node:test";
import {
  appendPaymentExpense,
  applyOccurrenceMap,
  buildCommitmentPaymentExpense,
  clearOccurrence,
  commitmentTotals,
  dueDateForMonth,
  markCommitmentPaid,
  markCommitmentUnpaid,
  monthStartFromDate,
  recordOccurrence,
  removePaymentExpense,
  unpaidActiveCount,
  type RecurringCommitment,
} from "./commitments.ts";
import type { Transaction } from "../sample-data.ts";

const base = {
  id: "one",
  name: "Internet",
  amount: 250_000,
  dueDay: 15,
  dueDate: "2026-07-15",
  accountId: "a",
  accountName: "Bank",
  categoryId: "c",
  categoryName: "Hóa đơn",
  categoryIcon: null,
  categoryColor: null,
  isArchived: false,
  isPaid: false,
  transactionId: null,
} satisfies RecurringCommitment;

test("due day is clamped to the final day of short months", () => {
  assert.equal(dueDateForMonth("2026-02-01", 31), "2026-02-28");
  assert.equal(dueDateForMonth("2028-02-01", 31), "2028-02-29");
});

test("monthStartFromDate normalizes any day to first of month", () => {
  assert.equal(monthStartFromDate("2026-07-15"), "2026-07-01");
  assert.equal(monthStartFromDate("2026-12-01"), "2026-12-01");
});

test("only active unpaid commitments are reserved", () => {
  const totals = commitmentTotals([
    base,
    { ...base, id: "two", amount: 500_000, isPaid: true },
    { ...base, id: "three", amount: 1_000_000, isArchived: true },
  ]);
  assert.deepEqual(totals, { reserved: 250_000, paid: 500_000 });
});

test("unpaidActiveCount ignores archived and paid", () => {
  assert.equal(
    unpaidActiveCount([
      base,
      { ...base, id: "two", isPaid: true },
      { ...base, id: "three", isArchived: true },
    ]),
    1,
  );
});

test("buildCommitmentPaymentExpense posts integer expense with recurring flag", () => {
  const expense = buildCommitmentPaymentExpense(base, "2026-07-15", "tx-pay-1", "2026-07-15T03:00:00.000Z");
  assert.equal(expense.kind, "expense");
  assert.equal(expense.amount, 250_000);
  assert.equal(expense.note, "Internet");
  assert.equal(expense.accountId, "a");
  assert.equal(expense.categoryId, "c");
  assert.equal(expense.occurredOn, "2026-07-15");
  assert.equal(expense.isRecurringPayment, true);
  assert.equal(Number.isSafeInteger(expense.amount), true);
});

test("buildCommitmentPaymentExpense rejects non-positive amount", () => {
  assert.throws(
    () => buildCommitmentPaymentExpense({ ...base, amount: 0 }, "2026-07-15", "tx"),
    /invalid_commitment_amount/,
  );
});

test("pay then undo updates commitment paid flags", () => {
  const paid = markCommitmentPaid([base], "one", "tx-1");
  assert.equal(paid[0]!.isPaid, true);
  assert.equal(paid[0]!.transactionId, "tx-1");
  const unpaid = markCommitmentUnpaid(paid, "one");
  assert.equal(unpaid[0]!.isPaid, false);
  assert.equal(unpaid[0]!.transactionId, null);
});

test("appendPaymentExpense is idempotent by transaction id", () => {
  const expense = buildCommitmentPaymentExpense(base, "2026-07-15", "tx-1");
  const once = appendPaymentExpense([], expense);
  const twice = appendPaymentExpense(once, expense);
  assert.equal(once.length, 1);
  assert.equal(twice.length, 1);
  assert.equal(twice[0]!.isRecurringPayment, true);
});

test("removePaymentExpense drops linked ledger row", () => {
  const expense = buildCommitmentPaymentExpense(base, "2026-07-15", "tx-1");
  const other: Transaction = {
    id: "keep",
    kind: "expense",
    categoryId: "c",
    category: "Hóa đơn",
    note: "Khác",
    accountId: "a",
    account: "Bank",
    amount: 10_000,
    occurredOn: "2026-07-14",
    occurredAt: "2026-07-14T00:00:00.000Z",
    relativeDate: "Hôm qua",
  };
  const list = appendPaymentExpense([other], expense);
  const after = removePaymentExpense(list, "tx-1");
  assert.equal(after.length, 1);
  assert.equal(after[0]!.id, "keep");
  assert.deepEqual(removePaymentExpense(after, null), after);
});

test("occurrence map overlay marks paid for insights reserve", () => {
  const map = recordOccurrence({}, "2026-07-01", "one", "tx-pay");
  const hydrated = applyOccurrenceMap([base, { ...base, id: "two", amount: 100_000 }], "2026-07-01", map);
  assert.equal(hydrated[0]!.isPaid, true);
  assert.equal(hydrated[0]!.transactionId, "tx-pay");
  assert.equal(hydrated[1]!.isPaid, false);
  assert.deepEqual(commitmentTotals(hydrated), { reserved: 100_000, paid: 250_000 });
});

test("clearOccurrence restores unpaid reserve", () => {
  let map = recordOccurrence({}, "2026-07-01", "one", "tx-pay");
  map = clearOccurrence(map, "2026-07-01", "one");
  assert.deepEqual(map, {});
  const hydrated = applyOccurrenceMap([base], "2026-07-01", map);
  assert.equal(hydrated[0]!.isPaid, false);
  assert.equal(commitmentTotals(hydrated).reserved, 250_000);
});

test("happy path: pay reduces reserved and posts expense to ledger", () => {
  const items = [
    base,
    { ...base, id: "two", name: "Điện", amount: 650_000, dueDay: 25, dueDate: "2026-07-25" },
  ];
  assert.equal(commitmentTotals(items).reserved, 900_000);

  const transactionId = "tx-internet-pay";
  const expense = buildCommitmentPaymentExpense(items[0]!, "2026-07-15", transactionId);
  const ledger = appendPaymentExpense([], expense);
  const paidItems = markCommitmentPaid(items, "one", transactionId);

  assert.equal(commitmentTotals(paidItems).reserved, 650_000);
  assert.equal(commitmentTotals(paidItems).paid, 250_000);
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0]!.kind, "expense");
  assert.equal(ledger[0]!.amount, 250_000);
  assert.equal(ledger[0]!.isRecurringPayment, true);

  const afterUndo = markCommitmentUnpaid(paidItems, "one");
  const ledgerAfter = removePaymentExpense(ledger, transactionId);
  assert.equal(commitmentTotals(afterUndo).reserved, 900_000);
  assert.equal(ledgerAfter.length, 0);
});
