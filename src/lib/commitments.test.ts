import assert from "node:assert/strict";
import test from "node:test";
import { commitmentTotals, dueDateForMonth, type RecurringCommitment } from "./commitments.ts";

test("due day is clamped to the final day of short months", () => {
  assert.equal(dueDateForMonth("2026-02-01", 31), "2026-02-28");
  assert.equal(dueDateForMonth("2028-02-01", 31), "2028-02-29");
});

test("only active unpaid commitments are reserved", () => {
  const base = { id: "one", name: "Internet", amount: 250_000, dueDay: 15, dueDate: "2026-07-15", accountId: "a", accountName: "Bank", categoryId: "c", categoryName: "Hóa đơn", categoryIcon: null, categoryColor: null, isArchived: false, isPaid: false, transactionId: null } satisfies RecurringCommitment;
  const totals = commitmentTotals([base, { ...base, id: "two", amount: 500_000, isPaid: true }, { ...base, id: "three", amount: 1_000_000, isArchived: true }]);
  assert.deepEqual(totals, { reserved: 250_000, paid: 500_000 });
});
