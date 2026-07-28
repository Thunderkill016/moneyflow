import assert from "node:assert/strict";
import test from "node:test";
import {
  appendIncomeReceipt,
  applyIncomeOccurrenceMap,
  buildIncomeTemplateReceipt,
  clearIncomeOccurrence,
  dueDateForMonth,
  incomeTemplateTotals,
  markIncomeReceived,
  markIncomeUnreceived,
  monthStartFromDate,
  pendingActiveCount,
  recordIncomeOccurrence,
  removeIncomeReceipt,
  type RecurringIncomeTemplate,
} from "./income-templates.ts";
import type { Transaction } from "../sample-data.ts";

const base = {
  id: "salary",
  name: "Lương tháng",
  amount: 20_000_000,
  dueDay: 5,
  dueDate: "2026-07-05",
  accountId: "a",
  accountName: "Bank",
  categoryId: "c",
  categoryName: "Lương",
  categoryIcon: "wallet",
  categoryColor: "green",
  isArchived: false,
  isReceived: false,
  transactionId: null,
} satisfies RecurringIncomeTemplate;

test("due day is clamped to the final day of short months", () => {
  assert.equal(dueDateForMonth("2026-02-01", 31), "2026-02-28");
  assert.equal(dueDateForMonth("2028-02-01", 31), "2028-02-29");
});

test("monthStartFromDate normalizes any day to first of month", () => {
  assert.equal(monthStartFromDate("2026-07-15"), "2026-07-01");
  assert.equal(monthStartFromDate("2026-12-01"), "2026-12-01");
});

test("income totals: expected vs received; archived excluded; never reserve", () => {
  const totals = incomeTemplateTotals([
    base,
    { ...base, id: "bonus", amount: 2_000_000, isReceived: true },
    { ...base, id: "old", amount: 1_000_000, isArchived: true },
  ]);
  assert.deepEqual(totals, { expected: 20_000_000, received: 2_000_000 });
  // Explicit product law: no reserved field for income templates
  assert.equal("reserved" in totals, false);
});

test("pendingActiveCount ignores archived and received", () => {
  assert.equal(
    pendingActiveCount([
      base,
      { ...base, id: "two", isReceived: true },
      { ...base, id: "three", isArchived: true },
    ]),
    1,
  );
});

test("buildIncomeTemplateReceipt posts integer income with recurring flag", () => {
  const income = buildIncomeTemplateReceipt(
    base,
    "2026-07-05",
    "tx-inc-1",
    "2026-07-05T03:00:00.000Z",
  );
  assert.equal(income.kind, "income");
  assert.equal(income.amount, 20_000_000);
  assert.equal(income.note, "Lương tháng");
  assert.equal(income.accountId, "a");
  assert.equal(income.categoryId, "c");
  assert.equal(income.occurredOn, "2026-07-05");
  assert.equal(income.isRecurringPayment, true);
  assert.equal(Number.isSafeInteger(income.amount), true);
});

test("buildIncomeTemplateReceipt rejects non-positive amount", () => {
  assert.throws(
    () => buildIncomeTemplateReceipt({ ...base, amount: 0 }, "2026-07-05", "tx"),
    /invalid_income_template_amount/,
  );
  assert.throws(
    () => buildIncomeTemplateReceipt({ ...base, amount: 1.5 }, "2026-07-05", "tx"),
    /invalid_income_template_amount/,
  );
});

test("mark received / unreceived flips state", () => {
  const received = markIncomeReceived([base], "salary", "tx-1");
  assert.equal(received[0].isReceived, true);
  assert.equal(received[0].transactionId, "tx-1");
  const undone = markIncomeUnreceived(received, "salary");
  assert.equal(undone[0].isReceived, false);
  assert.equal(undone[0].transactionId, null);
});

test("occurrence map records and clears", () => {
  let map = recordIncomeOccurrence({}, "2026-07-01", "salary", "tx-1");
  assert.equal(map["2026-07-01"]["salary"], "tx-1");
  map = clearIncomeOccurrence(map, "2026-07-01", "salary");
  assert.equal(map["2026-07-01"], undefined);
});

test("applyIncomeOccurrenceMap overlays received state", () => {
  const map = recordIncomeOccurrence({}, "2026-07-01", "salary", "tx-1");
  const next = applyIncomeOccurrenceMap([base], "2026-07-01", map);
  assert.equal(next[0].isReceived, true);
  assert.equal(next[0].transactionId, "tx-1");
});

test("append/remove income receipt is idempotent", () => {
  const income = buildIncomeTemplateReceipt(base, "2026-07-05", "tx-inc-1");
  const once = appendIncomeReceipt([], income);
  const twice = appendIncomeReceipt(once, income);
  assert.equal(twice.length, 1);
  const cleared = removeIncomeReceipt(twice, "tx-inc-1");
  assert.deepEqual(cleared, []);
  assert.deepEqual(removeIncomeReceipt(cleared, null), []);
});

test("income receipt is never kind expense (separate from commitments)", () => {
  const income = buildIncomeTemplateReceipt(base, "2026-07-05", "tx-inc-1");
  assert.notEqual(income.kind, "expense");
  const asTxn: Transaction = income;
  assert.equal(asTxn.kind, "income");
});
