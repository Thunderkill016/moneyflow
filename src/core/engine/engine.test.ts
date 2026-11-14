import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_BUDGET_CONFIG } from "../schema/budget.schema.ts";
import type { Account } from "../schema/account.schema.ts";
import type { Transaction } from "../schema/transaction.schema.ts";
import {
  computeMonthlyCashflow,
  computeQuickOnboardingPlan,
  simulateWhatIfPurchase,
} from "./cashflow.engine.ts";
import { parseUniversalCsvImport } from "./csv-import.engine.ts";
import {
  computeAccountBalances,
  computeNetWorthSummary,
  createReconcileTransaction,
  createSmartSplitTransactions,
  createTransferTransaction,
  settleSmartSplitTransaction,
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

test("slang units (củ, lít, 1tr35) and bare numbers under 1000 multiply by 1,000 cleanly", () => {
  assert.equal(parseVietnameseAmount("1tr35")?.amount, 1_350_000);
  assert.equal(parseVietnameseAmount("2 củ")?.amount, 2_000_000);
  assert.equal(parseVietnameseAmount("1củ5")?.amount, 1_500_000);
  assert.equal(parseVietnameseAmount("5 lít")?.amount, 500_000);

  const accounts = sampleAccounts();
  const parsed = parseQuickInput(
    "cf 35, phở 50, xăng 70",
    accounts,
    "acc-bank",
  );
  assert.deepEqual(
    parsed.map((item) => ({
      amount: item.amount,
      categoryId: item.categoryId,
      note: item.note,
    })),
    [
      { amount: 35_000, categoryId: "an-uong", note: "cf" },
      { amount: 50_000, categoryId: "an-uong", note: "phở" },
      { amount: 70_000, categoryId: "di-chuyen", note: "xăng" },
    ],
  );
});

test("Smart Split records only my share as EXPENSE and settles receivable back without distorting Income/Expense", () => {
  const bank: Account = {
    id: "acc-bank",
    name: "Techcombank",
    group: "LIQUID",
    currency: "VND",
    initialBalance: 10_000_000,
    currentBalance: 10_000_000,
    isArchived: false,
    updatedAt: NOW,
  };
  const receivable: Account = {
    id: "acc-receivable",
    name: "Sổ ứng hộ (Phải thu)",
    group: "DEBT",
    currency: "VND",
    initialBalance: 0,
    currentBalance: 0,
    isArchived: false,
    updatedAt: NOW,
  };

  const { expenseTx, receivableTransferTx } = createSmartSplitTransactions({
    idPrefix: "split-1",
    payerAccount: bank,
    receivableAccount: receivable,
    totalBill: 1_200_000,
    headcount: 4,
    categoryId: "an-uong",
    note: "Ăn lẩu",
    occurredAt: NOW,
    now: NOW,
  });

  assert.equal(expenseTx.amount, 300_000);
  assert.equal(expenseTx.splitInfo?.receivableAmount, 900_000);
  assert.equal(expenseTx.splitInfo?.isSettled, false);
  assert.equal(receivableTransferTx.amount, 900_000);

  const afterPay = computeAccountBalances(
    [bank, receivable],
    [expenseTx, receivableTransferTx],
  );
  assert.equal(afterPay[0].currentBalance, 8_800_000);
  assert.equal(afterPay[1].currentBalance, 900_000);

  const cashflowAfterPay = computeMonthlyCashflow({
    accounts: [bank, receivable],
    transactions: [expenseTx, receivableTransferTx],
    budget: DEFAULT_BUDGET_CONFIG,
    referenceDate: new Date(NOW),
  });
  assert.equal(cashflowAfterPay.totalExpense, 300_000);
  assert.equal(cashflowAfterPay.totalIncome, 0);

  const settled = settleSmartSplitTransaction({
    settleId: "settle-1",
    expenseTx,
    receivableAccountId: receivable.id,
    targetLiquidAccountId: bank.id,
    now: NOW + 5_000,
  });

  assert.equal(settled.updatedExpenseTx.splitInfo?.isSettled, true);
  assert.ok(settled.repaymentTransferTx);

  const afterSettle = computeAccountBalances(
    [bank, receivable],
    [settled.updatedExpenseTx, receivableTransferTx, settled.repaymentTransferTx],
  );
  assert.equal(afterSettle[0].currentBalance, 9_700_000);
  assert.equal(afterSettle[1].currentBalance, 0);

  const cashflowAfterSettle = computeMonthlyCashflow({
    accounts: [bank, receivable],
    transactions: [
      settled.updatedExpenseTx,
      receivableTransferTx,
      settled.repaymentTransferTx,
    ],
    budget: DEFAULT_BUDGET_CONFIG,
    referenceDate: new Date(NOW),
  });
  assert.equal(cashflowAfterSettle.totalIncome, 0);
  assert.equal(cashflowAfterSettle.totalExpense, 300_000);
});

test("simulateWhatIfPurchase and computeQuickOnboardingPlan calculate daily Safe-to-Spend impact", () => {
  const cashflow = computeMonthlyCashflow({
    accounts: sampleAccounts(),
    transactions: [],
    budget: {
      ...DEFAULT_BUDGET_CONFIG,
      monthlySpendingCap: 12_000_000,
    },
    referenceDate: new Date(2026, 10, 15, 10, 0, 0), // 16 remaining days in Nov
  });

  const sim = simulateWhatIfPurchase(cashflow, 1_800_000);
  assert.equal(sim.currentDailySafeToSpend, 750_000);
  assert.equal(sim.newRemainingSafeToSpend, 10_200_000);
  assert.equal(sim.newDailySafeToSpend, 637_500);
  assert.ok(sim.savingsDelayDays >= 1);
  assert.match(sim.verdictMessage, /tụt từ/);

  const onboarding = computeQuickOnboardingPlan({
    liquidBalanceVnd: 12_000_000,
    fixedCommitmentsVnd: 4_000_000,
    referenceDate: new Date(2026, 10, 15, 10, 0, 0), // 16 remaining days
  });
  assert.equal(onboarding.spendableMonthVnd, 8_000_000);
  assert.equal(onboarding.safeDailyVnd, 500_000);
});

test("parseUniversalCsvImport parses Vietnamese and English Money Lover / bank CSV rows", () => {
  const csv = [
    "Ngày,Số tiền,Danh mục,Ghi chú,Loại",
    "14/11/2026,55000,Ăn uống,Cà phê Highland,Chi tiêu",
    "13/11/2026,15000000,Lương,Lương tháng 11,Thu nhập",
    "12/11/2026,120k,,Đổ xăng A95,",
  ].join("\n");

  const imported = parseUniversalCsvImport(csv, "acc-bank", NOW);
  assert.equal(imported.length, 3);
  assert.equal(imported[0].type, "EXPENSE");
  assert.equal(imported[0].amount, 55_000);
  assert.equal(imported[0].categoryId, "an-uong");
  assert.equal(imported[1].type, "INCOME");
  assert.equal(imported[1].amount, 15_000_000);
  assert.equal(imported[2].type, "EXPENSE");
  assert.equal(imported[2].amount, 120_000);
  assert.equal(imported[2].categoryId, "di-chuyen");
});
