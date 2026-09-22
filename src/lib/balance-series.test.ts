import assert from "node:assert/strict";
import test from "node:test";

import {
  balanceEntriesFromTransactions,
  buildBalanceSeries,
  type BalanceSeriesAccount,
} from "./balance-series.ts";
import type { Transaction } from "./transactions/contracts.ts";

const account = (overrides: Partial<BalanceSeriesAccount>): BalanceSeriesAccount => ({
  id: "acc-a",
  name: "MB Bank",
  currencyCode: "VND",
  balance: 1_000_000,
  isArchived: false,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction>): Transaction => ({
  id: crypto.randomUUID(),
  kind: "expense",
  categoryId: "cat-food",
  category: "Ăn uống",
  note: "",
  accountId: "acc-a",
  account: "MB Bank",
  amount: 100_000,
  occurredOn: "2026-07-10",
  occurredAt: "2026-07-10T05:00:00.000Z",
  relativeDate: "10 thg 7",
  ...overrides,
});

test("replays backwards: balance at day N = current − sum of entries after N", () => {
  // Current balance 1.000.000; +500.000 on the 11th, −100.000 on the 12th.
  // → end of 10th: 600.000, end of 11th: 1.100.000, end of 12th: 1.000.000.
  const entries = balanceEntriesFromTransactions([
    transaction({ kind: "income", amount: 500_000, occurredOn: "2026-07-11" }),
    transaction({ kind: "expense", amount: 100_000, occurredOn: "2026-07-12" }),
  ]);
  const series = buildBalanceSeries([account({})], entries, {
    start: "2026-07-10",
    end: "2026-07-12",
  });
  assert.equal(series.granularity, "day");
  assert.equal(series.accounts.length, 1);
  assert.equal(series.accounts[0]?.opening, 600_000);
  assert.deepEqual(
    series.accounts[0]?.points.map((point) => [point.key, point.value]),
    [
      ["2026-07-10", 600_000],
      ["2026-07-11", 1_100_000],
      ["2026-07-12", 1_000_000],
    ],
  );
  // The final bucket always lands exactly on the current balance.
  assert.equal(series.netWorthVnd?.points.at(-1)?.value, 1_000_000);
  assert.equal(series.netWorthVnd?.opening, 600_000);
});

test("transfers move balance between accounts but net to zero in net worth", () => {
  const entries = balanceEntriesFromTransactions([
    transaction({
      kind: "transfer",
      categoryId: "",
      category: "Chuyển tiền",
      accountId: "acc-a",
      destinationAccountId: "acc-b",
      destinationAccount: "Tiền mặt",
      amount: 200_000,
      occurredOn: "2026-07-11",
    }),
  ]);
  const series = buildBalanceSeries(
    [
      account({ id: "acc-a", name: "MB Bank", balance: 800_000 }),
      account({ id: "acc-b", name: "Tiền mặt", balance: 1_200_000 }),
    ],
    entries,
    { start: "2026-07-10", end: "2026-07-12" },
  );
  const [a, b] = series.accounts;
  // Source drops by 200k on the 11th; destination rises by the same.
  assert.deepEqual(a?.points.map((point) => point.value), [1_000_000, 800_000, 800_000]);
  assert.deepEqual(b?.points.map((point) => point.value), [1_000_000, 1_200_000, 1_200_000]);
  // Net worth is flat — a transfer cannot create or destroy wealth.
  assert.deepEqual(
    series.netWorthVnd?.points.map((point) => point.value),
    [2_000_000, 2_000_000, 2_000_000],
  );
  assert.equal(series.netWorthVnd?.opening, 2_000_000);
});

test("FX accounts keep their own series but never fold into VND net worth", () => {
  const entries = balanceEntriesFromTransactions([
    transaction({ accountId: "acc-usd", amount: 500, occurredOn: "2026-07-11" }),
    transaction({ accountId: "acc-a", amount: 50_000, occurredOn: "2026-07-11" }),
  ]);
  const series = buildBalanceSeries(
    [
      account({ id: "acc-a", balance: 1_000_000 }),
      account({ id: "acc-usd", name: "USD du lịch", currencyCode: "USD", balance: 20_000 }),
    ],
    entries,
    { start: "2026-07-10", end: "2026-07-12" },
  );
  assert.equal(series.accounts.length, 2);
  // USD account replays in its own minor units.
  assert.deepEqual(
    series.accounts[1]?.points.map((point) => point.value),
    [20_500, 20_000, 20_000],
  );
  // Net worth counts only the VND account.
  assert.deepEqual(
    series.netWorthVnd?.points.map((point) => point.value),
    [1_050_000, 1_000_000, 1_000_000],
  );
  assert.deepEqual(series.foreignCurrencyCodes, ["USD"]);
});

test("an FX-only ledger has no VND net worth — not a fake zero line", () => {
  const series = buildBalanceSeries(
    [account({ id: "acc-usd", currencyCode: "USD", balance: 20_000 })],
    [],
    { start: "2026-07-10", end: "2026-07-12" },
  );
  assert.equal(series.netWorthVnd, null);
  assert.equal(series.accounts.length, 1);
  assert.deepEqual(series.foreignCurrencyCodes, ["USD"]);
});

test("empty ledger returns an honest empty result", () => {
  const series = buildBalanceSeries([], [], { start: "2026-07-10", end: "2026-07-12" });
  assert.deepEqual(series.accounts, []);
  assert.equal(series.netWorthVnd, null);
  assert.deepEqual(series.foreignCurrencyCodes, []);
});

test("a ledger with balances but no entries shows a flat real series", () => {
  // No movement in the window: every point is the current balance. This is
  // ledger truth (initial + entries), not invented history.
  const series = buildBalanceSeries([account({})], [], {
    start: "2026-07-10",
    end: "2026-07-12",
  });
  assert.deepEqual(
    series.netWorthVnd?.points.map((point) => point.value),
    [1_000_000, 1_000_000, 1_000_000],
  );
  assert.equal(series.netWorthVnd?.opening, 1_000_000);
});

test("entries before the window contribute only through the opening balance", () => {
  const entries = balanceEntriesFromTransactions([
    transaction({ kind: "income", amount: 300_000, occurredOn: "2026-07-05" }),
    transaction({ kind: "expense", amount: 50_000, occurredOn: "2026-07-11" }),
  ]);
  const series = buildBalanceSeries([account({})], entries, {
    start: "2026-07-10",
    end: "2026-07-12",
  });
  // The old income sits inside the anchor: opening = 1.000.000 − (−50.000 on
  // 11th) = 1.050.000, i.e. the 300k never leaves the series' base.
  assert.equal(series.accounts[0]?.opening, 1_050_000);
  assert.deepEqual(
    series.accounts[0]?.points.map((point) => point.value),
    [1_050_000, 1_000_000, 1_000_000],
  );
});

test("entries after the window shift the whole reconstructed window", () => {
  // Custom range viewed in the past: entries between window end and "now" must
  // be subtracted to reconstruct the balance at the window.
  const entries = balanceEntriesFromTransactions([
    transaction({ kind: "income", amount: 400_000, occurredOn: "2026-07-20" }),
    transaction({ kind: "expense", amount: 60_000, occurredOn: "2026-07-11" }),
  ]);
  const series = buildBalanceSeries([account({})], entries, {
    start: "2026-07-10",
    end: "2026-07-12",
  });
  // value(E) = 1.000.000 − entries after E, incl. the +400k after the window.
  // The −60k on the 11th is already inside the end-of-day-11 balance.
  assert.deepEqual(
    series.accounts[0]?.points.map((point) => point.value),
    [660_000, 600_000, 600_000],
  );
  assert.equal(series.accounts[0]?.opening, 660_000);
});

test("windows longer than 62 days bucket by calendar month", () => {
  const series = buildBalanceSeries([account({})], [], {
    start: "2026-01-01",
    end: "2026-04-15",
  });
  assert.equal(series.granularity, "month");
  assert.deepEqual(
    series.accounts[0]?.points.map((point) => [point.key, point.end]),
    [
      ["2026-01", "2026-01-31"],
      ["2026-02", "2026-02-28"],
      ["2026-03", "2026-03-31"],
      ["2026-04", "2026-04-15"],
    ],
  );
});

test("month-end bucket boundaries land on the last real day of each month", () => {
  // 2026-02-28 is not a leap-day edge, and a window starting mid-month still
  // measures the first bucket at that month's end.
  const entries = balanceEntriesFromTransactions([
    transaction({ kind: "income", amount: 700_000, occurredOn: "2026-02-10" }),
    transaction({ amount: 30_000, occurredOn: "2026-03-05" }),
  ]);
  const series = buildBalanceSeries([account({})], entries, {
    start: "2026-01-15",
    end: "2026-03-20",
  });
  assert.equal(series.granularity, "month");
  assert.deepEqual(
    series.accounts[0]?.points.map((point) => [point.end, point.value]),
    [
      // After Feb's +700k and Mar's −30k: 1.000.000 − 670.000 = 330.000.
      ["2026-01-31", 330_000],
      // After Mar's −30k only: 1.000.000 − (−30.000) = 1.030.000.
      ["2026-02-28", 1_030_000],
      ["2026-03-20", 1_000_000],
    ],
  );
});

test("a single-day window yields one point and a real opening", () => {
  const entries = balanceEntriesFromTransactions([
    transaction({ amount: 40_000, occurredOn: "2026-07-10" }),
  ]);
  const series = buildBalanceSeries([account({})], entries, {
    start: "2026-07-10",
    end: "2026-07-10",
  });
  assert.equal(series.accounts[0]?.points.length, 1);
  assert.equal(series.accounts[0]?.points[0]?.value, 1_000_000);
  assert.equal(series.accounts[0]?.opening, 1_040_000);
});

test("entries on unknown accounts are ignored rather than guessed", () => {
  const entries = balanceEntriesFromTransactions([
    transaction({ accountId: "acc-ghost", amount: 999_000, occurredOn: "2026-07-11" }),
  ]);
  const series = buildBalanceSeries([account({})], entries, {
    start: "2026-07-10",
    end: "2026-07-12",
  });
  assert.deepEqual(
    series.netWorthVnd?.points.map((point) => point.value),
    [1_000_000, 1_000_000, 1_000_000],
  );
});

test("split expenses still count once — by their whole amount", () => {
  const entries = balanceEntriesFromTransactions([
    transaction({
      amount: 120_000,
      splits: [
        { categoryId: "cat-food", category: "Ăn uống", amount: 70_000 },
        { categoryId: "cat-home", category: "Nhà cửa", amount: 50_000 },
      ],
      occurredOn: "2026-07-11",
    }),
  ]);
  const series = buildBalanceSeries([account({})], entries, {
    start: "2026-07-10",
    end: "2026-07-12",
  });
  assert.deepEqual(
    series.accounts[0]?.points.map((point) => point.value),
    [1_120_000, 1_000_000, 1_000_000],
  );
});

test("a transfer missing its destination still moves the source balance", () => {
  const entries = balanceEntriesFromTransactions([
    transaction({
      kind: "transfer",
      accountId: "acc-a",
      destinationAccountId: undefined,
      amount: 200_000,
      occurredOn: "2026-07-11",
    }),
  ]);
  const series = buildBalanceSeries([account({})], entries, {
    start: "2026-07-10",
    end: "2026-07-12",
  });
  assert.deepEqual(
    series.accounts[0]?.points.map((point) => point.value),
    [1_200_000, 1_000_000, 1_000_000],
  );
});

test("unsafe integer money throws instead of producing a wrong chart", () => {
  // 2**53 is not a safe integer — rejected at the entry boundary.
  assert.throws(
    () =>
      buildBalanceSeries(
        [account({})],
        [{ accountId: "acc-a", occurredOn: "2026-07-11", amount: 2 ** 53 }],
        { start: "2026-07-10", end: "2026-07-12" },
      ),
    /unsafe/,
  );
  // Two individually-safe amounts that overflow when summed per day.
  assert.throws(
    () =>
      buildBalanceSeries(
        [account({})],
        [
          { accountId: "acc-a", occurredOn: "2026-07-11", amount: Number.MAX_SAFE_INTEGER },
          { accountId: "acc-a", occurredOn: "2026-07-11", amount: 1 },
        ],
        { start: "2026-07-10", end: "2026-07-12" },
      ),
    /unsafe/,
  );
  assert.throws(
    () => balanceEntriesFromTransactions([transaction({ amount: 2 ** 53 })]),
    /unsafe/,
  );
});

test("invalid or reversed windows are rejected", () => {
  assert.throws(
    () => buildBalanceSeries([account({})], [], { start: "2026-07-12", end: "2026-07-10" }),
    /invalid/,
  );
  assert.throws(
    () => buildBalanceSeries([account({})], [], { start: "2026-13-01", end: "2026-13-10" }),
    /invalid/,
  );
});
