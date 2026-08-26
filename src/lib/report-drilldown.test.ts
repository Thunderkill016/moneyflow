import assert from "node:assert/strict";
import test from "node:test";
import {
  reportAccountDrilldownHref,
  reportCategoryDrilldownHref,
  reportDrilldownFilters,
  reportDrilldownHref,
} from "./report-drilldown.ts";
import { buildFinancialReport, customReportRange } from "./reports.ts";
import { filterTransactions } from "./transaction-filters.ts";
import type { Transaction } from "./sample-data.ts";

const RANGE = customReportRange("2026-08-01", "2026-08-31");

function row(
  id: string,
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id,
    kind: "expense",
    categoryId: "cat-food",
    category: "Ăn uống",
    note: "",
    accountId: "acc-cash",
    account: "Tiền mặt",
    amount: 100_000,
    occurredOn: "2026-08-10",
    occurredAt: "2026-08-10T05:00:00.000Z",
    relativeDate: "10 tháng 8",
    ...overrides,
  } as Transaction;
}

function sum(rows: Transaction[]) {
  return rows.reduce((total, item) => total + item.amount, 0);
}

const bankLunch = row("bank-lunch", { account: "Ngân hàng", amount: 700_000 });
const cashCoffee = row("cash-coffee", { amount: 300_000 });
const transferIn = row("transfer-in", {
  kind: "transfer",
  account: "Tiền mặt",
  destinationAccount: "Ngân hàng",
  amount: 5_000_000,
} as Partial<Transaction>);
const lastMonth = row("last-month", { account: "Ngân hàng", occurredOn: "2026-07-30", amount: 999_000 });

const ledger = [bankLunch, cashCoffee, transferIn, lastMonth];

test("an account drill-down sums to exactly the figure shown", () => {
  const report = buildFinancialReport(ledger, RANGE);
  const bank = report.accounts.find((item) => item.name === "Ngân hàng");
  assert.ok(bank, "fixture must produce the account being drilled");

  const rows = filterTransactions(
    ledger,
    reportDrilldownFilters({ range: RANGE, kind: "expense", account: "Ngân hàng" }),
  );

  assert.equal(sum(rows), bank.amount);
  assert.equal(sum(rows), 700_000);
});

/*
 * The trap this module exists around. `filterTransactions` matches the account
 * filter against BOTH `transaction.account` and `transaction.destinationAccount`,
 * so without an explicit kind a transfer INTO the account joins a list opened
 * from an expense figure and the total silently disagrees.
 */
test("without an explicit kind a transfer into the account would leak in", () => {
  const withoutKind = filterTransactions(
    ledger,
    reportDrilldownFilters({ range: RANGE, account: "Ngân hàng" }),
  );
  assert.ok(
    withoutKind.some((item) => item.id === "transfer-in"),
    "the leak must be real, or the guard below proves nothing",
  );

  const withKind = filterTransactions(
    ledger,
    reportDrilldownFilters({ range: RANGE, kind: "expense", account: "Ngân hàng" }),
  );
  assert.ok(!withKind.some((item) => item.id === "transfer-in"));
});

test("the named account helper always carries the expense kind", () => {
  const href = reportAccountDrilldownHref(RANGE, "Ngân hàng");
  assert.ok(href);
  const params = new URLSearchParams(href.split("?")[1]);
  assert.equal(params.get("kind"), "expense");
  assert.equal(params.get("account"), "Ngân hàng");
});

test("the window is the report's own, not a calendar month", () => {
  const week = customReportRange("2026-08-10", "2026-08-16");
  const href = reportCategoryDrilldownHref(week, "Ăn uống");
  assert.ok(href);

  const params = new URLSearchParams(href.split("?")[1]);
  assert.equal(params.get("from"), "2026-08-10");
  assert.equal(params.get("to"), "2026-08-16");
});

test("rows outside the report window never appear", () => {
  const rows = filterTransactions(
    ledger,
    reportDrilldownFilters({ range: RANGE, kind: "expense", account: "Ngân hàng" }),
  );
  assert.ok(!rows.some((item) => item.id === "last-month"));
});

/*
 * The two guarantees are deliberately different, and the difference is pinned
 * so nobody later claims the stronger one for categories. A split row belongs
 * whole to the account that paid it, so accounts add up exactly; it contributes
 * only its own line to a category share while the ledger shows the whole
 * transaction, so categories answer membership rather than sum.
 */
test("accounts sum exactly where categories only answer membership", () => {
  const split = row("split", {
    account: "Ngân hàng",
    amount: 300_000,
    splits: [
      { category: "Ăn uống", amount: 200_000 },
      { category: "Di chuyển", amount: 100_000 },
    ],
  } as Partial<Transaction>);
  const withSplit = [bankLunch, split];
  const report = buildFinancialReport(withSplit, RANGE);

  const accountRows = filterTransactions(
    withSplit,
    reportDrilldownFilters({ range: RANGE, kind: "expense", account: "Ngân hàng" }),
  );
  const bank = report.accounts.find((item) => item.name === "Ngân hàng");
  assert.ok(bank);
  assert.equal(sum(accountRows), bank.amount, "account drill-down must be an exact sum");

  const categoryRows = filterTransactions(
    withSplit,
    reportDrilldownFilters({ range: RANGE, kind: "expense", category: "Ăn uống" }),
  );
  const food = report.categories.find((item) => item.name === "Ăn uống");
  assert.ok(food);
  assert.ok(categoryRows.some((item) => item.id === "split"));
  assert.notEqual(sum(categoryRows), food.amount, "category drill-down is membership, not a sum");
});

test("a slice without a resolvable name refuses to build a link", () => {
  assert.equal(reportAccountDrilldownHref(RANGE, "   "), null);
  assert.equal(reportCategoryDrilldownHref(RANGE, ""), null);
  assert.equal(
    reportDrilldownHref({ range: RANGE, kind: "expense", requiresAccount: true }),
    null,
    "a missing account would fall back to `all` and open the whole ledger",
  );
});

test("the href round-trips into the filters it describes", () => {
  const href = reportCategoryDrilldownHref(RANGE, "Ăn uống");
  assert.ok(href);
  const params = new URLSearchParams(href.split("?")[1]);

  assert.equal(params.get("kind"), "expense");
  assert.equal(params.get("category"), "Ăn uống");
  assert.equal(params.get("from"), "2026-08-01");
  assert.equal(params.get("to"), "2026-08-31");
  assert.equal(params.get("q"), null);
  assert.equal(params.get("review"), null);
});
