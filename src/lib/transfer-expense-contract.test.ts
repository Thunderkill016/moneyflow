/**
 * TASK-253 — Contract: transfer never in month expense total / category spend.
 *
 * Uses the demo ledger (`sampleTransactions`) plus a large transfer so the
 * ship gate fails if transfer amount leaks into chi totals or category spend.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { sumBudgetSpent } from "./budgets.ts";
import {
  calculateDashboardSummary,
  monthExpenseTotal,
  topExpenseCategories,
} from "./finance.ts";
import { buildFinancialReport, reportRange } from "./reports.ts";
import { sampleTransactions, type Transaction } from "./sample-data.ts";

const TODAY = "2026-07-14";
const MONTH = "2026-07";

/** Large transfer so accidental inclusion would dominate totals. */
const TRANSFER_AMOUNT = 2_000_000;

const demoTransfer: Transaction = {
  id: "demo-contract-transfer",
  kind: "transfer",
  categoryId: "demo-category-expense-Ăn uống", // mis-tag must still not count as chi
  category: "Chuyển tiền",
  note: "MB Bank → Tiền mặt",
  accountId: "demo-account-mb",
  account: "MB Bank",
  destinationAccountId: "demo-account-cash",
  destinationAccount: "Tiền mặt",
  amount: TRANSFER_AMOUNT,
  occurredOn: TODAY,
  occurredAt: `${TODAY}T08:00:00.000Z`,
  relativeDate: "Hôm nay",
};

/** Demo ledger with transfer — the contract subject. */
const demoLedger: Transaction[] = [...sampleTransactions, demoTransfer];

function pureExpenseTotal(rows: Transaction[], monthPrefix: string): number {
  return rows
    .filter((r) => r.kind === "expense" && r.occurredOn.startsWith(monthPrefix))
    .reduce((sum, r) => sum + r.amount, 0);
}

test("TASK-253: demo ledger contains sample rows and a transfer", () => {
  assert.ok(sampleTransactions.length >= 3, "demo sampleTransactions should have seed rows");
  assert.ok(demoLedger.some((r) => r.kind === "transfer"));
  assert.ok(demoLedger.some((r) => r.kind === "expense"));
  assert.ok(demoLedger.every((r) => Number.isSafeInteger(r.amount) && r.amount > 0));
  const xfer = demoLedger.find((r) => r.id === demoTransfer.id);
  assert.equal(xfer?.amount, TRANSFER_AMOUNT);
});

test("TASK-253: transfer amount not in monthExpenseTotal (demo ledger)", () => {
  const without = monthExpenseTotal(sampleTransactions, MONTH);
  const withXfer = monthExpenseTotal(demoLedger, MONTH);
  const expected = pureExpenseTotal(sampleTransactions, MONTH);

  assert.equal(without, expected);
  assert.equal(withXfer, expected);
  assert.equal(withXfer, without);
  // Transfer alone contributes zero chi
  assert.equal(monthExpenseTotal([demoTransfer], MONTH), 0);
  // If transfer were wrongly counted, total would jump by TRANSFER_AMOUNT
  assert.notEqual(withXfer, expected + TRANSFER_AMOUNT);
  assert.ok(withXfer < TRANSFER_AMOUNT, "month expense should not swallow transfer amount");
});

test("TASK-253: transfer amount not in topExpenseCategories (category spend)", () => {
  const topWithout = topExpenseCategories(sampleTransactions, { today: TODAY, limit: 10 });
  const topWith = topExpenseCategories(demoLedger, { today: TODAY, limit: 10 });

  assert.deepEqual(topWith, topWithout);

  const transferCategory = topWith.find(
    (row) => row.name === "Chuyển tiền" || row.amount === TRANSFER_AMOUNT,
  );
  assert.equal(transferCategory, undefined);

  // Food category must not absorb mis-tagged transfer categoryId
  const food = topWith.find((row) => row.name === "Ăn uống");
  const foodSample = sampleTransactions
    .filter((r) => r.kind === "expense" && r.category === "Ăn uống" && r.occurredOn.startsWith(MONTH))
    .reduce((s, r) => s + r.amount, 0);
  if (foodSample > 0) {
    assert.equal(food?.amount, foodSample);
  }
  assert.ok(
    !topWith.some((row) => row.amount >= TRANSFER_AMOUNT),
    "no category row should equal/exceed transfer amount",
  );
});

test("TASK-253: transfer amount not in report category spend or expense total", () => {
  const range = reportRange(TODAY, "month");
  const reportWithout = buildFinancialReport(sampleTransactions, range);
  const reportWith = buildFinancialReport(demoLedger, range);

  assert.equal(reportWith.totals.expense, reportWithout.totals.expense);
  assert.equal(reportWith.totals.income, reportWithout.totals.income);
  assert.equal(reportWith.totals.net, reportWithout.totals.net);
  assert.deepEqual(reportWith.categories, reportWithout.categories);

  assert.ok(
    !reportWith.categories.some(
      (c) => c.name === "Chuyển tiền" || c.amount === TRANSFER_AMOUNT,
    ),
  );
  // Transfer is still a transaction in range (count can include it)
  assert.ok(reportWith.totals.transactions >= reportWithout.totals.transactions);
  assert.equal(
    reportWith.totals.expense,
    pureExpenseTotal(
      demoLedger.filter(
        (r) => r.occurredOn >= range.currentStart && r.occurredOn <= range.currentEnd,
      ),
      MONTH,
    ),
  );
});

test("TASK-253: transfer amount not in budget category spend (demo ledger)", () => {
  const foodId = "demo-category-expense-Ăn uống";
  const monthStart = "2026-07-01";

  const spentWithout = sumBudgetSpent(sampleTransactions, foodId, monthStart);
  const spentWith = sumBudgetSpent(demoLedger, foodId, monthStart);

  assert.equal(spentWith, spentWithout);
  // Mis-tagged transfer on same categoryId must not inflate budget spent
  assert.equal(sumBudgetSpent([demoTransfer], foodId, monthStart), 0);
  assert.notEqual(spentWith, spentWithout + TRANSFER_AMOUNT);
});

test("TASK-253: demo dashboard month expense ignores transfer", () => {
  // isDemo default true — recorded expense only; transfer must not change expense delta
  const dashWithout = calculateDashboardSummary(sampleTransactions, { today: TODAY });
  const dashWith = calculateDashboardSummary(demoLedger, { today: TODAY });

  const recordedOnly = pureExpenseTotal(sampleTransactions, MONTH);
  // Demo mode adds MONTHLY_EXPENSE_BEFORE_SAMPLE baseline; both should share same recordedExpense
  assert.equal(dashWith.expense, dashWithout.expense);
  assert.equal(dashWith.income, dashWithout.income);
  assert.equal(dashWith.foodExpense, dashWithout.foodExpense);
  // Absolute check: expense must equal baseline + pure expenses (not + transfer)
  assert.equal(dashWith.expense - recordedOnly, dashWithout.expense - recordedOnly);
  assert.ok(Number.isSafeInteger(dashWith.expense));
});
