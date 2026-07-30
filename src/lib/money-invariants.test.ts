/**
 * TASK-251 — MVP money invariants regression suite.
 *
 * Product law matrix (fail if any regress):
 * 1. Transfer never counts as expense (month total, dashboard, reports, categories)
 * 2. Soft-delete drops spent (balance / budget / month expense)
 * 3. Money is integer minor units only (store + transfer + parse)
 * 4. Budget spent ignores transfer (even mis-tagged categoryId)
 *
 * Domain math lives in src/lib/* — these tests are the ship-gate contract.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { sumBudgetSpent } from "./planning/budgets.ts";
import {
  balanceAfterTransactions,
  calculateDashboardSummary,
  monthExpenseTotal,
  netTransactionEffect,
  topExpenseCategories,
} from "./finance.ts";
import { parseMoneyInput, parseMoneyInputToMinor } from "./money.ts";
import { buildFinancialReport, reportRange } from "./reports.ts";
import type { Transaction } from "./sample-data.ts";
import { isTransaction } from "./transaction-store.ts";
import { applyTransferBalances } from "./transfers.ts";
import type { AccountSummary } from "./accounts.ts";
import { buildWeeklySummary } from "./weekly-summary.ts";

// --- fixtures (integer VND đồng) ---

const TODAY = "2026-07-14";
const MONTH = "2026-07";

const expense: Transaction = {
  id: "inv-expense",
  kind: "expense",
  categoryId: "cat-food",
  category: "Ăn uống",
  note: "Cà phê",
  accountId: "cash",
  account: "Tiền mặt",
  amount: 100_000,
  occurredOn: TODAY,
  occurredAt: `${TODAY}T05:00:00.000Z`,
  relativeDate: "Hôm nay",
};

const expense2: Transaction = {
  ...expense,
  id: "inv-expense-2",
  amount: 50_000,
  occurredOn: "2026-07-10",
};

const income: Transaction = {
  ...expense,
  id: "inv-income",
  kind: "income",
  categoryId: "cat-salary",
  category: "Lương",
  note: "Lương",
  amount: 5_000_000,
};

const transfer: Transaction = {
  ...expense,
  id: "inv-transfer",
  kind: "transfer",
  categoryId: "cat-food", // mis-tag must still not count as chi
  category: "Chuyển tiền",
  note: "Cash → Bank",
  amount: 750_000,
  destinationAccountId: "bank",
  destinationAccount: "Ngân hàng",
};

const accounts: AccountSummary[] = [
  {
    id: "cash",
    name: "Tiền mặt",
    kind: "cash",
    currencyCode: "VND",
    initialBalance: 0,
    balance: 2_000_000,
    isArchived: false,
  },
  {
    id: "bank",
    name: "Ngân hàng",
    kind: "bank",
    currencyCode: "VND",
    initialBalance: 0,
    balance: 1_000_000,
    isArchived: false,
  },
];

function assertSafeInt(n: number, label: string) {
  assert.ok(Number.isSafeInteger(n), `${label} must be safe integer, got ${n}`);
}

// =============================================================================
// 1. Transfer never expense
// =============================================================================

test("INVARIANT: transfer never counts in monthExpenseTotal", () => {
  assert.equal(monthExpenseTotal([expense, transfer, income], MONTH), 100_000);
  assert.equal(monthExpenseTotal([transfer], MONTH), 0);
  assert.equal(monthExpenseTotal([expense, expense2, transfer], MONTH), 150_000);
});

test("INVARIANT: transfer never counts in dashboard expense / net / income", () => {
  const withXfer = calculateDashboardSummary([expense, transfer, income], {
    isDemo: false,
    totalBalance: 10_000_000,
    today: TODAY,
  });
  const withoutXfer = calculateDashboardSummary([expense, income], {
    isDemo: false,
    totalBalance: 10_000_000,
    today: TODAY,
  });
  assert.equal(withXfer.expense, 100_000);
  assert.equal(withXfer.expense, withoutXfer.expense);
  assert.equal(withXfer.income, withoutXfer.income);
  assert.equal(withXfer.net, withoutXfer.net);
  assert.equal(withXfer.net, 5_000_000 - 100_000);
});

test("INVARIANT: transfer never in topExpenseCategories", () => {
  const top = topExpenseCategories([expense, transfer], { today: TODAY, limit: 5 });
  assert.equal(top.length, 1);
  assert.equal(top[0]?.name, "Ăn uống");
  assert.equal(top[0]?.amount, 100_000);
  assert.equal(
    top.find((row) => row.name === "Chuyển tiền"),
    undefined,
  );
});

test("INVARIANT: transfer never in report totals or weekly summary expense", () => {
  const range = reportRange(TODAY, "month");
  const report = buildFinancialReport(
    [expense, transfer, income],
    range,
  );
  assert.equal(report.totals.expense, 100_000);
  assert.equal(report.totals.income, 5_000_000);
  assert.equal(report.totals.net, 4_900_000);
  // transfer still counted in transaction count if in range, but not expense
  assert.ok(report.totals.transactions >= 2);

  const week = buildWeeklySummary([expense, transfer, income], TODAY);
  assert.equal(week.expense, 100_000);
  assert.equal(week.income, 5_000_000);
  assertSafeInt(week.expense, "weekly.expense");
  assertSafeInt(week.income, "weekly.income");
  assertSafeInt(week.net, "weekly.net");
});

test("INVARIANT: transfer preserves total assets (net effect 0)", () => {
  assert.equal(netTransactionEffect([transfer]), 0);
  assert.equal(balanceAfterTransactions(3_000_000, [transfer]), 3_000_000);
  const mixed = balanceAfterTransactions(3_000_000, [expense, income, transfer]);
  assert.equal(mixed, 3_000_000 - 100_000 + 5_000_000);
});

// =============================================================================
// 2. Soft-delete drops spent
// =============================================================================

test("INVARIANT: soft-delete drops expense from month total and balance", () => {
  const active = [expense, expense2];
  assert.equal(monthExpenseTotal(active, MONTH), 150_000);
  assert.equal(balanceAfterTransactions(1_000_000, active), 850_000);

  // Soft-delete = omit from active list (deleted_at filter / demo remove)
  const afterDelete = active.filter((row) => row.id !== "inv-expense");
  assert.equal(monthExpenseTotal(afterDelete, MONTH), 50_000);
  assert.equal(balanceAfterTransactions(1_000_000, afterDelete), 950_000);

  const dashBefore = calculateDashboardSummary(active, {
    isDemo: false,
    totalBalance: 850_000,
    today: TODAY,
  });
  const dashAfter = calculateDashboardSummary(afterDelete, {
    isDemo: false,
    totalBalance: 950_000,
    today: TODAY,
  });
  assert.equal(dashBefore.expense, 150_000);
  assert.equal(dashAfter.expense, 50_000);
});

test("INVARIANT: soft-delete drops budget spent", () => {
  const active = [expense, expense2];
  assert.equal(sumBudgetSpent(active, "cat-food", "2026-07-01"), 150_000);
  const afterDelete = active.filter((row) => row.id !== "inv-expense-2");
  assert.equal(sumBudgetSpent(afterDelete, "cat-food", "2026-07-01"), 100_000);
  assert.equal(sumBudgetSpent([], "cat-food", "2026-07-01"), 0);
});

// =============================================================================
// 3. Integer only
// =============================================================================

test("INVARIANT: transaction store rejects non-integer money", () => {
  const base = {
    id: "t1",
    kind: "expense" as const,
    categoryId: "c1",
    category: "Ăn uống",
    note: "x",
    accountId: "a1",
    account: "Cash",
    amount: 45_000,
    occurredOn: TODAY,
    occurredAt: `${TODAY}T00:00:00.000Z`,
    relativeDate: "Hôm nay",
  };
  assert.equal(isTransaction(base), true);
  assert.equal(isTransaction({ ...base, amount: 12.5 }), false);
  assert.equal(isTransaction({ ...base, amount: NaN }), false);
  assert.equal(isTransaction({ ...base, amount: Infinity }), false);
  assert.equal(isTransaction({ ...base, amount: -1 }), false);
});

test("INVARIANT: transfer apply rejects float/negative; keeps integer balances", () => {
  assert.equal(applyTransferBalances(accounts, "cash", "bank", 12.5), accounts);
  assert.equal(applyTransferBalances(accounts, "cash", "bank", -100), accounts);
  assert.equal(applyTransferBalances(accounts, "cash", "bank", 0), accounts);
  const next = applyTransferBalances(accounts, "cash", "bank", 250_000);
  assert.equal(next[0]?.balance, 1_750_000);
  assert.equal(next[1]?.balance, 1_250_000);
  assertSafeInt(next[0]!.balance, "source balance");
  assertSafeInt(next[1]!.balance, "dest balance");
  // total VND assets preserved
  assert.equal(
    next.reduce((s, a) => s + a.balance, 0),
    accounts.reduce((s, a) => s + a.balance, 0),
  );
});

test("INVARIANT: parseMoneyInput yields integer major/minor units", () => {
  assert.equal(parseMoneyInput("45.000"), 45_000);
  assert.equal(parseMoneyInput("45,5"), 455); // digits only → integer
  assert.equal(parseMoneyInputToMinor("150.000", "VND"), 150_000);
  assertSafeInt(parseMoneyInputToMinor("200", "USD"), "USD minor");
  assert.equal(Number.isInteger(parseMoneyInput("1.234.567")), true);
});

test("INVARIANT: all money totals from mixed ledger are safe integers", () => {
  const ledger = [expense, expense2, income, transfer];
  const monthExp = monthExpenseTotal(ledger, MONTH);
  const net = netTransactionEffect(ledger);
  const bal = balanceAfterTransactions(0, ledger);
  const spent = sumBudgetSpent(ledger, "cat-food", "2026-07-01");
  const dash = calculateDashboardSummary(ledger, {
    isDemo: false,
    totalBalance: bal,
    today: TODAY,
  });
  for (const [label, n] of [
    ["monthExp", monthExp],
    ["net", net],
    ["bal", bal],
    ["spent", spent],
    ["dash.balance", dash.balance],
    ["dash.expense", dash.expense],
    ["dash.income", dash.income],
    ["dash.net", dash.net],
  ] as const) {
    assertSafeInt(n, label);
  }
  assert.equal(monthExp, 150_000);
  assert.equal(spent, 150_000); // transfer mis-tagged cat-food ignored
});

// =============================================================================
// 4. Budget ignores transfer
// =============================================================================

test("INVARIANT: budget spent ignores transfer even with matching categoryId", () => {
  const onlyTransfer = sumBudgetSpent([transfer], "cat-food", "2026-07-01");
  assert.equal(onlyTransfer, 0);

  const withBoth = sumBudgetSpent([expense, transfer], "cat-food", "2026-07-01");
  assert.equal(withBoth, 100_000);

  const incomeOnly = sumBudgetSpent([income], "cat-salary", "2026-07-01");
  assert.equal(incomeOnly, 0);
});
