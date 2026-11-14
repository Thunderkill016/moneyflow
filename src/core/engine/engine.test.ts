import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_BUDGET_CONFIG } from "../schema/budget.schema.ts";
import type { Account } from "../schema/account.schema.ts";
import type { Transaction } from "../schema/transaction.schema.ts";
import { computeMonthlyCashflow } from "./cashflow.engine.ts";
import {
  computeAccountBalances,
  computeNetWorthSummary,
  createReconcileTransaction,
  createTransferTransaction,
} from "./ledger.engine.ts";
import { parseQuickInput, parseVietnameseAmount } from "./parser.engine.ts";

const NOW = new Date(2026, 10, 14, 10, 0, 0).getTime();

function sampleAccounts(): Account[] {
  return [
    {
      id: "acc-bank",
      name: "Techcombank",
      group: "LIQUID",
      currency: "VND",
      initialBalance: 20_000_000,
      currentBalance: 20_000_000,
      isArchived: false,
      updatedAt: NOW,
    },
    {
      id: "acc-cash",
      name: "Ví tiền mặt",
      group: "LIQUID",
      currency: "VND",
      initialBalance: 2_000_000,
      currentBalance: 2_000_000,
      isArchived: false,
      updatedAt: NOW,
    },
    {
      id: "acc-invest",
      name: "Quỹ Vàng & BTC",
      group: "INVESTMENT",
      currency: "VND",
      initialBalance: 50_000_000,
      currentBalance: 50_000_000,
      isArchived: false,
      updatedAt: NOW,
    },
    {
      id: "acc-debt",
      name: "Thẻ tín dụng VIB",
      group: "DEBT",
      currency: "VND",
      initialBalance: -3_000_000,
      currentBalance: -3_000_000,
      isArchived: false,
      updatedAt: NOW,
    },
  ];
}

test("TRANSFER from LIQUID to INVESTMENT moves balances without inflating EXPENSE and increases Savings Rate", () => {
  const accounts = sampleAccounts();
  const bank = accounts[0];
  const invest = accounts[2];

  const incomeTx: Transaction = {
    id: "tx-inc",
    type: "INCOME",
    amount: 25_000_000,
    accountId: bank.id,
    categoryId: "thu-nhap",
    note: "Lương tháng 11",
    occurredAt: NOW,
    syncStatus: "SYNCED",
    updatedAt: NOW,
  };

  const expenseTx: Transaction = {
    id: "tx-exp",
    type: "EXPENSE",
    amount: 1_200_000,
    accountId: bank.id,
    categoryId: "an-uong",
    note: "Siêu thị cuối tuần",
    occurredAt: NOW,
    syncStatus: "SYNCED",
    updatedAt: NOW,
  };

  const transferTx = createTransferTransaction({
    id: "tx-inv",
    fromAccount: bank,
    toAccount: invest,
    amount: 5_000_000,
    note: "Trích mua BTC & Vàng",
    occurredAt: NOW,
    now: NOW,
  });

  assert.equal(transferTx.type, "TRANSFER");
  assert.equal(transferTx.categoryId, "tich-luy");

  const updated = computeAccountBalances(accounts, [
    incomeTx,
    expenseTx,
    transferTx,
  ]);
  const updatedBank = updated.find((a) => a.id === bank.id)!;
  const updatedInvest = updated.find((a) => a.id === invest.id)!;

  assert.equal(updatedBank.currentBalance, 20_000_000 + 25_000_000 - 1_200_000 - 5_000_000);
  assert.equal(updatedInvest.currentBalance, 55_000_000);

  const netWorth = computeNetWorthSummary(updated);
  // Liquid = 38.8tr + 2tr = 40.8tr, Investment = 55tr, Debt = -3tr => 92.8tr
  assert.equal(netWorth.liquidVnd, 40_800_000);
  assert.equal(netWorth.investmentVnd, 55_000_000);
  assert.equal(netWorth.netWorthVnd, 92_800_000);

  const cashflow = computeMonthlyCashflow({
    accounts,
    transactions: [incomeTx, expenseTx, transferTx],
    budget: { ...DEFAULT_BUDGET_CONFIG, monthlyIncomeTarget: 25_000_000 },
    referenceDate: new Date(NOW),
  });

  assert.equal(cashflow.totalIncome, 25_000_000);
  assert.equal(cashflow.totalExpense, 1_200_000);
  assert.equal(cashflow.investmentTransfers, 5_000_000);
  assert.equal(cashflow.savingsRatePct, 20);
});

test("RECONCILE computes signed delta = actual - calculated and aligns balance without altering EXPENSE", () => {
  const accounts = sampleAccounts();
  const cash = accounts[1]; // initialBalance = 2_000_000

  const resultDown = createReconcileTransaction({
    id: "tx-rec-1",
    account: cash,
    actualBalance: 1_750_000,
    now: NOW,
  });

  assert.equal(resultDown.delta, -250_000);
  assert.ok(resultDown.transaction);
  assert.equal(resultDown.transaction.amount, 250_000);
  assert.equal(resultDown.transaction.reconcileDelta, -250_000);

  const afterDown = computeAccountBalances(accounts, [resultDown.transaction]);
  assert.equal(afterDown[1].currentBalance, 1_750_000);

  const resultUp = createReconcileTransaction({
    id: "tx-rec-2",
    account: afterDown[1],
    actualBalance: 1_900_000,
    now: NOW + 1000,
  });

  assert.equal(resultUp.delta, 150_000);
  const afterUp = computeAccountBalances(accounts, [
    resultDown.transaction,
    resultUp.transaction!,
  ]);
  assert.equal(afterUp[1].currentBalance, 1_900_000);

  const cashflow = computeMonthlyCashflow({
    accounts,
    transactions: [resultDown.transaction, resultUp.transaction!],
    budget: DEFAULT_BUDGET_CONFIG,
    referenceDate: new Date(NOW),
  });
  assert.equal(cashflow.totalExpense, 0);
  assert.equal(cashflow.reconcileNet, -100_000);
});

test("parseVietnameseAmount & parseQuickInput parse multi-transaction commands accurately", () => {
  assert.equal(parseVietnameseAmount("35k")?.amount, 35_000);
  assert.equal(parseVietnameseAmount("1tr5")?.amount, 1_500_000);
  assert.equal(parseVietnameseAmount("2.5m")?.amount, 2_500_000);
  assert.equal(parseVietnameseAmount("120.000")?.amount, 120_000);

  const accounts = sampleAccounts();
  const parsed = parseQuickInput(
    "ăn sáng 40k, đổ xăng 70k, lương +15tr, mua vàng 5tr",
    accounts,
    "acc-bank",
  );

  assert.equal(parsed.length, 4);
  assert.deepEqual(
    parsed.map((item) => ({
      type: item.type,
      amount: item.amount,
      categoryId: item.categoryId,
      toAccountId: item.toAccountId,
    })),
    [
      { type: "EXPENSE", amount: 40_000, categoryId: "an-uong", toAccountId: undefined },
      { type: "EXPENSE", amount: 70_000, categoryId: "di-chuyen", toAccountId: undefined },
      { type: "INCOME", amount: 15_000_000, categoryId: "thu-nhap", toAccountId: undefined },
      { type: "TRANSFER", amount: 5_000_000, categoryId: "tich-luy", toAccountId: "acc-invest" },
    ],
  );
});
