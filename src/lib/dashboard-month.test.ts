import assert from "node:assert/strict";
import test from "node:test";

import { monthStatementDetail } from "./dashboard-month.ts";
import type { Transaction } from "./transactions/contracts.ts";

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    kind: "expense",
    categoryId: "c1",
    category: "Ăn uống",
    note: "note",
    amount: 50_000,
    accountId: "a1",
    account: "Tiền mặt",
    occurredOn: "2026-09-10",
    occurredAt: "2026-09-10T08:00:00.000Z",
    relativeDate: "Hôm nay",
    ...overrides,
  };
}

test("monthStatementDetail shape returns one bucket per elapsed month day, expense only", () => {
  const today = "2026-09-03";
  const { shape } = monthStatementDetail(
    [
      tx({ occurredOn: "2026-09-01", amount: 30_000 }),
      tx({ occurredOn: "2026-09-01", amount: 20_000 }),
      tx({ occurredOn: "2026-09-03", amount: 99_000 }),
      // Income and transfers never land in a spending rhythm.
      tx({ kind: "income", occurredOn: "2026-09-02", amount: 5_000_000 }),
      tx({ kind: "transfer", occurredOn: "2026-09-02", amount: 500_000 }),
      // Last month stays out of the shape.
      tx({ occurredOn: "2026-08-31", amount: 1_000_000 }),
    ],
    today,
  );
  assert.deepEqual(shape, [
    { date: "2026-09-01", expense: 50_000 },
    { date: "2026-09-02", expense: 0 },
    { date: "2026-09-03", expense: 99_000 },
  ]);
});

test("monthStatementDetail shape starts on the first even when today is the first", () => {
  const { shape } = monthStatementDetail(
    [tx({ occurredOn: "2026-09-01", amount: 10_000 })],
    "2026-09-01",
  );
  assert.deepEqual(shape, [{ date: "2026-09-01", expense: 10_000 }]);
});

test("monthStatementDetail prior sums the equal-length window before this month", () => {
  // Today 2026-09-21 → current month window has 21 days, so the prior window
  // is 2026-08-11..2026-08-31 — the same rule reports call "cùng số ngày".
  const rows = [
    tx({ occurredOn: "2026-08-15", amount: 200_000 }),
    tx({ occurredOn: "2026-08-31", amount: 80_000 }),
    // Outside the prior window: early August and this month do not count.
    tx({ occurredOn: "2026-08-01", amount: 999_000 }),
    tx({ occurredOn: "2026-09-05", amount: 999_000 }),
    // Transfers are not expense.
    tx({ kind: "transfer", occurredOn: "2026-08-20", amount: 999_000 }),
  ];
  const { prior } = monthStatementDetail(rows, "2026-09-21");
  assert.equal(prior.expense, 280_000);
  assert.equal(prior.transactions, 3);
});

test("monthStatementDetail prior reports zero with no prior rows rather than guessing", () => {
  const { prior } = monthStatementDetail(
    [tx({ occurredOn: "2026-09-05", amount: 10_000 })],
    "2026-09-21",
  );
  assert.equal(prior.expense, 0);
  assert.equal(prior.transactions, 0);
});

test("monthStatementDetail prior on the first compares against the last day of last month", () => {
  // One elapsed day compares against a single day: 2026-08-31.
  const { prior } = monthStatementDetail(
    [tx({ occurredOn: "2026-08-31", amount: 40_000 })],
    "2026-09-01",
  );
  assert.equal(prior.expense, 40_000);
});
