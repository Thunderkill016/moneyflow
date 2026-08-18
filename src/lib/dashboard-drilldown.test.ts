import assert from "node:assert/strict";
import test from "node:test";
import {
  dashboardDrilldownFilters,
  dashboardDrilldownHref,
  monthEndFromDate,
  monthStartFromDate,
} from "./dashboard-drilldown.ts";
import { monthExpenseTotal, topExpenseCategories } from "./finance.ts";
import { filterTransactions } from "./transaction-filters.ts";
import type { Transaction } from "./sample-data.ts";

const TODAY = "2026-07-14";

const base: Transaction = {
  id: "base",
  kind: "expense",
  categoryId: "cat-food",
  category: "Ăn uống",
  note: "Bữa trưa",
  accountId: "acc-cash",
  account: "Tiền mặt",
  amount: 100_000,
  occurredOn: "2026-07-05",
  occurredAt: "2026-07-05T05:00:00.000Z",
  relativeDate: "5 tháng 7",
};

const transport: Transaction = {
  ...base,
  id: "transport",
  categoryId: "cat-transport",
  category: "Di chuyển",
  amount: 50_000,
  occurredOn: "2026-07-09",
};

/*
 * The regression this feature was designed around: a row dated later in the
 * current month is already inside `monthExpenseTotal`, because that aggregate
 * selects on the "YYYY-MM" prefix rather than on days up to today. A window
 * ending at `today` would drop it from the drilled list and the totals would
 * disagree in front of the user.
 */
const laterThisMonth: Transaction = {
  ...base,
  id: "later-this-month",
  amount: 70_000,
  occurredOn: "2026-07-28",
};

const lastMonth: Transaction = {
  ...base,
  id: "last-month",
  amount: 999_000,
  occurredOn: "2026-06-30",
};

const income: Transaction = {
  ...base,
  id: "income",
  kind: "income",
  categoryId: "cat-salary",
  category: "Lương",
  amount: 20_000_000,
  occurredOn: "2026-07-01",
};

const transfer: Transaction = {
  ...base,
  id: "transfer",
  kind: "transfer",
  categoryId: "cat-transfer",
  category: "Chuyển khoản",
  amount: 5_000_000,
  occurredOn: "2026-07-10",
  destinationAccount: "Ngân hàng",
};

const ledger = [base, transport, laterThisMonth, lastMonth, income, transfer];

function sumAmounts(transactions: Transaction[]) {
  return transactions.reduce((total, item) => total + item.amount, 0);
}

test("month end is the real last day, including February and leap years", () => {
  assert.equal(monthEndFromDate("2026-02-14"), "2026-02-28");
  assert.equal(monthEndFromDate("2028-02-01"), "2028-02-29");
  assert.equal(monthEndFromDate("2026-04-30"), "2026-04-30");
  assert.equal(monthEndFromDate("2026-12-01"), "2026-12-31");
  assert.equal(monthStartFromDate("2026-07-14"), "2026-07-01");
  assert.throws(() => monthEndFromDate("2026-13-01"), /invalid_drilldown_date/u);
});

test("the expense drill-down sums to exactly the figure the dashboard showed", () => {
  const rows = filterTransactions(
    ledger,
    dashboardDrilldownFilters({ withinMonth: TODAY, kind: "expense" }),
  );

  assert.equal(sumAmounts(rows), monthExpenseTotal(ledger, TODAY.slice(0, 7)));
  // Not vacuous: the figure is a real total made of several rows.
  assert.equal(sumAmounts(rows), 220_000);
  assert.equal(rows.length, 3);
});

test("a row dated later in the same month stays inside the drill-down", () => {
  const rows = filterTransactions(
    ledger,
    dashboardDrilldownFilters({ withinMonth: TODAY, kind: "expense" }),
  );

  assert.ok(
    rows.some((row) => row.id === "later-this-month"),
    "a window ending at today would drop it and the totals would disagree",
  );
});

test("the income drill-down sums to the income figure and excludes transfers", () => {
  const rows = filterTransactions(
    ledger,
    dashboardDrilldownFilters({ withinMonth: TODAY, kind: "income" }),
  );

  assert.equal(sumAmounts(rows), 20_000_000);
  assert.ok(!rows.some((row) => row.kind === "transfer"));
});

test("transfer neutrality holds on both sides of the drill-down", () => {
  const expenseRows = filterTransactions(
    ledger,
    dashboardDrilldownFilters({ withinMonth: TODAY, kind: "expense" }),
  );
  const incomeRows = filterTransactions(
    ledger,
    dashboardDrilldownFilters({ withinMonth: TODAY, kind: "income" }),
  );

  assert.ok(!expenseRows.some((row) => row.id === "transfer"));
  assert.ok(!incomeRows.some((row) => row.id === "transfer"));
  // The transfer is real and in the month, so its absence is a filter decision
  // rather than an accident of the fixture.
  assert.equal(transfer.occurredOn.startsWith(TODAY.slice(0, 7)), true);
});

test("last month never leaks into this month's drill-down", () => {
  const rows = filterTransactions(
    ledger,
    dashboardDrilldownFilters({ withinMonth: TODAY, kind: "expense" }),
  );

  assert.ok(!rows.some((row) => row.id === "last-month"));
});

test("a category drill-down opens every row behind that category share", () => {
  const share = topExpenseCategories(ledger, { today: TODAY }).find(
    (item) => item.name === "Ăn uống",
  );
  assert.ok(share, "fixture must produce the category being drilled");

  const rows = filterTransactions(
    ledger,
    dashboardDrilldownFilters({ withinMonth: TODAY, kind: "expense", category: "Ăn uống" }),
  );

  assert.equal(sumAmounts(rows), share.amount);
  assert.ok(!rows.some((row) => row.category === "Di chuyển"));
});

/*
 * A split row contributes only its own line to a category share, but the ledger
 * shows the whole transaction. So for split rows the category drill-down answers
 * "which transactions are behind this category", not "these amounts add to the
 * figure". This test pins that difference down so nobody later claims the
 * stronger guarantee in the UI.
 */
test("split rows appear in a category drill-down but carry their full amount", () => {
  const split: Transaction = {
    ...base,
    id: "split",
    category: "Ăn uống",
    amount: 300_000,
    occurredOn: "2026-07-12",
    splits: [
      { category: "Ăn uống", amount: 200_000 },
      { category: "Di chuyển", amount: 100_000 },
    ],
  } as Transaction;

  const withSplit = [...ledger, split];
  const share = topExpenseCategories(withSplit, { today: TODAY }).find(
    (item) => item.name === "Ăn uống",
  );
  assert.ok(share);

  const rows = filterTransactions(
    withSplit,
    dashboardDrilldownFilters({ withinMonth: TODAY, kind: "expense", category: "Ăn uống" }),
  );

  assert.ok(rows.some((row) => row.id === "split"), "the split row is behind the share");
  // The share counts 200_000 of the split; the row shows 300_000.
  assert.notEqual(sumAmounts(rows), share.amount);
  assert.equal(sumAmounts(rows) - share.amount, 100_000);
});

test("a category drill-down without a resolvable name refuses to build a link", () => {
  assert.equal(
    dashboardDrilldownHref({ withinMonth: TODAY, kind: "expense", requiresCategory: true }),
    null,
    "a missing category would fall back to `all` and open the whole ledger",
  );
  assert.equal(
    dashboardDrilldownHref({
      withinMonth: TODAY,
      kind: "expense",
      category: "   ",
      requiresCategory: true,
    }),
    null,
  );
});

test("the href round-trips into the filters it describes", () => {
  const href = dashboardDrilldownHref({
    withinMonth: TODAY,
    kind: "expense",
    category: "Ăn uống",
    requiresCategory: true,
  });
  assert.ok(href);

  const params = new URLSearchParams(href.split("?")[1]);
  assert.equal(params.get("kind"), "expense");
  assert.equal(params.get("category"), "Ăn uống");
  assert.equal(params.get("from"), "2026-07-01");
  assert.equal(params.get("to"), "2026-07-31");
  assert.equal(params.get("q"), null);
  assert.equal(params.get("review"), null);
});
