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
import {
  parseUniversalCsvImport,
  parseUniversalCsvImportWithStats,
} from "./csv-import.engine.ts";
import {
  computeAccountBalances,
  computeNetWorthSummary,
  computeTransactionFingerprint,
  createReconcileTransaction,
  createSmartSplitTransactions,
  createTransferTransaction,
  deduplicateTransactions,
  safeDivide,
  settleSmartSplitTransaction,
} from "./ledger.engine.ts";
import {
  parseBankNotificationSms,
  parseQuickInput,
  parseVietnameseAmount,
} from "./parser.engine.ts";

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

test("v3 cashflow engine handles refund net-off, report exclusions, spending pace, and no-spend streak", () => {
  const accounts = sampleAccounts();
  const refDate = new Date(2026, 10, 15, 12, 0, 0); // Day 15 of 30 => 50% elapsed month
  const day10 = new Date(2026, 10, 10, 9, 0, 0).getTime();
  const day12 = new Date(2026, 10, 12, 14, 0, 0).getTime();

  const txs: Transaction[] = [
    {
      id: "v3-inc-1",
      type: "INCOME",
      amount: 10_000_000,
      accountId: "acc-bank",
      categoryId: "thu-nhap",
      note: "Lương tháng 11",
      occurredAt: day10,
      syncStatus: "SYNCED",
      updatedAt: day10,
    },
    {
      id: "v3-exp-1",
      type: "EXPENSE",
      amount: 1_000_000,
      accountId: "acc-bank",
      categoryId: "mua-sam",
      note: "Mua giày chạy bộ",
      occurredAt: day10 + 1000,
      syncStatus: "SYNCED",
      updatedAt: day10 + 1000,
    },
    {
      id: "v3-refund-1",
      type: "INCOME",
      amount: 300_000,
      accountId: "acc-bank",
      categoryId: "mua-sam",
      note: "Hoàn tiền Shopee đổi size",
      isRefund: true,
      occurredAt: day12,
      syncStatus: "SYNCED",
      updatedAt: day12,
    },
    {
      id: "v3-event-1",
      type: "EXPENSE",
      amount: 4_000_000,
      accountId: "acc-bank",
      categoryId: "giai-tri",
      note: "Du lịch Đà Lạt công ty",
      excludeFromReports: true,
      eventTag: "da-lat-2026",
      occurredAt: day12 + 1000,
      syncStatus: "SYNCED",
      updatedAt: day12 + 1000,
    },
  ];

  const summary = computeMonthlyCashflow({
    accounts,
    transactions: txs,
    budget: {
      ...DEFAULT_BUDGET_CONFIG,
      monthlySpendingCap: 10_000_000,
    },
    referenceDate: refDate,
  });

  // Refund reduces net expense instead of inflating income; excluded event stays out of monthly expense
  assert.equal(summary.totalIncome, 10_000_000);
  assert.equal(summary.totalExpense, 700_000);
  assert.equal(summary.refundNetOffTotal, 300_000);
  assert.equal(summary.excludedExpenseTotal, 4_000_000);
  assert.equal(
    summary.categoryBreakdown.find((c) => c.categoryId === "mua-sam")?.amount,
    700_000,
  );
  assert.equal(summary.elapsedDaysInMonth, 15);
  assert.equal(summary.elapsedMonthPct, 50);
  assert.equal(summary.spendingPacePct, 7);
  assert.equal(summary.spendingPaceStatus, "under");
  // Last non-excluded expense was on day 10; referenceDate is day 15 => Nov 11..15 (5 days) without spending, or streak >= 1
  assert.ok(summary.noSpendStreakDays >= 1);
  assert.equal(safeDivide(100, 0, -1), -1);
});

test("fingerprint deduplication and Vietnamese bank SMS / refund quick parser work accurately", () => {
  const accounts = sampleAccounts();
  const bankAcc: Account = {
    ...accounts[0],
    id: "acc-vcb",
    name: "Vietcombank Chính",
  };
  const allAccounts = [bankAcc, ...accounts.slice(1)];

  const fpA = computeTransactionFingerprint({
    occurredAt: NOW,
    type: "EXPENSE",
    amount: 55_000,
    note: "Cà phê Highland!",
    accountId: "acc-vcb",
  });
  const fpB = computeTransactionFingerprint({
    occurredAt: NOW + 3_600_000, // same calendar day
    type: "EXPENSE",
    amount: 55_000,
    note: "Ca phe   Highland",
    accountId: "acc-vcb",
  });
  assert.equal(fpA, fpB);

  const existingTx: Transaction = {
    id: "tx-orig",
    type: "EXPENSE",
    amount: 55_000,
    accountId: "acc-vcb",
    categoryId: "an-uong",
    note: "Cà phê Highland",
    occurredAt: NOW,
    syncStatus: "PENDING",
    updatedAt: NOW,
  };
  const dupTx: Transaction = {
    ...existingTx,
    id: "tx-dup-clone",
    note: "Ca phe Highland",
  };
  const deduped = deduplicateTransactions([dupTx], [existingTx]);
  assert.equal(deduped.unique.length, 0);
  assert.equal(deduped.skippedCount, 1);

  const vcbSms = parseBankNotificationSms(
    "VCB: TK 0123xxx -150,000 VND luc 14/11/2026 09:30. SD: 18,500,000 VND. ND: Grab di lam",
    allAccounts,
    bankAcc.id,
    NOW,
  );
  assert.ok(vcbSms);
  assert.equal(vcbSms.type, "EXPENSE");
  assert.equal(vcbSms.amount, 150_000);
  assert.equal(vcbSms.accountId, bankAcc.id);
  assert.equal(vcbSms.categoryId, "di-chuyen");
  assert.equal(vcbSms.detectedBalance, 18_500_000);
  assert.equal(vcbSms.isRefund, false);

  const tcbRefundSms = parseBankNotificationSms(
    "Techcombank: +250,000 VND Hoan tien don hang Shopee. So du: 12,250,000 VND",
    allAccounts,
    bankAcc.id,
    NOW,
  );
  assert.ok(tcbRefundSms);
  assert.equal(tcbRefundSms.type, "INCOME");
  assert.equal(tcbRefundSms.isRefund, true);
  assert.equal(tcbRefundSms.amount, 250_000);
  assert.equal(tcbRefundSms.detectedBalance, 12_250_000);

  const quickRefund = parseQuickInput("hoàn tiền shopee 120k", allAccounts, bankAcc.id);
  assert.equal(quickRefund.length, 1);
  assert.equal(quickRefund[0].type, "INCOME");
  assert.equal(quickRefund[0].isRefund, true);
  assert.equal(quickRefund[0].categoryId, "mua-sam");

  const dupCsv = [
    "Ngày,Số tiền,Danh mục,Ghi chú,Loại",
    "14/11/2026,55000,Ăn uống,Cà phê Highland,Chi tiêu",
    "14/11/2026,55000,Ăn uống,Cà phê Highland,Chi tiêu",
  ].join("\n");
  const csvWithStats = parseUniversalCsvImportWithStats(dupCsv, bankAcc.id, NOW);
  assert.equal(csvWithStats.rows.length, 1);
  assert.equal(csvWithStats.skippedDuplicatesCount, 1);
});
